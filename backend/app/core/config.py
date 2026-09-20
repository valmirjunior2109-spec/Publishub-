"""Settings read from environment variables (and `backend/.env` in development)."""

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

ALLOWED_VIDEO_TYPES = {
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
}

# O print da curva de retenção do Instagram Insights.
ALLOWED_IMAGE_TYPES = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
}


def _int(name: str, default: int) -> int:
    try:
        value = int(os.getenv(name, ""))
        return value if value > 0 else default
    except ValueError:
        return default


def _rate(name: str, default: float) -> float:
    """Uma fração entre 0 e 1 (0.30 = 30%). Fora disso, o padrão."""
    try:
        value = float(os.getenv(name, ""))
        return value if 0 <= value <= 1 else default
    except ValueError:
        return default


def _int_or_zero(name: str, default: int) -> int:
    """Like _int, but zero is a valid answer (ex.: nenhuma análise grátis)."""
    try:
        value = int(os.getenv(name, ""))
        return value if value >= 0 else default
    except ValueError:
        return default


@dataclass(frozen=True)
class Settings:
    supabase_url: str
    supabase_service_role_key: str
    storage_bucket: str
    insights_bucket: str
    gemini_api_key: str
    gemini_model: str
    gemini_fallback_model: str
    cors_origins: list[str]
    max_upload_bytes: int
    max_image_bytes: int
    max_video_duration_seconds: int
    max_concurrent_analyses: int
    # ---- pagamento (Stripe): plano Creator, pagamento único
    stripe_secret_key: str
    stripe_webhook_secret: str
    free_uploads: int  # teto anti-abuso de análises grátis por conta (o produto grátis é parcial, não limitado)
    partners_goal: int  # indicações que compraram o Lifetime para ganhar o Lifetime
    # ---- Publishub Partners (programa de comissão)
    partners_commission_rate: float  # fração do valor pago que fica com o Partner (0.30 = 30%)
    partners_default_status: str  # status de quem acaba de entrar no programa
    admin_emails: list[str]  # quem enxerga /api/admin/*
    # ---- primeiro uso sem cadastro (previsão cega)
    guest_hash_salt: str  # sal do hash de IP; sem ele, a service_role key serve de sal
    guest_videos_per_ip: int  # vídeos de convidado por IP por dia
    # ---- e-mail que fecha o loop (Resend)
    resend_api_key: str
    email_from: str  # "Publishub <ola@getpublishub.com>"
    email_reply_to: str
    app_url: str  # base dos links do e-mail (o site, não a API)
    internal_secret: str  # protege /api/internal/*, chamado pelo cron
    followup_hours: int  # sem data informada: quanto tempo depois da análise
    followup_after_republish_hours: int  # com data informada: quanto depois dela

    def is_admin(self, email: str | None) -> bool:
        return bool(email) and email.strip().lower() in self.admin_emails

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)

    @property
    def ai_configured(self) -> bool:
        return bool(self.gemini_api_key)

    @property
    def email_configured(self) -> bool:
        """Sem chave do Resend (ou remetente) nenhum e-mail sai, e o lembrete fica na fila."""
        return bool(self.resend_api_key and self.email_from)

    @property
    def billing_configured(self) -> bool:
        """Sem a chave do Stripe ninguém consegue pagar, então também não bloqueamos ninguém."""
        return bool(self.stripe_secret_key)


@lru_cache
def get_settings() -> Settings:
    return Settings(
        supabase_url=os.getenv("SUPABASE_URL", "").strip().rstrip("/"),
        supabase_service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip(),
        storage_bucket=os.getenv("SUPABASE_STORAGE_BUCKET", "videos").strip() or "videos",
        insights_bucket=os.getenv("SUPABASE_INSIGHTS_BUCKET", "insights").strip() or "insights",
        gemini_api_key=os.getenv("GEMINI_API_KEY", "").strip(),
        gemini_model=os.getenv("GEMINI_MODEL", "").strip() or "gemini-3.8-flash",
        # usado só quando o modelo principal responde 429/503 (cota ou congestionamento)
        gemini_fallback_model=os.getenv("GEMINI_FALLBACK_MODEL", "").strip() or "gemini-3.5-flash",
        cors_origins=[o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()],
        max_upload_bytes=_int("MAX_UPLOAD_MB", 50) * 1024 * 1024,
        max_image_bytes=_int("MAX_IMAGE_MB", 5) * 1024 * 1024,
        max_video_duration_seconds=_int("MAX_VIDEO_DURATION_SECONDS", 600),
        max_concurrent_analyses=_int("MAX_CONCURRENT_ANALYSES", 2),
        stripe_secret_key=os.getenv("STRIPE_SECRET_KEY", "").strip(),
        stripe_webhook_secret=os.getenv("STRIPE_WEBHOOK_SECRET", "").strip(),
        free_uploads=_int_or_zero("FREE_UPLOADS", _int_or_zero("FREE_ANALYSES", 20)),
        partners_goal=_int("PARTNERS_GOAL", 5),
        partners_commission_rate=_rate("PARTNERS_COMMISSION_RATE", 0.30),
        partners_default_status=(os.getenv("PARTNERS_DEFAULT_STATUS", "").strip().lower() or "active"),
        admin_emails=[e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()],
        # o IP nunca é guardado em claro: o sal só precisa ser secreto e estável
        guest_hash_salt=os.getenv("GUEST_HASH_SALT", "").strip() or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip(),
        guest_videos_per_ip=_int("GUEST_VIDEOS_PER_IP", 1),
        resend_api_key=os.getenv("RESEND_API_KEY", "").strip(),
        email_from=os.getenv("EMAIL_FROM", "").strip(),
        email_reply_to=os.getenv("EMAIL_REPLY_TO", "").strip(),
        app_url=(os.getenv("APP_URL", "").strip().rstrip("/") or "http://localhost:3000"),
        internal_secret=os.getenv("INTERNAL_SECRET", "").strip(),
        followup_hours=_int("FOLLOWUP_HOURS", 72),
        followup_after_republish_hours=_int("FOLLOWUP_AFTER_REPUBLISH_HOURS", 48),
    )
