"""Business rules: register uploads, run the pipeline, expose analyses and the prediction loop.

Pipeline (three visible steps, stored in `analyses.step`):
  transcribing → the speech, with timestamps
  aligning     → the Insights screenshot, read into a curve; the phrase at the drop
                 (no screenshot: the AI picks the likely drop from the video itself)
  diagnosing   → why people left, three rewrites, a falsifiable prediction,
                 then the editing copilot (rhythm, hook, dead stretches, cuts)
"""

import base64
import logging
import re
import subprocess
import tempfile
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from app.core.config import ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES, get_settings
from app.core.errors import ApiError
from app.schemas.analysis import CurveReading, Transcript, TranscriptSegment
from app.services import ai_service, billing_service, followup_service, supabase_service as db
from app.services.video_processing import InvalidVideoError, extract_audio, extract_frames, extract_signals, frame_times

logger = logging.getLogger("publishub")

# Frames espalhados pelo vídeo inteiro que o copiloto de edição recebe.
COPILOT_MAX_FRAMES = 12

INTERRUPTED_MESSAGE = "A análise foi interrompida porque o servidor reiniciou. Clique em “Tentar novamente”."
_UUID = r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
_VIDEO_PATH_RE = re.compile(rf"^(?P<owner>{_UUID})/{_UUID}\.(mp4|mov|webm)$")
_IMAGE_PATH_RE = re.compile(rf"^(?P<owner>{_UUID})/{_UUID}\.(png|jpg|jpeg|webp)$")
# O convidado não tem pasta própria no bucket: o backend assina o envio em guest/<sessão>/.
_GUEST_VIDEO_PATH_RE = re.compile(rf"^guest/(?P<owner>{_UUID})/{_UUID}\.(mp4|mov|webm)$")

# A previsão mira o segundo em que a queda já terminou (a queda leva ~2 s).
PREDICTION_OFFSET_SECONDS = 2.0

# Previsão cega: a aposta é no segundo da queda, e o Insights nunca marca o instante
# exato. Errar por até um segundo é acerto — é o que "±1 s" significa no placar.
BLIND_TOLERANCE_SECONDS = 1.0

_slots: threading.Semaphore | None = None


@contextmanager
def _timed(label: str, analysis_id: str):
    """Cronometra uma etapa no log: é o que diz onde a análise demora de verdade."""
    started = time.monotonic()
    try:
        yield
    finally:
        logger.info("analysis %s: %s levou %.1fs", analysis_id, label, time.monotonic() - started)


def _together(analysis_id: str, **tasks):
    """Roda em paralelo coisas que não dependem umas das outras (chamadas de IA, ffmpeg).

    Devolve {nome: valor} ou, no lugar do valor, a exceção — quem chamou decide o que
    fazer com cada uma, exatamente como faria se tivesse chamado em sequência.
    """
    if len(tasks) == 1:
        name, fn = next(iter(tasks.items()))
        try:
            return {name: fn()}
        except Exception as exc:
            return {name: exc}
    started = time.monotonic()
    with ThreadPoolExecutor(max_workers=len(tasks)) as pool:
        futures = {name: pool.submit(fn) for name, fn in tasks.items()}
        out = {}
        for name, future in futures.items():
            try:
                out[name] = future.result()
            except Exception as exc:  # devolvida, não levantada: a ordem das checagens é de quem chamou
                out[name] = exc
    logger.info("analysis %s: %s em paralelo levaram %.1fs", analysis_id, "+".join(tasks), time.monotonic() - started)
    return out


def _raise_if_error(value):
    if isinstance(value, BaseException):
        raise value
    return value


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


