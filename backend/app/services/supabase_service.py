"""The only module that talks to Supabase (Auth, Postgres via PostgREST, Storage).

The backend uses the service-role key, which bypasses Row Level Security,
so every query that reads user data filters by the authenticated user's id.
RLS stays enabled in the database as a second line of defense.
"""

import logging
from functools import lru_cache
from typing import Any

import httpx
from supabase import Client, create_client

from app.core.config import get_settings

logger = logging.getLogger("publishub")


class SupabaseNotConfigured(Exception):
    pass


class SupabaseError(Exception):
    """Any failure talking to Supabase (network, API error, unexpected response)."""


@lru_cache
def _client() -> Client:
    settings = get_settings()
    if not settings.supabase_configured:
        raise SupabaseNotConfigured("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set")
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def _is_transient(exc: Exception) -> bool:
    """A dropped keep-alive connection or a read that timed out (seen downloading videos from Storage): worth one more try."""
    if isinstance(exc, (httpx.RemoteProtocolError, httpx.ReadError, httpx.ConnectError, httpx.WriteError, httpx.TimeoutException)):
        return True
    message = str(exc).lower()
    return "disconnected" in message or "timed out" in message


def _run(action: str, fn):
    for attempt in (1, 2):
        try:
            return fn()
        except SupabaseNotConfigured:
            raise
        except Exception as exc:  # postgrest.APIError, StorageException, httpx errors…
            if attempt == 1 and _is_transient(exc):
                logger.warning("supabase %s: transient error (%s), retrying once", action, exc)
                continue
            logger.error("supabase %s failed: %s", action, exc)
            raise SupabaseError(action) from exc


# ---------------------------------------------------------------- auth


def get_user_from_token(token: str) -> dict[str, Any] | None:
    """Validates a Supabase access token with Supabase Auth. None if invalid/expired."""
    try:
        response = _client().auth.get_user(token)
    except SupabaseNotConfigured:
        raise
    except Exception as exc:
        # Supabase Auth answers 401/403 for bad tokens; anything else is an outage.
        status = getattr(exc, "status", None)
        if status in (401, 403) or "invalid" in str(exc).lower() or "expired" in str(exc).lower():
            return None
        logger.error("supabase auth.get_user failed: %s", exc)
        raise SupabaseError("auth.get_user") from exc
    user = getattr(response, "user", None)
    if not user:
        return None
    return {"id": str(user.id), "email": user.email}


def get_profile(user_id: str) -> dict[str, Any] | None:
    rows = _run(
        "profiles.select",
        lambda: _client().table("profiles").select("*").eq("id", user_id).limit(1).execute(),
    ).data
    return rows[0] if rows else None


# ---------------------------------------------------------------- storage
# `bucket=None` means the videos bucket; the Insights screenshots live in their own.


def _bucket(bucket: str | None) -> str:
    return bucket or get_settings().storage_bucket


def get_object_info(path: str, bucket: str | None = None) -> dict[str, Any] | None:
    """Size and content type of an uploaded file, or None if it doesn't exist."""
    try:
        info = _client().storage.from_(_bucket(bucket)).info(path)
    except SupabaseNotConfigured:
        raise
    except Exception as exc:
        if "not found" in str(exc).lower() or getattr(exc, "status", None) in (400, 404, "404"):
            return None
        logger.error("supabase storage.info failed: %s", exc)
        raise SupabaseError("storage.info") from exc
    metadata = info.get("metadata") or {}
    return {
        "size": int(info.get("size") or metadata.get("size") or 0),
        "content_type": (info.get("content_type") or metadata.get("mimetype") or "").lower(),
    }


def download_object(path: str, bucket: str | None = None) -> bytes:
    return _run("storage.download", lambda: _client().storage.from_(_bucket(bucket)).download(path))


def delete_object(path: str, bucket: str | None = None) -> None:
    _run("storage.remove", lambda: _client().storage.from_(_bucket(bucket)).remove([path]))


