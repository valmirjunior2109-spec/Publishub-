"""Business rules: register uploads, run the pipeline, expose analyses and the prediction loop.

Pipeline (three visible steps, stored in `analyses.step`):
  transcribing → the speech, with timestamps
  aligning     → the Insights screenshot, read into a curve; the phrase at the drop
  diagnosing   → why people left, three rewrites, a falsifiable prediction,
                 then the editing copilot (rhythm, hook, dead stretches, cuts)
"""

import base64
import logging
import re
import subprocess
import tempfile
import threading
from datetime import datetime, timezone
from pathlib import Path

from app.core.config import ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES, get_settings
from app.core.errors import ApiError
from app.schemas.analysis import CurveReading, Transcript, TranscriptSegment
from app.services import ai_service, billing_service, supabase_service as db
from app.services.video_processing import InvalidVideoError, extract_audio, extract_frames, extract_signals, frame_times

logger = logging.getLogger("publishub")

# Frames espalhados pelo vídeo inteiro que o copiloto de edição recebe.
COPILOT_MAX_FRAMES = 12

INTERRUPTED_MESSAGE = "A análise foi interrompida porque o servidor reiniciou. Clique em “Tentar novamente”."
_UUID = r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
_VIDEO_PATH_RE = re.compile(rf"^(?P<owner>{_UUID})/{_UUID}\.(mp4|mov|webm)$")
_IMAGE_PATH_RE = re.compile(rf"^(?P<owner>{_UUID})/{_UUID}\.(png|jpg|jpeg|webp)$")

# A previsão mira o segundo em que a queda já terminou (a queda leva ~2 s).
PREDICTION_OFFSET_SECONDS = 2.0

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