def register_video(actor, storage_path: str, filename: str, insights_path: str | None, hypothesis: str | None) -> dict:
    """Validates the uploaded video (and the Insights screenshot, when sent) and queues the analysis.

    `actor` é uma conta ou uma sessão de convidado (previsão cega sem cadastro).
    O convidado manda só o vídeo: o print entra depois de criar a conta.
    """
    settings = get_settings()
    if actor.is_guest:
        if insights_path:
            raise ApiError(400, "GUEST_NO_INSIGHTS", "O print entra na análise completa, depois de criar a sua conta.")
        video_match = _GUEST_VIDEO_PATH_RE.match(storage_path)
    else:
        billing_service.ensure_can_upload(actor.user)  # uploads grátis usados e sem Lifetime → 402
        video_match = _VIDEO_PATH_RE.match(storage_path)

    owner = actor.guest_id if actor.is_guest else actor.user_id
    if not video_match:
        raise ApiError(400, "INVALID_FILE", "Caminho de arquivo inválido. Envie o vídeo novamente.")
    if video_match.group("owner") != owner:
        raise ApiError(403, "FORBIDDEN", "Este arquivo não pertence à sua conta.")
    if insights_path:
        image_match = _IMAGE_PATH_RE.match(insights_path)
        if not image_match:
            raise ApiError(400, "INVALID_IMAGE", "Caminho do print inválido. Envie o print novamente.")
        if image_match.group("owner") != owner:
            raise ApiError(403, "FORBIDDEN", "Este arquivo não pertence à sua conta.")
    if db.storage_path_in_use(storage_path) or (insights_path and db.insights_path_in_use(insights_path)):
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

    if insights_path:
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
            "user_id": actor.user_id,
            "guest_id": actor.guest_id,
            "filename": _clean_filename(filename),
            "storage_path": storage_path,
            "insights_path": insights_path,
            "hypothesis": (hypothesis or "").strip()[:500] or None,
            "size_bytes": info["size"],
            "mime_type": info["content_type"],
            "status": "uploaded",
        }
    )
    analysis = db.insert_analysis(video["id"], actor.user_id, actor.guest_id)
    return {"video": video, "analysis": analysis}


def list_user_videos(user: dict) -> list[dict]:
    items = []
    for video in db.list_videos(user["id"]):
        analyses = sorted(video.pop("analyses") or [], key=lambda a: a["created_at"], reverse=True)
        items.append({**video, "analysis": analyses[0] if analyses else None})
    return items


# ---------------------------------------------------------------- analyses


def accuracy(user: dict) -> dict:
    """Os dois placares: o segundo da previsão cega e a retenção prevista para depois de regravar."""
    counts = db.count_outcomes(user["id"])
    total = counts["confirmed"] + counts["refuted"]
    blind = db.count_blind_responses(user["id"])
    blind_total = blind["hits"] + blind["misses"]
    return {
        **counts,
        "total": total,
        "rate": round(counts["confirmed"] / total * 100) if total else None,
        "blind": {**blind, "total": blind_total, "rate": round(blind["hits"] / blind_total * 100) if blind_total else None},
    }


def _number(value) -> float | None:
    """numeric do Postgres chega como número ou string, dependendo do driver."""
    return None if value is None else round(float(value), 2)


def _blind(analysis: dict) -> dict | None:
    """A aposta cega: o segundo, a frase e o que a pessoa respondeu depois de abrir o Insights."""
    at_seconds = _number(analysis.get("blind_at_seconds"))
    if at_seconds is None:
        return None
    return {
        "at_seconds": at_seconds,
        "phrase": analysis.get("blind_phrase"),
        "shown_at": analysis.get("blind_shown_at"),
        "response": analysis.get("blind_response"),
        "actual_seconds": _number(analysis.get("blind_actual_seconds")),
        "hit": analysis.get("blind_hit"),
        "responded_at": analysis.get("blind_responded_at"),
        "tolerance_seconds": BLIND_TOLERANCE_SECONDS,
    }


# Quantas reescritas o produto entrega — usado para desenhar o lugar delas
# quando a análise está bloqueada e o número real ainda não existe.
REWRITES_PER_ANALYSIS = 3


