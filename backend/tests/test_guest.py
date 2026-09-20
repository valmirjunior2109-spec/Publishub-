"""Previsão cega sem cadastro: o convidado envia o vídeo, recebe a aposta e confere.

O fluxo do jeito que o navegador faz: abre a sessão, pede a URL assinada, envia o
arquivo, registra o vídeo, lê a previsão, responde "acertou"/"errou" e, ao criar a
conta, leva tudo consigo.
"""

import pytest

from app.services import ai_service
from tests.conftest import (
    ALICE,
    FakeGemini,
    auth,
    guest_headers,
    guest_upload,
    register,
    sample_copilot,
    sample_moment,
    sample_transcript,
    upload,
    upload_image,
)


@pytest.fixture
def blind_ai(monkeypatch):
    """Sem print, a IA responde três vezes: transcrição, momento provável e copiloto."""
    fake = FakeGemini(responses=[sample_transcript(), sample_moment(), sample_copilot()])
    monkeypatch.setattr(ai_service, "_client", lambda: fake)
    return fake


def analyse_as_guest(client, fake_db, sample_video):
    """Faz o que o navegador do convidado faria; devolve (headers, analysis_id)."""
    headers = guest_headers(client)
    session_id = list(fake_db.guest_sessions)[-1]

    target = client.post("/api/guest/upload-url", json={"content_type": "video/mp4"}, headers=headers)
    assert target.status_code == 200, target.text
    assert target.json()["path"].startswith(f"guest/{session_id}/")

    path = guest_upload(fake_db, session_id, sample_video)
    created = client.post("/api/videos", json={"storage_path": path, "filename": "reel.mp4"}, headers=headers)
    assert created.status_code == 201, created.text
    return headers, created.json()["analysis"]["id"]


def test_guest_gets_the_blind_prediction_without_signing_up(client, fake_db, blind_ai, sample_video):
    headers, analysis_id = analyse_as_guest(client, fake_db, sample_video)

    body = client.get(f"/api/analyses/{analysis_id}", headers=headers).json()
    assert body["status"] == "completed", body["error_message"]
    # a aposta: o segundo, a frase dita nele e a tolerância declarada
    assert body["blind"]["at_seconds"] == 2.6
    assert body["blind"]["phrase"].startswith("Então, antes de tudo")
    assert body["blind"]["response"] is None and body["blind"]["hit"] is None
    assert body["blind"]["tolerance_seconds"] == 1.0 and body["blind"]["shown_at"]
    # e nada além da aposta: a análise inteira é o que se ganha ao criar a conta
    assert body["result"] is None
    assert body["locked"] == {"analysis": True, "rewrites": 3, "copilot": True}
    # o vídeo é da sessão, não de uma conta
    video = fake_db.videos[body["video"]["id"]]
    assert video["user_id"] is None and video["guest_id"] == list(fake_db.guest_sessions)[-1]


