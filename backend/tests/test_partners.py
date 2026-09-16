"""Publishub Partners: link único, indicação gravada, conversões válidas e o Lifetime de graça."""

import uuid
from datetime import datetime, timedelta, timezone

import pytest

from app.core.config import get_settings
from app.services import analysis_service, partners_service
from app.services import supabase_service
from tests.conftest import ALICE, BOB, TOKENS, auth, register, upload, upload_image


@pytest.fixture
def partners(env, monkeypatch):
    env.setenv("STRIPE_SECRET_KEY", "sk_test_x")
    env.setenv("FREE_UPLOADS", "5")
    env.setenv("PARTNERS_GOAL", "5")
    get_settings.cache_clear()
    monkeypatch.setattr(analysis_service, "run_analysis", lambda analysis_id, ui_language=None: None)


def new_user(fake_db, name):
    """Uma conta nova com token próprio (o perfil nasce sob demanda, como o trigger)."""
    user = {"id": str(uuid.uuid4()), "email": f"{name}@example.com"}
    TOKENS[f"{name}-token"] = user
    return user


def pay(fake_db, user, session=None):
    fake_db.upsert_purchase({"stripe_session_id": session or f"cs_test_{user['id'][:8]}", "stripe_payment_intent": f"pi_{user['id'][:8]}", "email": user["email"], "user_id": user["id"], "amount_cents": 1200, "currency": "usd", "status": "paid"})


def claim(client, token, code):
    return client.post("/api/referrals/claim", json={"code": code}, headers=auth(token)).json()


def test_every_account_gets_one_stable_readable_code(client, fake_db, partners):
    first = client.get("/api/partners", headers=auth()).json()
    assert first == {"available": True, "code": first["code"], "referred_total": 0, "conversions": 0, "goal": 5, "remaining": 5, "unlocked": False}
    assert partners_service.CODE_RE.match(first["code"]) and not set(first["code"]) & set("01OI")
    assert client.get("/api/partners", headers=auth()).json()["code"] == first["code"]  # não muda a cada chamada
    assert client.get("/api/partners", headers=auth("bob-token")).json()["code"] != first["code"]


def test_claim_rules(client, fake_db, partners):
    code = client.get("/api/partners", headers=auth()).json()["code"]

    assert claim(client, "alice-token", code) == {"claimed": False, "reason": "self"}
    assert claim(client, "bob-token", "ABCDEFGH") == {"claimed": False, "reason": "unknown"}
    assert claim(client, "bob-token", "x") == {"claimed": False, "reason": "invalid"}

    assert claim(client, "bob-token", code.lower()) == {"claimed": True, "reason": None}  # maiúsculas/minúsculas não importam
    assert claim(client, "bob-token", code) == {"claimed": False, "reason": "already"}  # a mesma pessoa não conta duas vezes
    assert client.get("/api/partners", headers=auth()).json()["referred_total"] == 1

    # conta antiga (ou que já comprou) não é "nova pessoa"
    old = new_user(fake_db, "old")
    fake_db.get_profile(old["id"])
    fake_db.profiles[old["id"]]["created_at"] = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    assert claim(client, "old-token", code) == {"claimed": False, "reason": "not_new"}
    buyer = new_user(fake_db, "buyer")
    pay(fake_db, buyer)
    assert claim(client, "buyer-token", code) == {"claimed": False, "reason": "not_new"}
    assert client.get("/api/partners", headers=auth()).json()["referred_total"] == 1


