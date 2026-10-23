"""As ferramentas grátis, sem conta: a porta de quem chega pelo Google.

  - Leitor da curva de retenção: o print do Instagram Insights vira "você perdeu
    32% no segundo 4". É a mesma leitura que a análise completa faz.
  - Nota do gancho: a frase de abertura vira uma nota de 0 a 10, o porquê e três
    versões melhores. Só texto, a chamada mais barata da IA.
  - Hook Lab: a abertura de um vídeo (da transcrição de uma análise pronta, ou
    colada) vira os pontos fracos dela e cinco aberturas novas, uma por ângulo,
    que dá para gerar de novo ou ajustar. Também só texto.

Cada uma termina no mesmo lugar: "agora descubra qual frase causou isso" → /try.

Custo controlado sem cadastro, do mesmo jeito que o teste grátis: o IP entra só
como sha256(ip + sal) num contador em memória (o backend roda num processo só;
reiniciar zera, e tudo bem). Um teto diário global segura o pior caso. O Hook
Lab tem o contador dele (gerar de novo e ajustar também contam), e quem paga
(billing_service.has_full_access) não passa por limite nenhum.
"""

import base64
import binascii
import hashlib
import logging
import threading
import time
from collections import deque

from app.core.config import ALLOWED_IMAGE_TYPES, get_settings
from app.core.errors import ApiError
from app.schemas.analysis import HOOK_CATEGORIES, HookAlternative
from app.services import ai_service, analysis_service, billing_service, events_service

logger = logging.getLogger("publishub")

WINDOW_SECONDS = 24 * 3600
HOOK_MIN_CHARS = 3
HOOK_MAX_CHARS = 300

# Hook Lab
LAB_OPENING_MIN = 3
LAB_OPENING_MAX = 300
LAB_CONTEXT_MAX = 4000  # o bastante para o assunto, sem mandar uma palestra para a IA
LAB_INSTRUCTION_MAX = 200
LAB_AVOID_MAX = 10
LAB_OPENING_SECONDS = 6.0  # da transcrição, a abertura é o que é dito até aqui
LAB_OPENING_SEGMENTS = 3

_lock = threading.Lock()
# por contador ("tools" e "lab"): os usos de cada IP e os do dia
_by_ip: dict[str, dict[str, deque[float]]] = {}
_all: dict[str, deque[float]] = {}


def _hash(ip: str) -> str:
    return hashlib.sha256(f"{get_settings().guest_hash_salt}:tools:{ip}".encode()).hexdigest()


def _limits(bucket: str) -> tuple[int, int]:
    settings = get_settings()
    if bucket == "lab":
        return settings.hook_lab_per_ip_per_day, settings.hook_lab_daily_cap
    return settings.tools_per_ip_per_day, settings.tools_daily_cap


def _take(ip: str, bucket: str = "tools") -> None:
    """Gasta um uso deste IP (e do dia). Passou do limite: 429, sem chamar a IA."""
    per_ip, cap = _limits(bucket)
    now = time.monotonic()
    key = _hash(ip)
    with _lock:
        todos = _all.setdefault(bucket, deque())
        while todos and now - todos[0] > WINDOW_SECONDS:
            todos.popleft()
        usos = _by_ip.setdefault(bucket, {}).setdefault(key, deque())
        while usos and now - usos[0] > WINDOW_SECONDS:
            usos.popleft()
        if len(todos) >= cap:
            logger.warning("free tools daily cap reached (%s: %s)", bucket, cap)
            raise ApiError(429, "TOOLS_BUSY", "As ferramentas grátis chegaram ao limite de hoje. Tente amanhã, ou analise o vídeo inteiro de graça.")
        if len(usos) >= per_ip:
            raise ApiError(429, "TOOLS_LIMIT", "Você já usou as ferramentas grátis hoje. Analise o vídeo inteiro de graça para continuar.")
        usos.append(now)
        todos.append(now)


def _give_back(ip: str, bucket: str = "tools") -> None:
    """A IA falhou: o uso não conta (a pessoa não recebeu nada)."""
    key = _hash(ip)
    with _lock:
        usos = _by_ip.get(bucket, {}).get(key)
        if usos:
            usos.pop()
        if _all.get(bucket):
            _all[bucket].pop()


def reset() -> None:
    """Zera os contadores (testes)."""
    with _lock:
        _by_ip.clear()
        _all.clear()


