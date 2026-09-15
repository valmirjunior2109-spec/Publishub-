import httpx

from app.services.supabase_service import SupabaseError
from app.services import ai_service
from tests.conftest import ALICE, BOB, FakeGemini, auth, register, sample_copilot, sample_curve, sample_moment, sample_transcript, upload, upload_image


def test_health(client):
    body = client.get("/api/health").json()
    assert body["status"] == "ok"
    assert body["ai_configured"] is True


def test_requires_authentication(client):
    assert client.get("/api/videos").status_code == 401
    response = client.get("/api/videos", headers=auth("expired"))
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHENTICATED"


def test_me(client):
    body = client.get("/api/me", headers=auth()).json()
    assert body["id"] == ALICE["id"]
    assert body["email"] == ALICE["email"]


def test_register_validations(client, fake_db, sample_video):
    image = upload_image(fake_db, ALICE)

    r = register(client, fake_db, "alice-token", upload(fake_db, BOB, sample_video), image)
    assert r.status_code == 403

    r = register(client, fake_db, "alice-token", f"{ALICE['id']}/../../etc/passwd", image)
    assert r.status_code == 400 and r.json()["error"]["code"] == "INVALID_FILE"

    r = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, BOB))
    assert r.status_code == 403

    missing = f"{ALICE['id']}/00000000-0000-4000-8000-000000000000.mp4"
    r = register(client, fake_db, "alice-token", missing, image)
    assert r.status_code == 400 and r.json()["error"]["code"] == "UPLOAD_NOT_FOUND"

    missing_image = f"{ALICE['id']}/00000000-0000-4000-8000-000000000000.png"
    r = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), missing_image)
    assert r.status_code == 400 and r.json()["error"]["code"] == "UPLOAD_NOT_FOUND"

    too_big = upload(fake_db, ALICE, sample_video)
    fake_db.objects[too_big]["size"] = 60 * 1024 * 1024
    r = register(client, fake_db, "alice-token", too_big, image)
    assert r.status_code == 413 and too_big in fake_db.deleted

    wrong_type = upload(fake_db, ALICE, b"not a video", content_type="text/plain")
    r = register(client, fake_db, "alice-token", wrong_type, image)
    assert r.status_code == 400 and wrong_type in fake_db.deleted

    not_an_image = upload_image(fake_db, ALICE, b"%PDF", content_type="application/pdf")
    r = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), not_an_image)
    assert r.status_code == 400 and r.json()["error"]["code"] == "INVALID_IMAGE" and not_an_image in fake_db.deleted

    r = client.post("/api/videos", json={"filename": "a.mp4"}, headers=auth())
    assert r.status_code == 422 and r.json()["error"]["code"] == "VALIDATION_ERROR"


def test_full_flow_upload_analyze_read_and_close_the_loop(client, fake_db, fake_ai, sample_video):
    r = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE), hypothesis="Achei que o café ia prender.")
    assert r.status_code == 201
    analysis_id = r.json()["analysis"]["id"]

    # TestClient runs background tasks before returning, so the analysis is done.
    body = client.get(f"/api/analyses/{analysis_id}", headers=auth()).json()
    assert body["status"] == "completed", body["error_message"]
    assert body["step"] is None and body["outcome"] == "pending"
    result = body["result"]
    assert result["drop"] == {"at_seconds": 4.0, "retained_before": 93, "retained_after": 61}
    assert result["retention_source"] == "insights" and body["video"]["has_insights"] is True
    assert result["phrase"]["text"].startswith("Então, antes de tudo")
    assert result["phrase"]["before"].startswith("Eu fiquei") and result["phrase"]["after"].startswith("Eu sempre")
    assert len(result["rewrites"]) == 3 and result["rewrites"][0]["why"]
    assert result["prediction"] == {"at_second": 6.0, "baseline": 61.0, "predicted": 72, "statement": result["prediction"]["statement"]}
    assert result["curve"][0] == [0, 100] and result["curve"][-1] == [8, 55]
    assert result["hypothesis"] == "Achei que o café ia prender."
    assert result["signals"]["duration_seconds"] == 8.0
    assert body["video"]["playback_url"].startswith("https://") and body["video"]["insights_url"].startswith("https://storage.test/insights/")

    # o copiloto de edição: ritmo, gancho, trechos parados e cortes, ordenados pelo segundo
    copilot = result["copilot"]
    assert copilot["pace"] == "lento" and copilot["hook_score"] == 6
    assert [c["at_seconds"] for c in copilot["cuts"]] == [0.0, 3.5] and copilot["cuts"][1]["action"] == "encurtar_pausa"
    assert copilot["slow_stretches"][0]["end_seconds"] == 6.0

    # quatro chamadas à IA, na ordem: áudio, print, diagnóstico (frames da queda), copiloto (frames do vídeo inteiro)
    kinds = [[p.inline_data.mime_type for p in call["contents"] if p.inline_data is not None] for call in fake_ai.calls]
    assert kinds[0] == ["audio/mp3"] and kinds[1] == ["image/png"] and kinds[2] == ["image/jpeg"] * 3
    assert 6 <= len(kinds[3]) <= 12 and set(kinds[3]) == {"image/jpeg"}
    assert "Achei que o café" in fake_ai.calls[2]["contents"][0].text

    # a listagem traz o que o card precisa
    videos = client.get("/api/videos", headers=auth()).json()["videos"]
    assert videos[0]["status"] == "analyzed" and float(videos[0]["duration_seconds"]) == 8.0
    assert videos[0]["analysis"]["drop_at"] == 4.0 and videos[0]["analysis"]["outcome"] == "pending"
    assert videos[0]["analysis"]["curve"][0] == [0, 100]

    # o loop: o criador cola o número real
    assert client.get("/api/accuracy", headers=auth()).json() == {"confirmed": 0, "refuted": 0, "total": 0, "rate": None}
    r = client.post(f"/api/analyses/{analysis_id}/outcome", json={"actual_retention": 75}, headers=auth())
    assert r.status_code == 200
    assert r.json()["outcome"] == "confirmed" and r.json()["accuracy"]["rate"] == 100
    body = client.get(f"/api/analyses/{analysis_id}", headers=auth()).json()
    assert body["outcome"] == "confirmed" and body["actual_retention"] == 75 and body["outcome_recorded_at"]

    # abaixo do previsto → refutada; a acurácia acompanha
    r = client.post(f"/api/analyses/{analysis_id}/outcome", json={"actual_retention": 64.5}, headers=auth())
    assert r.json()["outcome"] == "refuted"
    assert client.get("/api/accuracy", headers=auth()).json()["rate"] == 0

    r = client.post(f"/api/analyses/{analysis_id}/outcome", json={"actual_retention": 140}, headers=auth())
    assert r.status_code == 422


