"""Os códigos do AppSumo: resgate, soma de códigos, limite do mês e reembolso."""

import pytest

from app.core.config import get_settings
from app.services import analysis_service, appsumo_service
from tests.conftest import ALICE, BOB, auth, register, upload, upload_image

CODES = ["PUB-ABCD-EFGH-JKLM", "PUB-2345-6789-NPQR", "PUB-STUV-WXYZ-2345", "PUB-JKLM-NPQR-STUV"]


@pytest.fixture
def appsumo(env, fake_db, monkeypatch):
    """Stripe ligado (então quem não pagou é grátis), os códigos do CSV no banco, e a análise não roda."""
    env.setenv("STRIPE_SECRET_KEY", "sk_test_x")
    env.setenv("FREE_UPLOADS", "5")
    env.setenv("APPSUMO_MONTHLY_ANALYSES", "2,4,6")
    get_settings.cache_clear()
    appsumo_service.reset_attempts()
    for code in CODES:
        fake_db.appsumo_codes[appsumo_service.code_hash(code)] = {"code_hash": appsumo_service.code_hash(code), "status": "available", "user_id": None}
    monkeypatch.setattr(analysis_service, "run_analysis", lambda analysis_id, ui_language=None: None)
    yield
    appsumo_service.reset_attempts()


def redeem(client, code, token="alice-token"):
    return client.post("/api/appsumo/redeem", json={"code": code}, headers=auth(token))


def me(client, token="alice-token"):
    return client.get("/api/me", headers=auth(token)).json()["entitlement"]


def send(client, fake_db, user=ALICE, token="alice-token", video=b"\x00" * 4096):
    return register(client, fake_db, token, upload(fake_db, user, video), upload_image(fake_db, user))


def test_one_code_gives_creator_with_the_monthly_limit(client, fake_db, appsumo):
    assert me(client)["plan"] == "free"
    r = redeem(client, "  pub-abcd-efgh-jklm ")  # colado com espaços e em minúsculas
    assert r.status_code == 200, r.text
    assert r.json()["plan"] == {"codes": 1, "tier": "creator", "monthly_limit": 2, "max_codes": 3}

    ent = me(client)
    assert ent["plan"] == "appsumo" and ent["source"] == "appsumo" and ent["tier"] == "creator"
    assert ent["can_see_rewrites"] is True and ent["uploads_limit"] == 2 and ent["uploads_remaining"] == 2
    assert ent["appsumo"]["used_this_month"] == 0
    assert [e["name"] for e in fake_db.events].count("appsumo_redeemed") == 1


def test_codes_stack_up_to_the_maximum(client, fake_db, appsumo):
    assert redeem(client, CODES[0]).json()["plan"]["tier"] == "creator"
    second = redeem(client, CODES[1]).json()["plan"]
    assert second == {"codes": 2, "tier": "pro", "monthly_limit": 4, "max_codes": 3}
    assert redeem(client, CODES[2]).json()["plan"]["monthly_limit"] == 6
    r = redeem(client, CODES[3])
    assert r.status_code == 409 and r.json()["error"]["code"] == "APPSUMO_MAX_CODES"
    assert me(client)["tier"] == "pro"


def test_a_code_belongs_to_one_account(client, fake_db, appsumo):
    assert redeem(client, CODES[0]).status_code == 200
    # de novo na mesma conta: nada muda, nada quebra
    again = redeem(client, CODES[0])
    assert again.status_code == 200 and again.json()["plan"]["codes"] == 1
    # outra conta: recusado
    r = redeem(client, CODES[0], "bob-token")
    assert r.status_code == 409 and r.json()["error"]["code"] == "APPSUMO_CODE_USED"
    assert me(client, "bob-token")["plan"] == "free"


def test_unknown_or_malformed_codes_are_refused_and_throttled(client, fake_db, appsumo):
    for bad in ["PUB-AAAA-AAAA-AAAA", "hello", "PUB-ABCD-EFGH-JKL0"]:
        r = redeem(client, bad)
        assert r.status_code == 404 and r.json()["error"]["code"] == "APPSUMO_CODE_INVALID"
    for _ in range(7):
        redeem(client, "PUB-AAAA-AAAA-AAAB")
    r = redeem(client, CODES[0])  # até um código bom espera a janela passar
    assert r.status_code == 429 and r.json()["error"]["code"] == "APPSUMO_TOO_MANY_ATTEMPTS"
    assert redeem(client, CODES[0], "bob-token").status_code == 200  # o limite é por conta


def test_the_monthly_limit_blocks_new_videos(client, fake_db, appsumo, sample_video):
    redeem(client, CODES[0])
    for _ in range(2):
        assert send(client, fake_db, video=sample_video).status_code == 201
    ent = me(client)
    assert ent["uploads_remaining"] == 0 and ent["can_upload"] is False and ent["appsumo"]["used_this_month"] == 2
    r = send(client, fake_db, video=sample_video)
    assert r.status_code == 402 and r.json()["error"]["code"] == "APPSUMO_MONTHLY_LIMIT"
    # um código a mais sobe o limite na hora
    redeem(client, CODES[1])
    assert send(client, fake_db, video=sample_video).status_code == 201
    assert all(a["full_access"] for a in fake_db.analyses.values())


def test_a_refund_takes_the_code_away(client, fake_db, appsumo, env):
    env.setenv("ADMIN_EMAILS", BOB["email"])
    get_settings.cache_clear()
    redeem(client, CODES[0])
    redeem(client, CODES[1])
    assert me(client)["tier"] == "pro"

    assert client.post("/api/admin/appsumo/deactivate", json={"code": CODES[1]}, headers=auth()).status_code == 403  # Alice não é admin
    r = client.post("/api/admin/appsumo/deactivate", json={"code": CODES[1]}, headers=auth("bob-token"))
    assert r.status_code == 200 and r.json()["user_id"] == ALICE["id"]
    assert me(client)["tier"] == "creator"
    # e o código reembolsado não volta a valer em lugar nenhum
    r = redeem(client, CODES[1], "bob-token")
    assert r.status_code == 410 and r.json()["error"]["code"] == "APPSUMO_CODE_DEACTIVATED"


def test_status_page_and_auth(client, fake_db, appsumo):
    assert client.get("/api/appsumo").status_code == 401
    assert client.post("/api/appsumo/redeem", json={"code": CODES[0]}).status_code == 401
    assert client.get("/api/appsumo", headers=auth()).json() == {"plan": None, "used_this_month": 0, "max_codes": 3}
    redeem(client, CODES[0])
    assert client.get("/api/appsumo", headers=auth()).json()["plan"]["codes"] == 1


def test_appsumo_counts_as_paid_for_the_watermark(fake_db, appsumo):
    from app.services import billing_service, edit_service

    assert edit_service._watermarked({"paid_at": None}, ALICE["id"]) is True
    fake_db.appsumo_codes[appsumo_service.code_hash(CODES[0])].update(status="redeemed", user_id=ALICE["id"])
    assert billing_service.has_full_access(ALICE) is True
    assert edit_service._watermarked({"paid_at": None}, ALICE["id"]) is False
