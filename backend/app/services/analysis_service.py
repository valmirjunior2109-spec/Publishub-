"""Business rules: register uploaded videos, expose analyses, run the analysis pipeline."""

import logging
import re
import subprocess
import tempfile
import threading
from pathlib import Path

from app.core.config import ALLOWED_VIDEO_TYPES, get_settings
from app.core.errors import ApiError
from app.services import ai_service, supabase_service as db
from app.services.video_processing import InvalidVideoError, extract_frames, extract_signals, frame_times

logger = logging.getLogger("publishub")

INTERRUPTED_MESSAGE = "A análise foi interrompida porque o servidor reiniciou. Clique em “Tentar novamente”."
_UUID = r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
_STORAGE_PATH_RE = re.compile(rf"^(?P<owner>{_UUID})/{_UUID}\.(mp4|mov|webm)$")

_slots: threading.Semaphore | None = None


def _analysis_slots() -> threading.Semaphore:
    global _slots
    if _slots is None:
        _slots = threading.Semaphore(get_settings().max_concurrent_analyses)
    return _slots


def is_uuid(value: str) -> bool:
    return re.fullmatch(_UUID, value) is not None


def _clean_filename(name: str) -> str:
    base = name.replace("\\", "/").split("/")[-1]
    base = re.sub(r"[\x00-\x1f\x7f]", "", base).strip()
    return base[:255] or "video"


# ---------------------------------------------------------------- videos


def register_video(user: dict, storage_path: str, filename: str) -> dict:
    """Validates a file the frontend uploaded to Storage and queues its analysis."""
    settings = get_settings()
    match = _STORAGE_PATH_RE.match(storage_path)
    if not match:
        raise ApiError(400, "INVALID_FILE", "Caminho de arquivo inválido. Envie o vídeo novamente.")
    if match.group("owner") != user["id"]:
        raise ApiError(403, "FORBIDDEN", "Este arquivo não pertence à sua conta.")
    if db.storage_path_in_use(storage_path):
        raise ApiError(409, "ALREADY_REGISTERED", "Este vídeo já foi registrado.")

    info = db.get_object_info(storage_path)
    if info is None:
        raise ApiError(400, "UPLOAD_NOT_FOUND", "Não encontramos o arquivo enviado. Envie o vídeo novamente.")
    # Never trust sizes or types sent by the client: use what Storage recorded.
    if info["size"] > settings.max_upload_bytes:
        db.delete_object(storage_path)
        raise ApiError(413, "FILE_TOO_LARGE", f"O vídeo passa do limite de {settings.max_upload_bytes // (1024 * 1024)} MB.")
    if info["content_type"] not in ALLOWED_VIDEO_TYPES:
        db.delete_object(storage_path)
        raise ApiError(400, "INVALID_FILE", "Formato não suportado. Envie um vídeo MP4, MOV ou WEBM.")

    video = db.insert_video(
        {
            "user_id": user["id"],
            "filename": _clean_filename(filename),
            "storage_path": storage_path,
            "size_bytes": info["size"],
            "mime_type": info["content_type"],
            "status": "uploaded",
        }
    )
    analysis = db.insert_analysis(video["id"], user["id"])
    return {"video": video, "analysis": analysis}


def list_user_videos(user: dict) -> list[dict]:
    items = []
    for video in db.list_videos(user["id"]):
        analyses = sorted(video.pop("analyses") or [], key=lambda a: a["created_at"], reverse=True)
        items.append({**video, "analysis": analyses[0] if analyses else None})
    return items


# ---------------------------------------------------------------- analyses


def get_user_analysis(user: dict, analysis_id: str) -> dict:
    analysis = db.get_analysis(analysis_id, user["id"]) if is_uuid(analysis_id) else None
    if not analysis:
        raise ApiError(404, "NOT_FOUND", "Análise não encontrada.")
    video = analysis.pop("videos") or {}
    return {
        "id": analysis["id"],
        "status": analysis["status"],
        "error_message": analysis["error_message"],
        "result": analysis["result"],
        "created_at": analysis["created_at"],
        "updated_at": analysis["updated_at"],
        "video": {
            "id": video.get("id"),
            "filename": video.get("filename"),
            "size_bytes": video.get("size_bytes"),
            "duration_seconds": video.get("duration_seconds"),
            "created_at": video.get("created_at"),
            # Short-lived link so the creator can watch the video next to the result.
            "playback_url": db.create_signed_url(video["storage_path"]) if video.get("storage_path") else None,
        },
    }


