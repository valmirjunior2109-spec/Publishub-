"""O e-mail de quem viu a análise grátis e ainda não comprou.

"Te mando o plano no e-mail": a pessoa deixa o endereço, ele vai para `leads`, e
sai na hora uma mensagem com a parte grátis (a queda e as primeiras
recomendações) e o link do checkout, que já leva o id da análise. O plano pago
não vai no e-mail: ele só sai do servidor depois do pagamento.

Anti-abuso: o formulário manda e-mail para um endereço digitado por qualquer um,
então cada análise aceita poucos endereços, e o mesmo endereço nunca recebe a
mesma análise duas vezes.
"""

import html
import logging
import re
from urllib.parse import urlencode

from app.core.config import get_settings
from app.core.errors import ApiError
from app.services import email_service, events_service, supabase_service as db
from app.services.billing_service import build_reference

logger = logging.getLogger("publishub")

MAX_EMAILS_PER_ANALYSIS = 3
EMAIL_RE = re.compile(r"^[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}$")
LOCALES = ("pt-BR", "en", "es")

TEMPLATES = {
    "pt-BR": {
        "subject": "Sua análise do Publishub: o segundo em que as pessoas saem",
        "intro": "Aqui está o que o Publishub achou no seu vídeo {filename}.",
        "drop": "A queda: aos {time}, enquanto você dizia:",
        "first": "As primeiras mudanças do plano:",
        "more": "E mais {count} mudanças no plano completo.",
        "cta": "Ver o plano completo",
        "open": "Abrir a análise no Publishub",
        "footer": "Você recebeu este e-mail porque pediu a análise no Publishub. Não mandamos outras mensagens sem você pedir.",
    },
    "en": {
        "subject": "Your Publishub analysis: the second people leave",
        "intro": "Here's what Publishub found in your video {filename}.",
        "drop": "The drop: at {time}, while you were saying:",
        "first": "The first changes in your plan:",
        "more": "And {count} more changes in the full plan.",
        "cta": "See the full plan",
        "open": "Open the analysis on Publishub",
        "footer": "You got this email because you asked for the analysis on Publishub. We don't send other messages unless you ask.",
    },
    "es": {
        "subject": "Tu análisis de Publishub: el segundo en que la gente se va",
        "intro": "Esto es lo que Publishub encontró en tu video {filename}.",
        "drop": "La caída: a los {time}, mientras decías:",
        "first": "Los primeros cambios del plan:",
        "more": "Y {count} cambios más en el plan completo.",
        "cta": "Ver el plan completo",
        "open": "Abrir el análisis en Publishub",
        "footer": "Recibiste este correo porque pediste el análisis en Publishub. No enviamos otros mensajes sin que lo pidas.",
    },
}


def _timestamp(seconds: float) -> str:
    total = int(round(seconds or 0))
    return f"{total // 60}:{total % 60:02d}"


def checkout_link(analysis_id: str, email: str, user_id: str | None) -> str:
    """O Payment Link já com a análise e o e-mail: pagar por aqui abre o plano desta análise."""
    params = {"prefilled_email": email}
    reference = build_reference(user_id, analysis_id)
    if reference:
        params["client_reference_id"] = reference
    return f"{get_settings().stripe_payment_link}?{urlencode(params)}"


def _message(locale: str, analysis: dict, free: dict, locked_count: int, email: str, user_id: str | None) -> tuple[str, str, str]:
    """Assunto, html e texto: só a parte grátis, no idioma do site."""
    text = TEMPLATES.get(locale, TEMPLATES["en"])
    settings = get_settings()
    filename = ((analysis.get("videos") or {}).get("filename")) or "Reel"
    drop = free.get("drop") or {}
    phrase = (free.get("phrase") or {}).get("text") or ""
    recommendations = [r for r in ((free.get("copilot") or {}).get("recommendations") or []) if r.get("title")]
    buy = checkout_link(analysis["id"], email, user_id)
    open_link = f"{settings.app_url}/results/{analysis['id']}"

    intro = text["intro"].format(filename=filename)
    drop_line = text["drop"].format(time=_timestamp(drop.get("at_seconds") or 0))
    items_html = "".join(f"<li style=\"margin-bottom:8px\"><strong>{html.escape(r['title'])}</strong>{(' ' + html.escape(r['why'])) if r.get('why') else ''}</li>" for r in recommendations)
    more = text["more"].format(count=locked_count) if locked_count > 0 else ""

    body = (
        '<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#1e1b16;max-width:540px">'
        f"<p>{html.escape(intro)}</p>"
        f"<p>{html.escape(drop_line)}<br><em>&ldquo;{html.escape(phrase)}&rdquo;</em></p>"
        + (f"<p>{html.escape(text['first'])}</p><ol>{items_html}</ol>" if items_html else "")
        + (f"<p>{html.escape(more)}</p>" if more else "")
        + f'<p style="margin:28px 0"><a href="{html.escape(buy)}" style="background:#078b72;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;display:inline-block">{html.escape(text["cta"])}</a></p>'
        f'<p><a href="{html.escape(open_link)}" style="color:#078b72">{html.escape(text["open"])}</a></p>'
        f'<p style="font-size:13px;color:#6b6459">{html.escape(text["footer"])}</p>'
        "</div>"
    )
    lines = [intro, "", drop_line, f"“{phrase}”"]
    if recommendations:
        lines += ["", text["first"], *[f"{i}. {r['title']}" for i, r in enumerate(recommendations, 1)]]
    if more:
        lines += ["", more]
    lines += ["", f"{text['cta']}: {buy}", f"{text['open']}: {open_link}", "", text["footer"]]
    return text["subject"], body, "\n".join(lines)


def capture(actor, analysis: dict, free: dict, locked_count: int, email: str, locale: str | None) -> dict:
    """Guarda o e-mail e manda a parte grátis. `free` já é a versão sem o conteúdo pago."""
    address = (email or "").strip().lower()
    if len(address) > 254 or not EMAIL_RE.match(address):
        raise ApiError(422, "INVALID_EMAIL", "Confira o e-mail: parece que falta alguma coisa.")
    if analysis.get("status") != "completed":
        raise ApiError(409, "NOT_READY", "Espere a análise terminar para receber no e-mail.")

    known = set(db.list_lead_emails(analysis["id"]))
    is_new = address not in known
    if is_new and len(known) >= MAX_EMAILS_PER_ANALYSIS:
        raise ApiError(429, "LEAD_LIMIT", "Esta análise já foi enviada para e-mails demais.")

    lang = locale if locale in LOCALES else "en"
    db.insert_lead({"email": address, "analysis_id": analysis["id"], "locale": lang})

    emailed = False
    if is_new:
        user_id = None if actor.is_guest else actor.user_id
        subject, body, plain = _message(lang, analysis, free, locked_count, address, user_id)
        try:
            email_service.send(address, subject, body, plain)
            emailed = True
        except email_service.EmailError as exc:
            # o lead fica guardado mesmo sem e-mail: dá para mandar depois, e a tela diz a verdade
            logger.warning("lead e-mail for analysis %s did not go out: %s", analysis["id"], exc)

    events_service.record(actor, "lead_captured", analysis["id"], {"new": is_new, "emailed": emailed, "locale": lang})
    # `repeated`: o mesmo endereço de novo — já recebeu (ou já tentamos), não reenvia
    return {"saved": True, "emailed": emailed, "repeated": not is_new}
