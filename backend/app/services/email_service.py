"""E-mail transacional pelo Resend.

Um provedor só, uma função só: `send`. Sem RESEND_API_KEY o envio não acontece e
o chamador fica sabendo — nada é simulado, do mesmo jeito que a IA.
"""

import logging

import httpx

from app.core.config import get_settings

logger = logging.getLogger("publishub")

ENDPOINT = "https://api.resend.com/emails"
TIMEOUT_SECONDS = 15


class EmailError(Exception):
    """Falha ao enviar: rede, chave inválida, domínio não verificado."""


def send(to: str, subject: str, html: str, text: str) -> str:
    """Envia e devolve o id da mensagem no Resend. Levanta EmailError se não der."""
    settings = get_settings()
    if not settings.email_configured:
        raise EmailError("RESEND_API_KEY / EMAIL_FROM não configurados")

    payload = {"from": settings.email_from, "to": [to], "subject": subject, "html": html, "text": text}
    if settings.email_reply_to:
        payload["reply_to"] = settings.email_reply_to

    try:
        response = httpx.post(
            ENDPOINT,
            json=payload,
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            timeout=TIMEOUT_SECONDS,
        )
    except httpx.HTTPError as exc:
        raise EmailError(f"não foi possível falar com o Resend: {exc}") from exc

    if response.status_code >= 400:
        # o corpo do Resend diz o motivo (domínio não verificado, chave errada…)
        raise EmailError(f"Resend respondeu {response.status_code}: {response.text[:300]}")
    return (response.json() or {}).get("id", "")
