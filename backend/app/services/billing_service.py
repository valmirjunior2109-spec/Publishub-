"""Payments: one Stripe payment link (plan "Vitalício Fundador", one-time), a webhook, and who may analyse.

The plan is limited to the first `FOUNDER_LIMIT` buyers. The counter is real: it
counts the distinct e-mails of the paid purchases stored in `purchases`, which
only get there after being confirmed at Stripe (webhook or /obrigado). A refund
gives the spot back.

How a payment turns into access:
  1. The site sends the person to the payment link with `prefilled_email` and a
     `client_reference_id` that says who is paying and for which analysis:
     "u-<user id>__a-<analysis id>", or "a-<analysis id>" for a guest (old links
     carry just the user id; see `parse_reference`).
  2. After paying, Stripe redirects to /obrigado?session_id=…; the page asks the
     backend to confirm the session straight at Stripe (`confirm_session`), so the
     access is unlocked immediately, without waiting for the webhook.
  3. The webhook (`checkout.session.completed`) records the same purchase as a
     safety net, and `charge.refunded` revokes it. A purchase that names an
     analysis marks it as paid (`analyses.paid_at`), so its full plan leaves the
     server; the refund closes it again.
  4. A purchase made before the account existed is linked by e-mail on the first
     `entitlement()` call (i.e. the first /api/me after login).
"""

import logging
import re
import threading
import time
from datetime import datetime, timedelta, timezone

import stripe

from app.core.config import get_settings
from app.core.errors import ApiError
from app.services import analytics_service, events_service, partners_service, supabase_service as db

logger = logging.getLogger("publishub")

PLAN_LIFETIME = "lifetime"
PLAN_FREE = "free"

# Um plano só: o Vitalício Fundador, com a análise mais profunda. No banco ele
# continua gravado como "pro" (analyses.tier aceita 'creator' e 'pro'): trocar o
# valor pediria uma migração só para mudar um nome. Quem comprou o Creator ou o
# Pro antes disso também é fundador e recebe a mesma análise.
TIER_FOUNDER = "pro"

# O contador de vagas aparece em toda visita à landing: 30 s de cache poupam o
# banco sem deixar o número velho por muito tempo. Uma compra nova zera o cache.
_SPOTS_TTL_SECONDS = 30.0
_spots_lock = threading.Lock()
_spots_cache: tuple[float, dict] | None = None

_UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
SESSION_ID_RE = re.compile(r"^cs_(live|test)_[A-Za-z0-9]+$")
# Um pedaço do client_reference_id: "u-<uuid>" (a conta) ou "a-<uuid>" (a análise).
_REFERENCE_PART_RE = re.compile(r"^(u|a)-([0-9a-f-]{36})$")


def parse_reference(reference: str | None) -> tuple[str | None, str | None]:
    """O client_reference_id do Stripe → (id da conta, id da análise).

    O Stripe só guarda um texto (letras, números, - e _), então os dois ids vão
    juntos: "u-<conta>__a-<análise>". Convidado manda só "a-<análise>". Links
    antigos mandam só o id da conta, sem prefixo, e continuam valendo.
    """
    ref = (reference or "").strip().lower()
    if _UUID_RE.match(ref):
        return ref, None
    user_id = analysis_id = None
    for part in ref.split("__"):
        match = _REFERENCE_PART_RE.match(part)
        if not match or not _UUID_RE.match(match.group(2)):
            continue
        if match.group(1) == "u":
            user_id = match.group(2)
        else:
            analysis_id = match.group(2)
    return user_id, analysis_id


def build_reference(user_id: str | None, analysis_id: str | None) -> str | None:
    """O avesso de `parse_reference`, para quem monta o link de pagamento (o e-mail do lead)."""
    parts = [f"u-{user_id}"] if user_id else []
    if analysis_id:
        parts.append(f"a-{analysis_id}")
    return "__".join(parts) or None


def _stripe():
    settings = get_settings()
    if not settings.billing_configured:
        raise ApiError(503, "BILLING_NOT_CONFIGURED", "O pagamento ainda não foi configurado neste servidor.")
    stripe.api_key = settings.stripe_secret_key
    return stripe


def _retrieve_session(session_id: str) -> dict:
    """The Checkout Session as Stripe has it. Split out so tests can stub it."""
    try:
        return _stripe().checkout.Session.retrieve(session_id)
    except stripe.InvalidRequestError as exc:
        logger.info("stripe session %s not found: %s", session_id, exc)
        raise ApiError(404, "SESSION_NOT_FOUND", "Não encontramos este pagamento no Stripe.") from exc
    except stripe.StripeError as exc:
        logger.error("stripe error retrieving %s: %s", session_id, exc)
        raise ApiError(502, "STRIPE_ERROR", "Não foi possível falar com o Stripe agora. Tente novamente.") from exc


