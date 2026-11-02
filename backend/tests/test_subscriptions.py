"""As assinaturas mensais (Creator e Pro), ao lado do Vitalício Fundador.

O que não pode quebrar:
  - acesso só com o Stripe dizendo que a assinatura está paga, nunca pela URL de sucesso;
  - o plano sai do preço que o Stripe cobrou, nunca do que o navegador diz;
  - evento repetido ou fora de ordem não duplica nem ressuscita acesso;
  - assinatura e vitalício são contados à parte: um acabar não mexe no outro.
"""

import hashlib
import hmac
import json
import time

import pytest

from app.core.config import get_settings
from app.core.errors import ApiError
from app.services import analysis_service, billing_service
from tests.conftest import ALICE, BOB, auth, register, upload, upload_image
from tests.test_billing import paid_session, webhook

CREATOR_PRICE = "price_1UQzqs2cdYlX3v8ab4Zv2AxE"
CREATOR_PRODUCT = "prod_VRteUtYYnuX7Mv"
PRO_PRICE = "price_1UQzhy2cdYlX3v8aWNB0shVE"
PRO_PRODUCT = "prod_VRtUKqyOXnW2K7"


@pytest.fixture
def stripe_state(env, monkeypatch):
    """Stripe ligado e em memória: sessões de checkout e assinaturas como o Stripe as devolveria."""
    env.setenv("STRIPE_SECRET_KEY", "sk_test_x")
    env.setenv("STRIPE_WEBHOOK_SECRET", "whsec_x")
    env.setenv("FREE_UPLOADS", "5")
    get_settings.cache_clear()

    state = {"sessions": {}, "subscriptions": {}, "portal_customers": []}

    def retrieve_session(session_id):
        if session_id not in state["sessions"]:
            raise ApiError(404, "SESSION_NOT_FOUND", "x")
        return state["sessions"][session_id]

    def retrieve_subscription(subscription_id):
        return state["subscriptions"][subscription_id]

    def portal(customer_id, return_url):
        state["portal_customers"].append(customer_id)
        return {"url": f"https://billing.stripe.com/p/session/test_{customer_id}"}

    def construct(payload, signature):
        if signature != "assinatura-boa":
            raise ApiError(400, "INVALID_SIGNATURE", "x")
        return json.loads(payload)

    monkeypatch.setattr(billing_service, "_retrieve_session", retrieve_session)
    monkeypatch.setattr(billing_service, "_retrieve_subscription", retrieve_subscription)
    monkeypatch.setattr(billing_service, "_create_portal_session", portal)
    monkeypatch.setattr(billing_service, "_construct_event", construct)
    monkeypatch.setattr(analysis_service, "run_analysis", lambda analysis_id, ui_language=None: None)
    return state


def subscription(sub_id="sub_1", status="active", price=CREATOR_PRICE, product=CREATOR_PRODUCT, email="alice@example.com", period_end=None, cancel_at_period_end=False):
    """Uma assinatura no formato da API do Stripe (fim do período no item, como nas versões novas)."""
    return {
        "id": sub_id,
        "object": "subscription",
        "status": status,
        "customer": {"id": f"cus_{sub_id}", "object": "customer", "email": email},
        "cancel_at_period_end": cancel_at_period_end,
        "canceled_at": None,
        "items": {"object": "list", "data": [{"price": {"id": price, "product": product}, "current_period_end": period_end or int(time.time()) + 30 * 86400}]},
    }


def checkout(session_id="cs_test_sub1", sub_id="sub_1", reference=None, email="alice@example.com", status="complete", amount=1200):
    return {
        "id": session_id,
        "object": "checkout.session",
        "mode": "subscription",
        "status": status,
        "payment_status": "paid" if status == "complete" else "unpaid",
        "subscription": sub_id if status == "complete" else None,
        "client_reference_id": reference,
        "customer_details": {"email": email},
        "amount_total": amount,
        "currency": "usd",
    }


def subscribe(client, stripe_state, sub_id="sub_1", price=CREATOR_PRICE, product=CREATOR_PRODUCT, reference=ALICE["id"], email="alice@example.com"):
    stripe_state["subscriptions"][sub_id] = subscription(sub_id, price=price, product=product, email=email)
    session = checkout(f"cs_test_{sub_id.replace('_', '')}", sub_id, reference=reference, email=email)
    stripe_state["sessions"][session["id"]] = session
    assert webhook(client, "checkout.session.completed", session).status_code == 200
    return session


def entitlement(client, token="alice-token"):
    return client.get("/api/me", headers=auth(token)).json()["entitlement"]