def retry_analysis(user: dict, analysis_id: str) -> dict:
    analysis = db.get_analysis(analysis_id, user["id"]) if is_uuid(analysis_id) else None
    if not analysis:
        raise ApiError(404, "NOT_FOUND", "Análise não encontrada.")
    if analysis["status"] != "failed":
        raise ApiError(409, "NOT_RETRYABLE", "Só é possível tentar novamente uma análise que falhou.")
    db.update_analysis(analysis_id, {"status": "pending", "error_message": None, "result": None})
    db.update_video(analysis["video_id"], {"status": "uploaded"})
    return {"id": analysis_id, "status": "pending"}


def _fail(analysis_id: str, video_id: str, message: str) -> None:
    try:
        db.update_analysis(analysis_id, {"status": "failed", "error_message": message})
        db.update_video(video_id, {"status": "failed"})
    except Exception:
        logger.exception("could not mark analysis %s as failed", analysis_id)


def run_analysis(analysis_id: str) -> None:
    """Background job: download → measure → AI → save. Never raises."""
    with _analysis_slots():
        try:
            analysis = db.get_analysis(analysis_id)
        except Exception:
            logger.exception("could not load analysis %s", analysis_id)
            return
        if not analysis or analysis["status"] != "pending":
            return
        video = analysis["videos"]
        settings = get_settings()

        if not settings.ai_configured:
            _fail(analysis_id, video["id"], "A análise por IA ainda não está configurada neste servidor (GEMINI_API_KEY ausente).")
            return

        try:
            db.update_analysis(analysis_id, {"status": "processing"})
            db.update_video(video["id"], {"status": "processing"})

            with tempfile.TemporaryDirectory(prefix="publishub-") as tmp:
                work = Path(tmp)
                # The file only lives here during processing; Storage keeps the original.
                source = work / f"video.{ALLOWED_VIDEO_TYPES.get(video['mime_type'], 'mp4')}"
                source.write_bytes(db.download_object(video["storage_path"]))

                signals = extract_signals(source)
                if signals.duration_seconds > settings.max_video_duration_seconds:
                    minutes = settings.max_video_duration_seconds // 60
                    _fail(analysis_id, video["id"], f"Nesta versão analisamos vídeos de até {minutes} minutos.")
                    return
                frames = extract_frames(source, frame_times(signals.duration_seconds), work)

            result = ai_service.analyze_video(signals, frames)
            result["signals"] = signals.as_dict()
            result["frames_analyzed"] = len(frames)
            result["model"] = settings.gemini_model

            db.update_analysis(analysis_id, {"status": "completed", "result": result, "error_message": None})
            db.update_video(video["id"], {"status": "analyzed", "duration_seconds": round(signals.duration_seconds, 2)})
        except InvalidVideoError:
            _fail(analysis_id, video["id"], "Não conseguimos ler este vídeo. Ele pode estar corrompido — exporte novamente em MP4 e envie outra vez.")
        except ai_service.AIServiceError as exc:
            _fail(analysis_id, video["id"], exc.message)
        except db.SupabaseError:
            _fail(analysis_id, video["id"], "Não foi possível acessar o armazenamento do vídeo. Tente novamente.")
        except subprocess.TimeoutExpired:
            _fail(analysis_id, video["id"], "O processamento do vídeo demorou demais. Tente um vídeo mais curto.")
        except Exception:
            logger.exception("analysis %s failed", analysis_id)
            _fail(analysis_id, video["id"], "Algo deu errado ao analisar o vídeo. Tente novamente.")


def recover_interrupted() -> None:
    """Called at startup: work left unfinished by a previous process can't resume."""
    count = db.fail_unfinished_analyses(INTERRUPTED_MESSAGE)
    if count:
        logger.warning("marked %s interrupted analysis(es) as failed", count)
