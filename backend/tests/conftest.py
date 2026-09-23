import copy
import subprocess
import threading
import uuid
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from google.genai import types

from app.core.config import get_settings
from app.schemas.analysis import Copilot, CurveReading, Diagnosis, MomentDiagnosis, Transcript
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
        self.partners: dict[str, dict] = {}  # por partner id
        self.clicks: list[dict] = []
        self.commissions: dict[str, dict] = {}  # por purchase_id (único, como no banco)
        self.guest_sessions: dict[str, dict] = {}  # por id
        self.video_edits: dict[str, dict] = {}  # por analysis_id (unico, como no banco)
        self.notion_connections: dict[str, dict] = {}  # por user_id
        self.notion_exports: dict[str, dict] = {}  # por analysis_id
        self.followups: dict[str, dict] = {}  # por analysis_id (único, como no banco)
        self.events: list[dict] = []
        self.signed_uploads: list[str] = []
        self.deleted: list[str] = []
        self.deleted_users: list[str] = []
        self.fail_with: Exception | None = None

    def _check(self):
        if self.fail_with:
            raise self.fail_with

    def _store(self, bucket):
        return self.images if bucket == INSIGHTS else self.objects

    def get_user_from_token(self, token):
        return TOKENS.get(token)

    def list_storage_paths(self, user_id):
        return [{"storage_path": v.get("storage_path"), "insights_path": v.get("insights_path")} for v in self.videos.values() if v.get("user_id") == user_id]

    def delete_user(self, user_id):
        self.deleted_users.append(user_id)
        # no banco de verdade quem apaga o resto é a FK em cascata
        for tabela in (self.profiles, self.videos, self.analyses):
            for chave in [k for k, row in tabela.items() if row.get("user_id") == user_id or row.get("id") == user_id]:
                tabela.pop(chave, None)

    def get_profile(self, user_id):
        # o trigger do banco copia o e-mail da conta para o perfil; o lembrete de 72 h lê daqui
        email = next((u["email"] for u in TOKENS.values() if u["id"] == user_id), "x")
        profile = self.profiles.setdefault(user_id, {"id": user_id, "email": email, "full_name": "Alice Creator", "created_at": now(), "referral_code": None})
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
        # o banco busca com ilike: maiúsculas não diferenciam
        return next((copy.deepcopy(p) for p in self.profiles.values() if (p.get("referral_code") or "").lower() == (code or "").lower()), None)

    def update_referral_code(self, user_id, code):
        profile = self.profiles.setdefault(user_id, {"id": user_id, "email": "x", "full_name": None, "created_at": now(), "referral_code": None})
        profile["referral_code"] = code
        return True

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

    def list_referrals(self, referrer_id):
        return [copy.deepcopy(r) for r in self.referrals.values() if r["referrer_id"] == referrer_id]

    def list_paid_purchases_of(self, user_ids):
        ids = set(user_ids)
        return [copy.deepcopy(p) for p in self.purchases.values() if p.get("user_id") in ids and p["status"] == "paid"]

    # ---- Partners: programa de comissão

    def get_partner(self, user_id):
        return next((copy.deepcopy(p) for p in self.partners.values() if p["user_id"] == user_id), None)

    def get_partner_by_id(self, partner_id):
        row = self.partners.get(partner_id)
        return copy.deepcopy(row) if row else None

    def insert_partner(self, user_id, commission_rate, status):
        assert not self.get_partner(user_id)  # user_id é único no banco
        row = {"id": str(uuid.uuid4()), "user_id": user_id, "commission_rate": commission_rate, "status": status, "created_at": now()}
        self.partners[row["id"]] = row
        return copy.deepcopy(row)

    def update_partner(self, partner_id, fields):
        row = self.partners.get(partner_id)
        if not row:
            return None
        row.update(fields)
        return copy.deepcopy(row)

    def list_partners(self):
        return [copy.deepcopy(p) for p in sorted(self.partners.values(), key=lambda p: p["created_at"], reverse=True)]

    def insert_referral_click(self, code):
        self.clicks.append({"id": str(uuid.uuid4()), "code": code, "created_at": now()})

    def count_referral_clicks(self, code):
        return sum(1 for c in self.clicks if c["code"] == code)

    def insert_commission(self, row):
        if row["purchase_id"] in self.commissions:
            return None  # purchase_id é único: a mesma compra nunca paga duas vezes
        stored = {"id": str(uuid.uuid4()), "status": "pending", "created_at": now(), **row}
        self.commissions[row["purchase_id"]] = stored
        return copy.deepcopy(stored)

    def list_commissions(self, partner_id):
        return [copy.deepcopy(c) for c in self.commissions.values() if c["partner_id"] == partner_id]

    def list_all_commissions(self):
        return [copy.deepcopy(c) for c in self.commissions.values()]

    def reverse_commissions_for_purchases(self, purchase_ids):
        reversed_count = 0
        for purchase_id in purchase_ids:
            commission = self.commissions.get(purchase_id)
            if commission and commission["status"] != "reversed":
                commission["status"] = "reversed"
                reversed_count += 1
        return reversed_count

    def list_purchases_by_intent(self, payment_intent):
        return [copy.deepcopy(p) for p in self.purchases.values() if p.get("stripe_payment_intent") == payment_intent]

    def get_object_info(self, path, bucket=None):
        self._check()
        obj = self._store(bucket).get(path)
        return {"size": obj["size"], "content_type": obj["content_type"]} if obj else None

    def download_object(self, path, bucket=None):
        return self._store(bucket)[path]["data"]

    def delete_object(self, path, bucket=None):
        self.deleted.append(path)
        self._store(bucket).pop(path, None)

    def upload_object(self, path, data, content_type, bucket=None):
        self._check()
        self._store(bucket)[path] = {"size": len(data), "content_type": content_type, "data": data}

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
                        "retention_source": result.get("retention_source"),
                    }
                )
            rows.append({**{k: v.get(k) for k in ("id", "filename", "size_bytes", "duration_seconds", "status", "created_at", "hypothesis")}, "analyses": analyses})
        return rows

    def insert_analysis(self, video_id, user_id, guest_id=None, full_access=True, tier=None):
        analysis = {
            "id": str(uuid.uuid4()),
            "video_id": video_id,
            "user_id": user_id,
            "guest_id": guest_id,
            "full_access": full_access,
            "tier": tier,
            "blind_at_seconds": None,
            "blind_phrase": None,
            "blind_shown_at": None,
            "blind_response": None,
            "blind_actual_seconds": None,
            "blind_hit": None,
            "blind_responded_at": None,
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

    def get_analysis(self, analysis_id, user_id=None, guest_id=None):
        self._check()
        a = self.analyses.get(analysis_id)
        if not a or (user_id is not None and a["user_id"] != user_id) or (guest_id is not None and a.get("guest_id") != guest_id):
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

    def count_blind_responses(self, user_id):
        mine = [a for a in self.analyses.values() if a["user_id"] == user_id]
        return {"hits": sum(a.get("blind_hit") is True for a in mine), "misses": sum(a.get("blind_hit") is False for a in mine)}

    # ---- convidados e eventos

    def insert_guest_session(self, row):
        self._check()
        session = {"id": str(uuid.uuid4()), "claimed_by": None, "claimed_at": None, "created_at": now(), **row}
        self.guest_sessions[session["id"]] = session
        return copy.deepcopy(session)

    def get_guest_session(self, token_hash):
        return next((copy.deepcopy(g) for g in self.guest_sessions.values() if g["token_hash"] == token_hash), None)

    def list_guest_session_ids_from_ip(self, ip_hash, since):
        return [g["id"] for g in self.guest_sessions.values() if g.get("ip_hash") == ip_hash and g["created_at"] >= since]

    def count_guest_videos(self, guest_ids):
        ids = set(guest_ids)
        return sum(1 for v in self.videos.values() if v.get("guest_id") in ids)

    def list_guest_analysis_ids(self, guest_id):
        return [a["id"] for a in self.analyses.values() if a.get("guest_id") == guest_id]

    def claim_guest_session(self, guest_id, user_id, claimed_at):
        self.guest_sessions[guest_id].update(claimed_by=user_id, claimed_at=claimed_at)
        for v in self.videos.values():
            if v.get("guest_id") == guest_id:
                v["user_id"] = user_id
        for a in self.analyses.values():
            if a.get("guest_id") == guest_id:
                a["user_id"] = user_id

    def create_signed_upload_url(self, path, bucket=None):
        self.signed_uploads.append(path)
        return {"url": f"https://storage.test/upload/{bucket or 'videos'}/{path}?token=up", "token": "up", "path": path}

    # ---- cortes aprovados

    def upsert_video_edit(self, row):
        self._check()
        current = self.video_edits.get(row["analysis_id"]) or {"id": str(uuid.uuid4()), "created_at": now()}
        current.update(row)
        self.video_edits[row["analysis_id"]] = current
        return copy.deepcopy(current)

    def get_video_edit(self, analysis_id):
        row = self.video_edits.get(analysis_id)
        return copy.deepcopy(row) if row else None

    def get_video_edit_by_id(self, edit_id):
        for row in self.video_edits.values():
            if row["id"] == edit_id:
                analysis = self.analyses.get(row["analysis_id"]) or {}
                video = self.videos.get(analysis.get("video_id")) or {}
                nested = {**copy.deepcopy(analysis), "videos": copy.deepcopy(video)}
                return {**copy.deepcopy(row), "analyses": nested}
        return None

    def update_video_edit(self, edit_id, fields):
        self._check()
        for row in self.video_edits.values():
            if row["id"] == edit_id:
                row.update(fields)

    def fail_unfinished_edits(self, code="interrupted"):
        count = 0
        for row in self.video_edits.values():
            if row["status"] in ("pending", "processing"):
                row.update(status="failed", error_code=code)
                count += 1
        return count

    # ---- Notion

    def upsert_notion_connection(self, row):
        self._check()
        current = self.notion_connections.get(row["user_id"]) or {"created_at": now()}
        current.update(row)
        self.notion_connections[row["user_id"]] = current
        return copy.deepcopy(current)

    def get_notion_connection(self, user_id):
        row = self.notion_connections.get(user_id)
        return copy.deepcopy(row) if row else None

    def update_notion_connection(self, user_id, fields):
        row = self.notion_connections.get(user_id)
        if not row:
            return None
        row.update(fields)
        return copy.deepcopy(row)

    def delete_notion_connection(self, user_id):
        self.notion_connections.pop(user_id, None)

    def upsert_notion_export(self, row):
        self._check()
        current = self.notion_exports.get(row["analysis_id"]) or {"id": str(uuid.uuid4()), "created_at": now()}
        current.update(row)
        self.notion_exports[row["analysis_id"]] = current
        return copy.deepcopy(current)

    def get_notion_export(self, analysis_id):
        row = self.notion_exports.get(analysis_id)
        return copy.deepcopy(row) if row else None

    # ---- lembretes (fechar o loop)

    def upsert_followup(self, row):
        self._check()
        current = self.followups.get(row["analysis_id"]) or {"id": str(uuid.uuid4()), "created_at": now()}
        current.update(row)
        self.followups[row["analysis_id"]] = current
        return copy.deepcopy(current)

    def get_followup(self, analysis_id):
        row = self.followups.get(analysis_id)
        return copy.deepcopy(row) if row else None

    def list_due_followups(self, now_iso, limit):
        due = [f for f in self.followups.values() if f["status"] == "scheduled" and f["send_after"] <= now_iso]
        rows = []
        for followup in sorted(due, key=lambda f: f["send_after"])[:limit]:
            analysis = self.analyses.get(followup["analysis_id"]) or {}
            video = self.videos.get(analysis.get("video_id")) or {}
            rows.append(
                {
                    **copy.deepcopy(followup),
                    "analyses": {
                        "id": analysis.get("id"),
                        "outcome": analysis.get("outcome"),
                        "status": analysis.get("status"),
                        "blind_at_seconds": analysis.get("blind_at_seconds"),
                        "videos": {"filename": video.get("filename")},
                    },
                }
            )
        return rows

    def update_followup(self, followup_id, fields):
        for followup in self.followups.values():
            if followup["id"] == followup_id:
                followup.update(fields)
                return

    def cancel_followup(self, analysis_id):
        followup = self.followups.get(analysis_id)
        if followup and followup["status"] == "scheduled":
            followup["status"] = "cancelled"
            return 1
        return 0

    def insert_event(self, row):
        self._check()
        self.events.append({"id": str(uuid.uuid4()), "created_at": now(), **row})


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
    monkeypatch.delenv("PARTNERS_COMMISSION_RATE", raising=False)
    monkeypatch.delenv("PARTNERS_DEFAULT_STATUS", raising=False)
    monkeypatch.delenv("ADMIN_EMAILS", raising=False)
    # o .env de quem roda os testes pode ter estas preenchidas; aqui cada teste liga a sua
    for optional in ("RESEND_API_KEY", "EMAIL_FROM", "INTERNAL_SECRET", "APP_URL", "GUEST_VIDEOS_PER_IP",
                     "NOTION_CLIENT_ID", "NOTION_CLIENT_SECRET", "NOTION_REDIRECT_URI"):
        monkeypatch.delenv(optional, raising=False)
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


def sample_moment(**overrides) -> MomentDiagnosis:
    """Sem print: a IA aponta o segmento 1 (a frase do contexto) como o momento provável."""
    data = {
        "segment_index": 1,
        "reason": "Aos 2,6s você troca o resultado prometido por contexto.",
        "diagnosis": "Quem chegou pelo título quer o resultado; o contexto adia a promessa.",
        "rewrites": sample_diagnosis().model_dump()["rewrites"],
    }
    data.update(overrides)
    return MomentDiagnosis.model_validate(data)


def sample_copilot(**overrides) -> Copilot:
    data = {
        "pace": "lento",
        "pace_note": "Entre 2,6s e 6,4s você fala devagar e o plano não muda.",
        "hook_score": 6,
        "hook_note": "Começa direto, mas sem prometer o resultado.",
        "overall_score": 8,
        "funnel": "descoberta",
        "funnel_note": "É um vídeo para alcançar quem não te conhece: o gancho vale mais que o CTA.",
        "recommendations": [
            {
                "kind": "hook",
                "at_seconds": 0.0,
                "end_seconds": 3.0,
                "title": "Abra com o resultado, não com o contexto",
                "action": "Troque os 3 primeiros segundos pela frase do resultado e coloque o número na tela.",
                "why": "Quem chega decide ficar nos primeiros segundos.",
                "impact": 9,
                "effort": "medio",
            },
            {
                "kind": "pacing",
                "at_seconds": 3.5,
                "end_seconds": 6.0,
                "title": "Encurte a pausa dos 3,5s",
                "action": "Corte o silêncio entre 3,5s e 6s, deixando no máximo 0,3s.",
                "why": "O vídeo fica 2 s mais curto sem perder nada.",
                "impact": 6,
                "effort": "rapido",
            },
            {
                "kind": "caption",
                "at_seconds": 0.5,
                "end_seconds": None,
                "title": "Ponha o número na tela",
                "action": 'Legenda "30 dias sem café" entrando em 0,5s e saindo em 3s.',
                "why": "Reforça a promessa para quem assiste sem som.",
                "impact": 5,
                "effort": "rapido",
            },
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
        self._lock = threading.Lock()

    def _pick(self, kwargs):
        """A resposta do tipo que a chamada pediu.

        O pipeline faz chamadas em paralelo (transcrição e print juntos, diagnóstico e
        copiloto juntos), então responder por ordem de chegada daria respostas trocadas.
        O `response_schema` diz exatamente o que está sendo pedido.
        """
        wanted = (kwargs.get("config") or {}).get("response_schema") if isinstance(kwargs.get("config"), dict) else getattr(kwargs.get("config"), "response_schema", None)
        with self._lock:
            if wanted is not None:
                match = next((r for r in self.responses if isinstance(r, wanted)), None)
                if match is not None:
                    # consome, mas a última do tipo continua valendo para chamadas repetidas
                    if sum(isinstance(r, wanted) for r in self.responses) > 1:
                        self.responses.remove(match)
                    return match
            return self.responses.pop(0) if len(self.responses) > 1 else self.responses[0]

    def _generate_content(self, **kwargs):
        self.calls.append(kwargs)
        if self.error:
            raise self.error
        parsed = self._pick(kwargs)
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


def guest_headers(client) -> dict:
    """Abre uma sessão de convidado e devolve o header que a identifica."""
    response = client.post("/api/guest/session")
    assert response.status_code == 201, response.text
    return {"X-Guest-Token": response.json()["token"]}


def guest_upload(fake_db, guest_id: str, data: bytes, content_type="video/mp4", ext="mp4") -> str:
    """Simula o envio do convidado pela URL assinada: o arquivo aparece em guest/<sessão>/."""
    path = f"guest/{guest_id}/{uuid.uuid4()}.{ext}"
    fake_db.objects[path] = {"size": len(data), "content_type": content_type, "data": data}
    return path


def register(client, fake_db, user_token, video_path, image_path, hypothesis=None):
    body = {"storage_path": video_path, "filename": "meu vídeo.mp4"}
    if image_path is not None:  # o print é opcional
        body["insights_path"] = image_path
    if hypothesis is not None:
        body["hypothesis"] = hypothesis
    return client.post("/api/videos", json=body, headers=auth(user_token))
