import httpx

from app.services.supabase_service import SupabaseError
from tests.conftest import ALICE, BOB, auth, upload


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
    other_users_file = upload(fake_db, BOB, sample_video)
    r = client.post("/api/videos", json={"storage_path": other_users_file, "filename": "a.mp4"}, headers=auth())
    assert r.status_code == 403

    r = client.post("/api/videos", json={"storage_path": f"{ALICE['id']}/../../etc/passwd", "filename": "a.mp4"}, headers=auth())
    assert r.status_code == 400 and r.json()["error"]["code"] == "INVALID_FILE"

    missing = f"{ALICE['id']}/00000000-0000-4000-8000-000000000000.mp4"
    r = client.post("/api/videos", json={"storage_path": missing, "filename": "a.mp4"}, headers=auth())
    assert r.status_code == 400 and r.json()["error"]["code"] == "UPLOAD_NOT_FOUND"

    too_big = upload(fake_db, ALICE, sample_video)
    fake_db.objects[too_big]["size"] = 60 * 1024 * 1024
    r = client.post("/api/videos", json={"storage_path": too_big, "filename": "a.mp4"}, headers=auth())
    assert r.status_code == 413 and too_big in fake_db.deleted

    wrong_type = upload(fake_db, ALICE, b"not a video", content_type="text/plain")
    r = client.post("/api/videos", json={"storage_path": wrong_type, "filename": "a.mp4"}, headers=auth())
    assert r.status_code == 400 and wrong_type in fake_db.deleted

    r = client.post("/api/videos", json={"filename": "a.mp4"}, headers=auth())
    assert r.status_code == 422 and r.json()["error"]["code"] == "VALIDATION_ERROR"


def test_full_flow_upload_analyze_and_read(client, fake_db, fake_ai, sample_video):
    path = upload(fake_db, ALICE, sample_video)
    r = client.post("/api/videos", json={"storage_path": path, "filename": "meu vídeo.mp4"}, headers=auth())
    assert r.status_code == 201
    analysis_id = r.json()["analysis"]["id"]

    # TestClient runs background tasks before returning, so the analysis is done.
    body = client.get(f"/api/analyses/{analysis_id}", headers=auth()).json()
    assert body["status"] == "completed", body["error_message"]
    result = body["result"]
    assert result["overall_score"] == 45  # (4 + 6 + 3 + 5) / 4 * 10
    assert result["hook"]["recommendation"]
    assert result["funnel"]["stage"] == "top"
    assert result["signals"]["duration_seconds"] == 8.0
    assert result["signals"]["width"] == 360 and result["signals"]["height"] == 640
    assert any(s["start"] < 1 and s["end"] > 1.3 for s in result["signals"]["silences"]), result["signals"]["silences"]
    assert any(3.3 < s["start"] < 3.8 for s in result["signals"]["silences"])
    assert body["video"]["filename"] == "meu vídeo.mp4"
    assert body["video"]["playback_url"].startswith("https://")

    # The AI received the hook frames and the measured signals.
    parts = fake_ai.calls[0]["contents"]
    images = [p for p in parts if p.inline_data is not None]
    assert len(images) >= 6
    assert all(p.inline_data.mime_type == "image/jpeg" for p in images)
    assert "SINAIS MEDIDOS" in parts[-1].text

    videos = client.get("/api/videos", headers=auth()).json()["videos"]
    assert videos[0]["status"] == "analyzed"
    assert videos[0]["analysis"]["status"] == "completed"
    assert float(videos[0]["duration_seconds"]) == 8.0


def test_users_cannot_see_each_others_data(client, fake_db, fake_ai, sample_video):
    path = upload(fake_db, ALICE, sample_video)
    analysis_id = client.post("/api/videos", json={"storage_path": path, "filename": "a.mp4"}, headers=auth()).json()["analysis"]["id"]

    assert client.get(f"/api/analyses/{analysis_id}", headers=auth("bob-token")).status_code == 404
    assert client.post(f"/api/analyses/{analysis_id}/retry", headers=auth("bob-token")).status_code == 404
    assert client.get("/api/videos", headers=auth("bob-token")).json()["videos"] == []
    assert client.get("/api/analyses/not-a-uuid", headers=auth()).status_code == 404


def test_ai_not_configured_fails_clearly(client, env, fake_db, sample_video):
    env.setenv("GEMINI_API_KEY", "")
    from app.core.config import get_settings

    get_settings.cache_clear()
    path = upload(fake_db, ALICE, sample_video)
    analysis_id = client.post("/api/videos", json={"storage_path": path, "filename": "a.mp4"}, headers=auth()).json()["analysis"]["id"]
    body = client.get(f"/api/analyses/{analysis_id}", headers=auth()).json()
    assert body["status"] == "failed"
    assert "não está configurada" in body["error_message"]
    assert body["result"] is None


def test_invalid_video_fails_with_friendly_message(client, fake_db, fake_ai):
    path = upload(fake_db, ALICE, b"\x00" * 5000)
    analysis_id = client.post("/api/videos", json={"storage_path": path, "filename": "a.mp4"}, headers=auth()).json()["analysis"]["id"]
    body = client.get(f"/api/analyses/{analysis_id}", headers=auth()).json()
    assert body["status"] == "failed"
    assert "Não conseguimos ler este vídeo" in body["error_message"]
    assert fake_ai.calls == []


def test_ai_error_then_retry(client, fake_db, fake_ai, sample_video):
    fake_ai.error = httpx.ConnectError("connection refused")
    path = upload(fake_db, ALICE, sample_video)
    analysis_id = client.post("/api/videos", json={"storage_path": path, "filename": "a.mp4"}, headers=auth()).json()["analysis"]["id"]
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
