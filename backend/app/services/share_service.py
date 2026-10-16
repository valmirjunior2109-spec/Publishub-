"""O resultado público de uma análise: o link que o criador compartilha.

Quem posta "meu Reel perdia gente no 0:04" nos Stories leva outros criadores ao
/try, sem a publishub precisar produzir conteúdo. Por isso o link existe, e por
isso ele mostra só o que dá vontade de testar no próprio vídeo:

  - o segundo da queda e a retenção antes e depois dele;
  - a frase dita naquele segundo;
  - o diagnóstico (o porquê).

Nunca sai daqui: o vídeo, o print, o plano de ação, as reescritas, o copiloto,
o nome do arquivo ou qualquer coisa de quem é a conta. O link só existe quando o
dono pede (`share`), e deixa de existir quando ele desliga (`unshare`).
"""

import logging
import re
import secrets
from datetime import datetime, timezone

from app.core.errors import ApiError
from app.services import events_service, supabase_service as db

logger = logging.getLogger("publishub")

# 12 caracteres url-safe: impossível de adivinhar, curto o bastante para colar.
_TOKEN_BYTES = 9
TOKEN_RE = re.compile(r"^[A-Za-z0-9_-]{8,32}$")


def _shareable(analysis: dict) -> dict:
    """O resultado da análise, se ela está pronta para virar link."""
    result = analysis.get("result") or {}
    if analysis.get("status") != "completed" or not result.get("drop") or not result.get("phrase"):
        raise ApiError(409, "NOT_READY", "Espere a análise terminar para compartilhar o resultado.")
    return result


def share(user: dict, analysis: dict) -> dict:
    """Liga o link público desta análise (o mesmo link, se já estava ligado)."""
    _shareable(analysis)
    token = analysis.get("share_token")
    if not token:
        token = secrets.token_urlsafe(_TOKEN_BYTES)
        db.set_share_token(analysis["id"], token, datetime.now(timezone.utc).isoformat())
        events_service.record_for_user(user["id"], "result_shared", analysis["id"])
        logger.info("analysis %s shared", analysis["id"])
    return {"token": token}


def unshare(user: dict, analysis: dict) -> dict:
    """Desliga o link: quem abrir de novo vê "não encontrado"."""
    if analysis.get("share_token"):
        db.set_share_token(analysis["id"], None, None)
        events_service.record_for_user(user["id"], "result_unshared", analysis["id"])
    return {"token": None}


def public(token: str) -> dict:
    """O que qualquer pessoa vê no link. Só o necessário para o cartão."""
    analysis = db.get_analysis_by_share_token(token) if TOKEN_RE.match(token or "") else None
    if not analysis:
        raise ApiError(404, "NOT_FOUND", "Este resultado não existe ou deixou de ser compartilhado.")
    result = _shareable(analysis)
    drop = result.get("drop") or {}
    phrase = result.get("phrase") or {}
    return {
        "token": token,
        "language": result.get("language"),
        "retention_source": result.get("retention_source") or "insights",
        "drop": {
            "at_seconds": drop.get("at_seconds"),
            "retained_before": drop.get("retained_before"),
            "retained_after": drop.get("retained_after"),
        },
        "phrase": phrase.get("text") or "",
        "diagnosis": result.get("diagnosis") or "",
        "shared_at": analysis.get("shared_at"),
    }