def send_video(client, fake_db, sample_video, token="alice-token", user=ALICE):
    return register(client, fake_db, token, upload(fake_db, user, sample_video), upload_image(fake_db, user))


# ---------------------------------------------------------------- o plano certo, do preço certo


def test_creator_subscription_unlocks_full_analyses_at_the_creator_depth(client, fake_db, sample_video, stripe_state):
    subscribe(client, stripe_state)

    ent = entitlement(client)
    assert ent["plan"] == "creator" and ent["source"] == "subscription" and ent["tier"] == "creator"
    assert ent["can_see_rewrites"] is True and ent["can_upload"] is True and ent["uploads_limit"] is None
    assert ent["subscription"]["plan"] == "creator" and ent["subscription"]["status"] == "active"
    assert ent["subscription"]["cancel_at_period_end"] is False

    # passa do teto grátis (5) sem bloqueio, e cada análise nasce completa, com o tier do Creator
    for _ in range(6):
        assert send_video(client, fake_db, sample_video).status_code == 201
    assert {a["tier"] for a in fake_db.analyses.values()} == {"creator"}
    assert all(a["full_access"] for a in fake_db.analyses.values())


def test_pro_subscription_gets_the_deep_analysis(client, fake_db, sample_video, stripe_state):
    subscribe(client, stripe_state, price=PRO_PRICE, product=PRO_PRODUCT)

    ent = entitlement(client)
    assert ent["plan"] == "pro" and ent["tier"] == "pro"
    assert send_video(client, fake_db, sample_video).status_code == 201
    assert next(iter(fake_db.analyses.values()))["tier"] == "pro"


def test_the_plan_comes_from_the_price_stripe_charged_not_from_the_event(client, fake_db, stripe_state):
    """O evento diz Pro, o Stripe diz Creator: vale o Stripe (o evento é relido lá)."""
    stripe_state["subscriptions"]["sub_1"] = subscription("sub_1", price=CREATOR_PRICE, product=CREATOR_PRODUCT)
    forjado = subscription("sub_1", price=PRO_PRICE, product=PRO_PRODUCT)
    assert webhook(client, "customer.subscription.created", forjado).status_code == 200
    assert fake_db.subscriptions["sub_1"]["plan"] == "creator"


def test_an_unknown_price_grants_nothing(client, fake_db, stripe_state):
    stripe_state["subscriptions"]["sub_x"] = subscription("sub_x", price="price_desconhecido", product="prod_desconhecido")
    session = checkout("cs_test_x", "sub_x", reference=ALICE["id"])
    assert webhook(client, "checkout.session.completed", session).status_code == 200
    assert fake_db.subscriptions["sub_x"]["plan"] is None
    assert entitlement(client)["plan"] == "free"


def test_the_ids_of_each_plan_can_change_without_a_deploy(client, fake_db, stripe_state, env):
    env.setenv("STRIPE_PRO_IDS", "price_novo_pro")
    get_settings.cache_clear()
    assert billing_service.subscription_plan("price_novo_pro", None) == "pro"
    assert billing_service.subscription_plan(PRO_PRICE, PRO_PRODUCT) is None
    assert billing_service.subscription_plan(CREATOR_PRICE, None) == "creator"


# ---------------------------------------------------------------- o Stripe confirma, a URL não


def test_success_page_confirms_at_stripe_and_unlocks_right_away(client, fake_db, stripe_state):
    stripe_state["subscriptions"]["sub_1"] = subscription("sub_1")
    stripe_state["sessions"]["cs_test_ok"] = checkout("cs_test_ok", "sub_1")  # sem client_reference_id

    for _ in range(3):  # F5 na /success
        r = client.post("/api/billing/confirm", json={"session_id": "cs_test_ok"}, headers=auth())
        assert r.status_code == 200, r.text
        assert r.json()["entitlement"]["plan"] == "creator"

    assert len(fake_db.subscriptions) == 1 and fake_db.subscriptions["sub_1"]["user_id"] == ALICE["id"]
    assert len([e for e in fake_db.events if e["name"] == "payment_completed"]) == 1

    # outra conta não leva a assinatura de Alice
    r = client.post("/api/billing/confirm", json={"session_id": "cs_test_ok"}, headers=auth("bob-token"))
    assert r.status_code == 409 and r.json()["error"]["code"] == "PURCHASE_OWNED"
    assert entitlement(client, "bob-token")["plan"] == "free"