def _construct_event(payload: bytes, signature: str | None) -> dict:
    """Verifies the webhook signature. Split out so tests can stub it."""
    settings = get_settings()
    if not settings.stripe_webhook_secret:
        raise ApiError(503, "BILLING_NOT_CONFIGURED", "O webhook do Stripe ainda não foi configurado.")
    try:
        return stripe.Webhook.construct_event(payload, signature or "", settings.stripe_webhook_secret)
    except (ValueError, stripe.SignatureVerificationError) as exc:
        logger.warning("stripe webhook rejected: %s", exc)
        raise ApiError(400, "INVALID_SIGNATURE", "Assinatura do webhook inválida.") from exc


def _mask(email: str) -> str:
    name, _, domain = email.partition("@")
    return f"{name[:1]}•••@{domain}"


def _purchase_from_session(session: dict) -> dict | None:
    """The row to store, or None when the session isn't a completed one-time payment."""
    if session.get("mode") != "payment" or session.get("payment_status") != "paid":
        return None
    details = session.get("customer_details") or {}
    email = (details.get("email") or session.get("customer_email") or "").strip().lower()
    if not email:
        return None
    user_id, analysis_id = parse_reference(session.get("client_reference_id"))
    intent = session.get("payment_intent")
    if isinstance(intent, dict):
        intent = intent.get("id")
    row = {
        "stripe_session_id": session["id"],
        "stripe_payment_intent": intent,
        "email": email,
        "user_id": user_id,
        "amount_cents": int(session.get("amount_total") or 0),
        "currency": (session.get("currency") or "usd").lower(),
        "status": "paid",
    }
    if analysis_id:
        row["analysis_id"] = analysis_id
    return row


def _mark_analysis_paid(analysis: dict) -> None:
    """A compra nomeou esta análise: o plano completo dela passa a sair do servidor."""
    if analysis.get("paid_at"):
        return  # webhook repetido não muda a data do pagamento
    db.set_analysis_paid(analysis["id"], datetime.now(timezone.utc).isoformat())
    logger.info("analysis %s marked as paid", analysis["id"])


def record_session(session: dict, user: dict | None = None) -> dict | None:
    """Stores (idempotently) the purchase behind a paid session; links it to `user` when given."""
    row = _purchase_from_session(session)
    if row is None:
        return None
    # só uma análise que existe: um id inventado no link não pode derrubar a compra (a FK recusaria)
    analysis = db.get_analysis(row["analysis_id"]) if row.get("analysis_id") else None
    if row.get("analysis_id") and analysis is None:
        logger.warning("session %s names analysis %s, which does not exist; recording the purchase without it", row["stripe_session_id"], row["analysis_id"])
        row.pop("analysis_id")
    existing = db.get_purchase_by_session(row["stripe_session_id"])
    if existing:
        if user and existing.get("user_id") and existing["user_id"] != user["id"]:
            raise ApiError(409, "PURCHASE_OWNED", "Este pagamento já está ligado a outra conta. Entre com ela ou responda o e-mail do recibo.")
        row["status"] = existing["status"]  # um reembolso não volta a valer
        if existing.get("user_id"):
            row["user_id"] = existing["user_id"]
    if user:
        row["user_id"] = user["id"]
    stored = db.upsert_purchase(row)
    if analysis is not None and stored["status"] == "paid":
        _mark_analysis_paid(analysis)
    if stored.get("user_id") and stored["status"] == "paid":
        # Publishub Partners: se quem comprou veio de uma indicação, a comissão nasce aqui.
        partners_service.sync_commissions(stored["user_id"])
    if existing is None and stored["status"] == "paid":
        forget_founder_spots()
        # a primeira vez que vemos esta sessão: webhook repetido não vira evento repetido
        logger.info("purchase recorded for session %s (user %s)", stored["stripe_session_id"], stored.get("user_id"))
        events_service.record_for_user(
            stored.get("user_id"),
            "payment_completed",
            props={"amount_cents": stored["amount_cents"], "currency": stored["currency"], "plan": PLAN_LIFETIME, "for_analysis": analysis is not None},
        )
        # PostHog: disparado aqui, com o pagamento já confirmado pelo Stripe, nunca pelo navegador
        analytics_service.capture(
            "purchase_completed",
            analytics_service.distinct_id(stored.get("user_id"), (analysis or {}).get("guest_id"), f"purchase:{stored['stripe_session_id']}"),
            {
                "analysis_id": (analysis or {}).get("id"),
                # o idioma em que a análise foi lida; sem análise, o do checkout do Stripe
                "locale": ((analysis or {}).get("result") or {}).get("explanations_language") or session.get("locale"),
                "amount_cents": stored["amount_cents"],
                "currency": stored["currency"],
            },
        )
    return stored


