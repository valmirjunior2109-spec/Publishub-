"""Primeiro uso sem cadastro: a previsão cega antes de pedir e-mail.

Como funciona:
  1. o navegador pede uma sessão (`start_session`) e guarda o token devolvido;
  2. pede uma URL assinada e envia o vídeo direto para o Storage;
  3. registra o vídeo e recebe a previsão cega, como um usuário logado receberia;
  4. ao criar a conta, o frontend chama `claim` com o mesmo token e a análise
     passa a ser da conta nova.

Anti-abuso, sem cadastro nem fingerprint de navegador: o IP entra só como
sha256(ip + sal) e limita quantos vídeos saem do mesmo IP por dia. É contornável
com VPN ou 4G, e é de propósito — o limite existe para conta de custo, não para
identificar ninguém.
"""

import hashlib
import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from app.core.config import ALLOWED_VIDEO_TYPES, get_settings
from app.core.errors import ApiError
from app.services import supabase_service as db

logger = logging.getLogger("publishub")

# Um vídeo por sessão: a previsão cega é uma amostra, não um plano grátis.
VIDEOS_PER_SESSION = 1
# Teto de sessões por IP por dia. Bem acima do limite de vídeos: quem só recarrega
# a página (e perde o token) não fica bloqueado, mas ninguém enche a tabela.
SESSIONS_PER_IP_PER_DAY = 20
WINDOW_HOURS = 24


def _hash(value: str) -> str:
    return hashlib.sha256(f"{get_settings().guest_hash_salt}:{value}".encode()).hexdigest()


def _since() -> str:
    return (datetime.now(timezone.utc) - timedelta(hours=WINDOW_HOURS)).isoformat()


def client_ip(request) -> str:
    """O IP de quem chamou. Atrás da Vercel/proxy, o primeiro salto do X-Forwarded-For."""
    forwarded = request.headers.get("x-forwarded-for") or ""
    first = forwarded.split(",")[0].strip()
    if first:
        return first
    return getattr(getattr(request, "client", None), "host", "") or "unknown"


def start_session(ip: str, user_agent: str | None) -> dict:
    """Abre (ou reabre) uma sessão de convidado. O token só existe nesta resposta."""
    ip_hash = _hash(ip)
    recent = db.list_guest_session_ids_from_ip(ip_hash, _since())
    if len(recent) >= SESSIONS_PER_IP_PER_DAY:
        raise ApiError(429, "GUEST_RATE_LIMITED", "Muitos testes a partir desta conexão hoje. Crie uma conta para continuar.")

    token = secrets.token_urlsafe(32)
    session = db.insert_guest_session(
        {
            "token_hash": _hash(token),
            "ip_hash": ip_hash,
            "ua_hash": _hash(user_agent) if user_agent else None,
        }
    )
    return {"token": token, "id": session["id"]}


def session_from_token(token: str) -> dict | None:
    return db.get_guest_session(_hash(token)) if token else None


def ensure_can_register(session: dict, ip: str) -> None:
    """Um vídeo por sessão e poucos por IP no dia. Passado isso, só com conta."""
    settings = get_settings()
    if db.count_guest_videos([session["id"]]) >= VIDEOS_PER_SESSION:
        raise ApiError(
            402,
            "GUEST_LIMIT_REACHED",
            "Você já usou o teste sem cadastro. Crie sua conta (de graça) para analisar outro vídeo.",
        )
    from_ip = db.list_guest_session_ids_from_ip(_hash(ip), _since())
    if db.count_guest_videos(from_ip) >= settings.guest_videos_per_ip:
        raise ApiError(
            429,
            "GUEST_RATE_LIMITED",
            "Esta conexão já usou o teste sem cadastro hoje. Crie sua conta (de graça) para continuar.",
        )


def upload_target(session: dict, content_type: str) -> dict:
    """Uma URL assinada para o navegador enviar o vídeo direto ao Storage."""
    extension = ALLOWED_VIDEO_TYPES.get((content_type or "").lower())
    if not extension:
        raise ApiError(400, "INVALID_FILE", "Formato não suportado. Envie um vídeo MP4, MOV ou WEBM.")
    path = f"guest/{session['id']}/{uuid.uuid4()}.{extension}"
    signed = db.create_signed_upload_url(path)
    if not signed.get("url"):
        raise ApiError(502, "STORAGE_ERROR", "Não foi possível preparar o envio agora. Tente novamente.")
    return signed


def claim(user: dict, token: str) -> dict:
    """Chamado assim que a conta é criada: o que o convidado já fez vira dela."""
    session = session_from_token(token)
    if not session:
        return {"claimed": 0, "analysis_ids": []}
    if session.get("claimed_by") and session["claimed_by"] != user["id"]:
        raise ApiError(409, "GUEST_ALREADY_CLAIMED", "Este teste já está ligado a outra conta.")

    analysis_ids = db.list_guest_analysis_ids(session["id"])
    if session.get("claimed_by") != user["id"]:
        db.claim_guest_session(session["id"], user["id"], datetime.now(timezone.utc).isoformat())
        logger.info("guest session %s claimed by %s (%s analyses)", session["id"], user["id"], len(analysis_ids))
    return {"claimed": len(analysis_ids), "analysis_ids": analysis_ids}
