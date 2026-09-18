"""Publishub Partners (comissão): entrar no programa, contar cliques e ganhar 30% do que o indicado paga."""

import json

import pytest

from app.core.config import get_settings
from app.core.errors import ApiError
from app.services import analysis_service, billing_service, partners_service
from tests.conftest import ALICE, BOB, TOKENS, auth
from tests.test_partners import new_user
from tests.test_billing import paid_session, webhook


@pytest.fixture
def program(env, monkeypatch):
    """Stripe de teste em memória, comissão de 30% e Alice como administradora."""
    env.setenv("STRIPE_SECRET_KEY", "sk_test_x")
    env.setenv("STRIPE_WEBHOOK_SECRET", "whsec_x")
    env.setenv("FREE_UPLOADS", "5")
    env.setenv("ADMIN_EMAILS", "alice@example.com")
    get_settings.cache_clear()
    monkeypatch.setattr(partners_service, "_unavailable", False)
    monkeypatch.setattr(partners_service, "_program_unavailable", False)
    monkeypatch.setattr(analysis_service, "run_analysis", lambda analysis_id, ui_language=None: None)

    sessions: dict[str, dict] = {}

    def retrieve(session_id):
        if session_id not in sessions:
            raise ApiError(404, "SESSION_NOT_FOUND", "x")
        return sessions[session_id]

    monkeypatch.setattr(billing_service, "_retrieve_session", retrieve)
    monkeypatch.setattr(billing_service, "_construct_event", lambda payload, signature: json.loads(payload))
    return sessions


def join(client, token="alice-token"):
    return client.post("/api/partners/join", headers=auth(token)).json()


def claim(client, token, code):
    return client.post("/api/referrals/claim", json={"code": code}, headers=auth(token)).json()


def buy(client, user, intent=None, amount=1200):
    """Uma compra paga chegando pelo webhook do Stripe, já ligada à conta."""
    session = paid_session(f"cs_test_{user['id'][:8]}", user["email"], reference=user["id"], intent=intent or f"pi_{user['id'][:8]}")
    session["amount_total"] = amount
    return webhook(client, "checkout.session.completed", session)


def test_joining_gives_a_link_and_an_empty_dashboard(client, fake_db, program):
    before = client.get("/api/partners/program", headers=auth()).json()
    assert before["available"] is True and before["enrolled"] is False and before["code"] is None
    assert before["commission_rate"] == 0.30  # a taxa aparece antes mesmo de entrar

    dashboard = join(client)
    assert dashboard == {
        "available": True, "enrolled": True, "code": dashboard["code"], "status": "active", "commission_rate": 0.30,
        "clicks": 0, "signups": 0, "paid_customers": 0, "earnings_cents": 0, "currency": "usd",
        "goal": 5, "remaining": 5, "unlocked": False,
    }
    assert partners_service.CODE_RE.match(dashboard["code"])
    assert join(client)["code"] == dashboard["code"]  # entrar duas vezes não cria dois Partners
    assert len(fake_db.partners) == 1


def test_a_referred_purchase_pays_thirty_percent_to_the_partner(client, fake_db, program):
    code = join(client)["code"]
    assert claim(client, "bob-token", code)["claimed"] is True

    assert buy(client, BOB).status_code == 200
    dashboard = client.get("/api/partners/program", headers=auth()).json()
    assert dashboard["signups"] == 1 and dashboard["paid_customers"] == 1
    assert dashboard["earnings_cents"] == 360  # 30% de US$ 12,00

    # o mesmo webhook chegando de novo não paga a comissão duas vezes
    buy(client, BOB)
    assert client.get("/api/partners/program", headers=auth()).json()["earnings_cents"] == 360


def test_only_active_partners_earn(client, fake_db, program):
    code = join(client)["code"]
    partner_id = next(iter(fake_db.partners))
    fake_db.partners[partner_id]["status"] = "paused"
    assert claim(client, "bob-token", code)["claimed"] is True

    buy(client, BOB)
    dashboard = client.get("/api/partners/program", headers=auth()).json()
    assert dashboard["status"] == "paused" and dashboard["paid_customers"] == 1 and dashboard["earnings_cents"] == 0