def test_outcome_needs_a_completed_analysis(client, fake_db, fake_ai, sample_video):
    fake_ai.error = httpx.ConnectError("connection refused")
    analysis_id = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE)).json()["analysis"]["id"]
    r = client.post(f"/api/analyses/{analysis_id}/outcome", json={"actual_retention": 70}, headers=auth())
    assert r.status_code == 409 and r.json()["error"]["code"] == "NOT_READY"


def test_users_cannot_see_each_others_data(client, fake_db, fake_ai, sample_video):
    analysis_id = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE)).json()["analysis"]["id"]

    assert client.get(f"/api/analyses/{analysis_id}", headers=auth("bob-token")).status_code == 404
    assert client.post(f"/api/analyses/{analysis_id}/retry", headers=auth("bob-token")).status_code == 404
    assert client.post(f"/api/analyses/{analysis_id}/outcome", json={"actual_retention": 70}, headers=auth("bob-token")).status_code == 404
    assert client.get("/api/videos", headers=auth("bob-token")).json()["videos"] == []
    assert client.get("/api/analyses/not-a-uuid", headers=auth()).status_code == 404


def test_ai_not_configured_fails_clearly(client, env, fake_db, sample_video):
    env.setenv("GEMINI_API_KEY", "")
    from app.core.config import get_settings

    get_settings.cache_clear()
    analysis_id = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE)).json()["analysis"]["id"]
    body = client.get(f"/api/analyses/{analysis_id}", headers=auth()).json()
    assert body["status"] == "failed"
    assert "não está configurada" in body["error_message"]
    assert body["result"] is None


def test_invalid_video_fails_with_friendly_message(client, fake_db, fake_ai):
    analysis_id = register(client, fake_db, "alice-token", upload(fake_db, ALICE, b"\x00" * 5000), upload_image(fake_db, ALICE)).json()["analysis"]["id"]
    body = client.get(f"/api/analyses/{analysis_id}", headers=auth()).json()
    assert body["status"] == "failed"
    assert "Não conseguimos ler este vídeo" in body["error_message"]
    assert fake_ai.calls == []


def test_video_without_audio_fails_before_calling_the_ai(client, fake_db, fake_ai, silent_video):
    analysis_id = register(client, fake_db, "alice-token", upload(fake_db, ALICE, silent_video), upload_image(fake_db, ALICE)).json()["analysis"]["id"]
    body = client.get(f"/api/analyses/{analysis_id}", headers=auth()).json()
    assert body["status"] == "failed" and "não tem áudio" in body["error_message"]
    assert fake_ai.calls == []


