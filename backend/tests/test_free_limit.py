"""Em produção, o grátis é um vídeo: nenhuma variável, indicação ou chave faltando abre o limite."""

from types import SimpleNamespace

import pytest

from app.core.config import get_settings
from app.services import guest_service
from tests.conftest import auth
from tests.test_billing import entitlement, send_video
from tests.test_partners import claim, new_user, partners  # noqa: F401 (fixture)
from tests.test_referral_bonus import code_of


@pytest.fixture
def production(env):
    """O servidor na Railway, com as variáveis que abriam o limite."""
    env.setenv("RAILWAY_PROJECT_ID", "project-test")
    env.setenv("FREE_UPLOADS", "20")
    env.setenv("FREE_FULL_ANALYSES", "5")
    env.setenv("GUEST_VIDEOS_PER_IP", "9")
    env.setenv("REFERRAL_BONUS_ANALYSES", "3")
    env.setenv("MAX_UPLOAD_MB", "50")
    get_settings.cache_clear()
    return env


def test_in_production_the_variables_cannot_open_the_limit(production):
    settings = get_settings()
    assert settings.free_uploads == 1
    assert settings.free_full_analyses == 1
    assert settings.guest_videos_per_ip == 1
    assert settings.referral_bonus_analyses == 0
    assert settings.limits_enforced is True
    assert settings.max_upload_bytes == 500 * 1024 * 1024  # o limite do bucket, não a variável antiga


def test_in_production_the_full_analysis_can_still_be_turned_off(production):
    production.setenv("FREE_FULL_ANALYSES", "0")
    get_settings.cache_clear()
    assert get_settings().free_full_analyses == 0


def test_outside_production_the_variables_still_apply(env):
    env.setenv("FREE_UPLOADS", "20")
    get_settings.cache_clear()
    assert get_settings().free_uploads == 20
    assert get_settings().limits_enforced is False


def test_in_production_a_missing_stripe_key_does_not_open_the_limit(client, fake_db, sample_video, production):
    production.delenv("STRIPE_SECRET_KEY", raising=False)
    get_settings.cache_clear()
    assert get_settings().billing_configured is False

    assert send_video(client, fake_db, sample_video).status_code == 201
    analyses = len(fake_db.analyses)
    second = send_video(client, fake_db, sample_video)
    assert second.status_code == 402 and second.json()["error"]["code"] == "FREE_LIMIT_REACHED"
    assert len(fake_db.analyses) == analyses


def test_in_production_a_referral_does_not_give_another_video(client, fake_db, partners, sample_video, production):  # noqa: F811
    production.setenv("STRIPE_SECRET_KEY", "sk_test_x")
    get_settings.cache_clear()
    code = code_of(client)
    new_user(fake_db, "bia")
    claim(client, "bia-token", code)

    assert entitlement(client, "bia-token")["uploads_limit"] == 1
    assert entitlement(client)["uploads_limit"] == 1


def test_health_reports_the_limits_in_force(client, production):
    limits = client.get("/api/health", headers=auth()).json()["limits"]
    assert limits == {"enforced": True, "free_uploads": 1, "guest_videos_per_ip": 1, "referral_bonus": 0, "max_upload_mb": 500}


def request_from(headers: dict, host: str = "10.0.0.1"):
    return SimpleNamespace(headers=headers, client=SimpleNamespace(host=host))


def test_rotating_ipv6_addresses_count_as_the_same_connection():
    one = guest_service.client_ip(request_from({"x-forwarded-for": "2804:14d:5c21:9a00:1111:2222:3333:4444"}))
    other = guest_service.client_ip(request_from({"x-forwarded-for": "2804:14d:5c21:9a00:aaaa:bbbb:cccc:dddd"}))
    elsewhere = guest_service.client_ip(request_from({"x-forwarded-for": "2804:14d:5c21:9b00:1111:2222:3333:4444"}))
    assert one == other != elsewhere


def test_the_proxy_header_wins_over_what_the_browser_can_send():
    request = request_from({"x-real-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.1, 203.0.113.7"})
    assert guest_service.client_ip(request) == "203.0.113.7"
