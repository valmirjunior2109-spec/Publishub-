"""Settings read from environment variables (and `backend/.env` in development)."""

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

ALLOWED_VIDEO_TYPES = {
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
}


def _int(name: str, default: int) -> int:
    try:
        value = int(os.getenv(name, ""))
        return value if value > 0 else default
    except ValueError:
        return default


@dataclass(frozen=True)
class Settings:
    supabase_url: str
    supabase_service_role_key: str
    storage_bucket: str
    gemini_api_key: str
    gemini_model: str
    cors_origins: list[str]
    max_upload_bytes: int
    max_video_duration_seconds: int
    max_concurrent_analyses: int

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)

    @property
    def ai_configured(self) -> bool:
        return bool(self.gemini_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings(
        supabase_url=os.getenv("SUPABASE_URL", "").strip().rstrip("/"),
        supabase_service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip(),
        storage_bucket=os.getenv("SUPABASE_STORAGE_BUCKET", "videos").strip() or "videos",
        gemini_api_key=os.getenv("GEMINI_API_KEY", "").strip(),
        gemini_model=os.getenv("GEMINI_MODEL", "").strip() or "gemini-2.5-pro",
        cors_origins=[o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()],
        max_upload_bytes=_int("MAX_UPLOAD_MB", 50) * 1024 * 1024,
        max_video_duration_seconds=_int("MAX_VIDEO_DURATION_SECONDS", 600),
        max_concurrent_analyses=_int("MAX_CONCURRENT_ANALYSES", 2),
    )
