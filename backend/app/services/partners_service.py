"""Publishub Partners: indique criadores; cinco que comprarem o Lifetime desbloqueiam o seu.

  - O código de indicação (profiles.referral_code) é criado na primeira vez que a
    pessoa abre o painel do Partners.
  - Quem chega por /?ref=CODE guarda o código num cookie; ao entrar na conta nova,
    o frontend chama `claim`, que grava a indicação (uma por conta, nunca a própria).
  - Conversão = conta indicada com compra paga em `purchases` (cada conta conta
    uma vez, não importa quantas compras). Reembolso deixa de contar.
  - Ao atingir a meta, `billing_service.entitlement` dá o Lifetime (source "partners").

Partner convidado (programa fechado, por cima do aberto acima):
  - `approve` marca profiles.is_partner e garante o código. `entitlement` lê a flag e dá
    o Lifetime (source "partner", no singular: aprovado, não conquistado por indicações).
    `revoke` volta a conta às regras normais.
  - Cliques: o navegador avisa uma vez por visitante (`track_click`); só contam links de Partners.
  - `stats` alimenta a área do Partner: cliques, cadastros, usuários ativos e conversões.
"""

import logging
import re
import secrets
from datetime import datetime, timedelta, timezone

from app.core.config import get_settings
from app.core.errors import ApiError
from app.services import supabase_service as db

logger = logging.getLogger("publishub")

# Enquanto a migração do Partners não roda, as tabelas não existem. Marcamos uma vez
# e paramos de tentar, para não encher o log nem atrasar cada /api/me.
_unavailable = False


class PartnersUnavailable(Exception):
    """As tabelas do Partners ainda não existem neste banco."""

# Sem 0/O/1/I para a pessoa conseguir ditar o código sem erro.
CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
CODE_LENGTH = 8
CODE_RE = re.compile(r"^[A-Z2-9]{8}$")
# Uma indicação só vale para conta nova: criada há poucos dias e ainda sem compra.
NEW_ACCOUNT_WINDOW = timedelta(days=7)


def normalize_code(raw: str) -> str | None:
    code = (raw or "").strip().upper()
    return code if CODE_RE.match(code) else None


def _generate_code() -> str:
    return "".join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))


def ensure_code(user: dict) -> str:
    profile = db.get_profile(user["id"])
    if profile and profile.get("referral_code"):
        return profile["referral_code"]
    for _ in range(5):
        code = _generate_code()
        if db.set_referral_code(user["id"], code):
            return code
        # colisão (raríssima) ou outra requisição gravou primeiro: relê
        profile = db.get_profile(user["id"])
        if profile and profile.get("referral_code"):
            return profile["referral_code"]
    raise ApiError(500, "REFERRAL_CODE", "Não foi possível criar seu link de indicação agora. Tente novamente.")


def available() -> bool:
    return not _unavailable


def _guard(fn, default=None):
    """Roda a consulta; se as tabelas não existem, lembra disso e devolve `default`."""
    global _unavailable
    if _unavailable:
        raise PartnersUnavailable()
    try:
        return fn()
    except db.SupabaseError as exc:
        cause = str(exc.__cause__ or exc)
        if "PGRST205" in cause or "referral_code" in cause or "referrals" in cause or "referral_clicks" in cause:
            _unavailable = True
            logger.warning("Publishub Partners desligado: rode a migração 20260915000000_partners.sql (%s)", cause[:120])
            raise PartnersUnavailable() from exc
        raise


def conversions(user_id: str) -> int:
    """Contas indicadas por `user_id` que compraram o Lifetime (cada uma vale uma). 0 se o Partners não estiver disponível."""
    try:
        return _guard(lambda: db.count_paid_purchasers(db.list_referred_ids(user_id)))
    except PartnersUnavailable:
        return 0


def overview(user: dict) -> dict:
    goal = get_settings().partners_goal
    try:
        referred = _guard(lambda: db.list_referred_ids(user["id"]))
        converted = db.count_paid_purchasers(referred)
        code = _guard(lambda: ensure_code(user))
    except PartnersUnavailable:
        return {"available": False, "code": None, "referred_total": 0, "conversions": 0, "goal": goal, "remaining": goal, "unlocked": False}
    return {
        "available": True,
        "code": code,
        "referred_total": len(referred),
        "conversions": converted,
        "goal": goal,
        "remaining": max(0, goal - converted),
        "unlocked": converted >= goal,
    }