def test_a_canceled_or_unfinished_checkout_grants_nothing(client, fake_db, stripe_state):
    stripe_state["sessions"]["cs_test_aberta"] = checkout("cs_test_aberta", status="open")
    r = client.post("/api/billing/confirm", json={"session_id": "cs_test_aberta"}, headers=auth())
    assert r.status_code == 402 and r.json()["error"]["code"] == "NOT_PAID"

    expirada = checkout("cs_test_expirada", status="expired", reference=ALICE["id"])
    assert webhook(client, "checkout.session.expired", expirada).status_code == 200
    assert webhook(client, "checkout.session.completed", expirada).status_code == 200

    # o cartão foi recusado na primeira cobrança: o Stripe deixa a assinatura "incomplete"
    stripe_state["subscriptions"]["sub_inc"] = subscription("sub_inc", status="incomplete")
    stripe_state["sessions"]["cs_test_inc"] = checkout("cs_test_inc", "sub_inc")
    assert client.post("/api/billing/confirm", json={"session_id": "cs_test_inc"}, headers=auth()).status_code == 402

    assert entitlement(client)["plan"] == "free"
    assert [e for e in fake_db.events if e["name"] == "payment_completed"] == []


def test_a_forged_webhook_is_rejected(client, fake_db, stripe_state):
    stripe_state["subscriptions"]["sub_1"] = subscription("sub_1")
    r = webhook(client, "checkout.session.completed", checkout(reference=ALICE["id"]), signature="forjada")
    assert r.status_code == 400 and fake_db.subscriptions == {}
    assert entitlement(client)["plan"] == "free"


# ---------------------------------------------------------------- a vida da assinatura


@pytest.mark.parametrize(
    ("status", "has_access"),
    [("active", True), ("trialing", True), ("past_due", True), ("canceled", False), ("unpaid", False), ("incomplete_expired", False), ("paused", False)],
)
def test_access_follows_the_stripe_status(client, fake_db, stripe_state, status, has_access):
    subscribe(client, stripe_state)
    stripe_state["subscriptions"]["sub_1"] = subscription("sub_1", status=status)
    assert webhook(client, "customer.subscription.updated", stripe_state["subscriptions"]["sub_1"]).status_code == 200

    ent = entitlement(client)
    assert (ent["plan"] == "creator") is has_access
    assert billing_service.has_full_access(ALICE) is has_access
    if not has_access:
        assert ent["plan"] == "free" and ent["subscription"] is None and ent["tier"] is None


def test_cancel_at_period_end_keeps_access_until_stripe_ends_it(client, fake_db, stripe_state):
    subscribe(client, stripe_state)
    stripe_state["subscriptions"]["sub_1"] = subscription("sub_1", cancel_at_period_end=True)
    webhook(client, "customer.subscription.updated", stripe_state["subscriptions"]["sub_1"])
    ent = entitlement(client)
    assert ent["plan"] == "creator" and ent["subscription"]["cancel_at_period_end"] is True

    stripe_state["subscriptions"]["sub_1"] = subscription("sub_1", status="canceled")
    webhook(client, "customer.subscription.deleted", stripe_state["subscriptions"]["sub_1"])
    assert entitlement(client)["plan"] == "free"


def test_an_active_subscription_whose_period_ended_long_ago_is_expired(client, fake_db, stripe_state):
    """Um webhook perdido não pode virar acesso para sempre."""
    subscribe(client, stripe_state)
    stripe_state["subscriptions"]["sub_1"] = subscription("sub_1", period_end=int(time.time()) - 10 * 86400)
    webhook(client, "customer.subscription.updated", stripe_state["subscriptions"]["sub_1"])
    assert entitlement(client)["plan"] == "free"


def test_repeated_and_out_of_order_events_never_resurrect_access(client, fake_db, stripe_state):
    subscribe(client, stripe_state)
    velho = subscription("sub_1", status="active")
    stripe_state["subscriptions"]["sub_1"] = subscription("sub_1", status="canceled")
    webhook(client, "customer.subscription.deleted", stripe_state["subscriptions"]["sub_1"])

    # o "updated" antigo chega depois do "deleted": o estado é relido no Stripe, e lá ela está cancelada
    for _ in range(3):
        assert webhook(client, "customer.subscription.updated", velho).status_code == 200
        assert webhook(client, "checkout.session.completed", stripe_state["sessions"]["cs_test_sub1"]).status_code == 200

    assert len(fake_db.subscriptions) == 1
    assert fake_db.subscriptions["sub_1"]["status"] == "canceled"
    assert entitlement(client)["plan"] == "free"
    assert len([e for e in fake_db.events if e["name"] == "payment_completed"]) == 1


