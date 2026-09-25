"""Eventos do servidor para o PostHog.

Dois eventos nascem aqui, e não no navegador, porque só o servidor sabe quando
eles aconteceram de verdade:
  - analysis_completed: a análise terminou (a pessoa pode ter fechado a aba);
  - purchase_completed: o Stripe confirmou o pagamento (webhook ou /obrigado).

A pessoa é a mesma do navegador: o id da conta, ou "guest:<id da sessão>" para
quem ainda não tem conta — o frontend identifica com os mesmos ids
(lib/analytics.ts). Sem POSTHOG_API_KEY nada sai, e nada quebra.

O envio vai numa thread: o webhook do Stripe não espera o PostHog responder.
Um evento que não sai fica no log; nunca derruba a requisição.
"""

import logging
import threading
from datetime import datetime, timezone

import httpx

from app.core.config import get_settings

logger = logging.getLogger("publishub")

TIMEOUT_SECONDS = 5


def distinct_id(user_id: str | None, guest_id: str | None, fallback: str) -> str:
    """A pessoa do evento, com os mesmos ids que o navegador usa ao identificar."""
    if user_id:
        return str(user_id)
    if guest_id:
        return f"guest:{guest_id}"
    return fallback


def _send(payload: dict) -> None:
    settings = get_settings()
    try:
        response = httpx.post(f"{settings.posthog_host}/i/v0/e/", json=payload, timeout=TIMEOUT_SECONDS)
        if response.status_code >= 400:
            logger.warning("posthog rejected %s: %s %s", payload["event"], response.status_code, response.text[:200])
    except httpx.HTTPError as exc:
        logger.warning("posthog unreachable for %s: %s", payload["event"], exc)


def _dispatch(payload: dict) -> None:
    """Numa thread: quem chamou (o webhook do Stripe, o fim da análise) segue sem esperar."""
    threading.Thread(target=_send, args=(payload,), daemon=True).start()


def capture(event: str, person: str, properties: dict) -> None:
    """Manda um evento sem esperar a resposta. Sem chave configurada, não faz nada."""
    settings = get_settings()
    if not settings.posthog_api_key:
        return
    payload = {
        "api_key": settings.posthog_api_key,
        "event": event,
        "distinct_id": person,
        "properties": {**properties, "$lib": "publishub-backend"},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    _dispatch(payload)
