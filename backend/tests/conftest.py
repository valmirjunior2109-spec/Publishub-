import copy
import subprocess
import uuid
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from google.genai import types

from app.core.config import get_settings
from app.schemas.analysis import Copilot, CurveReading, Diagnosis, Transcript
from app.services import ai_service, supabase_service
from app.services.video_processing import FFMPEG

ALICE = {"id": str(uuid.uuid4()), "email": "alice@example.com"}
BOB = {"id": str(uuid.uuid4()), "email": "bob@example.com"}
TOKENS = {"alice-token": ALICE, "bob-token": BOB}
INSIGHTS = "insights"


def now():
    return datetime.now(timezone.utc).isoformat()


class FakeSupabase:
    """In-memory stand-in for app.services.supabase_service (same function names)."""

    def __init__(self):
        self.objects: dict[str, dict] = {}  # bucket de vídeos
        self.images: dict[str, dict] = {}  # bucket de prints
        self.videos: dict[str, dict] = {}
        self.analyses: dict[str, dict] = {}
        self.purchases: dict[str, dict] = {}  # por stripe_session_id
        self.profiles: dict[str, dict] = {}  # por user_id, criados sob demanda (como o trigger faz)
        self.referrals: dict[str, dict] = {}  # por referred_user_id
        self.deleted: list[str] = []
        self.fail_with: Exception | None = None

    def _check(self):
        if self.fail_with:
            raise self.fail_with

    def _store(self, bucket):
        return self.images if bucket == INSIGHTS else self.objects

    def get_user_from_token(self, token):
        return TOKENS.get(token)

    def get_profile(self, user_id):
        profile = self.profiles.setdefault(user_id, {"id": user_id, "email": "x", "full_name": "Alice Creator", "created_at": now(), "referral_code": None})
        return copy.deepcopy(profile)

    # ---- Publishub Partners

    def set_referral_code(self, user_id, code):
        if any(p.get("referral_code") == code for p in self.profiles.values()):
            return False
        profile = self.profiles.setdefault(user_id, {"id": user_id, "email": "x", "full_name": None, "created_at": now(), "referral_code": None})
        if profile["referral_code"]:
            return False
        profile["referral_code"] = code
        return True

    def get_profile_by_referral_code(self, code):
        return next((copy.deepcopy(p) for p in self.profiles.values() if p.get("referral_code") == code), None)

    def get_referral_for(self, referred_user_id):
        row = self.referrals.get(referred_user_id)
        return copy.deepcopy(row) if row else None

    def insert_referral(self, referrer_id, referred_user_id, code):
        assert referred_user_id not in self.referrals and referrer_id != referred_user_id  # as constraints do banco
        row = {"id": str(uuid.uuid4()), "referrer_id": referrer_id, "referred_user_id": referred_user_id, "code": code, "created_at": now()}
        self.referrals[referred_user_id] = row
        return copy.deepcopy(row)

    def list_referred_ids(self, referrer_id):
        return [r["referred_user_id"] for r in self.referrals.values() if r["referrer_id"] == referrer_id]

    def count_paid_purchasers(self, user_ids):
        return len({p["user_id"] for p in self.purchases.values() if p.get("user_id") in set(user_ids) and p["status"] == "paid"})

    def get_object_info(self, path, bucket=None):
        self._check()
        obj = self._store(bucket).get(path)
        return {"size": obj["size"], "content_type": obj["content_type"]} if obj else None

    def download_object(self, path, bucket=None):
        return self._store(bucket)[path]["data"]

    def delete_object(self, path, bucket=None):
        self.deleted.append(path)
        self._store(bucket).pop(path, None)

    def create_signed_url(self, path, expires_in=3600, bucket=None):
        return f"https://storage.test/{bucket or 'videos'}/{path}?token=signed"

    def insert_video(self, row):
        self._check()
        video = {"id": str(uuid.uuid4()), "duration_seconds": None, "created_at": now(), **row}
        self.videos[video["id"]] = video
        return copy.deepcopy(video)

    def update_video(self, video_id, fields):
        self.videos[video_id].update(fields)

    def storage_path_in_use(self, path):
        return any(v["storage_path"] == path for v in self.videos.values())

    def insights_path_in_use(self, path):
        return any(v.get("insights_path") == path for v in self.videos.values())

    def list_videos(self, user_id):
        self._check()
        rows = []
        for v in sorted(self.videos.values(), key=lambda v: v["created_at"], reverse=True):
            if v["user_id"] != user_id:
                continue
            analyses = []
            for a in self.analyses.values():
                if a["video_id"] != v["id"]:
                    continue
                result = a.get("result") or {}
                analyses.append(
                    {
                        **{k: a.get(k) for k in ("id", "status", "step", "outcome", "actual_retention", "outcome_recorded_at", "created_at", "updated_at")},
                        "drop_at": (result.get("drop") or {}).get("at_seconds"),
                        "curve": result.get("curve"),
                    }
                )
            rows.append({**{k: v.get(k) for k in ("id", "filename", "size_bytes", "duration_seconds", "status", "created_at", "hypothesis")}, "analyses": analyses})
        return rows

    def insert_analysis(self, video_id, user_id):
        analysis = {
            "id": str(uuid.uuid4()),
            "video_id": video_id,
            "user_id": user_id,
            "status": "pending",
            "step": None,
            "outcome": "pending",
            "actual_retention": None,
            "outcome_recorded_at": None,
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

    def count_outcomes(self, user_id):
        mine = [a for a in self.analyses.values() if a["user_id"] == user_id]
        return {"confirmed": sum(a["outcome"] == "confirmed" for a in mine), "refuted": sum(a["outcome"] == "refuted" for a in mine)}

    def fail_unfinished_analyses(self, message):
        return 0

    # ---- compras (Stripe)

    def get_purchase_by_session(self, session_id):
        row = self.purchases.get(session_id)
        return copy.deepcopy(row) if row else None

    def upsert_purchase(self, row):
        current = self.purchases.get(row["stripe_session_id"]) or {"id": str(uuid.uuid4()), "created_at": now(), "refunded_at": None}
        current.update(row)
        self.purchases[row["stripe_session_id"]] = current
        return copy.deepcopy(current)

    def list_purchases(self, user_id, email):
        email = (email or "").lower()
        return [copy.deepcopy(p) for p in self.purchases.values() if p.get("user_id") == user_id or (not p.get("user_id") and email and p["email"] == email)]

    def link_purchases(self, email, user_id):
        linked = 0
        for p in self.purchases.values():
            if not p.get("user_id") and p["email"] == email.lower():
                p["user_id"] = user_id
                linked += 1
        return linked

    def mark_purchase_refunded(self, payment_intent, refunded_at):
        revoked = 0
        for p in self.purchases.values():
            if p.get("stripe_payment_intent") == payment_intent:
                p["status"], p["refunded_at"] = "refunded", refunded_at
                revoked += 1
        return revoked

    def count_videos(self, user_id):
        return sum(1 for v in self.videos.values() if v["user_id"] == user_id)


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
    # fixos: os testes não podem depender do backend/.env de quem está rodando
    monkeypatch.setenv("GEMINI_MODEL", "gemini-3.8-flash")
    monkeypatch.setenv("GEMINI_FALLBACK_MODEL", "gemini-3.5-flash")
    monkeypatch.setenv("MAX_UPLOAD_MB", "50")
    monkeypatch.delenv("STRIPE_SECRET_KEY", raising=False)
    monkeypatch.delenv("STRIPE_WEBHOOK_SECRET", raising=False)
    monkeypatch.delenv("FREE_UPLOADS", raising=False)
    monkeypatch.delenv("PARTNERS_GOAL", raising=False)
    get_settings.cache_clear()
    yield monkeypatch
    get_settings.cache_clear()


# ---------------------------------------------------------------- respostas da IA


def sample_transcript(**overrides) -> Transcript:
    data = {
        "language": "pt",
        "has_speech": True,
        "segments": [
            {"start_seconds": 0.0, "end_seconds": 2.6, "text": "Eu fiquei trinta dias sem café."},
            {"start_seconds": 2.6, "end_seconds": 6.4, "text": "Então, antes de tudo, deixa eu te dar um contexto rápido."},
            {"start_seconds": 6.4, "end_seconds": 8.0, "text": "Eu sempre fui daquelas pessoas que…"},
        ],
    }
    data.update(overrides)
    return Transcript.model_validate(data)


def sample_curve(**overrides) -> CurveReading:
    data = {
        "readable": True,
        "drop_second": 4.0,
        "retained_before_drop": 93.0,
        "retained_after_drop": 61.0,
        "points": [[0, 100], [2, 96], [4, 93], [6, 61], [8, 55]],
    }
    data.update(overrides)
    return CurveReading.model_validate(data)


def sample_diagnosis(**overrides) -> Diagnosis:
    data = {
        "diagnosis": "Você prometeu contexto no lugar do resultado; quem chegou quer saber o que aconteceu.",
        "rewrites": [
            {"text": "No dia 12 eu quase desisti. Aqui está o que aconteceu com o meu sono.", "why": "Abre com um momento concreto."},
            {"text": "Trinta dias sem café: dormi melhor, mas a produtividade caiu.", "why": "Entrega o resultado de cara."},
            {"text": "Se você toma mais de três cafés por dia, presta atenção.", "why": "Fala direto com quem tem o hábito."},
        ],
        "prediction": {"predicted_retention": 72.0, "statement": "Trocando a frase do 0:04, a retenção aos 6s deve subir de 61% para pelo menos 72%."},
    }
    data.update(overrides)
    return Diagnosis.model_validate(data)


def sample_copilot(**overrides) -> Copilot:
    data = {
        "pace": "lento",
        "pace_note": "Entre 2,6s e 6,4s você fala devagar e o plano não muda.",
        "hook_score": 6,
        "hook_note": "Começa direto, mas sem prometer o resultado.",
        "slow_stretches": [{"start_seconds": 3.5, "end_seconds": 6.0, "reason": "Pausa de 2,5 s sem nada acontecendo na tela."}],
        "cuts": [
            {"at_seconds": 3.5, "end_seconds": 6.0, "action": "encurtar_pausa", "why": "Some com a pausa e o vídeo fica 2 s mais curto sem perder nada."},
            {"at_seconds": 0.0, "end_seconds": None, "action": "inserir_texto", "why": "Um texto com o resultado nos primeiros segundos segura quem chega."},
        ],
        "summary": "Encurte a pausa do 3,5s e coloque o resultado na tela logo no início.",
    }
    data.update(overrides)
    return Copilot.model_validate(data)


class FakeGemini:
    """Captures requests; answers each call with the next canned structured response."""

    def __init__(self, responses=None, finish_reason=None, block_reason=None, error: Exception | None = None):
        self.calls = []
        self.error = error
        self.responses = list(responses) if responses is not None else [sample_transcript(), sample_curve(), sample_diagnosis(), sample_copilot()]
        self.finish_reason = finish_reason or types.FinishReason.STOP
        self.block_reason = block_reason
        self.models = SimpleNamespace(generate_content=self._generate_content)

    def _generate_content(self, **kwargs):
        self.calls.append(kwargs)
        if self.error:
            raise self.error
        parsed = self.responses.pop(0) if len(self.responses) > 1 else self.responses[0]
        return SimpleNamespace(
            parsed=parsed,
            candidates=[SimpleNamespace(finish_reason=self.finish_reason)],
            prompt_feedback=None if self.block_reason is None else SimpleNamespace(block_reason=self.block_reason),
        )


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


@pytest.fixture(scope="session")
def silent_video(tmp_path_factory) -> bytes:
    """4s video without an audio track."""
    out = tmp_path_factory.mktemp("media") / "silent.mp4"
    subprocess.run(
        [FFMPEG, "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc2=size=360x640:rate=25:duration=4",
         "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", str(out)],
        check=True,
    )
    return out.read_bytes()


# 1x1 PNG: enough for the fake bucket, the AI is faked anyway.
TINY_PNG = bytes.fromhex("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5f0000000049454e44ae426082")


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


def upload_image(fake_db, user, data: bytes = TINY_PNG, content_type="image/png", ext="png") -> str:
    path = f"{user['id']}/{uuid.uuid4()}.{ext}"
    fake_db.images[path] = {"size": len(data), "content_type": content_type, "data": data}
    return path


def register(client, fake_db, user_token, video_path, image_path, hypothesis=None):
    body = {"storage_path": video_path, "insights_path": image_path, "filename": "meu vídeo.mp4"}
    if hypothesis is not None:
        body["hypothesis"] = hypothesis
    return client.post("/api/videos", json=body, headers=auth(user_token))