def test_a_purchase_without_a_referral_pays_nobody(client, fake_db, program):
    join(client)
    buy(client, BOB)  # Bob comprou sozinho, sem ter vindo do link
    assert client.get("/api/partners/program", headers=auth()).json()["earnings_cents"] == 0
    assert fake_db.commissions == {}


def test_self_referral_earns_nothing(client, fake_db, program):
    code = join(client)["code"]
    assert claim(client, "alice-token", code)["reason"] == "self"
    buy(client, ALICE)
    dashboard = client.get("/api/partners/program", headers=auth()).json()
    assert dashboard["signups"] == 0 and dashboard["earnings_cents"] == 0


def test_a_refund_reverses_the_commission(client, fake_db, program):
    code = join(client)["code"]
    claim(client, "bob-token", code)
    buy(client, BOB, intent="pi_bob")
    assert client.get("/api/partners/program", headers=auth()).json()["earnings_cents"] == 360

    webhook(client, "charge.refunded", {"payment_intent": "pi_bob"})
    dashboard = client.get("/api/partners/program", headers=auth()).json()
    assert dashboard["earnings_cents"] == 0 and dashboard["paid_customers"] == 0


def test_a_purchase_made_before_the_account_existed_still_pays(client, fake_db, program):
    """Comprou com o e-mail, criou a conta depois: a comissão nasce quando a compra é ligada à conta."""
    code = join(client)["code"]
    late = new_user(fake_db, "late")
    claim(client, "late-token", code)
    fake_db.upsert_purchase({"stripe_session_id": "cs_test_late", "stripe_payment_intent": "pi_late", "email": late["email"], "user_id": None, "amount_cents": 1200, "currency": "usd", "status": "paid"})

    assert client.get("/api/partners/program", headers=auth()).json()["earnings_cents"] == 0
    client.get("/api/me", headers=auth("late-token"))  # o primeiro /api/me liga a compra pelo e-mail
    assert client.get("/api/partners/program", headers=auth()).json()["earnings_cents"] == 360


def test_clicks_are_counted_without_login_and_only_for_real_codes(client, fake_db, program):
    code = join(client)["code"]
    assert client.post("/api/referrals/visit", json={"code": code.lower()}).json() == {"recorded": True}
    assert client.post("/api/referrals/visit", json={"code": "ZZZZZZZZ"}).json() == {"recorded": False}
    assert client.post("/api/referrals/visit", json={"code": "nope"}).json() == {"recorded": False}
    assert client.get("/api/partners/program", headers=auth()).json()["clicks"] == 1


def test_the_admin_sees_every_partner_and_can_change_rate_and_status(client, fake_db, program):
    code = join(client)["code"]
    claim(client, "bob-token", code)
    buy(client, BOB)
    client.post("/api/referrals/visit", json={"code": code})

    assert client.get("/api/admin/partners", headers=auth("bob-token")).status_code == 403  # Bob não é admin
    assert client.get("/api/admin/partners").status_code == 401

    overview = client.get("/api/admin/partners", headers=auth()).json()
    assert overview["totals"] == {"partners": 1, "clicks": 1, "signups": 1, "paid_customers": 1, "revenue_cents": 1200, "commissions_owed_cents": 360}
    row = overview["partners"][0]
    assert row["code"] == code and row["status"] == "active" and row["commission_rate"] == 0.30

    updated = client.post(f"/api/admin/partners/{row['id']}", json={"status": "paused", "commission_rate": 0.5}, headers=auth()).json()
    assert updated["status"] == "paused" and updated["commission_rate"] == 0.5
    assert client.get("/api/partners/program", headers=auth()).json()["status"] == "paused"
    assert client.post(f"/api/admin/partners/{row['id']}", json={"status": "banido"}, headers=auth()).status_code == 422


