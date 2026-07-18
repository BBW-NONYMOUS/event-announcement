"""Event image uploads: validate, then store under a name we chose ourselves."""

import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.config import settings

# Extension is what we name the file; content type is what the client claims.
# Neither is trusted on its own — the magic bytes below decide.
EXTENSION_BY_TYPE = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
}

ALLOWED_DESCRIPTION = "PNG, JPG, or WebP"

_CHUNK_SIZE = 64 * 1024
# Enough bytes to cover the longest signature we check (WebP needs 12).
_SNIFF_SIZE = 12


def _sniff(header: bytes) -> str | None:
    """Identify the real format from the file's leading bytes."""
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if header.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    # WebP is a RIFF container: 'RIFF' <4-byte size> 'WEBP'.
    if header[:4] == b"RIFF" and header[8:12] == b"WEBP":
        return "image/webp"
    return None


def _reject(status_code: int, detail: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail=detail)


async def save_event_image(upload: UploadFile) -> tuple[str, int]:
    """Validate and persist an uploaded image.

    Returns (stored filename, size in bytes). Raises HTTPException with:
      415 — content type we do not accept
      413 — larger than MAX_UPLOAD_MB
      400 — empty, or bytes that don't match a real PNG/JPEG/WebP
    """
    content_type = (upload.content_type or "").split(";")[0].strip().lower()
    if content_type not in EXTENSION_BY_TYPE:
        raise _reject(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            f"Unsupported file type. Upload a {ALLOWED_DESCRIPTION} image.",
        )

    destination = settings.upload_path
    destination.mkdir(parents=True, exist_ok=True)

    # The name is ours: an attacker-supplied one could carry a path or a
    # second extension.
    filename = f"{uuid.uuid4().hex}{EXTENSION_BY_TYPE[content_type]}"
    target = destination / filename

    size = 0
    header = b""
    limit = settings.MAX_UPLOAD_BYTES

    try:
        with target.open("wb") as buffer:
            while chunk := await upload.read(_CHUNK_SIZE):
                size += len(chunk)
                # Stop at the limit instead of buffering the whole body first.
                if size > limit:
                    raise _reject(
                        status.HTTP_413_CONTENT_TOO_LARGE,
                        f"Image is larger than {settings.MAX_UPLOAD_MB} MB.",
                    )
                if len(header) < _SNIFF_SIZE:
                    header += chunk[: _SNIFF_SIZE - len(header)]
                buffer.write(chunk)

        if size == 0:
            raise _reject(status.HTTP_400_BAD_REQUEST, "The file is empty.")

        # A .png that is really something else fails here, whatever it claimed.
        actual = _sniff(header)
        if actual is None:
            raise _reject(
                status.HTTP_400_BAD_REQUEST,
                f"That file is not a valid {ALLOWED_DESCRIPTION} image.",
            )
        if EXTENSION_BY_TYPE[actual] != EXTENSION_BY_TYPE[content_type]:
            raise _reject(
                status.HTTP_400_BAD_REQUEST,
                f"File contents are {actual}, which does not match the declared {content_type}.",
            )

        # Only once the bytes are known-good does the image leave this machine.
        # Uploading first would put unvalidated content in a public bucket.
        if settings.use_object_storage:
            _put_object(target, filename, content_type)
    except Exception:
        # Never leave a partial or rejected file behind.
        target.unlink(missing_ok=True)
        raise
    finally:
        await upload.close()

    if settings.use_object_storage:
        # The bucket holds the image now; the local copy was only a staging
        # buffer so validation could stream rather than buffer in memory.
        target.unlink(missing_ok=True)

    return filename, size


def _client():
    """S3-compatible client, built per call.

    boto3 is imported here rather than at module scope so development and the
    test suite — which use the local filesystem — do not need it installed.
    """
    import boto3

    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT_URL,
        aws_access_key_id=settings.S3_ACCESS_KEY_ID,
        aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
        # R2 ignores regions but the SDK insists on one.
        region_name="auto",
    )


def _put_object(source: Path, key: str, content_type: str) -> None:
    try:
        _client().upload_file(
            str(source),
            settings.S3_BUCKET,
            key,
            # Without this the object is served as a download rather than
            # rendered inline, and every event image would fail to display.
            ExtraArgs={"ContentType": content_type},
        )
    except Exception as exc:
        raise _reject(
            status.HTTP_502_BAD_GATEWAY,
            "Could not store the image. Please try again.",
        ) from exc


def public_url(filename: str) -> str:
    """URL for a stored image, as persisted to Event.image_url.

    With object storage configured this is the bucket's absolute public URL.
    Both clients already pass absolute URLs through untouched, so nothing on
    the frontend changes.

    Otherwise it is host-relative (`/uploads/ab12.png`), deliberately: the
    value must not carry the *uploader's* host, or an admin uploading from
    localhost would store `http://localhost:8000/...`, which a phone on the LAN
    resolves to itself and fails to load. Each client joins the relative form
    onto its own API base instead.
    """
    if settings.use_object_storage:
        return f"{settings.S3_PUBLIC_URL.rstrip('/')}/{filename}"
    return f"/uploads/{filename}"


def stored_path(filename: str) -> Path:
    return settings.upload_path / filename
