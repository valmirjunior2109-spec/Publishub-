"""O e-mail de "sua análise ficou pronta" (ready_service).

Sai para a conta, nos momentos que contam: as 3 primeiras análises, a última
completa grátis (avisando o que muda) e as 2 primeiras parciais (dizendo o que o
plano completo tem, sem o conteúdo). Convidado não recebe; ninguém recebe 20.
"""

import pytest

from app.core.config import get_settings
from app.services import email_service
from tests.conftest import ALICE, register, upload, upload_image


@pytest.fixture
def mailbox(env, monkeypatch):
    env.setenv("RESEND_API_KEY", "re_test_x")
    env.setenv("EMAIL_FROM", "Publishub <ola@getpublishub.com>")
    env.setenv("APP_URL", "https://getpublishub.com")
    get_settings.cache_clear()
    sent: list[dict] = []

    def send(to, subject, html, text):
        sent.append({"to": to, "subject": subject, "html": html, "text": text})
        return "msg_1"

    monkeypatch.setattr(email_service, "send", send)
    return sent


@pytest.fixture
def stripe_on(env):
    env.setenv("STRIPE_SECRET_KEY", "sk_test_x")
    env.setenv("STRIPE_WEBHOOK_SECRET", "whsec_x")
    env.setenv("FREE_FULL_ANALYSES", "1")
    get_settings.cache_clear()
    return env


def analysed(client, fake_db, video) -> str:
    created = register(client, fake_db, "alice-token", upload(fake_db, ALICE, video), upload_image(fake_db, ALICE))
    assert created.status_code == 201, created.text
    return created.json()["analysis"]["id"]


def test_the_first_analysis_of_an_account_sends_the_ready_email(client, fake_db, fake_ai, sample_video, mailbox):
    analysis_id = analysed(client, fake_db, sample_video)

    assert len(mailbox) == 1
    message = mailbox[0]
    assert message["to"] == ALICE["email"]
    assert "meu vídeo.mp4" in message["subject"]
    assert f"https://getpublishub.com/results/{analysis_id}" in message["html"]
    # o segundo da queda, já no corpo: o motivo para abrir
    assert "0:04" in message["text"]
    # sem Stripe ninguém paga, então não há oferta de plano
    assert "/pricing" not in message["text"]


def test_after_the_first_three_the_account_is_left_alone(client, fake_db, fake_ai, sample_video, mailbox):
    for _ in range(4):
        analysed(client, fake_db, sample_video)
    assert len(mailbox) == 3


def test_the_last_free_analysis_and_the_first_partial_ones_point_to_the_plans(stripe_on, client, fake_db, fake_ai, sample_video, mailbox):
    analysed(client, fake_db, sample_video)  # a única completa grátis
    assert len(mailbox) == 1 and "/pricing" in mailbox[0]["text"]

    analysed(client, fake_db, sample_video)  # a primeira parcial: diz o que o plano completo tem
    assert len(mailbox) == 2 and "/pricing" in mailbox[1]["text"]

    analysed(client, fake_db, sample_video)  # a segunda parcial
    analysed(client, fake_db, sample_video)  # a terceira parcial: já não manda
    assert len(mailbox) == 3


def test_without_email_configured_nothing_breaks(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)
    assert client.get(f"/api/analyses/{analysis_id}", headers={"Authorization": "Bearer alice-token"}).json()["status"] == "completed"