def test_five_lifetime_purchases_from_referrals_unlock_lifetime(client, fake_db, sample_video, partners):
    code = client.get("/api/partners", headers=auth()).json()["code"]
    referred = [new_user(fake_db, f"ref{i}") for i in range(6)]
    for i, user in enumerate(referred):
        assert claim(client, f"ref{i}-token", code)["claimed"] is True
    assert client.get("/api/partners", headers=auth()).json()["referred_total"] == 6

    # uma compra duplicada da mesma pessoa vale uma conversão só
    pay(fake_db, referred[0], "cs_test_dup1")
    pay(fake_db, referred[0], "cs_test_dup2")
    progress = client.get("/api/partners", headers=auth()).json()
    assert progress["conversions"] == 1 and progress["remaining"] == 4 and progress["unlocked"] is False
    # quem não comprou não conta; Alice continua no Free
    assert client.get("/api/me", headers=auth()).json()["entitlement"]["plan"] == "free"

    for user in referred[1:4]:
        pay(fake_db, user)
    assert client.get("/api/partners", headers=auth()).json() == {"available": True, "code": code, "referred_total": 6, "conversions": 4, "goal": 5, "remaining": 1, "unlocked": False}

    pay(fake_db, referred[4])
    assert client.get("/api/partners", headers=auth()).json() == {"available": True, "code": code, "referred_total": 6, "conversions": 5, "goal": 5, "remaining": 0, "unlocked": True}
    me = client.get("/api/me", headers=auth()).json()["entitlement"]
    assert me["plan"] == "lifetime" and me["source"] == "partners" and me["can_upload"] is True and me["uploads_limit"] is None

    # sem bloqueio de uploads para quem desbloqueou pelo Partners
    for _ in range(6):
        assert register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE)).status_code == 201

    # reembolso de uma das cinco tira a conversão (e o benefício, enquanto não houver outra)
    fake_db.mark_purchase_refunded(f"pi_{referred[4]['id'][:8]}", "2026-09-15T00:00:00+00:00")
    assert client.get("/api/partners", headers=auth()).json()["conversions"] == 4
    assert client.get("/api/me", headers=auth()).json()["entitlement"]["plan"] == "free"
    pay(fake_db, referred[5])
    assert client.get("/api/me", headers=auth()).json()["entitlement"]["source"] == "partners"


def test_self_referral_cannot_count_via_own_purchase(client, fake_db, partners):
    code = client.get("/api/partners", headers=auth()).json()["code"]
    assert claim(client, "alice-token", code)["reason"] == "self"
    pay(fake_db, ALICE)
    progress = client.get("/api/partners", headers=auth()).json()
    assert progress["conversions"] == 0 and progress["referred_total"] == 0
    # comprar dá o Lifetime pela compra, não pelo Partners
    assert client.get("/api/me", headers=auth()).json()["entitlement"]["source"] == "purchase"


def test_someone_with_lifetime_keeps_it_when_referring(client, fake_db, partners):
    pay(fake_db, ALICE)
    code = client.get("/api/partners", headers=auth()).json()["code"]
    assert claim(client, "bob-token", code)["claimed"] is True
    pay(fake_db, BOB)
    assert client.get("/api/partners", headers=auth()).json()["conversions"] == 1
    assert client.get("/api/me", headers=auth()).json()["entitlement"] == {"plan": "lifetime", "source": "purchase", "uploads_limit": None, "uploads_used": 0, "uploads_remaining": None, "can_upload": True, "billing_configured": True}
    assert supabase_service.get_profile(ALICE["id"])["referral_code"] == code


def test_partners_degrades_when_the_migration_has_not_run(client, fake_db, partners, monkeypatch):
    """Sem as tabelas do Partners o painel some, mas login, uploads e /api/me seguem funcionando."""
    from app.services import supabase_service

    def missing(*_args, **_kwargs):
        raise supabase_service.SupabaseError("referrals.list") from RuntimeError("PGRST205 Could not find the table 'public.referrals'")

    monkeypatch.setattr(partners_service, "_unavailable", False)
    monkeypatch.setattr(fake_db, "list_referred_ids", missing)
    monkeypatch.setattr(supabase_service, "list_referred_ids", missing)

    body = client.get("/api/partners", headers=auth()).json()
    assert body["available"] is False and body["code"] is None and body["goal"] == 5
    assert client.get("/api/me", headers=auth()).json()["entitlement"]["plan"] == "free"
    assert client.post("/api/referrals/claim", json={"code": "ABCDEFGH"}, headers=auth()).json() == {"claimed": False, "reason": "unavailable"}
    monkeypatch.setattr(partners_service, "_unavailable", False)
