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
    assert entitlement(client) == {"plan": "free", "source": None, "tier": None, "uploads_limit": None, "uploads_used": 0, "uploads_remaining": None, "can_upload": True, "can_see_rewrites": True, "billing_configured": False, "free_analyses_limit": None, "free_analyses_used": 0, "free_analyses_remaining": None}
    for _ in range(2):
        assert send_video(client, fake_db, sample_video).status_code == 201


def test_free_plan_allows_five_uploads_then_blocks(client, fake_db, sample_video, billing):
    """O teto anti-abuso: cinco vídeos por conta grátis. Quantas saem completas é outra conta."""
    inicial = entitlement(client)
    assert inicial["plan"] == "free" and inicial["uploads_limit"] == 5 and inicial["uploads_remaining"] == 5
    # as três primeiras análises saem completas; a partir daí, parciais
    assert inicial["free_analyses_limit"] == 3 and inicial["free_analyses_remaining"] == 3
    assert inicial["can_see_rewrites"] is True

    for n in range(1, 6):
        assert send_video(client, fake_db, sample_video).status_code == 201, f"upload {n}"
        me = entitlement(client)
        assert me["uploads_used"] == n and me["uploads_remaining"] == 5 - n
        assert me["free_analyses_remaining"] == max(0, 3 - n)
        assert me["can_see_rewrites"] is (n < 3)

    assert entitlement(client)["can_upload"] is False
    r = send_video(client, fake_db, sample_video)
    assert r.status_code == 402 and r.json()["error"]["code"] == "FREE_LIMIT_REACHED"
    assert "5 vídeos" in r.json()["error"]["message"] and "Vitalício Fundador" in r.json()["error"]["message"]
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
    assert ent == {"plan": "lifetime", "source": "purchase", "tier": "pro", "uploads_limit": None, "uploads_used": 5, "uploads_remaining": None, "can_upload": True, "can_see_rewrites": True, "billing_configured": True, "free_analyses_limit": None, "free_analyses_used": 5, "free_analyses_remaining": None}
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


def test_a_repeated_webhook_does_not_duplicate_access_or_events(client, fake_db, billing):
    """O Stripe reenvia o mesmo evento ate receber 200: repetir nao pode contar duas vezes."""
    for _ in range(3):
        assert webhook(client, "checkout.session.completed", paid_session(reference=ALICE["id"])).status_code == 200

    assert len(fake_db.purchases) == 1
    pagos = [e for e in fake_db.events if e["name"] == "payment_completed"]
    assert len(pagos) == 1
    assert pagos[0]["user_id"] == ALICE["id"]
    assert pagos[0]["props"]["amount_cents"] == 1200 and pagos[0]["props"]["plan"] == "lifetime"
    # e o acesso continua liberado, uma vez so
    assert entitlement(client)["plan"] == "lifetime"


def test_failed_and_expired_checkouts_are_recorded_without_granting_access(client, fake_db, billing):
    expirada = {"id": "cs_test_expirada", "client_reference_id": ALICE["id"], "mode": "payment", "payment_status": "unpaid"}
    assert webhook(client, "checkout.session.expired", expirada).status_code == 200

    recusado = {"id": "pi_recusado", "last_payment_error": {"code": "card_declined"}}
    assert webhook(client, "payment_intent.payment_failed", recusado).status_code == 200

    motivos = [e["props"]["reason"] for e in fake_db.events if e["name"] == "payment_failed"]
    assert motivos == ["expired", "card_declined"]
    # nada disso libera nada
    assert entitlement(client)["plan"] == "free" and fake_db.purchases == {}


def test_an_unknown_webhook_is_acknowledged_and_ignored(client, fake_db, billing):
    """Responder 200 para o que nao interessa evita o Stripe reenviar para sempre."""
    assert webhook(client, "customer.created", {"id": "cus_1"}).status_code == 200
    assert fake_db.purchases == {} and fake_db.events == []


def test_refreshing_the_thank_you_page_after_paying_is_safe(client, fake_db, billing):
    """F5 no /obrigado chama a confirmacao de novo: nao pode duplicar compra nem evento."""
    billing["cs_test_abc123"] = paid_session()

    for _ in range(3):
        confirmado = client.post("/api/billing/confirm", json={"session_id": "cs_test_abc123"}, headers=auth())
        assert confirmado.status_code == 200
        assert confirmado.json()["entitlement"]["plan"] == "lifetime"

    assert len(fake_db.purchases) == 1
    assert len([e for e in fake_db.events if e["name"] == "payment_completed"]) == 1


def test_a_session_that_was_never_paid_does_not_unlock_anything(client, fake_db, billing):
    """O frontend nunca libera sozinho: sem pagamento no Stripe, a resposta e 402."""
    billing["cs_test_aberta"] = {**paid_session(session_id="cs_test_aberta"), "payment_status": "unpaid"}

    recusado = client.post("/api/billing/confirm", json={"session_id": "cs_test_aberta"}, headers=auth())
    assert recusado.status_code == 402 and recusado.json()["error"]["code"] == "NOT_PAID"
    assert entitlement(client)["plan"] == "free" and fake_db.purchases == {}