def create_signed_upload_url(path: str, bucket: str | None = None) -> dict[str, Any]:
    """URL temporária para o navegador enviar um arquivo sem estar logado (convidado).

    Quem autoriza é o backend, com a service_role: as policies do bucket só
    deixam usuário logado escrever na própria pasta, e o convidado não tem pasta.
    """
    result = _run("storage.signed_upload_url", lambda: _client().storage.from_(_bucket(bucket)).create_signed_upload_url(path))
    return {"url": result.get("signed_url") or result.get("signedUrl"), "token": result.get("token"), "path": path}


def create_signed_url(path: str, expires_in: int = 3600, bucket: str | None = None) -> str | None:
    try:
        result = _client().storage.from_(_bucket(bucket)).create_signed_url(path, expires_in)
    except Exception as exc:
        logger.warning("could not sign url for %s: %s", path, exc)
        return None
    return result.get("signedURL") or result.get("signedUrl")


# ---------------------------------------------------------------- videos


def insert_video(row: dict[str, Any]) -> dict[str, Any]:
    return _run("videos.insert", lambda: _client().table("videos").insert(row).execute()).data[0]


def update_video(video_id: str, fields: dict[str, Any]) -> None:
    _run("videos.update", lambda: _client().table("videos").update(fields).eq("id", video_id).execute())


def storage_path_in_use(path: str) -> bool:
    rows = _run(
        "videos.select",
        lambda: _client().table("videos").select("id").eq("storage_path", path).limit(1).execute(),
    ).data
    return bool(rows)


def insights_path_in_use(path: str) -> bool:
    rows = _run(
        "videos.select",
        lambda: _client().table("videos").select("id").eq("insights_path", path).limit(1).execute(),
    ).data
    return bool(rows)


# Campos da listagem: o bastante para o card do painel (miniatura da curva,
# segundo da queda, status do loop) sem baixar o resultado inteiro.
# `analyses!analyses_video_fkey`: há duas FKs entre as tabelas (a composta, que
# garante o mesmo dono, e a simples, que atende linhas de convidado com user_id
# nulo). Sem dizer qual, o PostgREST recusa o embed por ambiguidade.
LIST_SELECT = (
    "id, filename, size_bytes, duration_seconds, status, created_at, hypothesis, "
    "analyses!analyses_video_fkey(id, status, step, outcome, actual_retention, outcome_recorded_at, created_at, updated_at, "
    "drop_at:result->drop->at_seconds, curve:result->curve, retention_source:result->>retention_source)"
)


def list_videos(user_id: str) -> list[dict[str, Any]]:
    """The user's videos, newest first, each with its analyses."""
    return _run(
        "videos.list",
        lambda: _client().table("videos").select(LIST_SELECT).eq("user_id", user_id).order("created_at", desc=True).execute(),
    ).data


# ---------------------------------------------------------------- analyses


def insert_analysis(video_id: str, user_id: str | None, guest_id: str | None = None) -> dict[str, Any]:
    return _run(
        "analyses.insert",
        lambda: _client().table("analyses").insert({"video_id": video_id, "user_id": user_id, "guest_id": guest_id, "status": "pending"}).execute(),
    ).data[0]


def get_analysis(analysis_id: str, user_id: str | None = None, guest_id: str | None = None) -> dict[str, Any] | None:
    """An analysis with its video. When user_id (or guest_id) is given, only if it belongs to that owner."""

    def query():
        q = _client().table("analyses").select("*, videos!analyses_video_fkey(*)").eq("id", analysis_id)
        if user_id is not None:
            q = q.eq("user_id", user_id)
        if guest_id is not None:
            q = q.eq("guest_id", guest_id)
        return q.limit(1).execute()

    rows = _run("analyses.get", query).data
    return rows[0] if rows else None


def update_analysis(analysis_id: str, fields: dict[str, Any]) -> None:
    _run("analyses.update", lambda: _client().table("analyses").update(fields).eq("id", analysis_id).execute())


