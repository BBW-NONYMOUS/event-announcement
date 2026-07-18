import base64

import pytest

from app.config import settings

# A real 1x1 PNG — the endpoint sniffs magic bytes, so these must be genuine.
PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)
JPEG_BYTES = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00" + b"\xff\xd9"
WEBP_BYTES = b"RIFF" + (32).to_bytes(4, "little") + b"WEBPVP8 " + b"\x00" * 24

UPLOAD_URL = "/api/admin/uploads/image"


@pytest.fixture(autouse=True)
def _isolated_upload_dir(tmp_path, monkeypatch):
    """Keep test uploads out of the real backend/uploads directory."""
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path))
    return tmp_path


def _post(client, headers, content, filename="banner.png", content_type="image/png"):
    return client.post(UPLOAD_URL, headers=headers, files={"file": (filename, content, content_type)})


# --- Guard rails -----------------------------------------------------------


def test_upload_rejects_user_role_with_403(client, user_headers):
    assert _post(client, user_headers, PNG_BYTES).status_code == 403


def test_upload_rejects_anonymous_with_401(client):
    assert _post(client, {}, PNG_BYTES).status_code == 401


# --- Accepted formats ------------------------------------------------------


@pytest.mark.parametrize(
    "content,filename,content_type,extension",
    [
        (PNG_BYTES, "banner.png", "image/png", ".png"),
        (JPEG_BYTES, "banner.jpg", "image/jpeg", ".jpg"),
        (WEBP_BYTES, "banner.webp", "image/webp", ".webp"),
    ],
)
def test_accepts_png_jpg_and_webp(
    client, admin_headers, _isolated_upload_dir, content, filename, content_type, extension
):
    response = _post(client, admin_headers, content, filename, content_type)
    assert response.status_code == 201, response.text

    body = response.json()
    assert body["filename"].endswith(extension)
    assert body["size"] == len(content)
    assert body["url"].endswith(f"/uploads/{body['filename']}")
    # The bytes actually landed on disk, unchanged.
    stored = _isolated_upload_dir / body["filename"]
    assert stored.read_bytes() == content


def test_url_is_host_relative(client, admin_headers):
    """The uploader's host must not leak into a value every client reads back.

    An admin uploads from localhost; a phone resolves the API at a LAN IP. An
    absolute URL here would point the phone at its own localhost.
    """
    url = _post(client, admin_headers, PNG_BYTES).json()["url"]
    assert url.startswith("/uploads/")
    assert "localhost" not in url and "http" not in url


def test_stored_name_ignores_the_client_filename(client, admin_headers, _isolated_upload_dir):
    """A traversal attempt must not escape the upload directory."""
    body = _post(client, admin_headers, PNG_BYTES, filename="../../evil.png").json()

    assert "evil" not in body["filename"]
    assert "/" not in body["filename"] and "\\" not in body["filename"]
    assert (_isolated_upload_dir / body["filename"]).exists()
    assert [p.name for p in _isolated_upload_dir.iterdir()] == [body["filename"]]


# --- Rejections ------------------------------------------------------------


@pytest.mark.parametrize(
    "filename,content_type",
    [("notes.pdf", "application/pdf"), ("notes.txt", "text/plain"), ("art.gif", "image/gif")],
)
def test_unsupported_type_returns_415(client, admin_headers, filename, content_type):
    response = _post(client, admin_headers, PNG_BYTES, filename, content_type)
    assert response.status_code == 415
    assert "PNG, JPG, or WebP" in response.json()["detail"]


def test_renamed_file_is_caught_by_content_sniffing(client, admin_headers, _isolated_upload_dir):
    """A .exe renamed to .png, claiming image/png, must still be refused."""
    response = _post(client, admin_headers, b"MZ\x90\x00 this is not an image", "payload.png")
    assert response.status_code == 400
    assert "not a valid" in response.json()["detail"]
    # And nothing is left behind.
    assert list(_isolated_upload_dir.iterdir()) == []


def test_declared_type_must_match_actual_bytes(client, admin_headers):
    response = _post(client, admin_headers, JPEG_BYTES, "banner.png", "image/png")
    assert response.status_code == 400
    assert "does not match" in response.json()["detail"]


def test_empty_file_returns_400(client, admin_headers, _isolated_upload_dir):
    response = _post(client, admin_headers, b"")
    assert response.status_code == 400
    assert list(_isolated_upload_dir.iterdir()) == []


def test_oversized_upload_returns_413(client, admin_headers, monkeypatch, _isolated_upload_dir):
    monkeypatch.setattr(settings, "MAX_UPLOAD_MB", 1)
    oversized = PNG_BYTES + b"\x00" * (2 * 1024 * 1024)

    response = _post(client, admin_headers, oversized)
    assert response.status_code == 413
    assert "larger than 1 MB" in response.json()["detail"]
    # The partial write is cleaned up rather than left on disk.
    assert list(_isolated_upload_dir.iterdir()) == []


def test_default_limit_is_15_mb():
    assert settings.MAX_UPLOAD_MB == 15
    assert settings.MAX_UPLOAD_BYTES == 15 * 1024 * 1024


# --- Serving ---------------------------------------------------------------


def test_uploaded_image_is_served_back(client, admin_headers, monkeypatch):
    """Uses the real configured directory: that is what /uploads is mounted on."""
    monkeypatch.undo()  # restore the real UPLOAD_DIR for this test
    body = _post(client, admin_headers, PNG_BYTES).json()
    stored = settings.upload_path / body["filename"]

    try:
        response = client.get(f"/uploads/{body['filename']}")
        assert response.status_code == 200
        assert response.content == PNG_BYTES
        # Served without auth, like any other image the mobile app loads.
        assert response.headers["content-type"] == "image/png"
    finally:
        stored.unlink(missing_ok=True)
