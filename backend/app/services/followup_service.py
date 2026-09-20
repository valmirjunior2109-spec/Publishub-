"""O lembrete que fecha o loop.

Depois da análise o criador diz quando vai republicar. 72 h depois (ou 48 h
depois da data informada) sai um e-mail pedindo a retenção real — sem ele a
previsão nunca é conferida e o placar de precisão não sai do lugar.

Quem dispara é o cron, batendo em POST /api/internal/followups. O envio é
idempotente pelo status: só sai o que está "scheduled", e o que falha volta para
a fila com o erro registrado.
"""

import logging
from datetime import date, datetime, timedelta, timezone

from app.core.config import get_settings
from app.core.errors import ApiError
from app.services import email_service, supabase_service as db

logger = logging.getLogger("publishub")

# Quantas vezes um lembrete tenta sair antes de desistir (e-mail inválido, caixa cheia…).
MAX_ATTEMPTS = 3
DEFAULT_BATCH = 50
LOCALES = ("en", "pt-BR", "es")

# O e-mail é curto de propósito: uma pergunta e um link. Quem chegou até aqui já
# sabe o que é o Publishub — o assunto é a retenção real, não o produto.
TEMPLATES = {
    "en": {
        "subject": "Did the retention go up?",
        "greeting": "You analyzed {filename} on Publishub and were going to re-record it.",
        "ask": "Open Instagram Insights, look at the retention at the second we predicted, and paste the real number. We compare it with the prediction and update your accuracy score.",
        "cta": "Paste the real retention",
        "footer": "If you haven't republished yet, just ignore this — the analysis stays in your dashboard.",
    },
    "pt-BR": {
        "subject": "A retenção subiu?",
        "greeting": "Você analisou {filename} no Publishub e ia regravar esse trecho.",
        "ask": "Abra o Instagram Insights, veja a retenção no segundo que a gente previu e cole o número real. A gente compara com a previsão e atualiza seu placar de precisão.",
        "cta": "Colar a retenção real",
        "footer": "Se você ainda não republicou, pode ignorar este e-mail — a análise continua no seu painel.",
    },
    "es": {
        "subject": "¿Subió la retención?",
        "greeting": "Analizaste {filename} en Publishub e ibas a regrabar esa parte.",
        "ask": "Abre Instagram Insights, mira la retención en el segundo que predijimos y pega el número real. Lo comparamos con la predicción y actualizamos tu marcador de precisión.",
        "cta": "Pegar la retención real",
        "footer": "Si todavía no republicaste, ignora este correo — el análisis sigue en tu panel.",
    },
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _send_after(republish_on: date | None) -> datetime:
    settings = get_settings()
    if republish_on is None:
        return _now() + timedelta(hours=settings.followup_hours)
    # a data vem sem hora: conta a partir do fim daquele dia, em UTC
    published = datetime.combine(republish_on, datetime.min.time(), tzinfo=timezone.utc)
    return published + timedelta(hours=settings.followup_after_republish_hours)


def schedule(user: dict, analysis: dict, republish_on: date | None, locale: str | None) -> dict:
    """Agenda (ou reagenda) o lembrete de uma análise que já terminou."""
    if analysis["status"] != "completed":
        raise ApiError(409, "NOT_READY", "O lembrete só faz sentido depois que a análise termina.")
    if (analysis.get("outcome") or "pending") != "pending":
        raise ApiError(409, "LOOP_CLOSED", "Você já registrou o resultado real desta análise.")
    # sem previsão de retenção não há número para pedir no e-mail (análise sem print)
    if not (analysis.get("result") or {}).get("prediction"):
        raise ApiError(409, "NO_PREDICTION", "Esta análise foi feita sem o print da retenção, então não tem previsão para conferir.")

    send_after = _send_after(republish_on)
    row = {
        "analysis_id": analysis["id"],
        "user_id": user["id"],
        "republish_on": republish_on.isoformat() if republish_on else None,
        "send_after": send_after.isoformat(),
        "locale": locale if locale in LOCALES else "en",
        "status": "scheduled",
        "attempts": 0,
        "last_error": None,
        "sent_at": None,
    }
    stored = db.upsert_followup(row)
    return _serialize(stored)


def cancel(analysis_id: str) -> int:
    """O número real chegou: o lembrete perdeu o motivo de existir."""
    return db.cancel_followup(analysis_id)


def for_analysis(analysis_id: str) -> dict | None:
    row = db.get_followup(analysis_id)
    return _serialize(row) if row else None


def _serialize(row: dict) -> dict:
    return {
        "analysis_id": row["analysis_id"],
        "republish_on": row.get("republish_on"),
        "send_after": row.get("send_after"),
        "status": row.get("status"),
        "sent_at": row.get("sent_at"),
    }


def _message(followup: dict, filename: str) -> tuple[str, str, str]:
    """Assunto, html e texto do lembrete, no idioma em que o site estava."""
    settings = get_settings()
    text = TEMPLATES.get(followup.get("locale") or "en", TEMPLATES["en"])
    link = f"{settings.app_url}/results/{followup['analysis_id']}"
    greeting = text["greeting"].format(filename=filename)

    html = (
        '<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#1b1b1a;max-width:520px">'
        f"<p>{greeting}</p>"
        f"<p>{text['ask']}</p>"
        f'<p style="margin:28px 0"><a href="{link}" style="background:#8a5a4e;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;display:inline-block">{text["cta"]}</a></p>'
        f'<p style="font-size:13px;color:#6b6a67">{text["footer"]}</p>'
        "</div>"
    )
    plain = f"{greeting}\n\n{text['ask']}\n\n{text['cta']}: {link}\n\n{text['footer']}"
    return text["subject"], html, plain


def send_due(limit: int = DEFAULT_BATCH) -> dict:
    """Envia os lembretes vencidos. Chamado pelo cron; nunca levanta por causa de um e-mail."""
    settings = get_settings()
    if not settings.email_configured:
        logger.warning("followups: RESEND_API_KEY/EMAIL_FROM ausentes, nada foi enviado")
        return {"due": 0, "sent": 0, "failed": 0, "skipped": "email_not_configured"}

    due = db.list_due_followups(_now().isoformat(), limit)
    sent = failed = 0
    for followup in due:
        analysis = followup.get("analyses") or {}
        # o criador pode ter colado o número antes de o e-mail sair
        if (analysis.get("outcome") or "pending") != "pending":
            db.update_followup(followup["id"], {"status": "cancelled"})
            continue

        profile = db.get_profile(followup["user_id"])
        address = (profile or {}).get("email")
        if not address:
            db.update_followup(followup["id"], {"status": "failed", "last_error": "conta sem e-mail"})
            failed += 1
            continue

        filename = ((analysis.get("videos") or {}).get("filename")) or "seu Reel"
        subject, html, plain = _message(followup, filename)
        try:
            email_service.send(address, subject, html, plain)
        except email_service.EmailError as exc:
            attempts = (followup.get("attempts") or 0) + 1
            # tenta de novo nas próximas rodadas do cron; depois de MAX_ATTEMPTS, desiste
            db.update_followup(
                followup["id"],
                {"status": "failed" if attempts >= MAX_ATTEMPTS else "scheduled", "attempts": attempts, "last_error": str(exc)[:300]},
            )
            logger.warning("followup %s não saiu (tentativa %s): %s", followup["id"], attempts, exc)
            failed += 1
            continue

        db.update_followup(followup["id"], {"status": "sent", "sent_at": _now().isoformat(), "attempts": (followup.get("attempts") or 0) + 1})
        sent += 1

    logger.info("followups: %s vencidos, %s enviados, %s com erro", len(due), sent, failed)
    return {"due": len(due), "sent": sent, "failed": failed}
