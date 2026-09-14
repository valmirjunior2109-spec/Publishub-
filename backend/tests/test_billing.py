"""O pagamento vira acesso: teste grátis, ativação pelo /obrigado, webhook, reembolso e limite mensal."""

import json

import pytest

from app.core.config import get_settings
from app.core.errors import ApiError
from app.services import analysis_service, billing_service
from tests.conftest import ALICE, BOB, auth, register, upload, upload_image


@pytest.fixture
def billing(env, monkeypatch):
    """Stripe 'ligado' (chaves de teste), 1 análise grátis, Creator com 2 por mês; Stripe em memória."""
    env.setenv("STRIPE_SECRET_KEY", "sk_test_x")
    env.setenv("STRIPE_WEBHOOK_SECRET", "whsec_x")
    env.setenv("FREE_ANALYSES", "1")
    env.setenv("CREATOR_ANALYSES_PER_MONTH", "2")
    get_settings.cache_clear()

    sessions: dict[str, dict] = {}

    def retrieve(session_id):
        if session_id not in sessions:
            raise ApiError(404, "SESSION_NOT_FOUND", "x")
        return sessions[session_id]

    def construct(payload, signature):
        if signature != "assinatura-boa":
            raise ApiError(400, "INVALID_SIGNATURE", "x")
        return json.loads(payload)

    monkeypatch.setattr(billing_service, "_retrieve_session", retrieve)
    monkeypatch.setattr(billing_service, "_construct_event", construct)
    # aqui só interessa a contagem: a análise em si não roda (o vídeo fica "uploaded", que conta no limite)
    monkeypatch.setattr(analysis_service, "run_analysis", lambda analysis_id: None)
    return sessions


def paid_session(session_id="cs_test_abc123", email="alice@example.com", reference=None, intent="pi_1"):
    return {
        "id": session_id,
        "mode": "payment",
        "payment_status": "paid",
        "customer_details": {"email": email},
        "client_reference_id": reference,
        "payment_intent": intent,
        "amount_total": 1200,
        "currency": "usd",
    }


def webhook(client, event_type, obj, signature="assinatura-boa"):
    body = json.dumps({"type": event_type, "data": {"object": obj}})
    return client.post("/api/stripe/webhook", content=body, headers={"stripe-signature": signature, "content-type": "application/json"})


def test_without_stripe_nobody_is_blocked(client, fake_db, fake_ai, sample_video):
    me = client.get("/api/me", headers=auth()).json()["entitlement"]
    assert me == {"plan": "free", "period": "trial", "analyses_limit": None, "analyses_used": 0, "analyses_remaining": None, "can_analyze": True, "billing_configured": False}
    for _ in range(2):
        assert register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE)).status_code == 201


def test_free_trial_then_paywall(client, fake_db, fake_ai, sample_video, billing):
    assert client.get("/api/me", headers=auth()).json()["entitlement"]["analyses_remaining"] == 1
    assert register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE)).status_code == 201

    r = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE))
    assert r.status_code == 402 and r.json()["error"]["code"] == "PAYMENT_REQUIRED"
    me = client.get("/api/me", headers=auth()).json()["entitlement"]
    assert me["plan"] == "free" and me["analyses_used"] == 1 and me["can_analyze"] is False


def test_confirm_session_unlocks_creator_immediately(client, fake_db, fake_ai, sample_video, billing):
    billing["cs_test_abc123"] = paid_session(reference=ALICE["id"])
    register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE))  # a grátis

    r = client.post("/api/billing/confirm", json={"session_id": "cs_test_abc123"}, headers=auth())
    assert r.status_code == 200, r.text
    ent = r.json()["entitlement"]
    assert ent["plan"] == "creator" and ent["analyses_limit"] == 2 and ent["analyses_used"] == 1 and ent["can_analyze"] is True
    assert fake_db.purchases["cs_test_abc123"]["user_id"] == ALICE["id"]

    # segunda chamada é idempotente; outra conta não consegue “roubar” a compra
    assert client.post("/api/billing/confirm", json={"session_id": "cs_test_abc123"}, headers=auth()).status_code == 200
    r = client.post("/api/billing/confirm", json={"session_id": "cs_test_abc123"}, headers=auth("bob-token"))
    assert r.status_code == 409 and r.json()["error"]["code"] == "PURCHASE_OWNED"

    # limite mensal do Creator: 2 por mês (a grátis já contou)
    assert register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE)).status_code == 201
    r = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE))
    assert r.status_code == 402 and r.json()["error"]["code"] == "LIMIT_REACHED"


def test_confirm_rejects_unpaid_or_unknown_sessions(client, fake_db, billing):
    billing["cs_test_open"] = {**paid_session("cs_test_open"), "payment_status": "unpaid"}
    r = client.post("/api/billing/confirm", json={"session_id": "cs_test_open"}, headers=auth())
    assert r.status_code == 402 and r.json()["error"]["code"] == "NOT_PAID"
    assert client.post("/api/billing/confirm", json={"session_id": "cs_test_nope"}, headers=auth()).status_code == 404
    assert client.post("/api/billing/confirm", json={"session_id": "hack"}, headers=auth()).status_code == 422


def test_public_session_masks_the_email_and_links_later_by_email(client, fake_db, fake_ai, sample_video, billing):
    billing["cs_test_bob"] = paid_session("cs_test_bob", email="Bob@Example.com", intent="pi_bob")
    r = client.get("/api/billing/session/cs_test_bob")  # sem login
    assert r.status_code == 200 and r.json() == {"paid": True, "email_masked": "b•••@example.com", "amount_cents": 1200, "currency": "usd"}
    assert fake_db.purchases["cs_test_bob"]["user_id"] is None

    # Bob cria a conta com o mesmo e-mail: o primeiro /api/me liga a compra a ele
    me = client.get("/api/me", headers=auth("bob-token")).json()["entitlement"]
    assert me["plan"] == "creator"
    assert fake_db.purchases["cs_test_bob"]["user_id"] == BOB["id"]


def test_webhook_records_payments_and_refunds(client, fake_db, billing):
    assert webhook(client, "checkout.session.completed", paid_session("cs_test_wh", email="bob@example.com", intent="pi_wh"), signature="ruim").status_code == 400

    assert webhook(client, "checkout.session.completed", paid_session("cs_test_wh", email="bob@example.com", intent="pi_wh")).json() == {"received": True}
    assert client.get("/api/me", headers=auth("bob-token")).json()["entitlement"]["plan"] == "creator"

    assert webhook(client, "charge.refunded", {"id": "ch_1", "payment_intent": "pi_wh"}).status_code == 200
    assert fake_db.purchases["cs_test_wh"]["status"] == "refunded"
    assert client.get("/api/me", headers=auth("bob-token")).json()["entitlement"]["plan"] == "free"

    # um evento que não é pagamento único concluído é ignorado sem erro
    assert webhook(client, "checkout.session.completed", {**paid_session("cs_test_sub"), "mode": "subscription"}).status_code == 200
    assert "cs_test_sub" not in fake_db.purchases
