"""Os eventos do funil, gravados no banco (sem serviço externo, sem cookie de terceiro).

São só os seis que respondem "onde as pessoas param": a previsão apareceu, foi
conferida, a análise completa foi vista, o paywall apareceu, alguém comprou e
alguém voltou com o número real.
"""

import logging

from app.core.errors import ApiError
from app.services import supabase_service as db

logger = logging.getLogger("publishub")

NAMES = frozenset(
    {
        "prediction_shown",
        "prediction_confirmed",
        "full_analysis_viewed",
        "paywall_viewed",
        "purchased",
        "real_result_submitted",
    }
)

MAX_PROPS = 20


def record(actor, name: str, analysis_id: str | None = None, props: dict | None = None) -> dict:
    """Grava um evento. Nome fora da lista é 422: a tabela tem o mesmo check."""
    if name not in NAMES:
        raise ApiError(422, "UNKNOWN_EVENT", "Evento desconhecido.")
    row = {
        "name": name,
        "user_id": actor.user_id,
        "guest_id": actor.guest_id,
        "analysis_id": analysis_id,
        "props": dict(list((props or {}).items())[:MAX_PROPS]),
    }
    try:
        db.insert_event(row)
    except db.SupabaseError:
        # Medir é importante, mas não o bastante para derrubar a tela de quem está usando.
        logger.warning("could not record event %s", name)
        return {"recorded": False}
    return {"recorded": True}