def _image(data_b64: str, mime_type: str) -> bytes:
    if mime_type not in ALLOWED_IMAGE_TYPES:
        raise ApiError(400, "INVALID_IMAGE", "Envie o print como PNG, JPG ou WEBP.")
    try:
        raw = base64.b64decode(data_b64.split(",", 1)[-1], validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ApiError(400, "INVALID_IMAGE", "Não conseguimos ler esta imagem.") from exc
    if len(raw) > get_settings().max_image_bytes:
        raise ApiError(413, "IMAGE_TOO_LARGE", "O print é grande demais.")
    # o conteúdo tem de ser a imagem que diz ser, não só o rótulo
    real = raw[:8] == b"\x89PNG\r\n\x1a\n" or raw[:3] == b"\xff\xd8\xff" or (raw[:4] == b"RIFF" and raw[8:12] == b"WEBP")
    if not real:
        raise ApiError(400, "INVALID_IMAGE", "Este arquivo não parece um print (PNG, JPG ou WEBP).")
    return raw


def _ai(ip: str, call, *, bucket: str = "tools", limited: bool = True):
    if limited:
        _take(ip, bucket)
    try:
        return call()
    except ai_service.AINotConfiguredError as exc:
        if limited:
            _give_back(ip, bucket)
        raise ApiError(503, "SERVICE_UNAVAILABLE", "A IA ainda não foi configurada neste servidor.") from exc
    except ai_service.AIServiceError as exc:
        if limited:
            _give_back(ip, bucket)
        raise ApiError(502, "AI_ERROR", str(exc) or "A IA não respondeu agora. Tente novamente.") from exc


def read_curve(ip: str, image_base64: str, mime_type: str) -> dict:
    """O print da curva de retenção → onde e quanto a audiência caiu."""
    raw = _image(image_base64, mime_type)
    reading = _ai(ip, lambda: ai_service.read_retention_chart(raw, mime_type))
    readable = bool(reading.readable and reading.drop_second is not None)
    before, after = reading.retained_before_drop, reading.retained_after_drop
    events_service.record_for_user(None, "tool_used", props={"tool": "curve", "readable": readable})
    if not readable:
        return {"readable": False, "drop_second": None, "retained_before": None, "retained_after": None, "lost_points": None, "points": []}
    return {
        "readable": True,
        "drop_second": round(float(reading.drop_second), 1),
        "retained_before": before,
        "retained_after": after,
        "lost_points": round(before - after, 1) if before is not None and after is not None else None,
        "points": [[float(p[0]), float(p[1])] for p in reading.points if len(p) >= 2][:200],
    }


def score_hook(ip: str, hook: str, locale: str | None) -> dict:
    """A frase de abertura → nota, o porquê e três versões melhores."""
    texto = " ".join((hook or "").split())
    if not HOOK_MIN_CHARS <= len(texto) <= HOOK_MAX_CHARS:
        raise ApiError(400, "INVALID_HOOK", f"Escreva a frase de abertura (até {HOOK_MAX_CHARS} caracteres).")
    result = _ai(ip, lambda: ai_service.score_hook(texto, locale))
    events_service.record_for_user(None, "tool_used", props={"tool": "hook", "score": result.score})
    return {"score": result.score, "verdict": result.verdict, "rewrites": [r.model_dump() for r in result.rewrites]}


# ---------------------------------------------------------------- Hook Lab


def _clean(text: str | None) -> str:
    return " ".join((text or "").split())


def _limited(actor) -> bool:
    """Quem paga não tem limite; o resto (conta grátis ou convidado ou ninguém) tem o do Hook Lab."""
    user = getattr(actor, "user", None) if actor else None
    return not (user and billing_service.has_full_access(user))


def _avoid(items: list[str] | None) -> list[str]:
    return [t for t in (_clean(i)[:LAB_OPENING_MAX] for i in (items or [])[:LAB_AVOID_MAX]) if t]


def _lab_payload(result, *, source: str, opening: dict, context: str | None, language: str | None, audit_hook: dict | None = None) -> dict:
    return {
        "source": source,
        "language": language,
        "opening": opening,
        # o que a rodada usou como assunto: volta no "ajustar", para a abertura nova falar do mesmo vídeo
        "context": context,
        "summary": result.original_summary,
        "weaknesses": result.weaknesses,
        "alternatives": [a.model_dump() for a in result.alternatives],
        "audit_hook": audit_hook,
    }


def hook_lab(ip: str, opening: str, context: str | None, locale: str | None, avoid: list[str] | None = None, actor=None) -> dict:
    """Pela transcrição: a abertura colada (e o resto da fala, se houver) → pontos fracos e cinco aberturas."""
    texto = _clean(opening)
    if not LAB_OPENING_MIN <= len(texto) <= LAB_OPENING_MAX:
        raise ApiError(400, "INVALID_HOOK", f"Escreva o que é dito na abertura do vídeo (até {LAB_OPENING_MAX} caracteres).")
    assunto = _clean(context)[:LAB_CONTEXT_MAX] or None
    result = _ai(ip, lambda: ai_service.hook_lab(texto, assunto, language=None, ui_language=locale, avoid=_avoid(avoid)), bucket="lab", limited=_limited(actor))
    events_service.record_for_user(getattr(actor, "user_id", None), "tool_used", props={"tool": "hook_lab", "source": "transcript", "regenerated": bool(avoid)})
    return _lab_payload(result, source="transcript", opening={"text": texto, "start_seconds": None, "end_seconds": None}, context=assunto, language=None)


def _opening_of(segments: list[dict]) -> tuple[str, float, float]:
    """O que é dito nos primeiros segundos: os segmentos até LAB_OPENING_SECONDS (ao menos o primeiro)."""
    first = [s for s in segments if float(s.get("start_seconds") or 0) < LAB_OPENING_SECONDS][:LAB_OPENING_SEGMENTS] or segments[:1]
    text = _clean(" ".join(s.get("text") or "" for s in first))[:LAB_OPENING_MAX]
    return text, float(first[0].get("start_seconds") or 0), float(first[-1].get("end_seconds") or 0)


def hook_lab_for_analysis(ip: str, actor, analysis_id: str, locale: str | None, avoid: list[str] | None = None) -> dict:
    """De uma análise pronta (do dono): a abertura e o assunto saem da transcrição dela, com os segundos."""
    analysis = analysis_service._owned(actor, analysis_id)
    result = analysis.get("result") or {}
    if analysis.get("status") != "completed" or not result:
        raise ApiError(409, "ANALYSIS_NOT_READY", "A análise deste vídeo ainda não terminou.")
    segments = [s for s in (result.get("transcript") or []) if _clean(s.get("text"))]
    if not segments:
        raise ApiError(422, "NO_TRANSCRIPT", "Não encontramos fala neste vídeo. Cole o que é dito na abertura para gerar as aberturas.")
    texto, start, end = _opening_of(segments)
    assunto = _clean(" ".join(s.get("text") or "" for s in segments))[:LAB_CONTEXT_MAX]
    language = result.get("language")
    span = f"{start:.1f}s-{end:.1f}s"
    lab = _ai(ip, lambda: ai_service.hook_lab(texto, assunto, language=language, ui_language=locale, span=span, avoid=_avoid(avoid)), bucket="lab", limited=_limited(actor))
    copilot = result.get("copilot") or {}
    audit_hook = {"score": copilot.get("hook_score"), "note": copilot.get("hook_note")} if copilot.get("hook_score") is not None else None
    events_service.record_for_user(actor.user_id, "tool_used", analysis_id, {"tool": "hook_lab", "source": "analysis", "regenerated": bool(avoid)})
    return _lab_payload(lab, source="analysis", opening={"text": texto, "start_seconds": round(start, 1), "end_seconds": round(end, 1)}, context=assunto, language=language, audit_hook=audit_hook)


def refine_hook(ip: str, opening: str, context: str | None, hook: dict, instruction: str, locale: str | None, language: str | None = None, actor=None) -> dict:
    """Uma abertura sugerida ajustada ao pedido ("mais curta", "mais casual"…), na mesma categoria."""
    texto = _clean(opening)[:LAB_OPENING_MAX]
    pedido = _clean(instruction)
    if not texto or not 2 <= len(pedido) <= LAB_INSTRUCTION_MAX:
        raise ApiError(400, "INVALID_REFINE", f"Diga em poucas palavras como quer a abertura (até {LAB_INSTRUCTION_MAX} caracteres).")
    category = hook.get("category")
    if category not in HOOK_CATEGORIES or not _clean(hook.get("text")):
        raise ApiError(400, "INVALID_REFINE", "Escolha uma das aberturas sugeridas para ajustar.")
    pick = HookAlternative(category=category, text=_clean(hook.get("text"))[:LAB_OPENING_MAX], why="", on_screen_text="", delivery="")
    assunto = _clean(context)[:LAB_CONTEXT_MAX] or None
    result = _ai(ip, lambda: ai_service.refine_hook(texto, assunto, pick, pedido, language=language, ui_language=locale), bucket="lab", limited=_limited(actor))
    events_service.record_for_user(getattr(actor, "user_id", None), "tool_used", props={"tool": "hook_lab", "refined": True})
    return {"alternative": result.model_dump()}