def _locked(result: dict | None, *, blind_only: bool) -> dict:
    """O que está atrás da porta, para a tela desenhar o lugar certo desfocado."""
    count = len((result or {}).get("rewrites") or []) or REWRITES_PER_ANALYSIS
    return {"analysis": blind_only, "rewrites": count, "copilot": True}


def _serialize(analysis: dict, *, unlocked: bool = True, blind_only: bool = False) -> dict:
    """`unlocked`: conta com Lifetime, vê tudo. `blind_only`: convidado, vê só a aposta.

    O que é pago não sai do servidor: as reescritas e o copiloto são removidos aqui,
    não escondidos com CSS.
    """
    settings = get_settings()
    video = analysis.pop("videos") or {}
    failure = (analysis.get("result") or {}).get("error") if analysis["status"] == "failed" else None
    result = None if analysis["status"] == "failed" else analysis["result"]
    locked = None
    if result is not None and blind_only:
        locked, result = _locked(result, blind_only=True), None
    elif result is not None and not unlocked:
        locked = _locked(result, blind_only=False)
        result = {**result, "rewrites": [], "copilot": None}
    return {
        "id": analysis["id"],
        "status": analysis["status"],
        "step": analysis.get("step"),
        "outcome": analysis.get("outcome") or "pending",
        # sai antes de a análise terminar: a aposta aparece enquanto o resto roda
        "blind": _blind(analysis),
        "actual_retention": analysis.get("actual_retention"),
        "outcome_recorded_at": analysis.get("outcome_recorded_at"),
        "error_message": analysis["error_message"],
        # falhas guardam {"error": {code, params}} em result; o site escreve a mensagem no idioma dele
        "error_code": failure.get("code") if failure else None,
        "error_params": (failure.get("params") or {}) if failure else None,
        "result": result,
        # null quando a conta vê tudo; senão diz o que falta e quantos cartões desenhar
        "locked": locked,
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
            "has_insights": bool(video.get("insights_path")),
        },
    }


def get_actor_analysis(actor, analysis_id: str) -> dict:
    """A análise de quem pediu — conta ou convidado. De outro dono, 404.

    O convidado recebe a aposta e nada mais: a análise inteira é o que se ganha
    ao criar a conta. Na conta grátis saem as reescritas e o copiloto, que são do
    Lifetime.
    """
    analysis = _owned(actor, analysis_id)
    if actor.is_guest:
        return _serialize(analysis, blind_only=True)
    return _serialize(analysis, unlocked=billing_service.has_full_access(actor.user))


def _owned(actor, analysis_id: str) -> dict:
    analysis = db.get_analysis(analysis_id, user_id=actor.user_id, guest_id=actor.guest_id) if is_uuid(analysis_id) else None
    if not analysis:
        raise ApiError(404, "NOT_FOUND", "Análise não encontrada.")
    return analysis


def record_blind_response(actor, analysis_id: str, response: str, actual_seconds: float | None) -> dict:
    """"Acertou" / "errou, foi em X": fecha a previsão cega e alimenta o placar.

    Errar por até BLIND_TOLERANCE_SECONDS conta como acerto, mesmo quando a pessoa
    clica em "errou": quem decide é a distância, não o botão.
    """
    analysis = _owned(actor, analysis_id)
    predicted = _number(analysis.get("blind_at_seconds"))
    if predicted is None:
        raise ApiError(409, "NO_BLIND_PREDICTION", "A previsão ainda não saiu. Espere a análise terminar.")
    if analysis.get("blind_response"):
        raise ApiError(409, "BLIND_ALREADY_ANSWERED", "Você já respondeu a esta previsão.")

    if response == "hit":
        actual, hit = predicted, True
    else:
        if actual_seconds is None:
            raise ApiError(422, "MISSING_SECOND", "Diga em que segundo a queda aconteceu.")
        duration = _number((analysis.get("videos") or {}).get("duration_seconds"))
        actual = round(min(actual_seconds, duration) if duration else actual_seconds, 2)
        hit = abs(actual - predicted) <= BLIND_TOLERANCE_SECONDS

    responded_at = datetime.now(timezone.utc).isoformat()
    db.update_analysis(
        analysis_id,
        {"blind_response": response, "blind_actual_seconds": actual, "blind_hit": hit, "blind_responded_at": responded_at},
    )
    return {
        "id": analysis_id,
        "blind": {"at_seconds": predicted, "response": response, "actual_seconds": actual, "hit": hit, "responded_at": responded_at, "tolerance_seconds": BLIND_TOLERANCE_SECONDS},
        "accuracy": accuracy(actor.user) if actor.user else None,
    }