def test_the_program_degrades_when_the_migration_has_not_run(client, fake_db, program, monkeypatch):
    """Sem as tabelas novas o painel some, mas o resto do produto segue igual."""
    from app.services import supabase_service

    def missing(*_args, **_kwargs):
        raise supabase_service.SupabaseError("partners.by_user") from RuntimeError("PGRST205 Could not find the table 'public.partners'")

    monkeypatch.setattr(supabase_service, "get_partner", missing)
    monkeypatch.setattr(fake_db, "get_partner", missing)

    body = client.get("/api/partners/program", headers=auth()).json()
    assert body["available"] is False and body["enrolled"] is False
    assert client.post("/api/partners/join", headers=auth()).status_code == 503
    assert client.get("/api/me", headers=auth()).json()["entitlement"]["plan"] == "free"
    monkeypatch.setattr(partners_service, "_program_unavailable", False)


def set_code(client, code, token="alice-token"):
    return client.post("/api/partners/code", json={"code": code}, headers=auth(token))


def test_a_partner_can_choose_a_readable_code_before_sharing(client, fake_db, program):
    random_code = join(client)["code"]
    assert set_code(client, "copilot").json()["code"] == "copilot"
    assert client.get("/api/partners/program", headers=auth()).json()["code"] == "copilot"

    # o link antigo, sorteado, deixa de valer; o novo vale em qualquer caixa
    assert client.post("/api/referrals/visit", json={"code": random_code}).json() == {"recorded": False}
    assert client.post("/api/referrals/visit", json={"code": "COPILOT"}).json() == {"recorded": True}
    assert client.get("/api/partners/program", headers=auth()).json()["clicks"] == 1
    assert claim(client, "bob-token", "Copilot")["claimed"] is True


def test_the_code_has_to_be_free_valid_and_chosen_before_the_first_referral(client, fake_db, program):
    join(client)
    join(client, "bob-token")

    assert set_code(client, "no").status_code == 422  # curto demais
    assert set_code(client, "meu link").status_code == 422  # espaço não é código
    assert set_code(client, "admin").status_code == 422  # palavra reservada
    assert set_code(client, "copilot").status_code == 200
    assert set_code(client, "COPILOT", token="bob-token").status_code == 409  # já é de outra pessoa

    # depois que a primeira indicação cai, o código trava (o link já foi divulgado)
    assert claim(client, "bob-token", "copilot")["claimed"] is True
    assert set_code(client, "outro").status_code == 409
    assert client.get("/api/partners/program", headers=auth()).json()["code"] == "copilot"


def test_only_a_partner_can_choose_a_code(client, fake_db, program):
    assert set_code(client, "copilot").status_code == 403  # ainda não entrou no programa
    assert client.post("/api/partners/code", json={"code": "copilot"}).status_code == 401


def test_the_dashboard_also_shows_the_progress_to_free_lifetime(client, fake_db, program, monkeypatch):
    """O link é um só: cada indicado que compra paga comissão e aproxima o Lifetime de graça."""
    from tests.test_partners import new_user

    monkeypatch.setenv("PARTNERS_GOAL", "2")
    get_settings.cache_clear()
    code = join(client)["code"]

    first, second = new_user(fake_db, "p1"), new_user(fake_db, "p2")
    for i, user in enumerate((first, second)):
        assert claim(client, f"p{i + 1}-token", code)["claimed"] is True

    buy(client, first)
    progress = client.get("/api/partners/program", headers=auth()).json()
    assert progress["goal"] == 2 and progress["remaining"] == 1 and progress["unlocked"] is False
    assert progress["earnings_cents"] == 360

    buy(client, second)
    progress = client.get("/api/partners/program", headers=auth()).json()
    assert progress["remaining"] == 0 and progress["unlocked"] is True and progress["earnings_cents"] == 720
    # e o Lifetime de graça aparece de fato na conta
    assert client.get("/api/me", headers=auth()).json()["entitlement"] == {
        "plan": "lifetime", "source": "partners", "uploads_limit": None, "uploads_used": 0,
        "uploads_remaining": None, "can_upload": True, "billing_configured": True,
    }
