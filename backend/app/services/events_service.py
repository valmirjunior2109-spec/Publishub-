"""Os eventos do funil, gravados no próprio banco (sem serviço externo, sem cookie de terceiro).

Uma pergunta por evento: onde a pessoa entrou, onde parou, onde pagou. A lista
é fechada de propósito — evento sem nome combinado é evento que ninguém analisa.

O que NUNCA entra aqui: senha, dado de cartão, chave de API e conteúdo do vídeo
(fala, transcrição, frase da queda). `_clean` derruba isso mesmo que alguém
tente mandar por engano — medir não pode virar vazamento.
"""

import logging

from app.core.errors import ApiError
from app.services import supabase_service as db

logger = logging.getLogger("publishub")

NAMES = frozenset(
    {
        # entrada
        "page_view",
        "signup_started",
        "signup_completed",
        "onboarding_completed",
        # análise
        "video_upload_started",
        "video_upload_completed",
        "analysis_started",
        "analysis_completed",
        "analysis_failed",
        "results_viewed",
        "action_plan_viewed",
        "full_analysis_viewed",
        # dinheiro
        "paywall_viewed",
        "upgrade_clicked",
        "payment_started",
        "payment_completed",
        "payment_failed",
        # loop de previsão
        "prediction_shown",
        "prediction_confirmed",
        "real_result_submitted",
    }
)

MAX_PROPS = 20
MAX_VALUE_LENGTH = 120

# Nada cujo nome cheire a segredo ou a conteúdo do vídeo entra no banco de eventos.
BANNED = ("password", "senha", "token", "secret", "api_key", "apikey", "card", "cvv", "iban",
          "transcript", "phrase", "frase", "rewrite", "content", "email")


def _clean(props: dict | None) -> dict:
    """Só números, booleanos e textos curtos; nomes suspeitos são descartados."""
    out: dict = {}
    for key, value in list((props or {}).items())[: MAX_PROPS * 2]:
        name = str(key).lower()
        if any(banned in name for banned in BANNED):
            continue
        if isinstance(value, bool) or isinstance(value, (int, float)) or value is None:
            out[key] = value
        elif isinstance(value, str):
            out[key] = value[:MAX_VALUE_LENGTH]
        if len(out) >= MAX_PROPS:
            break
    return out


def _write(user_id: str | None, guest_id: str | None, name: str, analysis_id: str | None, props: dict | None) -> dict:
    if name not in NAMES:
        raise ApiError(422, "UNKNOWN_EVENT", "Evento desconhecido.")
    row = {"name": name, "user_id": user_id, "guest_id": guest_id, "analysis_id": analysis_id, "props": _clean(props)}
    try:
        db.insert_event(row)
    except db.SupabaseError:
        # Medir é importante, mas não o bastante para derrubar a tela de quem está usando.
        logger.warning("could not record event %s", name)
        return {"recorded": False}
    return {"recorded": True}


def record(actor, name: str, analysis_id: str | None = None, props: dict | None = None) -> dict:
    """O evento de quem está na tela: conta ou convidado."""
    return _write(actor.user_id, actor.guest_id, name, analysis_id, props)


def record_for_user(user_id: str | None, name: str, analysis_id: str | None = None, props: dict | None = None) -> None:
    """Para quem não tem um Actor à mão: o pipeline em background e o webhook do Stripe.

    Nunca levanta: um evento perdido não pode derrubar uma análise nem um pagamento.
    """
    try:
        _write(user_id, None, name, analysis_id, props)
    except Exception:
        logger.warning("could not record event %s", name)