def register_video(user: dict, storage_path: str, filename: str, insights_path: str, hypothesis: str | None) -> dict:
    """Validates the two files the frontend uploaded to Storage and queues the analysis."""
    settings = get_settings()
    billing_service.ensure_can_upload(user)  # 5 uploads grátis usados e sem Lifetime → 402

    video_match = _VIDEO_PATH_RE.match(storage_path)
    if not video_match:
        raise ApiError(400, "INVALID_FILE", "Caminho de arquivo inválido. Envie o vídeo novamente.")
    if video_match.group("owner") != user["id"]:
        raise ApiError(403, "FORBIDDEN", "Este arquivo não pertence à sua conta.")
    image_match = _IMAGE_PATH_RE.match(insights_path)
    if not image_match:
        raise ApiError(400, "INVALID_IMAGE", "Caminho do print inválido. Envie o print novamente.")
    if image_match.group("owner") != user["id"]:
        raise ApiError(403, "FORBIDDEN", "Este arquivo não pertence à sua conta.")
    if db.storage_path_in_use(storage_path) or db.insights_path_in_use(insights_path):
        raise ApiError(409, "ALREADY_REGISTERED", "Este vídeo já foi registrado.")

    info = db.get_object_info(storage_path)
    if info is None:
        raise ApiError(400, "UPLOAD_NOT_FOUND", "Não encontramos o vídeo enviado. Envie novamente.")
    # Never trust sizes or types sent by the client: use what Storage recorded.
    if info["size"] > settings.max_upload_bytes:
        db.delete_object(storage_path)
        raise ApiError(413, "FILE_TOO_LARGE", f"O vídeo passa do limite de {settings.max_upload_bytes // (1024 * 1024)} MB.")
    if info["content_type"] not in ALLOWED_VIDEO_TYPES:
        db.delete_object(storage_path)
        raise ApiError(400, "INVALID_FILE", "Formato não suportado. Envie um vídeo MP4, MOV ou WEBM.")

    image = db.get_object_info(insights_path, bucket=settings.insights_bucket)
    if image is None:
        raise ApiError(400, "UPLOAD_NOT_FOUND", "Não encontramos o print enviado. Envie novamente.")
    if image["size"] > settings.max_image_bytes:
        db.delete_object(insights_path, bucket=settings.insights_bucket)
        raise ApiError(413, "IMAGE_TOO_LARGE", f"O print passa do limite de {settings.max_image_bytes // (1024 * 1024)} MB.")
    if image["content_type"] not in ALLOWED_IMAGE_TYPES:
        db.delete_object(insights_path, bucket=settings.insights_bucket)
        raise ApiError(400, "INVALID_IMAGE", "O print precisa ser uma imagem PNG, JPG ou WEBP.")

    video = db.insert_video(
        {
            "user_id": user["id"],
            "filename": _clean_filename(filename),
            "storage_path": storage_path,
            "insights_path": insights_path,
            "hypothesis": (hypothesis or "").strip()[:500] or None,
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


def accuracy(user: dict) -> dict:
    counts = db.count_outcomes(user["id"])
    total = counts["confirmed"] + counts["refuted"]
    return {**counts, "total": total, "rate": round(counts["confirmed"] / total * 100) if total else None}


def _serialize(analysis: dict) -> dict:
    settings = get_settings()
    video = analysis.pop("videos") or {}
    return {
        "id": analysis["id"],
        "status": analysis["status"],
        "step": analysis.get("step"),
        "outcome": analysis.get("outcome") or "pending",
        "actual_retention": analysis.get("actual_retention"),
        "outcome_recorded_at": analysis.get("outcome_recorded_at"),
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
            "hypothesis": video.get("hypothesis"),
            # Short-lived links so the creator can watch the video and see the print next to the result.
            "playback_url": db.create_signed_url(video["storage_path"]) if video.get("storage_path") else None,
            "insights_url": db.create_signed_url(video["insights_path"], bucket=settings.insights_bucket) if video.get("insights_path") else None,
        },
    }


def get_user_analysis(user: dict, analysis_id: str) -> dict:
    analysis = db.get_analysis(analysis_id, user["id"]) if is_uuid(analysis_id) else None
    if not analysis:
        raise ApiError(404, "NOT_FOUND", "Análise não encontrada.")
    return _serialize(analysis)


def record_outcome(user: dict, analysis_id: str, actual_retention: float) -> dict:
    """The creator republished and pasted the real number: the prediction gets its verdict."""
    analysis = db.get_analysis(analysis_id, user["id"]) if is_uuid(analysis_id) else None
    if not analysis:
        raise ApiError(404, "NOT_FOUND", "Análise não encontrada.")
    prediction = (analysis.get("result") or {}).get("prediction")
    if analysis["status"] != "completed" or not prediction:
        raise ApiError(409, "NOT_READY", "A previsão só pode ser conferida depois que a análise terminar.")

    outcome = "confirmed" if actual_retention >= prediction["predicted"] else "refuted"
    recorded_at = datetime.now(timezone.utc).isoformat()
    db.update_analysis(analysis_id, {"outcome": outcome, "actual_retention": round(actual_retention, 2), "outcome_recorded_at": recorded_at})
    return {"id": analysis_id, "outcome": outcome, "actual_retention": round(actual_retention, 2), "outcome_recorded_at": recorded_at, "accuracy": accuracy(user)}


def retry_analysis(user: dict, analysis_id: str) -> dict:
    analysis = db.get_analysis(analysis_id, user["id"]) if is_uuid(analysis_id) else None
    if not analysis:
        raise ApiError(404, "NOT_FOUND", "Análise não encontrada.")
    if analysis["status"] != "failed":
        raise ApiError(409, "NOT_RETRYABLE", "Só é possível tentar novamente uma análise que falhou.")
    db.update_analysis(analysis_id, {"status": "pending", "step": None, "error_message": None, "result": None})
    db.update_video(analysis["video_id"], {"status": "uploaded"})
    return {"id": analysis_id, "status": "pending"}


# ---------------------------------------------------------------- pipeline


def align_phrase(transcript: Transcript, drop_second: float) -> dict:
    """The segment being spoken when the audience left, with its neighbours.

    The chart reading is approximate (±1 s), so a segment that contains the
    second wins; otherwise the nearest one by its middle.
    """
    segments = transcript.segments
    containing = [s for s in segments if s.start_seconds <= drop_second <= s.end_seconds]
    chosen: TranscriptSegment = containing[0] if containing else min(segments, key=lambda s: abs((s.start_seconds + s.end_seconds) / 2 - drop_second))
    index = segments.index(chosen)
    return {
        "start_seconds": round(chosen.start_seconds, 2),
        "end_seconds": round(chosen.end_seconds, 2),
        "text": chosen.text.strip(),
        "before": segments[index - 1].text.strip() if index > 0 else "",
        "after": segments[index + 1].text.strip() if index + 1 < len(segments) else "",
    }


def _clean_curve(curve: CurveReading, duration: float) -> list[list[float]]:
    points = []
    for point in curve.points:
        if len(point) != 2:
            continue
        t, retained = point
        points.append([round(max(0.0, min(duration, t)), 1), round(max(0.0, min(100.0, retained)), 1)])
    return sorted(points, key=lambda p: p[0])


def _retained_at(points: list[list[float]], second: float, fallback: float) -> float:
    if not points:
        return fallback
    nearest = min(points, key=lambda p: abs(p[0] - second))
    return nearest[1]


def _fail(analysis_id: str, video_id: str, message: str) -> None:
    try:
        db.update_analysis(analysis_id, {"status": "failed", "step": None, "error_message": message})
        db.update_video(video_id, {"status": "failed"})
    except Exception:
        logger.exception("could not mark analysis %s as failed", analysis_id)


def _decode_frames(frames: list[dict]) -> list[dict]:
    return [{"time": f["time"], "jpeg": base64.b64decode(f["jpeg_base64"])} for f in frames]


def run_analysis(analysis_id: str) -> None:
    """Background job: download → transcribe → read the chart → diagnose → copilot → save. Never raises."""
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
            # ---- 1. transcrevendo
            db.update_analysis(analysis_id, {"status": "processing", "step": "transcribing"})
            db.update_video(video["id"], {"status": "processing"})

            with tempfile.TemporaryDirectory(prefix="publishub-") as tmp:
                work = Path(tmp)
                source = work / f"video.{ALLOWED_VIDEO_TYPES.get(video['mime_type'], 'mp4')}"
                source.write_bytes(db.download_object(video["storage_path"]))

                signals = extract_signals(source)
                if signals.duration_seconds > settings.max_video_duration_seconds:
                    minutes = settings.max_video_duration_seconds // 60
                    _fail(analysis_id, video["id"], f"Nesta versão analisamos vídeos de até {minutes} minutos.")
                    return
                audio = extract_audio(source, work) if signals.has_audio else None
                if audio is None:
                    _fail(analysis_id, video["id"], "Este vídeo não tem áudio. O Publishub analisa o que você fala — envie um vídeo com fala.")
                    return
                transcript = ai_service.transcribe(audio.read_bytes())
                if not transcript.has_speech or not transcript.segments:
                    _fail(analysis_id, video["id"], "Não encontramos fala neste vídeo. O Publishub analisa o que você diz — envie um vídeo em que você fala.")
                    return

                # ---- 2. alinhando com a retenção
                db.update_analysis(analysis_id, {"step": "aligning"})
                image_bytes = db.download_object(video["insights_path"], bucket=settings.insights_bucket)
                image_type = next((mime for mime, ext in ALLOWED_IMAGE_TYPES.items() if video["insights_path"].lower().endswith(ext)), "image/png")
                if video["insights_path"].lower().endswith(".jpeg"):
                    image_type = "image/jpeg"
                curve = ai_service.read_retention_chart(image_bytes, image_type)
                if not curve.readable or curve.drop_second is None:
                    _fail(analysis_id, video["id"], "Não conseguimos ler o print. Envie o print da curva de retenção do Instagram Insights — a tela com o gráfico que cai ao longo do vídeo.")
                    return

                duration = signals.duration_seconds
                drop_at = round(max(0.0, min(duration, curve.drop_second)), 1)
                points = _clean_curve(curve, duration)
                retained_before = round(curve.retained_before_drop if curve.retained_before_drop is not None else _retained_at(points, drop_at, 100.0))
                retained_after = round(curve.retained_after_drop if curve.retained_after_drop is not None else _retained_at(points, drop_at + PREDICTION_OFFSET_SECONDS, retained_before))
                phrase = align_phrase(transcript, drop_at)

                # ---- 3. diagnosticando
                db.update_analysis(analysis_id, {"step": "diagnosing"})
                target_second = round(min(duration, drop_at + PREDICTION_OFFSET_SECONDS), 1)
                baseline = float(retained_after)
                frames = extract_frames(source, [max(0.0, drop_at - 1), drop_at, min(duration - 0.1, drop_at + 1)], work)
                context = {
                    "language": transcript.language,
                    "duration_seconds": round(duration, 1),
                    "drop": {"at_seconds": drop_at, "retained_before": retained_before, "retained_after": retained_after},
                    "phrase_at_drop": phrase,
                    "creator_hypothesis": video.get("hypothesis"),
                    "prediction_target": {"at_second": target_second, "baseline_retention": baseline},
                }
                diagnosis = ai_service.diagnose(context, _decode_frames(frames))

                # ---- 4. copiloto de edição: o vídeo inteiro, não só a queda.
                # Se falhar, a análise continua sem ele — a queda e as reescritas já valem sozinhas.
                copilot_context = {
                    "language": transcript.language,
                    "duration_seconds": round(duration, 1),
                    "transcript": [s.model_dump() for s in transcript.segments],
                    "silences": signals.silences,
                    "scene_cuts": signals.scene_cuts,
                    "retention_curve": points,
                    "drop_at_seconds": drop_at,
                }
                copilot_frames = extract_frames(source, frame_times(duration)[:COPILOT_MAX_FRAMES], work)
                try:
                    copilot = ai_service.copilot(copilot_context, _decode_frames(copilot_frames))
                except ai_service.AIServiceError as exc:
                    logger.warning("copilot skipped for analysis %s: %s", analysis_id, exc.message)
                    copilot = None

            predicted = round(max(baseline + 1.0, min(100.0, diagnosis.prediction.predicted_retention)))
            result = {
                "language": transcript.language,
                "drop": {"at_seconds": drop_at, "retained_before": retained_before, "retained_after": retained_after},
                "curve": points,
                "transcript": [s.model_dump() for s in transcript.segments],
                "phrase": phrase,
                "diagnosis": diagnosis.diagnosis.strip(),
                "rewrites": [r.model_dump() for r in diagnosis.rewrites],
                "prediction": {"at_second": target_second, "baseline": baseline, "predicted": predicted, "statement": diagnosis.prediction.statement.strip()},
                "copilot": copilot.model_dump() if copilot else None,
                "hypothesis": video.get("hypothesis"),
                "signals": signals.as_dict(),
                "model": settings.gemini_model,
            }

            db.update_analysis(analysis_id, {"status": "completed", "step": None, "result": result, "error_message": None})
            db.update_video(video["id"], {"status": "analyzed", "duration_seconds": round(duration, 2)})
        except InvalidVideoError:
            _fail(analysis_id, video["id"], "Não conseguimos ler este vídeo. Ele pode estar corrompido — exporte novamente em MP4 e envie outra vez.")
        except ai_service.AIServiceError as exc:
            _fail(analysis_id, video["id"], exc.message)
        except db.SupabaseError:
            _fail(analysis_id, video["id"], "Não foi possível acessar os arquivos enviados. Tente novamente.")
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
