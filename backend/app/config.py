from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    # NoDecode: the raw env value is a comma-separated string, not JSON.
    CORS_ORIGINS: Annotated[list[str], NoDecode] = []

    ALGORITHM: str = "HS256"

    # Event image uploads. UPLOAD_DIR is resolved relative to the backend root
    # unless an absolute path is given, and is served read-only at /uploads.
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_MB: int = 15

    # S3-compatible object storage for event images (Cloudflare R2).
    #
    # Optional: leave unset and images are written to UPLOAD_DIR, which is what
    # development and the tests use. Set all five and uploads go to the bucket
    # instead — necessary on any host with an ephemeral filesystem, where local
    # files are lost on every redeploy.
    S3_ENDPOINT_URL: str = ""
    S3_ACCESS_KEY_ID: str = ""
    S3_SECRET_ACCESS_KEY: str = ""
    S3_BUCKET: str = ""
    # Public base URL for the bucket, e.g. https://pub-xxxx.r2.dev — this is
    # what gets persisted in Event.image_url, so it must be publicly readable.
    S3_PUBLIC_URL: str = ""

    @property
    def MAX_UPLOAD_BYTES(self) -> int:
        return self.MAX_UPLOAD_MB * 1024 * 1024

    @property
    def upload_path(self) -> Path:
        path = Path(self.UPLOAD_DIR)
        if not path.is_absolute():
            path = Path(__file__).resolve().parent.parent / path
        return path

    @property
    def use_object_storage(self) -> bool:
        """True only when every S3 setting is present.

        All-or-nothing on purpose: a half-configured bucket would fail at the
        moment an admin uploads, rather than at startup where it is obvious.
        """
        return all(
            (
                self.S3_ENDPOINT_URL,
                self.S3_ACCESS_KEY_ID,
                self.S3_SECRET_ACCESS_KEY,
                self.S3_BUCKET,
                self.S3_PUBLIC_URL,
            )
        )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
