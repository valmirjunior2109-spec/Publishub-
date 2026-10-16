"""As ferramentas grátis, sem conta: a porta de quem chega pelo Google.

  - Leitor da curva de retenção: o print do Instagram Insights vira "você perdeu
    32% no segundo 4". É a mesma leitura que a análise completa faz.
  - Nota do gancho: a frase de abertura vira uma nota de 0 a 10, o porquê e três
    versões melhores. Só texto, a chamada mais barata da IA.

Cada uma termina no mesmo lugar: "agora descubra qual frase causou isso" → /try.

Custo controlado sem cadastro, do mesmo jeito que o teste grátis: o IP entra só
como sha256(ip + sal) num contador em memória (o backend roda num processo só;
reiniciar zera, e tudo bem). Um teto diário global segura o pior caso.
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
from app.services import ai_service, events_service

logger = logging.getLogger("publishub")

WINDOW_SECONDS = 24 * 3600
HOOK_MIN_CHARS = 3
HOOK_MAX_CHARS = 300

_lock = threading.Lock()
_by_ip: dict[str, deque[float]] = {}
_all: deque[float] = deque()


def _hash(ip: str) -> str:
    return hashlib.sha256(f"{get_settings().guest_hash_salt}:tools:{ip}".encode()).hexdigest()


def _take(ip: str) -> None:
    """Gasta um uso deste IP (e do dia). Passou do limite: 429, sem chamar a IA."""
    settings = get_settings()
    now = time.monotonic()
    key = _hash(ip)
    with _lock:
        while _all and now - _all[0] > WINDOW_SECONDS:
            _all.popleft()
        usos = _by_ip.setdefault(key, deque())
        while usos and now - usos[0] > WINDOW_SECONDS:
            usos.popleft()
        if len(_all) >= settings.tools_daily_cap:
            logger.warning("free tools daily cap reached (%s)", settings.tools_daily_cap)
            raise ApiError(429, "TOOLS_BUSY", "As ferramentas grátis chegaram ao limite de hoje. Tente amanhã, ou analise o vídeo inteiro de graça.")
        if len(usos) >= settings.tools_per_ip_per_day:
            raise ApiError(429, "TOOLS_LIMIT", "Você já usou as ferramentas grátis hoje. Analise o vídeo inteiro de graça para continuar.")
        usos.append(now)
        _all.append(now)


def _give_back(ip: str) -> None:
    """A IA falhou: o uso não conta (a pessoa não recebeu nada)."""
    key = _hash(ip)
    with _lock:
        if _by_ip.get(key):
            _by_ip[key].pop()
        if _all:
            _all.pop()


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


def _ai(ip: str, call):
    _take(ip)
    try:
        return call()
    except ai_service.AINotConfiguredError as exc:
        _give_back(ip)
        raise ApiError(503, "SERVICE_UNAVAILABLE", "A IA ainda não foi configurada neste servidor.") from exc
    except ai_service.AIServiceError as exc:
        _give_back(ip)
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