def record_outcome(user: dict, analysis_id: str, actual_retention: float) -> dict:
    """The creator republished and pasted the real number: the prediction gets its verdict."""
    analysis = db.get_analysis(analysis_id, user["id"]) if is_uuid(analysis_id) else None
    if not analysis:
        raise ApiError(404, "NOT_FOUND", "Análise não encontrada.")
    result = analysis.get("result") or {}
    if analysis["status"] == "completed" and result.get("retention_source") == "estimated":
        raise ApiError(409, "NO_PREDICTION", "Esta análise foi feita sem o print da retenção, então não tem previsão para conferir.")
    prediction = result.get("prediction")
    if analysis["status"] != "completed" or not prediction:
        raise ApiError(409, "NOT_READY", "A previsão só pode ser conferida depois que a análise terminar.")

    outcome = "confirmed" if actual_retention >= prediction["predicted"] else "refuted"
    recorded_at = datetime.now(timezone.utc).isoformat()
    db.update_analysis(analysis_id, {"outcome": outcome, "actual_retention": round(actual_retention, 2), "outcome_recorded_at": recorded_at})
    # o número real chegou: o lembrete de 72 h não precisa mais sair
    followup_service.cancel(analysis_id)
    return {"id": analysis_id, "outcome": outcome, "actual_retention": round(actual_retention, 2), "outcome_recorded_at": recorded_at, "accuracy": accuracy(user)}


def schedule_followup(user: dict, analysis_id: str, republish_on, ui_locale: str | None) -> dict:
    """"Quando você vai republicar?": agenda o e-mail que pede a retenção real."""
    analysis = db.get_analysis(analysis_id, user["id"]) if is_uuid(analysis_id) else None
    if not analysis:
        raise ApiError(404, "NOT_FOUND", "Análise não encontrada.")
    return {"followup": followup_service.schedule(user, analysis, republish_on, ui_locale)}


def get_followup(user: dict, analysis_id: str) -> dict:
    analysis = db.get_analysis(analysis_id, user["id"]) if is_uuid(analysis_id) else None
    if not analysis:
        raise ApiError(404, "NOT_FOUND", "Análise não encontrada.")
    return {"followup": followup_service.for_analysis(analysis_id)}


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


def _phrase_at(transcript: Transcript, index: int) -> dict:
    """The segment at `index`, with the lines spoken right before and after it."""
    segments = transcript.segments
    chosen = segments[index]
    return {
        "start_seconds": round(chosen.start_seconds, 2),
        "end_seconds": round(chosen.end_seconds, 2),
        "text": chosen.text.strip(),
        "before": segments[index - 1].text.strip() if index > 0 else "",
        "after": segments[index + 1].text.strip() if index + 1 < len(segments) else "",
    }


def align_phrase(transcript: Transcript, drop_second: float) -> dict:
    """The segment being spoken when the audience left, with its neighbours.

    The chart reading is approximate (±1 s), so a segment that contains the
    second wins; otherwise the nearest one by its middle.
    """
    segments = transcript.segments
    containing = [s for s in segments if s.start_seconds <= drop_second <= s.end_seconds]
    chosen: TranscriptSegment = containing[0] if containing else min(segments, key=lambda s: abs((s.start_seconds + s.end_seconds) / 2 - drop_second))
    return _phrase_at(transcript, segments.index(chosen))


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