def count_outcomes(user_id: str) -> dict[str, int]:
    """How many of the user's predictions were confirmed / refuted."""

    def count(outcome: str) -> int:
        return (
            _run(
                f"analyses.count.{outcome}",
                lambda: _client().table("analyses").select("id", count="exact", head=True).eq("user_id", user_id).eq("outcome", outcome).execute(),
            ).count
            or 0
        )

    return {"confirmed": count("confirmed"), "refuted": count("refuted")}


def fail_unfinished_analyses(message: str) -> int:
    """Marks analyses left pending/processing by a previous server process as failed."""
    rows = _run(
        "analyses.recover",
        lambda: _client()
        .table("analyses")
        .update({"status": "failed", "step": None, "error_message": message, "result": {"error": {"code": "interrupted", "params": {}}}})
        .in_("status", ["pending", "processing"])
        .execute(),
    ).data
    for row in rows:
        update_video(row["video_id"], {"status": "failed"})
    return len(rows)


# ---------------------------------------------------------------- compras (Stripe)
# Uma linha por checkout pago. `user_id` fica nulo até a pessoa entrar com o
# e-mail do pagamento (ou quando o link já veio com client_reference_id).


def get_purchase_by_session(session_id: str) -> dict[str, Any] | None:
    rows = _run("purchases.get", lambda: _client().table("purchases").select("*").eq("stripe_session_id", session_id).limit(1).execute()).data
    return rows[0] if rows else None


def upsert_purchase(row: dict[str, Any]) -> dict[str, Any]:
    return _run("purchases.upsert", lambda: _client().table("purchases").upsert(row, on_conflict="stripe_session_id").execute()).data[0]


def list_purchases(user_id: str, email: str | None) -> list[dict[str, Any]]:
    """The user's purchases: linked to the id, or still unlinked but made with the same e-mail (one round trip)."""
    if not email:
        return _run("purchases.by_user", lambda: _client().table("purchases").select("*").eq("user_id", user_id).execute()).data
    clause = f"user_id.eq.{user_id},and(user_id.is.null,email.eq.{email.lower()})"
    return _run("purchases.by_user_or_email", lambda: _client().table("purchases").select("*").or_(clause).execute()).data


def link_purchases(email: str, user_id: str) -> int:
    rows = _run(
        "purchases.link",
        lambda: _client().table("purchases").update({"user_id": user_id}).is_("user_id", "null").eq("email", email.lower()).execute(),
    ).data
    return len(rows or [])


def mark_purchase_refunded(payment_intent: str, refunded_at: str) -> int:
    rows = _run(
        "purchases.refund",
        lambda: _client().table("purchases").update({"status": "refunded", "refunded_at": refunded_at}).eq("stripe_payment_intent", payment_intent).execute(),
    ).data
    return len(rows or [])


def count_videos(user_id: str) -> int:
    """Videos this account actually registered — the free-upload counter.

    An upload that never became a row (bad file, dropped connection) never counts.
    A registered video whose analysis failed still counts, but "Tentar novamente"
    reuses the same row, so a failure on our side never burns a free upload.
    """
    return (
        _run(
            "videos.count",
            lambda: _client().table("videos").select("id", count="exact", head=True).eq("user_id", user_id).execute(),
        ).count
        or 0
    )


# ---------------------------------------------------------------- Publishub Partners
# O código de indicação mora em profiles.referral_code; cada conta indicada vira
# uma linha em referrals (uma só por conta indicada, nunca a própria).


def set_referral_code(user_id: str, code: str) -> bool:
    """Grava o código se a conta ainda não tem um. False quando o código já existe (colisão) ou já havia código."""
    try:
        rows = _run(
            "profiles.referral_code",
            lambda: _client().table("profiles").update({"referral_code": code}).eq("id", user_id).is_("referral_code", "null").execute(),
        ).data
    except SupabaseError as exc:
        if "unique" in str(exc.__cause__).lower() or "duplicate" in str(exc.__cause__).lower():
            return False
        raise
    return bool(rows)