def _is_new_account(user: dict) -> bool:
    profile = db.get_profile(user["id"])
    created = profile.get("created_at") if profile else None
    if created:
        try:
            created_at = datetime.fromisoformat(str(created).replace("Z", "+00:00"))
            if datetime.now(timezone.utc) - created_at > NEW_ACCOUNT_WINDOW:
                return False
        except ValueError:
            pass
    return not any(p["status"] == "paid" for p in db.list_purchases(user["id"], user.get("email")))


def claim(user: dict, raw_code: str) -> dict:
    """Liga a conta `user` a quem a indicou. Nunca falha por regra de negócio: devolve o motivo."""
    code = normalize_code(raw_code)
    if not code:
        return {"claimed": False, "reason": "invalid"}
    try:
        referrer = _guard(lambda: db.get_profile_by_referral_code(code))
    except PartnersUnavailable:
        return {"claimed": False, "reason": "unavailable"}
    if not referrer:
        return {"claimed": False, "reason": "unknown"}
    if referrer["id"] == user["id"]:
        return {"claimed": False, "reason": "self"}
    if db.get_referral_for(user["id"]):
        return {"claimed": False, "reason": "already"}
    if not _is_new_account(user):
        return {"claimed": False, "reason": "not_new"}
    if db.insert_referral(referrer["id"], user["id"], code) is None:
        return {"claimed": False, "reason": "already"}  # dois claims ao mesmo tempo: o outro chegou primeiro
    logger.info("referral: %s indicou %s", referrer["id"], user["id"])
    return {"claimed": True, "reason": None}


# ---------------------------------------------------------------- Partner convidado


def is_partner(user_id: str) -> bool:
    """Se a conta é Partner. Falso enquanto a migração do programa não rodou (a coluna não existe)."""
    profile = db.get_profile(user_id)
    return bool(profile and profile.get("is_partner"))


def approve(email: str) -> dict:
    """Aprova a conta com este e-mail como Partner: Lifetime grátis e link de indicação. Idempotente."""
    profile = db.get_profile_by_email(email)
    if not profile:
        raise ApiError(404, "USER_NOT_FOUND", "Não há conta com este e-mail. A pessoa precisa criar a conta antes de ser aprovada.")
    already = bool(profile.get("is_partner"))
    if not already:
        db.set_partner(profile["id"], True, datetime.now(timezone.utc).isoformat())
        logger.info("partner aprovado: %s", profile["id"])
    return {"user_id": profile["id"], "email": profile.get("email") or email, "code": ensure_code({"id": profile["id"]}), "already": already}


def revoke(email: str) -> dict:
    """Tira o status de Partner: a conta volta às regras normais de plano. Os indicados continuam ligados a ela."""
    profile = db.get_profile_by_email(email)
    if not profile:
        raise ApiError(404, "USER_NOT_FOUND", "Não há conta com este e-mail.")
    changed = bool(profile.get("is_partner"))
    if changed:
        db.set_partner(profile["id"], False, None)
        logger.info("partner removido: %s", profile["id"])
    return {"user_id": profile["id"], "email": profile.get("email") or email, "changed": changed}


def track_click(raw_code: str) -> dict:
    """Um visitante abriu /?ref=CODE. Só conta para o link de um Partner; nunca falha por regra de negócio."""
    code = normalize_code(raw_code)
    if not code:
        return {"counted": False}
    try:
        referrer = _guard(lambda: db.get_profile_by_referral_code(code))
        if not referrer or not referrer.get("is_partner"):
            return {"counted": False}
        _guard(lambda: db.insert_referral_click(referrer["id"]))
    except PartnersUnavailable:
        return {"counted": False}
    return {"counted": True}


def stats(user: dict) -> dict:
    """A área do Partner: o código e os quatro números. 403 para quem não é Partner."""
    profile = db.get_profile(user["id"])
    if not profile or not profile.get("is_partner"):
        raise ApiError(403, "NOT_PARTNER", "Esta área é só para creators do Publishub Partners.")
    return {"code": ensure_code(user), "partner_since": profile.get("partner_since"), **db.partner_stats(user["id"])}
