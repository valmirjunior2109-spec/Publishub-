"""O pagamento vira acesso: 5 uploads grátis, Lifetime ilimitado, ativação pelo /obrigado, webhook e reembolso."""

import json

import pytest

from app.core.config import get_settings
from app.core.errors import ApiError
from app.services import analysis_service, billing_service
from tests.conftest import ALICE, BOB, auth, register, upload, upload_image


@pytest.fixture
def billing(env, monkeypatch):
    """Stripe 'ligado' (chaves de teste), 5 uploads grátis; Stripe em memória."""
    env.setenv("STRIPE_SECRET_KEY", "sk_test_x")
    env.setenv("STRIPE_WEBHOOK_SECRET", "whsec_x")
    env.setenv("FREE_UPLOADS", "5")
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
    monkeypatch.setattr(analysis_service, "run_analysis", lambda analysis_id, ui_language=None: None)
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


def send_video(client, fake_db, sample_video, token="alice-token", user=ALICE):
    return register(client, fake_db, token, upload(fake_db, user, sample_video), upload_image(fake_db, user))


def entitlement(client, token="alice-token"):
    return client.get("/api/me", headers=auth(token)).json()["entitlement"]


def test_without_stripe_nobody_is_blocked(client, fake_db, fake_ai, sample_video):
    assert entitlement(client) == {"plan": "free", "source": None, "uploads_limit": None, "uploads_used": 0, "uploads_remaining": None, "can_upload": True, "billing_configured": False}
    for _ in range(2):
        assert send_video(client, fake_db, sample_video).status_code == 201


def test_free_plan_allows_five_uploads_then_blocks(client, fake_db, sample_video, billing):
    assert entitlement(client) == {"plan": "free", "source": None, "uploads_limit": 5, "uploads_used": 0, "uploads_remaining": 5, "can_upload": True, "billing_configured": True}

    for n in range(1, 6):
        assert send_video(client, fake_db, sample_video).status_code == 201, f"upload {n}"
        me = entitlement(client)
        assert me["uploads_used"] == n and me["uploads_remaining"] == 5 - n

    assert entitlement(client)["can_upload"] is False
    r = send_video(client, fake_db, sample_video)
    assert r.status_code == 402 and r.json()["error"]["code"] == "FREE_LIMIT_REACHED"
    assert "5 uploads grátis" in r.json()["error"]["message"] and "Lifetime" in r.json()["error"]["message"]
    # o histórico continua acessível
    assert len(client.get("/api/videos", headers=auth()).json()["videos"]) == 5


def test_counter_is_server_side_and_ignores_uploads_that_never_registered(client, fake_db, sample_video, billing):
    # tentativa recusada na validação (print inválido) não vira vídeo, então não conta
    r = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE, b"%PDF", content_type="application/pdf"))
    assert r.status_code == 400 and entitlement(client)["uploads_used"] == 0

    # vídeo aceito conta e continua contando mesmo se a análise falhar
    # (o botão "Tentar novamente" reusa o mesmo vídeo, então uma falha nossa não gasta upload)
    assert send_video(client, fake_db, sample_video).status_code == 201
    assert entitlement(client)["uploads_used"] == 1
    video_id = next(iter(fake_db.videos))
    fake_db.videos[video_id]["status"] = "failed"
    assert entitlement(client)["uploads_used"] == 1
    assert client.post(f"/api/analyses/{next(iter(fake_db.analyses))}/retry", headers=auth()).status_code in (202, 409)
    assert entitlement(client)["uploads_used"] == 1

    # outra conta tem o próprio contador
    assert send_video(client, fake_db, sample_video, "bob-token", BOB).status_code == 201
    assert entitlement(client)["uploads_used"] == 1 and entitlement(client, "bob-token")["uploads_used"] == 1


def test_lifetime_via_checkout_is_unlimited(client, fake_db, sample_video, billing):
    billing["cs_test_abc123"] = paid_session(reference=ALICE["id"])
    for _ in range(5):
        send_video(client, fake_db, sample_video)
    assert entitlement(client)["can_upload"] is False

    r = client.post("/api/billing/confirm", json={"session_id": "cs_test_abc123"}, headers=auth())
    assert r.status_code == 200, r.text
    ent = r.json()["entitlement"]
    assert ent == {"plan": "lifetime", "source": "purchase", "uploads_limit": None, "uploads_used": 5, "uploads_remaining": None, "can_upload": True, "billing_configured": True}
    assert fake_db.purchases["cs_test_abc123"]["user_id"] == ALICE["id"]

    # mais de 5 uploads, sem bloqueio
    for _ in range(3):
        assert send_video(client, fake_db, sample_video).status_code == 201
    assert entitlement(client)["uploads_used"] == 8 and entitlement(client)["can_upload"] is True

    # segunda confirmação é idempotente; outra conta não consegue "roubar" a compra
    assert client.post("/api/billing/confirm", json={"session_id": "cs_test_abc123"}, headers=auth()).status_code == 200
    r = client.post("/api/billing/confirm", json={"session_id": "cs_test_abc123"}, headers=auth("bob-token"))
    assert r.status_code == 409 and r.json()["error"]["code"] == "PURCHASE_OWNED"


def test_confirm_rejects_unpaid_or_unknown_sessions(client, fake_db, billing):
    billing["cs_test_open"] = {**paid_session("cs_test_open"), "payment_status": "unpaid"}
    r = client.post("/api/billing/confirm", json={"session_id": "cs_test_open"}, headers=auth())
    assert r.status_code == 402 and r.json()["error"]["code"] == "NOT_PAID"
    assert client.post("/api/billing/confirm", json={"session_id": "cs_test_nope"}, headers=auth()).status_code == 404
    assert client.post("/api/billing/confirm", json={"session_id": "hack"}, headers=auth()).status_code == 422


def test_public_session_masks_the_email_and_links_later_by_email(client, fake_db, billing):
    billing["cs_test_bob"] = paid_session("cs_test_bob", email="Bob@Example.com", intent="pi_bob")
    r = client.get("/api/billing/session/cs_test_bob")  # sem login
    assert r.status_code == 200 and r.json() == {"paid": True, "email_masked": "b•••@example.com", "amount_cents": 1200, "currency": "usd"}
    assert fake_db.purchases["cs_test_bob"]["user_id"] is None

    # Bob cria a conta com o mesmo e-mail: o primeiro /api/me liga a compra a ele
    assert entitlement(client, "bob-token")["plan"] == "lifetime"
    assert fake_db.purchases["cs_test_bob"]["user_id"] == BOB["id"]


def test_webhook_records_payments_and_refunds(client, fake_db, billing):
    assert webhook(client, "checkout.session.completed", paid_session("cs_test_wh", email="bob@example.com", intent="pi_wh"), signature="ruim").status_code == 400

    assert webhook(client, "checkout.session.completed", paid_session("cs_test_wh", email="bob@example.com", intent="pi_wh")).json() == {"received": True}
    assert entitlement(client, "bob-token")["plan"] == "lifetime"

    assert webhook(client, "charge.refunded", {"id": "ch_1", "payment_intent": "pi_wh"}).status_code == 200
    assert fake_db.purchases["cs_test_wh"]["status"] == "refunded"
    assert entitlement(client, "bob-token")["plan"] == "free"

    # um evento que não é pagamento único concluído é ignorado sem erro
    assert webhook(client, "checkout.session.completed", {**paid_session("cs_test_sub"), "mode": "subscription"}).status_code == 200
    assert "cs_test_sub" not in fake_db.purchases