def _fail(analysis_id: str, video_id: str | None, message: str, code: str = "generic", params: dict | None = None) -> None:
    """Marks the analysis failed. `message` (pt-BR) stays for old clients; `code` + `params` let the site show it in its own language.

    `video_id` pode ser None: falhar a análise é o que importa, e é justamente
    quando não se tem o vídeo que não dá para deixar isto estourar.
    """
    try:
        db.update_analysis(analysis_id, {"status": "failed", "step": None, "error_message": message, "result": {"error": {"code": code, "params": params or {}}}})
        if video_id:
            db.update_video(video_id, {"status": "failed"})
    except Exception:
        logger.exception("could not mark analysis %s as failed", analysis_id)


# Cortes medidos: o que o ffmpeg já mediu no arquivo vira sugestão quando a IA não responde.
MEASURED_PAUSE_SECONDS = 0.8
MEASURED_STATIC_SHOT_SECONDS = 8.0


def measured_copilot(signals, transcript: Transcript, duration: float) -> dict:
    """The copilot without AI: long pauses and long shots without a scene change, measured in the file.

    Items carry a code and numbers instead of text, so the site writes them in its own
    language. No quota, no network: the cuts section never comes back empty-handed.
    """
    cuts: list[dict] = []
    slow: list[dict] = []
    for pause in signals.silences:
        start, end = float(pause["start"]), float(pause["end"])
        length = round(end - start, 1)
        if length < MEASURED_PAUSE_SECONDS:
            continue
        if start <= 0.2:
            cuts.append({"at_seconds": 0.0, "end_seconds": round(end, 1), "action": "cortar", "why": None, "why_code": "dead_start", "params": {"seconds": length}})
        elif end >= duration - 0.2:
            cuts.append({"at_seconds": round(start, 1), "end_seconds": round(duration, 1), "action": "cortar", "why": None, "why_code": "dead_end", "params": {"seconds": length}})
        else:
            cuts.append({"at_seconds": round(start, 1), "end_seconds": round(end, 1), "action": "encurtar_pausa", "why": None, "why_code": "long_pause", "params": {"seconds": length}})
            if length >= 1.5:
                slow.append({"start_seconds": round(start, 1), "end_seconds": round(end, 1), "reason": None, "reason_code": "long_pause", "params": {"seconds": length}})

    bounds = [0.0, *sorted(float(t) for t in signals.scene_cuts if 0 < float(t) < duration), duration]
    for a, b in zip(bounds, bounds[1:]):
        if b - a >= MEASURED_STATIC_SHOT_SECONDS:
            length = round(b - a, 1)
            cuts.append({"at_seconds": round(a + (b - a) / 2, 1), "end_seconds": None, "action": "trocar_plano", "why": None, "why_code": "static_shot", "params": {"seconds": length}})
            slow.append({"start_seconds": round(a, 1), "end_seconds": round(b, 1), "reason": None, "reason_code": "static_shot", "params": {"seconds": length}})

    words = sum(len(s.text.split()) for s in transcript.segments)
    speaking = sum(max(0.0, s.end_seconds - s.start_seconds) for s in transcript.segments)
    wps = round(words / speaking, 1) if speaking else 0.0
    paused = sum(float(p["end"]) - float(p["start"]) for p in signals.silences)
    pause_pct = round(100 * paused / duration) if duration else 0
    pace = "lento" if wps < 2.0 or pause_pct >= 20 else "acelerado" if wps > 3.6 else "bom"
    return {
        "source": "measured",
        "pace": pace,
        "pace_note": None,
        "pace_note_code": "measured",
        "pace_params": {"wps": wps, "pause_pct": pause_pct},
        "hook_score": None,  # o gancho não dá para medir sem a IA
        "hook_note": None,
        "slow_stretches": sorted(slow, key=lambda s: s["start_seconds"])[: ai_service.MAX_SLOW_STRETCHES],
        "cuts": sorted(cuts, key=lambda c: c["at_seconds"])[: ai_service.MAX_CUTS],
        "summary": None,
        "summary_code": "measured",
    }


