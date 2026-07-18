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

    @property
    def MAX_UPLOAD_BYTES(self) -> int:
        return self.MAX_UPLOAD_MB * 1024 * 1024

    @property
    def upload_path(self) -> Path:
        path = Path(self.UPLOAD_DIR)
        if not path.is_absolute():
            path = Path(__file__).resolve().parent.parent / path
        return path

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
