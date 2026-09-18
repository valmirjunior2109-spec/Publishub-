"""Partner convidado: aprovação, Lifetime grátis vindo do banco, link único, atribuição e estatísticas."""

import uuid

import pytest

from app.core.config import get_settings
from app.core.errors import ApiError
from app.manage_partners import main as manage_partners
from app.services import analysis_service, partners_service, supabase_service
from tests.conftest import ALICE, BOB, TOKENS, auth, register, upload, upload_image


@pytest.fixture
def program(env, monkeypatch):
    """Stripe 'ligado' (o Free tem limite de 5 uploads); a análise em si não roda."""
    env.setenv("STRIPE_SECRET_KEY", "sk_test_x")
    env.setenv("FREE_UPLOADS", "5")
    get_settings.cache_clear()
    monkeypatch.setattr(analysis_service, "run_analysis", lambda analysis_id, ui_language=None: None)
    monkeypatch.setattr(partners_service, "_unavailable", False)


def new_user(name):
    user = {"id": str(uuid.uuid4()), "email": f"{name}@example.com"}
    TOKENS[f"{name}-token"] = user
    return user


def stats(client, token="alice-token"):
    return client.get("/api/partner/stats", headers=auth(token))


def claim(client, token, code):
    return client.post("/api/referrals/claim", json={"code": code}, headers=auth(token)).json()


def click(client, code):
    return client.post("/api/referrals/click", json={"code": code}).json()  # sem Authorization: o visitante não tem conta


def pay(fake_db, user):
    fake_db.upsert_purchase({"stripe_session_id": f"cs_test_{user['id'][:8]}", "stripe_payment_intent": f"pi_{user['id'][:8]}", "email": user["email"], "user_id": user["id"], "amount_cents": 1200, "currency": "usd", "status": "paid"})


def entitlement(client, token="alice-token"):
    return client.get("/api/me", headers=auth(token)).json()


def test_approval_gives_free_lifetime_from_the_database(client, fake_db, sample_video, program):
    before = entitlement(client)
    assert before["is_partner"] is False and before["entitlement"]["plan"] == "free" and before["entitlement"]["uploads_limit"] == 5

    result = partners_service.approve(ALICE["email"])
    assert result["already"] is False and partners_service.CODE_RE.match(result["code"])

    me = entitlement(client)
    assert me["is_partner"] is True
    assert me["entitlement"]["plan"] == "lifetime" and me["entitlement"]["source"] == "partner"
    assert me["entitlement"]["can_upload"] is True and me["entitlement"]["uploads_limit"] is None

    # sem bloqueio de uploads, e o status vem do banco (não de nada que o cliente mande)
    for _ in range(6):
        assert register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE)).status_code == 201
    assert fake_db.profiles[ALICE["id"]]["is_partner"] is True and fake_db.profiles[ALICE["id"]]["partner_since"]
    # quem não foi aprovado segue no Free
    assert entitlement(client, "bob-token")["entitlement"]["plan"] == "free"


def test_approval_is_idempotent_and_keeps_the_same_link(client, fake_db, program):
    first = partners_service.approve(ALICE["email"])
    since = fake_db.profiles[ALICE["id"]]["partner_since"]
    second = partners_service.approve(ALICE["email"].upper())  # o e-mail não diferencia maiúsculas
    assert second["already"] is True and second["code"] == first["code"]
    assert fake_db.profiles[ALICE["id"]]["partner_since"] == since  # a data da aprovação não muda
    assert stats(client).json()["code"] == first["code"]
    # cada Partner tem o próprio código
    assert partners_service.approve(BOB["email"])["code"] != first["code"]


def test_approve_unknown_account_fails_cleanly(fake_db, program):
    with pytest.raises(ApiError) as error:
        partners_service.approve("ninguem@example.com")
    assert error.value.status_code == 404 and error.value.code == "USER_NOT_FOUND"


def test_revoke_returns_the_account_to_the_normal_rules(client, fake_db, program):
    partners_service.approve(ALICE["email"])
    assert entitlement(client)["entitlement"]["source"] == "partner"
    assert partners_service.revoke(ALICE["email"])["changed"] is True
    me = entitlement(client)
    assert me["is_partner"] is False and me["entitlement"]["plan"] == "free" and me["entitlement"]["uploads_limit"] == 5
    assert stats(client).status_code == 403
    assert partners_service.revoke(ALICE["email"])["changed"] is False


def test_a_paid_partner_keeps_the_purchase_as_the_source(client, fake_db, program):
    pay(fake_db, ALICE)
    partners_service.approve(ALICE["email"])
    me = entitlement(client)
    assert me["is_partner"] is True and me["entitlement"]["source"] == "purchase"


def test_stats_are_only_for_partners(client, fake_db, program):
    assert client.get("/api/partner/stats").status_code == 401
    denied = stats(client)
    assert denied.status_code == 403 and denied.json()["error"]["code"] == "NOT_PARTNER"