def _decode_frames(frames: list[dict]) -> list[dict]:
    return [{"time": f["time"], "jpeg": base64.b64decode(f["jpeg_base64"])} for f in frames]


def run_analysis(analysis_id: str, ui_language: str | None = None) -> None:
    """Background job: download → transcribe → (read the chart → diagnose | find the moment) → copilot → save. Never raises."""
    with _analysis_slots():
        try:
            analysis = db.get_analysis(analysis_id)
        except Exception:
            logger.exception("could not load analysis %s", analysis_id)
            return
        if not analysis or analysis["status"] != "pending":
            return
        video = analysis.get("videos")
        if not video:
            # Sem o arquivo não há o que analisar. Falhar aqui é obrigatório: foi
            # o que faltou quando o join de convidado voltou vazio e a análise
            # ficou presa em "transcrevendo" para sempre.
            logger.error("analysis %s has no video attached", analysis_id)
            _fail(analysis_id, None, "Não encontramos o vídeo desta análise. Envie o vídeo novamente.", "storage")
            return
        settings = get_settings()

        if not settings.ai_configured:
            _fail(analysis_id, video["id"], "A análise por IA ainda não está configurada neste servidor (GEMINI_API_KEY ausente).", "ai_not_configured")
            return

        started_at = time.monotonic()
        try:
            # ---- 1. transcrevendo
            db.update_analysis(analysis_id, {"status": "processing", "step": "transcribing"})
            db.update_video(video["id"], {"status": "processing"})

            with tempfile.TemporaryDirectory(prefix="publishub-") as tmp:
                work = Path(tmp)
                source = work / f"video.{ALLOWED_VIDEO_TYPES.get(video['mime_type'], 'mp4')}"
                with _timed("baixar o vídeo", analysis_id):
                    source.write_bytes(db.download_object(video["storage_path"]))

                # dois passes de ffmpeg sobre o mesmo arquivo, sem relação entre si
                with _timed("ffmpeg (sinais + áudio)", analysis_id):
                    prepared = _together(analysis_id, signals=lambda: extract_signals(source), audio=lambda: extract_audio(source, work))
                signals = _raise_if_error(prepared["signals"])
                if signals.duration_seconds > settings.max_video_duration_seconds:
                    minutes = settings.max_video_duration_seconds // 60
                    _fail(analysis_id, video["id"], f"Nesta versão analisamos vídeos de até {minutes} minutos.", "video_too_long", {"minutes": minutes})
                    return
                audio = _raise_if_error(prepared["audio"]) if signals.has_audio else None
                if audio is None:
                    _fail(analysis_id, video["id"], "Este vídeo não tem áudio. O Publishub analisa o que você fala. Envie um vídeo com fala.", "no_audio")
                    return

                duration = signals.duration_seconds
                # os frames do vídeo inteiro (para o copiloto) não dependem de nada: saem junto com a transcrição
                spread_times = frame_times(duration)[:COPILOT_MAX_FRAMES]
                chart = None
                first_round = {
                    "transcript": lambda: ai_service.transcribe(audio.read_bytes()),
                    "spread_frames": lambda: _decode_frames(extract_frames(source, spread_times, work)),
                }
                if video.get("insights_path"):
                    # ler o print não precisa da transcrição: vai na mesma rodada
                    def read_chart():
                        image_bytes = db.download_object(video["insights_path"], bucket=settings.insights_bucket)
                        image_type = next((mime for mime, ext in ALLOWED_IMAGE_TYPES.items() if video["insights_path"].lower().endswith(ext)), "image/png")
                        if video["insights_path"].lower().endswith(".jpeg"):
                            image_type = "image/jpeg"
                        return ai_service.read_retention_chart(image_bytes, image_type)

                    first_round["chart"] = read_chart

                done = _together(analysis_id, **first_round)
                transcript = _raise_if_error(done["transcript"])
                if not transcript.has_speech or not transcript.segments:
                    _fail(analysis_id, video["id"], "Não encontramos fala neste vídeo. O Publishub analisa o que você diz. Envie um vídeo em que você fala.", "no_speech")
                    return
                spread_frames = _raise_if_error(done["spread_frames"])
                if "chart" in done:
                    chart = _raise_if_error(done["chart"])

                segments = [s.model_dump() for s in transcript.segments]

                def copilot_context_for(curve_points, drop_at):
                    return {
                        "language": transcript.language,
                        "ui_language": ui_language or transcript.language,
                        "duration_seconds": round(duration, 1),
                        "transcript": segments,
                        "silences": signals.silences,
                        "scene_cuts": signals.scene_cuts,
                        "retention_curve": curve_points,
                        "drop_at_seconds": drop_at,
                    }

                copilot_outcome = None  # com print, o copiloto roda junto do diagnóstico

                if chart is not None:
                    # ---- 2. alinhando com a retenção: o print do Insights diz onde a audiência saiu
                    db.update_analysis(analysis_id, {"step": "aligning"})
                    curve = chart
                    if not curve.readable or curve.drop_second is None:
                        _fail(analysis_id, video["id"], "Não conseguimos ler o print. Envie o print da curva de retenção do Instagram Insights: a tela com o gráfico que cai ao longo do vídeo.", "chart_unreadable")
                        return

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
                        "ui_language": ui_language or transcript.language,
                        "duration_seconds": round(duration, 1),
                        "drop": {"at_seconds": drop_at, "retained_before": retained_before, "retained_after": retained_after},
                        "phrase_at_drop": phrase,
                        "creator_hypothesis": video.get("hypothesis"),
                        "prediction_target": {"at_second": target_second, "baseline_retention": baseline},
                    }
                    second_round = _together(
                        analysis_id,
                        diagnosis=lambda: ai_service.diagnose(context, _decode_frames(frames)),
                        copilot=lambda: ai_service.copilot(copilot_context_for(points, drop_at), spread_frames),
                    )
                    diagnosis = _raise_if_error(second_round["diagnosis"])
                    copilot_outcome = second_round["copilot"]
                    predicted = round(max(baseline + 1.0, min(100.0, diagnosis.prediction.predicted_retention)))
                    retention = {
                        "retention_source": "insights",
                        "drop": {"at_seconds": drop_at, "retained_before": retained_before, "retained_after": retained_after},
                        "curve": points,
                        "prediction": {"at_second": target_second, "baseline": baseline, "predicted": predicted, "statement": diagnosis.prediction.statement.strip()},
                    }
                    diagnosis_text, rewrites = diagnosis.diagnosis.strip(), diagnosis.rewrites
                else:
                    # ---- 2. sem print: a IA aponta, pelo próprio vídeo, o momento com mais chance de perder gente
                    db.update_analysis(analysis_id, {"step": "aligning"})
                    moment = ai_service.find_moment(
                        {
                            "language": transcript.language,
                            "ui_language": ui_language or transcript.language,
                            "duration_seconds": round(duration, 1),
                            "transcript": [{"index": i, **segment} for i, segment in enumerate(segments)],
                            "silences": signals.silences,
                            "scene_cuts": signals.scene_cuts,
                            "creator_hypothesis": video.get("hypothesis"),
                        },
                        spread_frames,
                    )
                    index = max(0, min(len(transcript.segments) - 1, moment.segment_index))
                    phrase = _phrase_at(transcript, index)
                    drop_at = round(max(0.0, min(duration, transcript.segments[index].start_seconds)), 1)
                    retention = {
                        "retention_source": "estimated",
                        "drop": {"at_seconds": drop_at, "retained_before": None, "retained_after": None, "reason": moment.reason.strip()},
                        "curve": None,
                        "prediction": None,  # sem a curva não há % de partida para apostar
                    }
                    diagnosis_text, rewrites = moment.diagnosis.strip(), moment.rewrites
                    # A aposta cega é gravada agora, não no fim: a tela mostra o segundo e a
                    # frase enquanto o copiloto ainda está rodando.
                    db.update_analysis(
                        analysis_id,
                        {
                            "step": "diagnosing",
                            "blind_at_seconds": drop_at,
                            "blind_phrase": phrase["text"],
                            "blind_shown_at": datetime.now(timezone.utc).isoformat(),
                        },
                    )

                # ---- 4. copiloto de edição: o vídeo inteiro, não só a queda.
                # Se a IA não responder, os cortes vêm medidos do arquivo: eles nunca somem.
                # Com print ele já rodou junto do diagnóstico; sem print, depende do momento
                # que a IA acabou de apontar, então roda agora.
                if copilot_outcome is None:
                    with _timed("copiloto", analysis_id):
                        copilot_outcome = _together(analysis_id, copilot=lambda: ai_service.copilot(copilot_context_for(retention["curve"], drop_at), spread_frames))["copilot"]
                if isinstance(copilot_outcome, ai_service.AIServiceError):
                    logger.warning("AI copilot unavailable for analysis %s (%s); using measured cuts", analysis_id, copilot_outcome.message)
                    copilot = measured_copilot(signals, transcript, duration)
                else:
                    copilot = {**_raise_if_error(copilot_outcome).model_dump(), "source": "ai"}

            result = {
                "language": transcript.language,
                # a fala fica no idioma do vídeo; as explicações, no idioma do site de quem pediu
                "explanations_language": ui_language or transcript.language,
                **retention,
                "transcript": segments,
                "phrase": phrase,
                "diagnosis": diagnosis_text,
                "rewrites": [r.model_dump() for r in rewrites],
                "copilot": copilot,
                "hypothesis": video.get("hypothesis"),
                "signals": signals.as_dict(),
                "model": settings.gemini_model,
            }

            db.update_analysis(analysis_id, {"status": "completed", "step": None, "result": result, "error_message": None})
            db.update_video(video["id"], {"status": "analyzed", "duration_seconds": round(duration, 2)})
            logger.info("analysis %s: pronta em %.1fs (vídeo de %.1fs, %s print)", analysis_id, time.monotonic() - started_at, duration, "com" if chart is not None else "sem")
        except InvalidVideoError:
            _fail(analysis_id, video["id"], "Não conseguimos ler este vídeo. Ele pode estar corrompido. Exporte novamente em MP4 e envie outra vez.", "invalid_video")
        except ai_service.AIServiceError as exc:
            _fail(analysis_id, video["id"], exc.message, exc.code)
        except db.SupabaseError:
            _fail(analysis_id, video["id"], "Não foi possível acessar os arquivos enviados. Tente novamente.", "storage")
        except subprocess.TimeoutExpired:
            _fail(analysis_id, video["id"], "O processamento do vídeo demorou demais. Tente um vídeo mais curto.", "timeout")
        except Exception:
            logger.exception("analysis %s failed", analysis_id)
            _fail(analysis_id, video.get("id"), "Algo deu errado ao analisar o vídeo. Tente novamente.", "generic")


def recover_interrupted() -> None:
    """Called at startup: work left unfinished by a previous process can't resume."""
    count = db.fail_unfinished_analyses(INTERRUPTED_MESSAGE)
    if count:
        logger.warning("marked %s interrupted analysis(es) as failed", count)