def test_a_guest_cannot_send_the_retention_screenshot(client, fake_db, blind_ai, sample_video):
    headers = guest_headers(client)
    session_id = list(fake_db.guest_sessions)[-1]
    response = client.post(
        "/api/videos",
        json={
            "storage_path": guest_upload(fake_db, session_id, sample_video),
            "filename": "reel.mp4",
            "insights_path": upload_image(fake_db, ALICE),
        },
        headers=headers,
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "GUEST_NO_INSIGHTS"


def test_guest_gets_one_video_and_then_needs_an_account(client, fake_db, blind_ai, sample_video):
    headers, _ = analyse_as_guest(client, fake_db, sample_video)
    session_id = list(fake_db.guest_sessions)[-1]

    again = client.post(
        "/api/videos",
        json={"storage_path": guest_upload(fake_db, session_id, sample_video), "filename": "outro.mp4"},
        headers=headers,
    )
    assert again.status_code == 402
    assert again.json()["error"]["code"] == "GUEST_LIMIT_REACHED"
    # e nem consegue pedir outra URL de envio
    assert client.post("/api/guest/upload-url", json={"content_type": "video/mp4"}, headers=headers).status_code == 402


def test_the_same_connection_is_limited_per_day(client, fake_db, blind_ai, sample_video):
    """Sessão nova no mesmo IP: o limite por IP cobre quem limpa o navegador."""
    analyse_as_guest(client, fake_db, sample_video)
    other = guest_headers(client)
    other_session = list(fake_db.guest_sessions)[-1]
    response = client.post(
        "/api/videos",
        json={"storage_path": guest_upload(fake_db, other_session, sample_video), "filename": "reel.mp4"},
        headers=other,
    )
    assert response.status_code == 429
    assert response.json()["error"]["code"] == "GUEST_RATE_LIMITED"


def test_a_guest_only_sees_their_own_analysis(client, fake_db, blind_ai, sample_video):
    _, analysis_id = analyse_as_guest(client, fake_db, sample_video)

    assert client.get(f"/api/analyses/{analysis_id}").status_code == 401
    assert client.get(f"/api/analyses/{analysis_id}", headers={"X-Guest-Token": "inventado"}).status_code == 401
    # outra sessão de convidado: 404, como entre contas
    assert client.get(f"/api/analyses/{analysis_id}", headers=guest_headers(client)).status_code == 404
    # e nenhuma conta enxerga o que é de um convidado
    assert client.get(f"/api/analyses/{analysis_id}", headers=auth()).status_code == 404


def test_the_guest_answers_and_the_tolerance_decides(client, fake_db, blind_ai, sample_video):
    headers, analysis_id = analyse_as_guest(client, fake_db, sample_video)

    # "errou, foi em 3,2s": 0,6 s de diferença ainda é acerto (±1 s)
    response = client.post(f"/api/analyses/{analysis_id}/blind", json={"response": "miss", "actual_seconds": 3.2}, headers=headers)
    assert response.status_code == 200, response.text
    blind = response.json()["blind"]
    assert blind["response"] == "miss" and blind["actual_seconds"] == 3.2 and blind["hit"] is True
    assert response.json()["accuracy"] is None  # convidado ainda não tem placar

    # fica guardado, e não se responde duas vezes
    stored = client.get(f"/api/analyses/{analysis_id}", headers=headers).json()["blind"]
    assert stored["hit"] is True and stored["responded_at"]
    repeat = client.post(f"/api/analyses/{analysis_id}/blind", json={"response": "hit"}, headers=headers)
    assert repeat.status_code == 409 and repeat.json()["error"]["code"] == "BLIND_ALREADY_ANSWERED"


def test_a_miss_outside_the_tolerance_is_a_miss(client, fake_db, blind_ai, sample_video):
    headers, analysis_id = analyse_as_guest(client, fake_db, sample_video)
    body = client.post(f"/api/analyses/{analysis_id}/blind", json={"response": "miss", "actual_seconds": 7.0}, headers=headers).json()
    assert body["blind"]["hit"] is False and body["blind"]["actual_seconds"] == 7.0


def test_a_miss_without_a_second_is_refused(client, fake_db, blind_ai, sample_video):
    headers, analysis_id = analyse_as_guest(client, fake_db, sample_video)
    response = client.post(f"/api/analyses/{analysis_id}/blind", json={"response": "miss"}, headers=headers)
    assert response.status_code == 422 and response.json()["error"]["code"] == "MISSING_SECOND"


def test_signing_up_keeps_what_the_guest_already_did(client, fake_db, blind_ai, sample_video):
    headers, analysis_id = analyse_as_guest(client, fake_db, sample_video)
    client.post(f"/api/analyses/{analysis_id}/blind", json={"response": "hit"}, headers=headers)
    token = headers["X-Guest-Token"]

    claimed = client.post("/api/guest/claim", json={"token": token}, headers=auth())
    assert claimed.status_code == 200
    assert claimed.json() == {"claimed": 1, "analysis_ids": [analysis_id]}

    # a análise é da conta agora e aparece no painel dela
    body = client.get(f"/api/analyses/{analysis_id}", headers=auth()).json()
    assert body["blind"]["hit"] is True
    assert [v["id"] for v in client.get("/api/videos", headers=auth()).json()["videos"]] == [body["video"]["id"]]
    # o placar da conta conta o acerto do segundo
    assert client.get("/api/accuracy", headers=auth()).json()["blind"] == {"hits": 1, "misses": 0, "total": 1, "rate": 100}
    # o token antigo não abre mais nada
    assert client.get(f"/api/analyses/{analysis_id}", headers=headers).status_code == 401
    # e chamar de novo não duplica nada
    assert client.post("/api/guest/claim", json={"token": token}, headers=auth()).json()["claimed"] == 1


def test_claiming_someone_elses_session_is_refused(client, fake_db, blind_ai, sample_video):
    headers, _ = analyse_as_guest(client, fake_db, sample_video)
    token = headers["X-Guest-Token"]
    assert client.post("/api/guest/claim", json={"token": token}, headers=auth()).status_code == 200
    response = client.post("/api/guest/claim", json={"token": token}, headers=auth("bob-token"))
    assert response.status_code == 409 and response.json()["error"]["code"] == "GUEST_ALREADY_CLAIMED"


def test_claiming_an_unknown_token_does_nothing(client):
    body = client.post("/api/guest/claim", json={"token": "token-que-nao-existe"}, headers=auth()).json()
    assert body == {"claimed": 0, "analysis_ids": []}


def test_events_are_recorded_for_guests_and_accounts(client, fake_db, blind_ai, sample_video):
    headers, analysis_id = analyse_as_guest(client, fake_db, sample_video)
    session_id = list(fake_db.guest_sessions)[-1]

    # o pipeline grava os dele sozinho, do lado do servidor
    do_pipeline = [e["name"] for e in fake_db.events]
    assert "analysis_started" in do_pipeline and "analysis_completed" in do_pipeline

    assert client.post("/api/events", json={"name": "prediction_shown", "analysis_id": analysis_id}, headers=headers).status_code == 202
    assert client.post("/api/events", json={"name": "paywall_viewed"}, headers=auth()).status_code == 202

    da_tela = [e for e in fake_db.events if e["name"] in ("prediction_shown", "paywall_viewed")]
    assert [e["name"] for e in da_tela] == ["prediction_shown", "paywall_viewed"]
    assert da_tela[0]["guest_id"] == session_id and da_tela[0]["user_id"] is None
    assert da_tela[1]["user_id"] == ALICE["id"] and da_tela[1]["guest_id"] is None

    unknown = client.post("/api/events", json={"name": "curiosidade"}, headers=auth())
    assert unknown.status_code == 422 and unknown.json()["error"]["code"] == "UNKNOWN_EVENT"


def test_an_analysis_with_a_screenshot_has_no_blind_prediction(client, fake_db, fake_ai, sample_video):
    """Com print, o segundo vem da curva: não há aposta cega para conferir."""
    created = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE))
    analysis_id = created.json()["analysis"]["id"]
    assert client.get(f"/api/analyses/{analysis_id}", headers=auth()).json()["blind"] is None

    response = client.post(f"/api/analyses/{analysis_id}/blind", json={"response": "hit"}, headers=auth())
    assert response.status_code == 409 and response.json()["error"]["code"] == "NO_BLIND_PREDICTION"
