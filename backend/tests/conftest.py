import copy
import subprocess
import uuid
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from google.genai import types

from app.core.config import get_settings
from app.schemas.analysis import AIAnalysis
from app.services import ai_service, supabase_service
from app.services.video_processing import FFMPEG

ALICE = {"id": str(uuid.uuid4()), "email": "alice@example.com"}
BOB = {"id": str(uuid.uuid4()), "email": "bob@example.com"}
TOKENS = {"alice-token": ALICE, "bob-token": BOB}


def now():
    return datetime.now(timezone.utc).isoformat()


class FakeSupabase:
    """In-memory stand-in for app.services.supabase_service (same function names)."""

    def __init__(self):
        self.objects: dict[str, dict] = {}
        self.videos: dict[str, dict] = {}
        self.analyses: dict[str, dict] = {}
        self.deleted: list[str] = []
        self.fail_with: Exception | None = None

    def _check(self):
        if self.fail_with:
            raise self.fail_with

    def get_user_from_token(self, token):
        return TOKENS.get(token)

    def get_profile(self, user_id):
        return {"id": user_id, "email": "x", "full_name": "Alice Creator", "created_at": now()}

    def get_object_info(self, path):
        self._check()
        obj = self.objects.get(path)
        return {"size": obj["size"], "content_type": obj["content_type"]} if obj else None

    def download_object(self, path):
        return self.objects[path]["data"]

    def delete_object(self, path):
        self.deleted.append(path)
        self.objects.pop(path, None)

    def create_signed_url(self, path, expires_in=3600):
        return f"https://storage.test/{path}?token=signed"

    def insert_video(self, row):
        self._check()
        video = {"id": str(uuid.uuid4()), "duration_seconds": None, "created_at": now(), **row}
        self.videos[video["id"]] = video
        return copy.deepcopy(video)

    def update_video(self, video_id, fields):
        self.videos[video_id].update(fields)

    def storage_path_in_use(self, path):
        return any(v["storage_path"] == path for v in self.videos.values())

    def list_videos(self, user_id):
        self._check()
        rows = []
        for v in sorted(self.videos.values(), key=lambda v: v["created_at"], reverse=True):
            if v["user_id"] != user_id:
                continue
            analyses = [
                {k: a[k] for k in ("id", "status", "created_at", "updated_at")}
                for a in self.analyses.values()
                if a["video_id"] == v["id"]
            ]
            rows.append({**{k: v[k] for k in ("id", "filename", "size_bytes", "duration_seconds", "status", "created_at")}, "analyses": analyses})
        return rows

    def insert_analysis(self, video_id, user_id):
        analysis = {
            "id": str(uuid.uuid4()),
            "video_id": video_id,
            "user_id": user_id,
            "status": "pending",
            "result": None,
            "error_message": None,
            "created_at": now(),
            "updated_at": now(),
        }
        self.analyses[analysis["id"]] = analysis
        return copy.deepcopy(analysis)

    def get_analysis(self, analysis_id, user_id=None):
        self._check()
        a = self.analyses.get(analysis_id)
        if not a or (user_id is not None and a["user_id"] != user_id):
            return None
        return {**copy.deepcopy(a), "videos": copy.deepcopy(self.videos[a["video_id"]])}

    def update_analysis(self, analysis_id, fields):
        self.analyses[analysis_id].update(fields, updated_at=now())

    def fail_unfinished_analyses(self, message):
        return 0


@pytest.fixture
def fake_db(monkeypatch):
    fake = FakeSupabase()
    for name in [n for n in dir(fake) if not n.startswith("_") and callable(getattr(fake, n))]:
        if hasattr(supabase_service, name):
            monkeypatch.setattr(supabase_service, name, getattr(fake, name))
    return fake


@pytest.fixture
def env(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://project.supabase.test")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-role-test")
    monkeypatch.setenv("GEMINI_API_KEY", "gemini-key-test")
    monkeypatch.setenv("MAX_UPLOAD_MB", "50")
    get_settings.cache_clear()
    yield monkeypatch
    get_settings.cache_clear()


def sample_ai_output(**overrides) -> AIAnalysis:
    data = {
        "summary": "Bom visual, mas o início demora e há uma pausa longa.",
        "hook": {"score": 4, "assessment": "Começa parado.", "problem": "1,5s de silêncio no início.", "recommendation": "Comece direto no assunto."},
        "editing": {
            "score": 6,
            "assessment": "Ritmo irregular.",
            "findings": [{"start_seconds": 3.5, "end_seconds": 6.0, "problem": "Pausa longa.", "recommendation": "Corte a pausa."}],
        },
        "captions": {"score": 3, "has_captions": False, "assessment": "Sem legendas.", "recommendations": ["Adicione legendas."]},
        "retention": {"score": 5, "assessment": "Risco no início.", "findings": []},
        "weak_points": ["Início lento"],
        "recommendations": [{"priority": "high", "category": "hook", "text": "Corte o silêncio inicial."}],
        "funnel": {"stage": "top", "reason": "Conteúdo de descoberta."},
    }
    data.update(overrides)
    return AIAnalysis.model_validate(data)


class FakeGemini:
    """Captures requests; returns a canned structured response."""

    def __init__(self, parsed=None, finish_reason=None, block_reason=None, error: Exception | None = None):
        self.calls = []
        self.error = error
        self.response = SimpleNamespace(
            parsed=parsed if parsed is not None else sample_ai_output(),
            candidates=[SimpleNamespace(finish_reason=finish_reason or types.FinishReason.STOP)],
            prompt_feedback=None if block_reason is None else SimpleNamespace(block_reason=block_reason),
        )
        self.models = SimpleNamespace(generate_content=self._generate_content)

    def _generate_content(self, **kwargs):
        self.calls.append(kwargs)
        if self.error:
            raise self.error
        return self.response


@pytest.fixture
def fake_ai(monkeypatch):
    fake = FakeGemini()
    monkeypatch.setattr(ai_service, "_client", lambda: fake)
    return fake


@pytest.fixture(scope="session")
def sample_video(tmp_path_factory) -> bytes:
    """8s vertical video: 1.5s silence, tone, 2.5s pause, tone."""
    out = tmp_path_factory.mktemp("media") / "sample.mp4"
    subprocess.run(
        [
            FFMPEG, "-hide_banner", "-loglevel", "error", "-y",
            "-f", "lavfi", "-i", "testsrc2=size=360x640:rate=25:duration=8",
            "-f", "lavfi", "-i", "sine=frequency=440:duration=8",
            "-filter_complex", "[1:a]volume='if(lt(t,1.5)+between(t,3.5,6),0,1)':eval=frame[a]",
            "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", "-c:a", "aac",
            str(out),
        ],
        check=True,
    )
    return out.read_bytes()


@pytest.fixture
def client(env, fake_db):
    from app.main import app

    return TestClient(app)


def auth(token="alice-token"):
    return {"Authorization": f"Bearer {token}"}


def upload(fake_db, user, data: bytes, content_type="video/mp4", ext="mp4") -> str:
    path = f"{user['id']}/{uuid.uuid4()}.{ext}"
    fake_db.objects[path] = {"size": len(data), "content_type": content_type, "data": data}
    return path