def confirm_session(user: dict, session_id: str) -> dict:
    """Called by /obrigado when the person is logged in: unlocks the access right away."""
    if not SESSION_ID_RE.match(session_id):
        raise ApiError(400, "INVALID_SESSION", "Link de pagamento inválido.")
    session = _retrieve_session(session_id)
    if record_session(session, user) is None:
        raise ApiError(402, "NOT_PAID", "Não encontramos um pagamento confirmado neste link.")
    return entitlement(user)


def public_session(session_id: str) -> dict:
    """Called by /obrigado when nobody is logged in: says whether it's paid, without exposing the e-mail."""
    if not SESSION_ID_RE.match(session_id):
        raise ApiError(400, "INVALID_SESSION", "Link de pagamento inválido.")
    session = _retrieve_session(session_id)
    row = _purchase_from_session(session)
    if row is None:
        return {"paid": False, "email_masked": None, "amount_cents": None, "currency": None}
    record_session(session)  # guarda já, para ligar pelo e-mail quando a conta for criada
    return {"paid": True, "email_masked": _mask(row["email"]), "amount_cents": row["amount_cents"], "currency": row["currency"]}


def _user_of_event(obj: dict) -> str | None:
    """A conta por trás do objeto do Stripe, quando dá para saber."""
    user_id, _ = parse_reference(obj.get("client_reference_id"))
    if user_id:
        return user_id
    intent = obj.get("payment_intent") or obj.get("id")
    if isinstance(intent, str):
        for purchase in db.list_purchases_by_intent(intent):
            if purchase.get("user_id"):
                return purchase["user_id"]
    return None


def handle_webhook(payload: bytes, signature: str | None) -> dict:
    """O Stripe é a fonte da verdade do pagamento; o frontend nunca libera acesso sozinho.

    Reenvio do mesmo evento é normal (o Stripe repete até receber 200): gravar é
    idempotente pelo `stripe_session_id`, então repetir não duplica acesso nem evento.
    """
    event = _construct_event(payload, signature)
    kind = event["type"]
    obj = event["data"]["object"]

    if kind in ("checkout.session.completed", "checkout.session.async_payment_succeeded"):
        if record_session(obj) is None:
            logger.info("stripe webhook %s ignored: session %s not a paid one-time payment", kind, obj.get("id"))
    elif kind == "charge.refunded":
        intent = obj.get("payment_intent")
        if intent:
            revoked = db.mark_purchase_refunded(intent, datetime.now(timezone.utc).isoformat())
            forget_founder_spots()  # o reembolso devolve a vaga
            # a análise que a compra abriu volta a mostrar só a parte grátis
            for purchase in db.list_purchases_by_intent(intent):
                if purchase.get("analysis_id"):
                    db.set_analysis_paid(purchase["analysis_id"], None)
            reversed_commissions = partners_service.reverse_commissions_for_intent(intent)
            logger.info("stripe refund %s: %s purchase(s) revoked, %s commission(s) reversed", intent, revoked, reversed_commissions)
    elif kind in ("checkout.session.expired", "checkout.session.async_payment_failed", "payment_intent.payment_failed"):
        # nada a revogar (nunca houve acesso); o que interessa é saber quanta gente trava aqui
        reason = {
            "checkout.session.expired": "expired",
            "checkout.session.async_payment_failed": "async_failed",
            "payment_intent.payment_failed": (((obj.get("last_payment_error") or {}).get("code")) or "declined"),
        }[kind]
        logger.info("stripe %s for %s: %s", kind, obj.get("id"), reason)
        events_service.record_for_user(_user_of_event(obj), "payment_failed", props={"reason": reason, "kind": kind})
    else:
        logger.debug("stripe webhook %s ignored", kind)
    return {"received": True}


def _lifetime_source(user: dict) -> str | None:
    """"purchase", "partners" ou None. É a única pergunta que decide o que a conta vê."""
    email = (user.get("email") or "").strip().lower()
    purchases = db.list_purchases(user["id"], email)
    if email and any(not p.get("user_id") for p in purchases):
        db.link_purchases(email, user["id"])
        # a compra pode ter sido feita antes da conta existir: só agora dá para saber quem indicou
        partners_service.sync_commissions(user["id"])
    if any(p["status"] == "paid" for p in purchases):
        return "purchase"
    if partners_service.conversions(user["id"]) >= get_settings().partners_goal:
        return "partners"
    return None


