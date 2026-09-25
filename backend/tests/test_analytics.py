"""PostHog do lado do servidor: análise concluída e compra concluída.

A compra só é contada quando o Stripe confirma (webhook ou /obrigado), nunca pelo
navegador. Os dois eventos levam analysis_id e locale, e caem na mesma pessoa que
o navegador identificou: o id da conta, ou "guest:<sessão>".
"""

import json

import httpx
import pytest

from app.core.config import get_settings
from app.core.errors import ApiError
from app.services import analytics_service, billing_service
from tests.conftest import ALICE, register, upload, upload_image
from tests.test_billing import paid_session, webhook
from tests.test_guest import analyse_as_guest, blind_ai  # noqa: F401 (fixture)


@pytest.fixture
def posthog(env, monkeypatch):
    """PostHog configurado, mas em memória: guarda o que teria saído, na hora."""
    env.setenv("POSTHOG_API_KEY", "phc_test")
    env.setenv("STRIPE_SECRET_KEY", "sk_test_x")
    env.setenv("STRIPE_WEBHOOK_SECRET", "whsec_x")
    get_settings.cache_clear()
    monkeypatch.setattr(billing_service, "_construct_event", lambda payload, signature: json.loads(payload))
    monkeypatch.setattr(billing_service, "_retrieve_session", lambda session_id: (_ for _ in ()).throw(ApiError(404, "SESSION_NOT_FOUND", "x")))
    enviados: list[dict] = []
    monkeypatch.setattr(analytics_service, "_dispatch", enviados.append)
    return enviados


def eventos(enviados, nome):
    return [e for e in enviados if e["event"] == nome]


def test_nothing_is_sent_without_a_key(client, fake_db, fake_ai, sample_video, monkeypatch):
    enviados: list[dict] = []
    monkeypatch.setattr(analytics_service, "_dispatch", enviados.append)
    register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE))
    assert enviados == []


def test_an_account_analysis_reports_completion_as_the_account(client, fake_db, fake_ai, posthog, sample_video):
    criada = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE))
    analysis_id = criada.json()["analysis"]["id"]

    [evento] = eventos(posthog, "analysis_completed")
    assert evento["distinct_id"] == ALICE["id"]
    assert evento["api_key"] == "phc_test"
    assert evento["properties"]["analysis_id"] == analysis_id
    assert evento["properties"]["locale"] == "pt"  # sem idioma do site, o da fala do vídeo
    assert evento["properties"]["guest"] is False


def test_a_guest_analysis_reports_as_the_guest_session(client, fake_db, blind_ai, posthog, sample_video):
    _, analysis_id = analyse_as_guest(client, fake_db, sample_video)

    [evento] = eventos(posthog, "analysis_completed")
    assert evento["distinct_id"] == f"guest:{list(fake_db.guest_sessions)[-1]}"
    assert evento["properties"]["analysis_id"] == analysis_id and evento["properties"]["guest"] is True


def test_a_purchase_is_reported_by_the_server_with_the_analysis(client, fake_db, blind_ai, posthog, sample_video):
    _, analysis_id = analyse_as_guest(client, fake_db, sample_video)
    sessao = paid_session("cs_1", email="convidada@example.com", reference=f"a-{analysis_id}", intent="pi_1")

    webhook(client, "checkout.session.completed", sessao)
    webhook(client, "checkout.session.completed", sessao)  # o Stripe repete: a compra conta uma vez

    [evento] = eventos(posthog, "purchase_completed")
    assert evento["distinct_id"] == f"guest:{list(fake_db.guest_sessions)[-1]}"  # a mesma pessoa da análise
    assert evento["properties"] == {"analysis_id": analysis_id, "locale": "pt", "amount_cents": 1200, "currency": "usd", "$lib": "publishub-backend"}


def test_a_purchase_by_an_account_is_the_account(client, fake_db, posthog):
    webhook(client, "checkout.session.completed", paid_session("cs_2", email=ALICE["email"], reference=f"u-{ALICE['id']}", intent="pi_2"))
    [evento] = eventos(posthog, "purchase_completed")
    assert evento["distinct_id"] == ALICE["id"] and evento["properties"]["analysis_id"] is None


def test_an_anonymous_purchase_still_counts(client, fake_db, posthog):
    """Pagou pelo link puro, sem conta nem análise: o evento sai, com a sessão do Stripe como pessoa."""
    webhook(client, "checkout.session.completed", {**paid_session("cs_3", email="alguem@example.com", intent="pi_3"), "locale": "es"})
    [evento] = eventos(posthog, "purchase_completed")
    assert evento["distinct_id"] == "purchase:cs_3" and evento["properties"]["locale"] == "es"


def test_an_unpaid_session_is_not_a_purchase(client, fake_db, posthog):
    webhook(client, "checkout.session.completed", {**paid_session("cs_4", intent="pi_4"), "payment_status": "unpaid"})
    assert eventos(posthog, "purchase_completed") == []


def test_posthog_being_down_never_breaks_anything(env, monkeypatch):
    env.setenv("POSTHOG_API_KEY", "phc_test")
    get_settings.cache_clear()

    def fora_do_ar(*_args, **_kwargs):
        raise httpx.ConnectError("sem rede")

    monkeypatch.setattr(analytics_service.httpx, "post", fora_do_ar)
    analytics_service._send({"event": "purchase_completed"})  # não levanta