def test_a_subscription_paid_before_the_account_existed_is_linked_by_email(client, fake_db, stripe_state):
    subscribe(client, stripe_state, reference=None, email="Bob@Example.com")
    assert fake_db.subscriptions["sub_1"]["user_id"] is None

    r = client.get("/api/billing/session/cs_test_sub1")  # /success sem login
    assert r.status_code == 200 and r.json() == {"paid": True, "email_masked": "b•••@example.com", "amount_cents": 1200, "currency": "usd"}

    assert entitlement(client, "bob-token")["plan"] == "creator"
    assert fake_db.subscriptions["sub_1"]["user_id"] == BOB["id"]
    assert entitlement(client)["plan"] == "free"  # Alice não tem nada com isso


# ---------------------------------------------------------------- assinatura e vitalício, cada um no seu lugar


def test_lifetime_and_subscription_are_counted_separately(client, fake_db, stripe_state):
    stripe_state["sessions"]["cs_test_life"] = paid_session("cs_test_life", reference=ALICE["id"], intent="pi_life")
    assert webhook(client, "checkout.session.completed", stripe_state["sessions"]["cs_test_life"]).status_code == 200
    subscribe(client, stripe_state)

    ent = entitlement(client)
    assert ent["plan"] == "lifetime" and ent["source"] == "purchase" and ent["tier"] == "pro"
    assert ent["subscription"]["plan"] == "creator"  # a tela da conta ainda oferece cancelar

    # a assinatura acaba: o vitalício continua
    stripe_state["subscriptions"]["sub_1"] = subscription("sub_1", status="canceled")
    webhook(client, "customer.subscription.deleted", stripe_state["subscriptions"]["sub_1"])
    assert entitlement(client)["plan"] == "lifetime"
    assert len(fake_db.purchases) == 1 and fake_db.purchases["cs_test_life"]["status"] == "paid"


def test_refunding_the_lifetime_does_not_touch_a_subscription(client, fake_db, stripe_state):
    stripe_state["sessions"]["cs_test_life"] = paid_session("cs_test_life", reference=ALICE["id"], intent="pi_life")
    webhook(client, "checkout.session.completed", stripe_state["sessions"]["cs_test_life"])
    subscribe(client, stripe_state, price=PRO_PRICE, product=PRO_PRODUCT)

    webhook(client, "charge.refunded", {"id": "ch_1", "payment_intent": "pi_life"})
    ent = entitlement(client)
    assert ent["plan"] == "pro" and ent["source"] == "subscription"


def test_subscriptions_do_not_take_founder_spots(client, fake_db, stripe_state):
    subscribe(client, stripe_state)
    assert client.get("/api/billing/founder").json()["taken"] == 0


# ---------------------------------------------------------------- o portal (cancelar, trocar cartão)


def test_the_portal_opens_for_the_subscriber_only(client, fake_db, stripe_state):
    r = client.post("/api/billing/portal", headers=auth())
    assert r.status_code == 404 and r.json()["error"]["code"] == "NO_SUBSCRIPTION"

    subscribe(client, stripe_state)
    r = client.post("/api/billing/portal", headers=auth())
    assert r.status_code == 200 and r.json()["url"].startswith("https://billing.stripe.com/")
    assert stripe_state["portal_customers"] == ["cus_sub_1"]

    assert client.post("/api/billing/portal", headers=auth("bob-token")).status_code == 404
    assert client.post("/api/billing/portal").status_code == 401


# ---------------------------------------------------------------- o Stripe de verdade, sem dublê


def test_a_real_signed_webhook_goes_through_the_real_stripe_library(client, fake_db, env, monkeypatch):
    """A biblioteca do Stripe devolve StripeObject, que não é dict: o caminho real tem de funcionar.

    Os outros testes trocam `_construct_event` por json.loads e nunca veriam isso.
    """
    env.setenv("STRIPE_SECRET_KEY", "sk_test_x")
    env.setenv("STRIPE_WEBHOOK_SECRET", "whsec_real")
    get_settings.cache_clear()

    session = {**paid_session("cs_test_real", reference=ALICE["id"], intent="pi_real"), "object": "checkout.session"}
    payload = json.dumps({"id": "evt_1", "object": "event", "type": "checkout.session.completed", "data": {"object": session}})
    timestamp = str(int(time.time()))
    signature = hmac.new(b"whsec_real", f"{timestamp}.{payload}".encode(), hashlib.sha256).hexdigest()

    r = client.post("/api/stripe/webhook", content=payload, headers={"stripe-signature": f"t={timestamp},v1={signature}", "content-type": "application/json"})
    assert r.status_code == 200, r.text
    assert fake_db.purchases["cs_test_real"]["user_id"] == ALICE["id"]
    assert entitlement(client)["plan"] == "lifetime"