def get_profile_by_referral_code(code: str) -> dict[str, Any] | None:
    """Quem é dono do código. Ignora maiúsculas: quem digita "copilot" acha "Copilot".

    (Usa ilike com o código inteiro; os códigos não têm "%" nem "_", então não há curinga.)
    """
    rows = _run(
        "profiles.by_code",
        lambda: _client().table("profiles").select("id, email, created_at, referral_code").ilike("referral_code", code).limit(1).execute(),
    ).data
    return rows[0] if rows else None


def update_referral_code(user_id: str, code: str) -> bool:
    """Troca o código da conta pelo escolhido por ela (quem valida é o partners_service)."""
    rows = _run("profiles.set_code", lambda: _client().table("profiles").update({"referral_code": code}).eq("id", user_id).execute()).data
    return bool(rows)


def get_referral_for(referred_user_id: str) -> dict[str, Any] | None:
    rows = _run("referrals.for", lambda: _client().table("referrals").select("*").eq("referred_user_id", referred_user_id).limit(1).execute()).data
    return rows[0] if rows else None


def insert_referral(referrer_id: str, referred_user_id: str, code: str) -> dict[str, Any]:
    return _run(
        "referrals.insert",
        lambda: _client().table("referrals").insert({"referrer_id": referrer_id, "referred_user_id": referred_user_id, "code": code}).execute(),
    ).data[0]


def list_referred_ids(referrer_id: str) -> list[str]:
    rows = _run("referrals.list", lambda: _client().table("referrals").select("referred_user_id").eq("referrer_id", referrer_id).execute()).data
    return [r["referred_user_id"] for r in rows]


def count_paid_purchasers(user_ids: list[str]) -> int:
    """Quantas dessas contas têm ao menos uma compra paga (cada conta conta uma vez)."""
    if not user_ids:
        return 0
    rows = _run(
        "purchases.paid_among",
        lambda: _client().table("purchases").select("user_id").eq("status", "paid").in_("user_id", user_ids).execute(),
    ).data
    return len({r["user_id"] for r in rows if r.get("user_id")})


def list_referrals(referrer_id: str) -> list[dict[str, Any]]:
    """As indicações feitas por `referrer_id` (a linha inteira: id, indicado e data)."""
    return _run("referrals.by_referrer", lambda: _client().table("referrals").select("*").eq("referrer_id", referrer_id).execute()).data


def list_paid_purchases_of(user_ids: list[str]) -> list[dict[str, Any]]:
    """As compras pagas dessas contas (para calcular a comissão sobre o valor real)."""
    if not user_ids:
        return []
    return _run(
        "purchases.paid_of",
        lambda: _client().table("purchases").select("*").eq("status", "paid").in_("user_id", user_ids).execute(),
    ).data


# ---------------------------------------------------------------- Partners: programa de comissão


def get_partner(user_id: str) -> dict[str, Any] | None:
    rows = _run("partners.by_user", lambda: _client().table("partners").select("*").eq("user_id", user_id).limit(1).execute()).data
    return rows[0] if rows else None


def get_partner_by_id(partner_id: str) -> dict[str, Any] | None:
    rows = _run("partners.by_id", lambda: _client().table("partners").select("*").eq("id", partner_id).limit(1).execute()).data
    return rows[0] if rows else None


def insert_partner(user_id: str, commission_rate: float, status: str) -> dict[str, Any]:
    return _run(
        "partners.insert",
        lambda: _client().table("partners").insert({"user_id": user_id, "commission_rate": commission_rate, "status": status}).execute(),
    ).data[0]


def update_partner(partner_id: str, fields: dict[str, Any]) -> dict[str, Any] | None:
    rows = _run("partners.update", lambda: _client().table("partners").update(fields).eq("id", partner_id).execute()).data
    return rows[0] if rows else None


def list_partners() -> list[dict[str, Any]]:
    return _run("partners.list", lambda: _client().table("partners").select("*").order("created_at", desc=True).execute()).data


