"""Payments: three Stripe payment links, a webhook, and who may analyse.

  - Creator (US$ 12/month) and Pro (US$ 24/month): subscriptions. A row per Stripe
    subscription in `subscriptions`, always rewritten from the subscription as
    Stripe returns it (never from what the browser says). Access lasts while
    Stripe says the subscription is active, trialing or past_due (Stripe is still
    retrying the card); canceled, unpaid, incomplete or paused close it.
  - Founder Lifetime (US$ 49 once): a one-time payment, stored in `purchases`.

How a subscription turns into access: `checkout.session.completed` (mode
"subscription") links the subscription to the account named in
`client_reference_id`; every `customer.subscription.*` event re-reads the
subscription at Stripe, so events arriving twice or out of order change nothing.
/success confirms the session at Stripe too, so access unlocks without waiting
for the webhook. A subscription paid before the account existed is linked by
e-mail on the first `entitlement()` call, like a purchase.

Founder Lifetime is limited to the first `FOUNDER_LIMIT` buyers. The counter is real: it
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
from app.services import analytics_service, appsumo_service, events_service, partners_service, supabase_service as db

logger = logging.getLogger("publishub")

PLAN_LIFETIME = "lifetime"
PLAN_FREE = "free"
PLAN_CREATOR = "creator"
PLAN_PRO = "pro"
PLAN_APPSUMO = "appsumo"

# O que vai em analyses.tier. "pro" é a análise mais profunda (mais frames, plano
# maior): é a do Pro mensal e a do Vitalício Fundador, como sempre foi para quem
# comprou o fundador. "creator" é a análise completa de sempre.
TIER_CREATOR = "creator"
TIER_PRO = "pro"
TIER_FOUNDER = TIER_PRO
_TIER_RANK = {None: 0, TIER_CREATOR: 1, TIER_PRO: 2}


def _best_tier(*tiers: str | None) -> str | None:
    """Quem tem mais de uma fonte (assinatura e códigos do AppSumo) fica com a análise mais profunda."""
    return max(tiers, key=lambda t: _TIER_RANK.get(t, 0))

# Os status do Stripe em que a assinatura dá acesso. past_due: a renovação falhou e
# o Stripe ainda está tentando o cartão; quando ele desistir, o status muda para
# canceled ou unpaid (conforme o painel do Stripe) e o acesso fecha.
_SUBSCRIPTION_ACCESS = {"active", "trialing", "past_due"}
# Uma assinatura "active" cujo período acabou há mais que isso é um webhook que se
# perdeu, não um cliente pagante: o acesso fecha até o Stripe dizer o contrário.
_PERIOD_GRACE = timedelta(days=3)
SUBSCRIPTION_EVENTS = {
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "customer.subscription.paused",
    "customer.subscription.resumed",
}

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


def _plain(obj) -> dict:
    """O objeto do Stripe como dict comum.

    Desde a stripe-python 13 um StripeObject não é mais dict (não tem `.get`):
    tudo o que vem do Stripe passa por aqui antes de chegar ao resto do código.
    """
    return obj.to_dict() if hasattr(obj, "to_dict") else obj


def _retrieve_session(session_id: str) -> dict:
    """The Checkout Session as Stripe has it. Split out so tests can stub it."""
    try:
        return _plain(_stripe().checkout.Session.retrieve(session_id))
    except stripe.InvalidRequestError as exc:
        logger.info("stripe session %s not found: %s", session_id, exc)
        raise ApiError(404, "SESSION_NOT_FOUND", "Não encontramos este pagamento no Stripe.") from exc
    except stripe.StripeError as exc:
        logger.error("stripe error retrieving %s: %s", session_id, exc)
        raise ApiError(502, "STRIPE_ERROR", "Não foi possível falar com o Stripe agora. Tente novamente.") from exc


def _retrieve_subscription(subscription_id: str) -> dict:
    """The subscription as Stripe has it right now, with the customer (for the e-mail). Split out so tests can stub it."""
    try:
        return _plain(_stripe().Subscription.retrieve(subscription_id, expand=["customer"]))
    except stripe.StripeError as exc:
        logger.error("stripe error retrieving subscription %s: %s", subscription_id, exc)
        raise ApiError(502, "STRIPE_ERROR", "Não foi possível falar com o Stripe agora. Tente novamente.") from exc


def _retrieve_invoice(invoice_id: str) -> dict:
    """A fatura como o Stripe a tem agora, com os pagamentos (nas versões novas da API eles só vêm expandidos). Split out so tests can stub it."""
    try:
        return _plain(_stripe().Invoice.retrieve(invoice_id, expand=["payments"]))
    except stripe.StripeError as exc:
        logger.error("stripe error retrieving invoice %s: %s", invoice_id, exc)
        raise ApiError(502, "STRIPE_ERROR", "Não foi possível falar com o Stripe agora. Tente novamente.") from exc


def _create_portal_session(customer_id: str, return_url: str) -> dict:
    """A sessão do portal do cliente do Stripe (cancelar, trocar cartão, recibos). Split out so tests can stub it."""
    try:
        return _plain(_stripe().billing_portal.Session.create(customer=customer_id, return_url=return_url))
    except stripe.StripeError as exc:
        # o portal precisa estar ativado no painel do Stripe (Settings → Billing → Customer portal)
        logger.error("stripe error opening the portal for %s: %s", customer_id, exc)
        raise ApiError(502, "STRIPE_ERROR", "Não foi possível abrir o portal de assinatura agora. Fale com o suporte.") from exc


def _construct_event(payload: bytes, signature: str | None) -> dict:
    """Verifies the webhook signature. Split out so tests can stub it."""
    settings = get_settings()
    if not settings.stripe_webhook_secret:
        raise ApiError(503, "BILLING_NOT_CONFIGURED", "O webhook do Stripe ainda não foi configurado.")
    try:
        return _plain(stripe.Webhook.construct_event(payload, signature or "", settings.stripe_webhook_secret))
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


# ---------------------------------------------------------------- assinaturas (Creator e Pro)


def subscription_plan(price_id: str | None, product_id: str | None) -> str | None:
    """"creator", "pro" ou None (um preço que o backend não conhece não dá acesso nenhum)."""
    settings = get_settings()
    ids = {i for i in (price_id, product_id) if i}
    if ids & settings.stripe_pro_ids:
        return PLAN_PRO
    if ids & settings.stripe_creator_ids:
        return PLAN_CREATOR
    return None


def _id_of(value) -> str | None:
    """Um campo do Stripe que pode vir como id ou como objeto expandido."""
    if isinstance(value, str):
        return value
    if value is not None and hasattr(value, "get"):
        return value.get("id")
    return None


def _timestamp(value) -> str | None:
    return datetime.fromtimestamp(int(value), timezone.utc).isoformat() if value else None


def _subscription_row(subscription: dict, email: str | None = None) -> dict:
    """A linha a gravar, tirada da assinatura como o Stripe a devolve."""
    items = (subscription.get("items") or {}).get("data") or []
    item = items[0] if items else {}
    price = item.get("price") or {}
    product_id = _id_of(price.get("product"))
    customer = subscription.get("customer")
    customer_email = customer.get("email") if customer is not None and hasattr(customer, "get") else None
    # nas versões novas da API o fim do período mora no item, não na assinatura
    period_end = item.get("current_period_end") or subscription.get("current_period_end")
    return {
        "stripe_subscription_id": subscription["id"],
        "stripe_customer_id": _id_of(customer),
        "stripe_price_id": price.get("id"),
        "stripe_product_id": product_id,
        "plan": subscription_plan(price.get("id"), product_id),
        "status": subscription.get("status") or "incomplete",
        "email": ((email or customer_email or "").strip().lower() or None),
        "current_period_end": _timestamp(period_end),
        "cancel_at_period_end": bool(subscription.get("cancel_at_period_end")),
        "canceled_at": _timestamp(subscription.get("canceled_at")),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def subscription_grants_access(row: dict | None) -> bool:
    """A assinatura dá acesso agora? Plano conhecido, status do Stripe que paga, período que não venceu."""
    if not row or row.get("plan") not in (PLAN_CREATOR, PLAN_PRO):
        return False
    if row.get("status") not in _SUBSCRIPTION_ACCESS:
        return False
    end = row.get("current_period_end")
    if not end:
        return True
    return datetime.fromisoformat(str(end).replace("Z", "+00:00")) + _PERIOD_GRACE > datetime.now(timezone.utc)


def sync_subscription(subscription_id: str, *, user: dict | None = None, user_id: str | None = None, email: str | None = None, checkout_session_id: str | None = None) -> dict:
    """Grava a assinatura como o Stripe a tem agora (idempotente pelo id da assinatura).

    Sempre relida no Stripe: um evento repetido ou fora de ordem grava o mesmo
    estado de novo, nunca um estado velho por cima de um novo.
    """
    row = _subscription_row(_retrieve_subscription(subscription_id), email)
    existing = db.get_subscription(row["stripe_subscription_id"])
    row["user_id"] = None
    if existing:
        if user and existing.get("user_id") and existing["user_id"] != user["id"]:
            raise ApiError(409, "PURCHASE_OWNED", "Esta assinatura já está ligada a outra conta. Entre com ela ou responda o e-mail do recibo.")
        row["user_id"] = existing.get("user_id")
        row["email"] = row["email"] or existing.get("email")
        row["stripe_checkout_session_id"] = existing.get("stripe_checkout_session_id")
    if user_id and not row["user_id"]:
        row["user_id"] = user_id
    if user:
        row["user_id"] = user["id"]
    if checkout_session_id and not row.get("stripe_checkout_session_id"):
        row["stripe_checkout_session_id"] = checkout_session_id
    if row["plan"] is None:
        logger.error("subscription %s uses price %s / product %s, unknown to STRIPE_CREATOR_IDS and STRIPE_PRO_IDS: no access granted", row["stripe_subscription_id"], row["stripe_price_id"], row["stripe_product_id"])

    stored = db.upsert_subscription(row)
    # a primeira vez que o checkout desta assinatura é visto: webhook repetido não vira evento repetido
    first_checkout = bool(checkout_session_id) and not (existing or {}).get("stripe_checkout_session_id")
    if first_checkout and subscription_grants_access(stored):
        logger.info("subscription %s (%s) started for user %s", stored["stripe_subscription_id"], stored["plan"], stored.get("user_id"))
        events_service.record_for_user(stored.get("user_id"), "payment_completed", props={"plan": stored["plan"], "billing": "monthly"})
        analytics_service.capture(
            "purchase_completed",
            analytics_service.distinct_id(stored.get("user_id"), None, f"subscription:{stored['stripe_subscription_id']}"),
            {"plan": stored["plan"], "billing": "monthly"},
        )
    return stored


def _record_subscription_checkout(session: dict, user: dict | None = None) -> dict | None:
    """O checkout de uma assinatura terminou: liga a assinatura à conta. None se não terminou."""
    subscription_id = _id_of(session.get("subscription"))
    if session.get("mode") != "subscription" or session.get("status") != "complete" or not subscription_id:
        return None
    user_id, _ = parse_reference(session.get("client_reference_id"))
    details = session.get("customer_details") or {}
    email = details.get("email") or session.get("customer_email")
    stored = sync_subscription(subscription_id, user=user, user_id=user_id, email=email, checkout_session_id=session["id"])
    invoice_id = _id_of(session.get("invoice"))
    if invoice_id and stored.get("user_id"):
        # a primeira mensalidade: o invoice.paid dela pode ter chegado antes da conta estar ligada
        try:
            _record_invoice_commission(_retrieve_invoice(invoice_id))
        except ApiError:
            logger.warning("subscription %s: first invoice %s not read, commission left to invoice.paid", subscription_id, invoice_id)
    return stored if subscription_grants_access(stored) else None


def _invoice_subscription_id(invoice: dict) -> str | None:
    """A assinatura da fatura: no topo nas versões antigas da API, em parent.subscription_details nas novas."""
    parent = (invoice.get("parent") or {}).get("subscription_details") or {}
    return _id_of(invoice.get("subscription")) or _id_of(parent.get("subscription"))


def _invoice_payment_intent(invoice: dict) -> str | None:
    """O pagamento da fatura (para estornar a comissão num reembolso): no topo nas versões antigas, em payments nas novas."""
    intent = _id_of(invoice.get("payment_intent"))
    if intent:
        return intent
    for payment in (invoice.get("payments") or {}).get("data") or []:
        intent = _id_of((payment.get("payment") or {}).get("payment_intent"))
        if intent:
            return intent
    return None


def _record_invoice_commission(invoice: dict) -> None:
    """Uma mensalidade paga: se quem pagou foi indicado por um Partner, a comissão dela fica registrada.

    Chamada pelo webhook `invoice.paid` (toda renovação) e no fim do checkout (a
    primeira fatura, que pode chegar antes de a assinatura estar ligada à conta).
    Uma comissão por fatura: repetir não duplica.
    """
    subscription_id = _invoice_subscription_id(invoice)
    amount = int(invoice.get("amount_paid") or 0)
    if not subscription_id or amount <= 0 or invoice.get("status") != "paid":
        return
    stored = db.get_subscription(subscription_id) or sync_subscription(subscription_id)
    if not stored.get("user_id"):
        # ainda sem conta: o fim do checkout registra a primeira fatura quando ligar a assinatura
        logger.info("invoice %s: subscription %s has no account yet, no commission now", invoice.get("id"), subscription_id)
        return
    intent = _invoice_payment_intent(invoice)
    if intent is None and invoice.get("id"):
        # versões novas da API: o evento não traz os pagamentos; sem eles, o reembolso não acha a comissão
        try:
            intent = _invoice_payment_intent(_retrieve_invoice(invoice["id"]))
        except ApiError:
            logger.warning("invoice %s: payments not read, its commission can't be reversed by a refund", invoice["id"])
    partners_service.record_invoice_commission(stored["user_id"], invoice["id"], amount, invoice.get("currency") or "usd", intent)


def _subscriptions_of(user: dict) -> list[dict]:
    """As assinaturas da conta; as feitas antes da conta existir são ligadas aqui, pelo e-mail."""
    email = (user.get("email") or "").strip().lower()
    subscriptions = db.list_subscriptions(user["id"], email)
    if email and any(not s.get("user_id") for s in subscriptions):
        db.link_subscriptions(email, user["id"])
    return subscriptions


def _active_subscription(user: dict) -> dict | None:
    """A assinatura que dá acesso agora (a do Pro, se houver as duas)."""
    active = [s for s in _subscriptions_of(user) if subscription_grants_access(s)]
    active.sort(key=lambda s: s["plan"] != PLAN_PRO)
    return active[0] if active else None


def portal_session(user: dict) -> dict:
    """O link do portal do Stripe para quem assina: cancelar, trocar o cartão, ver recibos."""
    with_customer = [s for s in _subscriptions_of(user) if s.get("stripe_customer_id")]
    if not with_customer:
        raise ApiError(404, "NO_SUBSCRIPTION", "Esta conta não tem assinatura.")
    current = next((s for s in with_customer if subscription_grants_access(s)), with_customer[0])
    session = _create_portal_session(current["stripe_customer_id"], f"{get_settings().app_url}/account")
    return {"url": session["url"]}


def confirm_session(user: dict, session_id: str) -> dict:
    """Called by /success when the person is logged in: unlocks the access right away."""
    if not SESSION_ID_RE.match(session_id):
        raise ApiError(400, "INVALID_SESSION", "Link de pagamento inválido.")
    session = _retrieve_session(session_id)
    if session.get("mode") == "subscription":
        if _record_subscription_checkout(session, user) is None:
            raise ApiError(402, "NOT_PAID", "Não encontramos um pagamento confirmado neste link.")
        return entitlement(user)
    if record_session(session, user) is None:
        raise ApiError(402, "NOT_PAID", "Não encontramos um pagamento confirmado neste link.")
    return entitlement(user)


def public_session(session_id: str) -> dict:
    """Called by /obrigado when nobody is logged in: says whether it's paid, without exposing the e-mail."""
    if not SESSION_ID_RE.match(session_id):
        raise ApiError(400, "INVALID_SESSION", "Link de pagamento inválido.")
    session = _retrieve_session(session_id)
    if session.get("mode") == "subscription":
        stored = _record_subscription_checkout(session)  # guarda já, para ligar pelo e-mail quando a conta for criada
        if stored is None or not stored.get("email"):
            return {"paid": False, "email_masked": None, "amount_cents": None, "currency": None}
        return {"paid": True, "email_masked": _mask(stored["email"]), "amount_cents": int(session.get("amount_total") or 0), "currency": (session.get("currency") or "usd").lower()}
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
        if obj.get("mode") == "subscription":
            if _record_subscription_checkout(obj) is None:
                logger.info("stripe webhook %s: subscription checkout %s gives no access (yet)", kind, obj.get("id"))
        elif record_session(obj) is None:
            logger.info("stripe webhook %s ignored: session %s not a paid one-time payment", kind, obj.get("id"))
    elif kind in SUBSCRIPTION_EVENTS:
        # criada, renovada, atrasada, cancelada: relida no Stripe, é sempre o estado de agora
        stored = sync_subscription(obj["id"])
        logger.info("stripe %s: subscription %s is %s (%s)", kind, stored["stripe_subscription_id"], stored["status"], stored.get("plan"))
    elif kind == "invoice.paid":
        # toda mensalidade paga (a primeira e as renovações): é aqui que o Partner ganha a comissão dela
        _record_invoice_commission(obj)
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
    """"pro", "creator" ou None (sem acesso pago): a profundidade da próxima análise.

    O Vitalício Fundador (comprado ou ganho no programa de parceria) é "pro",
    como sempre foi. A assinatura dá o tier do plano assinado.
    """
    if _lifetime_source(user):
        return TIER_FOUNDER
    subscription = _active_subscription(user)
    appsumo = appsumo_service.summary(user["id"])
    return _best_tier(subscription["plan"] if subscription else None, appsumo["tier"] if appsumo else None)


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
    """A conta tem um plano pago agora (ou o servidor não cobra de ninguém).

    Sem contar vídeos: isto roda a cada poll. Quem tem plano pago destrava também
    as análises antigas que nasceram parciais; quando a assinatura acaba, elas
    voltam a mostrar só a parte grátis (as que nasceram completas continuam completas).
    """
    if not get_settings().billing_configured:
        return True
    return _lifetime_source(user) is not None or _active_subscription(user) is not None or appsumo_service.summary(user["id"]) is not None


