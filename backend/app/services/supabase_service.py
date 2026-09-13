"""The only module that talks to Supabase (Auth, Postgres via PostgREST, Storage).

The backend uses the service-role key, which bypasses Row Level Security,
so every query that reads user data filters by the authenticated user's id.
RLS stays enabled in the database as a second line of defense.
"""

import logging
from functools import lru_cache
from typing import Any

from supabase import Client, create_client

from app.core.config import get_settings

logger = logging.getLogger("publishub")


class SupabaseNotConfigured(Exception):
    pass


class SupabaseError(Exception):
    """Any failure talking to Supabase (network, API error, unexpected response)."""


@lru_cache
def _client() -> Client:
    settings = get_settings()
    if not settings.supabase_configured:
        raise SupabaseNotConfigured("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set")
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def _run(action: str, fn):
    try:
        return fn()
    except SupabaseNotConfigured:
        raise
    except Exception as exc:  # postgrest.APIError, StorageException, httpx errors…
        logger.error("supabase %s failed: %s", action, exc)
        raise SupabaseError(action) from exc


# ---------------------------------------------------------------- auth


def get_user_from_token(token: str) -> dict[str, Any] | None:
    """Validates a Supabase access token with Supabase Auth. None if invalid/expired."""
    try:
        response = _client().auth.get_user(token)
    except SupabaseNotConfigured:
        raise
    except Exception as exc:
        # Supabase Auth answers 401/403 for bad tokens; anything else is an outage.
        status = getattr(exc, "status", None)
        if status in (401, 403) or "invalid" in str(exc).lower() or "expired" in str(exc).lower():
            return None
        logger.error("supabase auth.get_user failed: %s", exc)
        raise SupabaseError("auth.get_user") from exc
    user = getattr(response, "user", None)
    if not user:
        return None
    return {"id": str(user.id), "email": user.email}


def get_profile(user_id: str) -> dict[str, Any] | None:
    rows = _run(
        "profiles.select",
        lambda: _client().table("profiles").select("id, email, full_name, created_at").eq("id", user_id).limit(1).execute(),
    ).data
    return rows[0] if rows else None


# ---------------------------------------------------------------- storage
# `bucket=None` means the videos bucket; the Insights screenshots live in their own.


def _bucket(bucket: str | None) -> str:
    return bucket or get_settings().storage_bucket


def get_object_info(path: str, bucket: str | None = None) -> dict[str, Any] | None:
    """Size and content type of an uploaded file, or None if it doesn't exist."""
    try:
        info = _client().storage.from_(_bucket(bucket)).info(path)
    except SupabaseNotConfigured:
        raise
    except Exception as exc:
        if "not found" in str(exc).lower() or getattr(exc, "status", None) in (400, 404, "404"):
            return None
        logger.error("supabase storage.info failed: %s", exc)
        raise SupabaseError("storage.info") from exc
    metadata = info.get("metadata") or {}
    return {
        "size": int(info.get("size") or metadata.get("size") or 0),
        "content_type": (info.get("content_type") or metadata.get("mimetype") or "").lower(),
    }


def download_object(path: str, bucket: str | None = None) -> bytes:
    return _run("storage.download", lambda: _client().storage.from_(_bucket(bucket)).download(path))


def delete_object(path: str, bucket: str | None = None) -> None:
    _run("storage.remove", lambda: _client().storage.from_(_bucket(bucket)).remove([path]))


def create_signed_url(path: str, expires_in: int = 3600, bucket: str | None = None) -> str | None:
    try:
        result = _client().storage.from_(_bucket(bucket)).create_signed_url(path, expires_in)
    except Exception as exc:
        logger.warning("could not sign url for %s: %s", path, exc)
        return None
    return result.get("signedURL") or result.get("signedUrl")


# ---------------------------------------------------------------- videos


def insert_video(row: dict[str, Any]) -> dict[str, Any]:
    return _run("videos.insert", lambda: _client().table("videos").insert(row).execute()).data[0]


def update_video(video_id: str, fields: dict[str, Any]) -> None:
    _run("videos.update", lambda: _client().table("videos").update(fields).eq("id", video_id).execute())


def storage_path_in_use(path: str) -> bool:
    rows = _run(
        "videos.select",
        lambda: _client().table("videos").select("id").eq("storage_path", path).limit(1).execute(),
    ).data
    return bool(rows)


def insights_path_in_use(path: str) -> bool:
    rows = _run(
        "videos.select",
        lambda: _client().table("videos").select("id").eq("insights_path", path).limit(1).execute(),
    ).data
    return bool(rows)


# Campos da listagem: o bastante para o card do painel (miniatura da curva,
# segundo da queda, status do loop) sem baixar o resultado inteiro.
LIST_SELECT = (
    "id, filename, size_bytes, duration_seconds, status, created_at, hypothesis, "
    "analyses(id, status, step, outcome, actual_retention, outcome_recorded_at, created_at, updated_at, "
    "drop_at:result->drop->at_seconds, curve:result->curve)"
)


def list_videos(user_id: str) -> list[dict[str, Any]]:
    """The user's videos, newest first, each with its analyses."""
    return _run(
        "videos.list",
        lambda: _client().table("videos").select(LIST_SELECT).eq("user_id", user_id).order("created_at", desc=True).execute(),
    ).data


# ---------------------------------------------------------------- analyses


def insert_analysis(video_id: str, user_id: str) -> dict[str, Any]:
    return _run(
        "analyses.insert",
        lambda: _client().table("analyses").insert({"video_id": video_id, "user_id": user_id, "status": "pending"}).execute(),
    ).data[0]


def get_analysis(analysis_id: str, user_id: str | None = None) -> dict[str, Any] | None:
    """An analysis with its video. When user_id is given, only if it belongs to that user."""

    def query():
        q = _client().table("analyses").select("*, videos(*)").eq("id", analysis_id)
        if user_id is not None:
            q = q.eq("user_id", user_id)
        return q.limit(1).execute()

    rows = _run("analyses.get", query).data
    return rows[0] if rows else None


def update_analysis(analysis_id: str, fields: dict[str, Any]) -> None:
    _run("analyses.update", lambda: _client().table("analyses").update(fields).eq("id", analysis_id).execute())


def count_outcomes(user_id: str) -> dict[str, int]:
    """How many of the user's predictions were confirmed / refuted."""

    def count(outcome: str) -> int:
        return (
            _run(
                f"analyses.count.{outcome}",
                lambda: _client().table("analyses").select("id", count="exact", head=True).eq("user_id", user_id).eq("outcome", outcome).execute(),
            ).count
            or 0
        )

    return {"confirmed": count("confirmed"), "refuted": count("refuted")}


def fail_unfinished_analyses(message: str) -> int:
    """Marks analyses left pending/processing by a previous server process as failed."""
    rows = _run(
        "analyses.recover",
        lambda: _client()
        .table("analyses")
        .update({"status": "failed", "step": None, "error_message": message})
        .in_("status", ["pending", "processing"])
        .execute(),
    ).data
    for row in rows:
        update_video(row["video_id"], {"status": "failed"})
    return len(rows)
