"""Payments: one Stripe payment link (plan "Creator", one-time), a webhook, and who may analyse.

How a payment turns into access:
  1. /planos sends the person to the payment link with `prefilled_email` and
     `client_reference_id=<user id>` when she is logged in.
  2. After paying, Stripe redirects to /obrigado?session_id=…; the page asks the
     backend to confirm the session straight at Stripe (`confirm_session`), so the
     access is unlocked immediately, without waiting for the webhook.
  3. The webhook (`checkout.session.completed`) records the same purchase as a
     safety net, and `charge.refunded` revokes it.
  4. A purchase made before the account existed is linked by e-mail on the first
     `entitlement()` call (i.e. the first /api/me after login).
"""

import logging
import re
from datetime import datetime, timezone

import stripe

from app.core.config import get_settings
from app.core.errors import ApiError
from app.services import events_service, partners_service, supabase_service as db

logger = logging.getLogger("publishub")

PLAN_LIFETIME = "lifetime"
PLAN_FREE = "free"

# Os dois planos vitalícios. O que separa os dois é o valor pago: o Stripe já
# guarda isso em cada compra, então não precisamos de um campo novo para saber
# quem comprou o quê.
TIER_CREATOR = "creator"
TIER_PRO = "pro"
# Qualquer compra a partir daqui é Pro (o link do Pro é US$ 29; o do Creator, US$ 12).
PRO_MIN_CENTS = 2500

_UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
SESSION_ID_RE = re.compile(r"^cs_(live|test)_[A-Za-z0-9]+$")


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
    reference = session.get("client_reference_id") or ""
    intent = session.get("payment_intent")
    if isinstance(intent, dict):
        intent = intent.get("id")
    return {
        "stripe_session_id": session["id"],
        "stripe_payment_intent": intent,
        "email": email,
        "user_id": reference if _UUID_RE.match(reference) else None,
        "amount_cents": int(session.get("amount_total") or 0),
        "currency": (session.get("currency") or "usd").lower(),
        "status": "paid",
    }


def record_session(session: dict, user: dict | None = None) -> dict | None:
    """Stores (idempotently) the purchase behind a paid session; links it to `user` when given."""
    row = _purchase_from_session(session)
    if row is None:
        return None
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
    if stored.get("user_id") and stored["status"] == "paid":
        # Publishub Partners: se quem comprou veio de uma indicação, a comissão nasce aqui.
        partners_service.sync_commissions(stored["user_id"])
    if existing is None and stored["status"] == "paid":
        # a primeira vez que vemos esta sessão: webhook repetido não vira evento repetido
        logger.info("purchase recorded for session %s (user %s)", stored["stripe_session_id"], stored.get("user_id"))
        events_service.record_for_user(
            stored.get("user_id"),
            "payment_completed",
            props={"amount_cents": stored["amount_cents"], "currency": stored["currency"], "plan": PLAN_LIFETIME},
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
    reference = obj.get("client_reference_id") or ""
    if _UUID_RE.match(reference):
        return reference
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
    """"pro", "creator" ou None (sem compra).

    Quem ganhou o acesso pelo programa de parceria entra como Creator: é o plano
    que a indicação promete.
    """
    email = (user.get("email") or "").strip().lower()
    pagas = [p for p in db.list_purchases(user["id"], email) if p["status"] == "paid"]
    if any((p.get("amount_cents") or 0) >= PRO_MIN_CENTS for p in pagas):
        return TIER_PRO
    if pagas:
        return TIER_CREATOR
    # sem compra: só o programa de parceria destrava, e ele vale como Creator
    return TIER_CREATOR if partners_service.conversions(user["id"]) >= get_settings().partners_goal else None


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

    base = {"uploads_used": used, "billing_configured": settings.billing_configured, "tier": tier(user)}
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
    raise ApiError(402, "FREE_LIMIT_REACHED", f"Você já analisou {current['uploads_limit']} vídeos nesta conta. Ative o Lifetime para continuar.")