def tier(user: dict) -> str | None:
    """"pro" (o Vitalício Fundador) ou None (sem acesso pago).

    Quem ganhou o acesso pelo programa de parceria também é fundador.
    """
    return TIER_FOUNDER if _lifetime_source(user) else None


def founder_spots() -> dict:
    """As vagas do Vitalício Fundador: quantas existem, quantas foram compradas, se esgotou.

    Conta compradores distintos (pelo e-mail), não sessões: quem pagou duas vezes
    ocupa uma vaga. Compra reembolsada não conta. Nunca é um número fixo.
    """
    global _spots_cache
    with _spots_lock:
        if _spots_cache and time.monotonic() - _spots_cache[0] < _SPOTS_TTL_SECONDS:
            return dict(_spots_cache[1])

    limit = get_settings().founder_limit
    taken = len({email.strip().lower() for email in db.list_paid_purchase_emails()})
    spots = {"limit": limit, "taken": taken, "remaining": max(0, limit - taken), "sold_out": taken >= limit}
    with _spots_lock:
        _spots_cache = (time.monotonic(), spots)
    return dict(spots)


def forget_founder_spots() -> None:
    """Uma compra ou um reembolso acabou de acontecer: a próxima leitura vai ao banco."""
    global _spots_cache
    with _spots_lock:
        _spots_cache = None


def ensure_within_daily_limit(user: dict) -> None:
    """Uso justo: até `DAILY_ANALYSIS_LIMIT` análises por conta a cada 24 h (está nos Termos).

    Vale para toda conta, paga ou não. Conta vídeos registrados, então tentar de
    novo uma análise que falhou não gasta nada.
    """
    limit = get_settings().daily_analysis_limit
    if not limit:
        return
    since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    if db.count_videos_since(user["id"], since) >= limit:
        raise ApiError(429, "DAILY_LIMIT_REACHED", f"Você chegou ao limite de {limit} análises em 24 horas. Ele libera 24 horas depois de cada envio.")


def has_full_access(user: dict) -> bool:
    """A conta tem Lifetime (ou o servidor não cobra de ninguém).

    Sem contar vídeos: isto roda a cada poll. Quem tem Lifetime destrava também
    as análises antigas que nasceram parciais.
    """
    if not get_settings().billing_configured:
        return True
    return _lifetime_source(user) is not None


def analysis_starts_unlocked(user: dict) -> bool:
    """A próxima análise desta conta sai completa?

    As primeiras da conta saem: ninguém compra o que nunca viu. Passado o limite,
    a análise continua acontecendo, mas o plano de ação fica atrás do paywall.
    """
    if has_full_access(user):
        return True
    return db.count_videos(user["id"]) < get_settings().free_full_analyses


def entitlement(user: dict) -> dict:
    """What the account may do: plan, where it came from, and the free-upload counter.

    O grátis analisa e vê o segundo da queda e a frase; as reescritas e o copiloto
    são do Lifetime (`can_see_rewrites`). O contador de uploads continua existindo,
    mas como limite anti-abuso, não como porta do produto.
    """
    settings = get_settings()
    used = db.count_videos(user["id"])
    source = _lifetime_source(user)

    base = {"uploads_used": used, "billing_configured": settings.billing_configured, "tier": TIER_FOUNDER if source else None}
    unlimited = {
        "plan": PLAN_LIFETIME,
        "uploads_limit": None,
        "uploads_remaining": None,
        "can_upload": True,
        "can_see_rewrites": True,
        "free_analyses_limit": None,
        "free_analyses_used": used,
        "free_analyses_remaining": None,
    }
    if source:
        return {**base, **unlimited, "source": source}
    if not settings.billing_configured:
        # sem Stripe ninguém consegue pagar, então também não bloqueamos nada
        return {**base, **unlimited, "plan": PLAN_FREE, "source": None}

    free_limit = settings.free_full_analyses
    free_remaining = max(0, free_limit - used)
    limit = settings.free_uploads
    remaining = max(0, limit - used)
    return {
        **base,
        "plan": PLAN_FREE,
        "source": None,
        # teto anti-abuso: quantos vídeos esta conta ainda pode enviar
        "uploads_limit": limit,
        "uploads_remaining": remaining,
        "can_upload": remaining > 0,
        # o que decide a experiência: quantas análises ainda saem completas
        "free_analyses_limit": free_limit,
        "free_analyses_used": min(used, free_limit),
        "free_analyses_remaining": free_remaining,
        "can_see_rewrites": free_remaining > 0,
    }


def ensure_can_upload(user: dict) -> dict:
    current = entitlement(user)
    if current["can_upload"]:
        return current
    raise ApiError(402, "FREE_LIMIT_REACHED", f"Você já analisou {current['uploads_limit']} vídeos nesta conta. Ative o Vitalício Fundador para continuar.")
