"""Indique e ganhe: análises completas a mais para quem chega e para quem indicou."""

from app.core.config import get_settings
from tests.conftest import auth, register, upload, upload_image
from tests.test_partners import claim, new_user, partners  # noqa: F401 (fixture)


def entitlement(client, token="alice-token"):
    return client.get("/api/me", headers=auth(token)).json()["entitlement"]


def code_of(client, token="alice-token"):
    return client.get("/api/partners", headers=auth(token)).json()["code"]


def test_whoever_arrives_by_a_link_gets_the_bonus_right_away(client, fake_db, partners, sample_video):
    code = code_of(client)
    new_user(fake_db, "bia")
    assert entitlement(client, "bia-token")["free_analyses_limit"] == 3
    assert claim(client, "bia-token", code)["claimed"] is True

    ent = entitlement(client, "bia-token")
    assert ent["bonus_analyses"] == 3 and ent["free_analyses_limit"] == 6
    assert ent["uploads_limit"] == 5 + 3  # o teto de uploads cresce junto


def test_the_referrer_earns_only_for_referrals_who_send_a_video(client, fake_db, partners, sample_video):
    code = code_of(client)
    bia = new_user(fake_db, "bia")
    claim(client, "bia-token", code)
    # indicada que só criou a conta: nada para quem indicou
    assert entitlement(client)["bonus_analyses"] == 0

    register(client, fake_db, "bia-token", upload(fake_db, bia, sample_video), upload_image(fake_db, bia))
    ent = entitlement(client)
    assert ent["bonus_analyses"] == 3 and ent["free_analyses_limit"] == 6


def test_the_referrer_bonus_has_a_ceiling(client, fake_db, partners, sample_video, env):
    env.setenv("REFERRAL_BONUS_MAX_REFERRALS", "2")
    get_settings.cache_clear()
    code = code_of(client)
    for name in ("c1", "c2", "c3"):
        user = new_user(fake_db, name)
        claim(client, f"{name}-token", code)
        register(client, fake_db, f"{name}-token", upload(fake_db, user, sample_video), upload_image(fake_db, user))
    assert entitlement(client)["bonus_analyses"] == 6  # 2 indicados, não 3


def test_the_bonus_turns_into_full_analyses(client, fake_db, partners, sample_video):
    """A 4ª análise de quem chegou indicado ainda sai completa (3 grátis + 3 de bônus)."""
    bia = new_user(fake_db, "bia")
    claim(client, "bia-token", code_of(client))
    for _ in range(4):
        register(client, fake_db, "bia-token", upload(fake_db, bia, sample_video), upload_image(fake_db, bia))
    mine = [a for a in fake_db.analyses.values() if a["user_id"] == bia["id"]]
    assert len(mine) == 4 and all(a["full_access"] for a in mine)


def test_zero_turns_the_program_off(client, fake_db, partners, env):
    env.setenv("REFERRAL_BONUS_ANALYSES", "0")
    get_settings.cache_clear()
    new_user(fake_db, "bia")
    assert claim(client, "bia-token", code_of(client))["claimed"] is True
    assert entitlement(client, "bia-token")["bonus_analyses"] == 0