def insert_referral_click(code: str) -> None:
    _run("referral_clicks.insert", lambda: _client().table("referral_clicks").insert({"code": code}).execute())


def count_referral_clicks(code: str) -> int:
    return _run("referral_clicks.count", lambda: _client().table("referral_clicks").select("id", count="exact", head=True).eq("code", code).execute()).count or 0


def insert_commission(row: dict[str, Any]) -> dict[str, Any] | None:
    """Grava a comissão. None quando a compra já tinha uma (purchase_id é único)."""
    try:
        return _run("commissions.insert", lambda: _client().table("commissions").insert(row).execute()).data[0]
    except SupabaseError as exc:
        cause = str(exc.__cause__).lower()
        if "duplicate" in cause or "unique" in cause or "23505" in cause:
            return None
        raise


def list_commissions(partner_id: str) -> list[dict[str, Any]]:
    return _run("commissions.by_partner", lambda: _client().table("commissions").select("*").eq("partner_id", partner_id).execute()).data


def list_all_commissions() -> list[dict[str, Any]]:
    return _run("commissions.list", lambda: _client().table("commissions").select("*").execute()).data


def reverse_commissions_for_purchases(purchase_ids: list[str]) -> int:
    """Estorno: a comissão dessas compras deixa de ser devida."""
    if not purchase_ids:
        return 0
    rows = _run(
        "commissions.reverse",
        lambda: _client().table("commissions").update({"status": "reversed"}).in_("purchase_id", purchase_ids).neq("status", "reversed").execute(),
    ).data
    return len(rows)


def list_purchases_by_intent(payment_intent: str) -> list[dict[str, Any]]:
    return _run("purchases.by_intent", lambda: _client().table("purchases").select("*").eq("stripe_payment_intent", payment_intent).execute()).data


# ---------------------------------------------------------------- convidados (previsão cega sem cadastro)
# Uma sessão por navegador: o token fica no navegador, aqui só o sha256 dele.
# O vídeo e a análise nascem com guest_id e user_id nulo; o claim troca os dois.


def insert_guest_session(row: dict[str, Any]) -> dict[str, Any]:
    return _run("guest_sessions.insert", lambda: _client().table("guest_sessions").insert(row).execute()).data[0]


def get_guest_session(token_hash: str) -> dict[str, Any] | None:
    rows = _run(
        "guest_sessions.by_token",
        lambda: _client().table("guest_sessions").select("*").eq("token_hash", token_hash).limit(1).execute(),
    ).data
    return rows[0] if rows else None


def list_guest_session_ids_from_ip(ip_hash: str, since: str) -> list[str]:
    """Sessões abertas por este IP desde `since` — a base do limite anti-abuso."""
    rows = _run(
        "guest_sessions.by_ip",
        lambda: _client().table("guest_sessions").select("id").eq("ip_hash", ip_hash).gte("created_at", since).execute(),
    ).data
    return [r["id"] for r in rows]


def count_guest_videos(guest_ids: list[str]) -> int:
    if not guest_ids:
        return 0
    return (
        _run(
            "videos.count_guest",
            lambda: _client().table("videos").select("id", count="exact", head=True).in_("guest_id", guest_ids).execute(),
        ).count
        or 0
    )


def list_guest_analysis_ids(guest_id: str) -> list[str]:
    rows = _run(
        "analyses.by_guest",
        lambda: _client().table("analyses").select("id").eq("guest_id", guest_id).order("created_at", desc=True).execute(),
    ).data
    return [r["id"] for r in rows]


def claim_guest_session(guest_id: str, user_id: str, claimed_at: str) -> None:
    """A conta nova assume a sessão: vídeos e análises passam a ser dela."""
    _run(
        "guest_sessions.claim",
        lambda: _client().table("guest_sessions").update({"claimed_by": user_id, "claimed_at": claimed_at}).eq("id", guest_id).execute(),
    )
    _run("videos.claim", lambda: _client().table("videos").update({"user_id": user_id}).eq("guest_id", guest_id).execute())
    _run("analyses.claim", lambda: _client().table("analyses").update({"user_id": user_id}).eq("guest_id", guest_id).execute())