def test_stats_count_clicks_signups_active_users_and_conversions(client, fake_db, sample_video, program):
    code = partners_service.approve(ALICE["email"])["code"]
    assert stats(client).json() == {"code": code, "partner_since": fake_db.profiles[ALICE["id"]]["partner_since"], "clicks": 0, "signups": 0, "active_users": 0, "conversions": 0}

    for _ in range(3):
        assert click(client, code) == {"counted": True}

    people = [new_user(f"lead{i}") for i in range(3)]
    for i in range(3):
        assert claim(client, f"lead{i}-token", code) == {"claimed": True, "reason": None}
    # duas usaram o produto (uma delas mandou dois vídeos: conta uma vez); uma delas comprou
    for person in people[:2]:
        assert register(client, fake_db, f"{person['email'].split('@')[0]}-token", upload(fake_db, person, sample_video), upload_image(fake_db, person)).status_code == 201
    assert register(client, fake_db, "lead0-token", upload(fake_db, people[0], sample_video), upload_image(fake_db, people[0])).status_code == 201
    pay(fake_db, people[1])
    pay(fake_db, people[1])  # segunda compra da mesma conta: uma conversão só

    body = stats(client).json()
    assert (body["clicks"], body["signups"], body["active_users"], body["conversions"]) == (3, 3, 2, 1)

    # reembolso deixa de contar como conversão
    fake_db.mark_purchase_refunded(f"pi_{people[1]['id'][:8]}", "2026-09-18T00:00:00+00:00")
    assert stats(client).json()["conversions"] == 0


def test_clicks_only_count_for_partner_links(client, fake_db, program):
    open_code = client.get("/api/partners", headers=auth("bob-token")).json()["code"]  # link do programa aberto: BOB não é Partner
    partner_code = partners_service.approve(ALICE["email"])["code"]
    assert click(client, open_code) == {"counted": False}
    assert click(client, "ABCDEFGH") == {"counted": False}  # código que não existe
    assert click(client, "x") == {"counted": False}  # formato inválido
    assert click(client, partner_code.lower()) == {"counted": True}
    assert fake_db.clicks == [ALICE["id"]]


def test_click_tracking_degrades_without_the_migration(client, fake_db, program, monkeypatch):
    code = partners_service.approve(ALICE["email"])["code"]

    def missing(*_args, **_kwargs):
        raise supabase_service.SupabaseError("referral_clicks.insert") from RuntimeError("PGRST205 Could not find the table 'public.referral_clicks'")

    monkeypatch.setattr(supabase_service, "insert_referral_click", missing)
    assert click(client, code) == {"counted": False}  # nada de 5xx para o visitante
    monkeypatch.setattr(partners_service, "_unavailable", False)


def test_attribution_is_saved_once_and_the_first_partner_wins(client, fake_db, program):
    alice_code = partners_service.approve(ALICE["email"])["code"]
    carol = new_user("carol")
    carol_code = partners_service.approve(carol["email"])["code"]

    assert claim(client, "bob-token", alice_code) == {"claimed": True, "reason": None}
    assert claim(client, "bob-token", alice_code) == {"claimed": False, "reason": "already"}  # sem duplicar
    assert claim(client, "bob-token", carol_code) == {"claimed": False, "reason": "already"}  # a primeira indicação não é trocada
    assert fake_db.referrals[BOB["id"]]["referrer_id"] == ALICE["id"]
    assert stats(client).json()["signups"] == 1 and stats(client, "carol-token").json()["signups"] == 0


def test_a_partner_cannot_refer_themselves(client, fake_db, program):
    code = partners_service.approve(ALICE["email"])["code"]
    assert claim(client, "alice-token", code) == {"claimed": False, "reason": "self"}
    assert stats(client).json()["signups"] == 0 and ALICE["id"] not in fake_db.referrals


def test_simultaneous_claims_do_not_fail_or_duplicate(client, fake_db, program, monkeypatch):
    """Dois claims ao mesmo tempo (React StrictMode, duas abas): o banco recusa o segundo e o backend responde 'already'."""
    code = partners_service.approve(ALICE["email"])["code"]
    monkeypatch.setattr(supabase_service, "insert_referral", lambda *args: None)  # a constraint unique do banco
    assert claim(client, "bob-token", code) == {"claimed": False, "reason": "already"}


def test_unique_violation_is_told_apart_from_other_database_errors():
    from app.services.supabase_service import SupabaseError, _is_unique_violation

    assert _is_unique_violation(SupabaseError("referrals.insert")) is False
    other = SupabaseError("referrals.insert")
    other.__cause__ = RuntimeError("connection reset by peer")
    assert _is_unique_violation(other) is False
    duplicate = SupabaseError("referrals.insert")
    duplicate.__cause__ = RuntimeError('duplicate key value violates unique constraint "referrals_referred_user_id_key"')
    assert _is_unique_violation(duplicate) is True


def test_partner_without_the_migration_is_just_a_normal_account(client, fake_db, program):
    """Sem a coluna is_partner (migração não rodou) nada quebra: a conta segue nas regras normais."""
    fake_db.get_profile(ALICE["id"])  # cria o perfil (o trigger faria isso)
    fake_db.profiles[ALICE["id"]].pop("is_partner")
    fake_db.profiles[ALICE["id"]].pop("partner_since")
    me = entitlement(client)
    assert me["is_partner"] is False and me["entitlement"]["plan"] == "free"


def test_cli_approves_revokes_and_lists(client, fake_db, program, capsys):
    assert manage_partners(["approve", ALICE["email"]]) == 0
    output = capsys.readouterr().out
    assert "agora é Partner" in output and "/?ref=" in output
    assert entitlement(client)["entitlement"]["source"] == "partner"

    assert manage_partners(["approve", ALICE["email"]]) == 0 and "já era Partner" in capsys.readouterr().out
    assert manage_partners(["list"]) == 0
    listing = capsys.readouterr().out
    assert ALICE["email"] in listing and "1 Partner(s)." in listing

    assert manage_partners(["approve", "ninguem@example.com"]) == 1
    assert "criar a conta" in capsys.readouterr().err

    assert manage_partners(["revoke", ALICE["email"]]) == 0
    assert entitlement(client)["entitlement"]["plan"] == "free"