def analysis_starts_unlocked(user: dict) -> bool:
    """A próxima análise desta conta sai completa?

    As primeiras da conta saem: ninguém compra o que nunca viu. Passado o limite,
    a análise continua acontecendo, mas o plano de ação fica atrás do paywall.
    """
    if has_full_access(user):
        return True
    return db.count_videos(user["id"]) < get_settings().free_full_analyses + partners_service.bonus_analyses(user["id"])


def _public_subscription(row: dict | None) -> dict | None:
    """O que a tela da conta mostra da assinatura (nada de ids do Stripe)."""
    if not row:
        return None
    return {
        "plan": row["plan"],
        "status": row["status"],
        "current_period_end": row.get("current_period_end"),
        "cancel_at_period_end": bool(row.get("cancel_at_period_end")),
    }


def entitlement(user: dict) -> dict:
    """What the account may do: plan, where it came from, and the free-upload counter.

    `plan`: "free", "creator" ou "pro" (assinatura mensal ativa) ou "lifetime"
    (Vitalício Fundador). O vitalício e a assinatura são contados à parte: quem
    tem os dois aparece como "lifetime", e a assinatura continua em `subscription`
    (é por ela que a tela da conta oferece o portal para cancelar).

    O grátis analisa e vê o segundo da queda e a frase; as reescritas e o copiloto
    são dos planos pagos (`can_see_rewrites`). O contador de uploads continua
    existindo, mas como limite anti-abuso, não como porta do produto.
    """
    settings = get_settings()
    used = db.count_videos(user["id"])
    source = _lifetime_source(user)
    subscription = _active_subscription(user)
    appsumo = appsumo_service.summary(user["id"])
    paid_tier = TIER_FOUNDER if source else _best_tier(subscription["plan"] if subscription else None, appsumo["tier"] if appsumo else None)

    base = {"uploads_used": used, "billing_configured": settings.billing_configured, "tier": paid_tier, "subscription": _public_subscription(subscription)}
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
    if subscription:
        return {**base, **unlimited, "plan": subscription["plan"], "source": "subscription"}
    if appsumo:
        # o AppSumo é o único plano pago: análises completas, com o limite do mês do nível
        month_used = appsumo_service.used_this_month(user["id"])
        left = max(0, appsumo["monthly_limit"] - month_used)
        return {
            **base,
            **unlimited,
            "plan": PLAN_APPSUMO,
            "source": "appsumo",
            "uploads_limit": appsumo["monthly_limit"],
            "uploads_remaining": left,
            "can_upload": left > 0,
            "appsumo": {**appsumo, "used_this_month": month_used},
        }
    if not settings.billing_configured:
        # sem Stripe ninguém consegue pagar, então também não bloqueamos nada
        return {**base, **unlimited, "plan": PLAN_FREE, "source": None}

    # indique e ganhe: as análises a mais valem para as completas e para o teto de uploads
    bonus = partners_service.bonus_analyses(user["id"])
    free_limit = settings.free_full_analyses + bonus
    free_remaining = max(0, free_limit - used)
    limit = settings.free_uploads + bonus
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
        "bonus_analyses": bonus,
        "can_see_rewrites": free_remaining > 0,
    }


def ensure_can_upload(user: dict) -> dict:
    current = entitlement(user)
    if current["can_upload"]:
        return current
    if current["plan"] == PLAN_APPSUMO:
        raise ApiError(402, "APPSUMO_MONTHLY_LIMIT", f"Você já fez as {current['uploads_limit']} análises do mês do seu plano AppSumo. O limite renova no dia 1.")
    raise ApiError(402, "FREE_LIMIT_REACHED", f"Você já analisou {current['uploads_limit']} vídeos nesta conta. Escolha um plano (Creator ou Pro) para continuar.")
