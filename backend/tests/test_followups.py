"""O lembrete de 72 h: o que fecha o loop de previsão.

Depois da análise o criador diz quando vai republicar; o cron manda o e-mail
pedindo a retenção real. Quem já colou o número não recebe nada.
"""

from datetime import datetime, timedelta, timezone

import pytest

from app.core.config import get_settings
from app.services import email_service, followup_service
from tests.conftest import ALICE, auth, register, upload, upload_image


@pytest.fixture
def mailbox(env, monkeypatch):
    """Resend configurado, mas em memória: cada envio vira uma linha aqui."""
    env.setenv("RESEND_API_KEY", "re_test_x")
    env.setenv("EMAIL_FROM", "Publishub <ola@getpublishub.com>")
    env.setenv("APP_URL", "https://getpublishub.com")
    env.setenv("INTERNAL_SECRET", "segredo-do-cron")
    get_settings.cache_clear()

    sent: list[dict] = []

    def send(to, subject, html, text):
        sent.append({"to": to, "subject": subject, "html": html, "text": text})
        return "msg_1"

    monkeypatch.setattr(email_service, "send", send)
    return sent


def analysed(client, fake_db, sample_video) -> str:
    created = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE))
    assert created.status_code == 201, created.text
    return created.json()["analysis"]["id"]


def due_now(fake_db, analysis_id: str) -> None:
    """Adianta o relógio do lembrete: o cron do teste não espera 72 h."""
    fake_db.followups[analysis_id]["send_after"] = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()


def run_cron(client, secret="segredo-do-cron"):
    return client.post("/api/internal/followups", headers={"X-Internal-Secret": secret})


def test_without_a_date_the_reminder_goes_out_in_72h(client, fake_db, fake_ai, sample_video, mailbox):
    analysis_id = analysed(client, fake_db, sample_video)
    response = client.post(f"/api/analyses/{analysis_id}/followup", json={"ui_locale": "pt-BR"}, headers=auth())

    assert response.status_code == 200, response.text
    followup = response.json()["followup"]
    assert followup["status"] == "scheduled" and followup["republish_on"] is None
    hours = (datetime.fromisoformat(followup["send_after"]) - datetime.now(timezone.utc)) / timedelta(hours=1)
    assert 71.5 < hours < 72.5

    # e a tela consegue ler de volta o que agendou
    assert client.get(f"/api/analyses/{analysis_id}/followup", headers=auth()).json()["followup"]["status"] == "scheduled"


def test_a_republish_date_pushes_the_reminder_to_48h_after_it(client, fake_db, fake_ai, sample_video, mailbox):
    analysis_id = analysed(client, fake_db, sample_video)
    response = client.post(f"/api/analyses/{analysis_id}/followup", json={"republish_on": "2026-10-01"}, headers=auth())

    followup = response.json()["followup"]
    assert followup["republish_on"] == "2026-10-01"
    assert datetime.fromisoformat(followup["send_after"]) == datetime(2026, 10, 3, tzinfo=timezone.utc)


def test_the_cron_sends_what_is_due_in_the_language_of_the_site(client, fake_db, fake_ai, sample_video, mailbox):
    analysis_id = analysed(client, fake_db, sample_video)
    client.post(f"/api/analyses/{analysis_id}/followup", json={"ui_locale": "pt-BR"}, headers=auth())
    due_now(fake_db, analysis_id)

    assert run_cron(client).json() == {"due": 1, "sent": 1, "failed": 0}
    assert len(mailbox) == 1
    message = mailbox[0]
    assert message["to"] == "alice@example.com"
    assert message["subject"] == "A retenção subiu?"
    assert f"https://getpublishub.com/results/{analysis_id}" in message["html"]
    assert "meu vídeo.mp4" in message["text"]
    assert fake_db.followups[analysis_id]["status"] == "sent"

    # rodar de novo não manda o mesmo e-mail duas vezes
    assert run_cron(client).json() == {"due": 0, "sent": 0, "failed": 0}
    assert len(mailbox) == 1


def test_the_reminder_is_cancelled_when_the_real_number_arrives(client, fake_db, fake_ai, sample_video, mailbox):
    analysis_id = analysed(client, fake_db, sample_video)
    client.post(f"/api/analyses/{analysis_id}/followup", json={}, headers=auth())

    assert client.post(f"/api/analyses/{analysis_id}/outcome", json={"actual_retention": 75}, headers=auth()).status_code == 200
    assert fake_db.followups[analysis_id]["status"] == "cancelled"

    due_now(fake_db, analysis_id)
    assert run_cron(client).json()["sent"] == 0
    assert mailbox == []


def test_a_send_that_fails_goes_back_to_the_queue_and_gives_up_after_three_tries(client, fake_db, fake_ai, sample_video, mailbox, monkeypatch):
    analysis_id = analysed(client, fake_db, sample_video)
    client.post(f"/api/analyses/{analysis_id}/followup", json={}, headers=auth())

    def explode(*_args, **_kwargs):
        raise email_service.EmailError("domínio não verificado")

    monkeypatch.setattr(email_service, "send", explode)

    for attempt in (1, 2):
        due_now(fake_db, analysis_id)
        assert run_cron(client).json() == {"due": 1, "sent": 0, "failed": 1}
        stored = fake_db.followups[analysis_id]
        assert stored["status"] == "scheduled" and stored["attempts"] == attempt
        assert "domínio não verificado" in stored["last_error"]

    due_now(fake_db, analysis_id)
    run_cron(client)
    assert fake_db.followups[analysis_id]["status"] == "failed"
    assert fake_db.followups[analysis_id]["attempts"] == followup_service.MAX_ATTEMPTS


def test_the_internal_endpoint_is_not_open_to_the_world(client, fake_db, fake_ai, sample_video, mailbox):
    assert client.post("/api/internal/followups").status_code == 401
    assert run_cron(client, secret="chute").status_code == 401
    assert run_cron(client).status_code == 200


def test_without_an_email_provider_nothing_is_sent_and_the_queue_is_kept(client, fake_db, fake_ai, sample_video, env):
    """Sem RESEND_API_KEY o lembrete fica na fila — nada é simulado, como na IA."""
    env.setenv("INTERNAL_SECRET", "segredo-do-cron")
    get_settings.cache_clear()
    analysis_id = analysed(client, fake_db, sample_video)
    client.post(f"/api/analyses/{analysis_id}/followup", json={}, headers=auth())
    due_now(fake_db, analysis_id)

    assert run_cron(client).json()["skipped"] == "email_not_configured"
    assert fake_db.followups[analysis_id]["status"] == "scheduled"


def test_a_reminder_needs_a_finished_analysis(client, fake_db, sample_video, mailbox, monkeypatch):
    from app.services import analysis_service

    monkeypatch.setattr(analysis_service, "run_analysis", lambda analysis_id, ui_language=None: None)
    analysis_id = analysed(client, fake_db, sample_video)

    response = client.post(f"/api/analyses/{analysis_id}/followup", json={}, headers=auth())
    assert response.status_code == 409 and response.json()["error"]["code"] == "NOT_READY"