# ---------------------------------------------------------------- eventos do funil


def insert_event(row: dict[str, Any]) -> None:
    _run("events.insert", lambda: _client().table("events").insert(row).execute())


def count_blind_responses(user_id: str) -> dict[str, int]:
    """Quantas previsões cegas desta conta acertaram o segundo (tolerância de ±1 s)."""

    def count(hit: bool) -> int:
        return (
            _run(
                f"analyses.count_blind.{hit}",
                lambda: _client().table("analyses").select("id", count="exact", head=True).eq("user_id", user_id).is_("blind_hit", hit).execute(),
            ).count
            or 0
        )

    return {"hits": count(True), "misses": count(False)}


# ---------------------------------------------------------------- lembretes (fechar o loop)


def upsert_followup(row: dict[str, Any]) -> dict[str, Any]:
    """Um lembrete por análise: mudar a data de republicação reaproveita a linha."""
    return _run("followups.upsert", lambda: _client().table("followups").upsert(row, on_conflict="analysis_id").execute()).data[0]


def get_followup(analysis_id: str) -> dict[str, Any] | None:
    rows = _run("followups.get", lambda: _client().table("followups").select("*").eq("analysis_id", analysis_id).limit(1).execute()).data
    return rows[0] if rows else None


def list_due_followups(now: str, limit: int) -> list[dict[str, Any]]:
    """Os lembretes que já podem sair, do mais antigo para o mais novo."""
    return _run(
        "followups.due",
        lambda: _client()
        .table("followups")
        .select("*, analyses(id, outcome, status, blind_at_seconds, videos!analyses_video_fkey(filename))")
        .eq("status", "scheduled")
        .lte("send_after", now)
        .order("send_after")
        .limit(limit)
        .execute(),
    ).data


def update_followup(followup_id: str, fields: dict[str, Any]) -> None:
    _run("followups.update", lambda: _client().table("followups").update(fields).eq("id", followup_id).execute())


def cancel_followup(analysis_id: str) -> int:
    """O criador já colou o número real: o lembrete perdeu o motivo de existir."""
    rows = _run(
        "followups.cancel",
        lambda: _client().table("followups").update({"status": "cancelled"}).eq("analysis_id", analysis_id).eq("status", "scheduled").execute(),
    ).data
    return len(rows or [])


# ---------------------------------------------------------------- Manus (opcional)
# A chave do criador chega aqui já cifrada pelo manus_service; este módulo não
# sabe descriptografar nada, só guarda e devolve.


def upsert_manus_connection(row: dict[str, Any]) -> dict[str, Any]:
    return _run("manus_connections.upsert", lambda: _client().table("manus_connections").upsert(row, on_conflict="user_id").execute()).data[0]


def get_manus_connection(user_id: str) -> dict[str, Any] | None:
    rows = _run("manus_connections.get", lambda: _client().table("manus_connections").select("*").eq("user_id", user_id).limit(1).execute()).data
    return rows[0] if rows else None


def delete_manus_connection(user_id: str) -> None:
    _run("manus_connections.delete", lambda: _client().table("manus_connections").delete().eq("user_id", user_id).execute())


def upsert_manus_task(row: dict[str, Any]) -> dict[str, Any]:
    """Uma tarefa por análise: mandar de novo reaproveita a linha."""
    return _run("manus_tasks.upsert", lambda: _client().table("manus_tasks").upsert(row, on_conflict="analysis_id").execute()).data[0]


def get_manus_task(analysis_id: str) -> dict[str, Any] | None:
    rows = _run("manus_tasks.get", lambda: _client().table("manus_tasks").select("*").eq("analysis_id", analysis_id).limit(1).execute()).data
    return rows[0] if rows else None


def update_manus_task(task_row_id: str, fields: dict[str, Any]) -> None:
    _run("manus_tasks.update", lambda: _client().table("manus_tasks").update(fields).eq("id", task_row_id).execute())