def test_no_speech_and_unreadable_chart_fail_clearly(client, fake_db, monkeypatch, sample_video):
    from app.services import ai_service

    monkeypatch.setattr(ai_service, "_client", lambda: FakeGemini(responses=[sample_transcript(has_speech=False, segments=[])]))
    analysis_id = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE)).json()["analysis"]["id"]
    body = client.get(f"/api/analyses/{analysis_id}", headers=auth()).json()
    assert body["status"] == "failed" and "Não encontramos fala" in body["error_message"]

    # uma instância só: a sequência de respostas (áudio → print) precisa sobreviver entre as chamadas
    unreadable = FakeGemini(responses=[sample_transcript(), sample_curve(readable=False, drop_second=None)])
    monkeypatch.setattr(ai_service, "_client", lambda: unreadable)
    analysis_id = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE)).json()["analysis"]["id"]
    body = client.get(f"/api/analyses/{analysis_id}", headers=auth()).json()
    assert body["status"] == "failed" and "Não conseguimos ler o print" in body["error_message"]


def test_ai_error_then_retry(client, fake_db, fake_ai, sample_video):
    fake_ai.error = httpx.ConnectError("connection refused")
    analysis_id = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE)).json()["analysis"]["id"]
    body = client.get(f"/api/analyses/{analysis_id}", headers=auth()).json()
    assert body["status"] == "failed"
    assert "Não foi possível falar com a IA" in body["error_message"]

    fake_ai.error = None
    r = client.post(f"/api/analyses/{analysis_id}/retry", headers=auth())
    assert r.status_code == 202
    assert client.get(f"/api/analyses/{analysis_id}", headers=auth()).json()["status"] == "completed"

    r = client.post(f"/api/analyses/{analysis_id}/retry", headers=auth())
    assert r.status_code == 409


def test_database_outage_returns_502(client, fake_db):
    fake_db.fail_with = SupabaseError("videos.list")
    r = client.get("/api/videos", headers=auth())
    assert r.status_code == 502
    assert r.json()["error"]["code"] == "DATABASE_ERROR"
    assert "Traceback" not in r.text


def test_unconfigured_server_returns_503(env, fake_db, monkeypatch):
    from fastapi.testclient import TestClient

    from app.main import app
    from app.services import supabase_service

    def not_configured(token):
        raise supabase_service.SupabaseNotConfigured()

    monkeypatch.setattr(supabase_service, "get_user_from_token", not_configured)
    r = TestClient(app).get("/api/videos", headers=auth())
    assert r.status_code == 503


def test_analysis_without_retention_screenshot(client, fake_db, monkeypatch, sample_video):
    """O print é opcional: a IA aponta o momento provável pelo vídeo; não há curva nem previsão."""
    fake = FakeGemini(responses=[sample_transcript(), sample_moment(), sample_copilot()])
    monkeypatch.setattr(ai_service, "_client", lambda: fake)

    r = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), None)
    assert r.status_code == 201, r.text
    analysis_id = r.json()["analysis"]["id"]
    assert fake_db.videos[r.json()["video"]["id"]]["insights_path"] is None

    body = client.get(f"/api/analyses/{analysis_id}", headers=auth()).json()
    assert body["status"] == "completed", body["error_message"]
    assert body["video"]["has_insights"] is False and body["video"]["insights_url"] is None
    result = body["result"]
    assert result["retention_source"] == "estimated"
    assert result["curve"] is None and result["prediction"] is None
    assert result["drop"] == {"at_seconds": 2.6, "retained_before": None, "retained_after": None, "reason": "Aos 2,6s você troca o resultado prometido por contexto."}
    assert result["phrase"]["text"].startswith("Então, antes de tudo") and result["phrase"]["before"].startswith("Eu fiquei")
    assert len(result["rewrites"]) == 3 and result["copilot"]["pace"] == "lento"

    # três chamadas à IA: áudio, o momento (com frames do vídeo inteiro) e o copiloto; nenhuma leitura de print
    assert len(fake.calls) == 3
    assert fake.calls[1]["config"].response_schema is ai_service.MomentDiagnosis
    kinds = [[p.inline_data.mime_type for p in call["contents"] if p.inline_data is not None] for call in fake.calls]
    assert kinds[0] == ["audio/mp3"] and "image/png" not in sum(kinds, []) and len(kinds[1]) >= 6

    # a lista do painel sabe que não há previsão
    listed = client.get("/api/videos", headers=auth()).json()["videos"][0]["analysis"]
    assert listed["retention_source"] == "estimated" and listed["curve"] is None and listed["drop_at"] == 2.6

    # sem previsão, não há o que conferir
    r = client.post(f"/api/analyses/{analysis_id}/outcome", json={"actual_retention": 70}, headers=auth())
    assert r.status_code == 409 and r.json()["error"]["code"] == "NO_PREDICTION"


def test_moment_index_out_of_range_is_clamped(client, fake_db, monkeypatch, sample_video):
    fake = FakeGemini(responses=[sample_transcript(), sample_moment(segment_index=99), sample_copilot()])
    monkeypatch.setattr(ai_service, "_client", lambda: fake)
    r = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), None)
    result = client.get(f"/api/analyses/{r.json()['analysis']['id']}", headers=auth()).json()["result"]
    assert result["drop"]["at_seconds"] == 6.4 and result["phrase"]["text"].startswith("Eu sempre fui")
