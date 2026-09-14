"""Publishub Partners: indique criadores; cinco que comprarem o Lifetime desbloqueiam o seu.

  - O código de indicação (profiles.referral_code) é criado na primeira vez que a
    pessoa abre o painel do Partners.
  - Quem chega por /?ref=CODE guarda o código num cookie; ao entrar na conta nova,
    o frontend chama `claim`, que grava a indicação (uma por conta, nunca a própria).
  - Conversão = conta indicada com compra paga em `purchases` (cada conta conta
    uma vez, não importa quantas compras). Reembolso deixa de contar.
  - Ao atingir a meta, `billing_service.entitlement` dá o Lifetime (source "partners").
"""

import logging
import re
import secrets
from datetime import datetime, timedelta, timezone

from app.core.config import get_settings
from app.core.errors import ApiError
from app.services import supabase_service as db

logger = logging.getLogger("publishub")

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


def conversions(user_id: str) -> int:
    """Contas indicadas por `user_id` que compraram o Lifetime (cada uma vale uma)."""
    return db.count_paid_purchasers(db.list_referred_ids(user_id))


def overview(user: dict) -> dict:
    goal = get_settings().partners_goal
    referred = db.list_referred_ids(user["id"])
    converted = db.count_paid_purchasers(referred)
    return {
        "code": ensure_code(user),
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
    referrer = db.get_profile_by_referral_code(code)
    if not referrer:
        return {"claimed": False, "reason": "unknown"}
    if referrer["id"] == user["id"]:
        return {"claimed": False, "reason": "self"}
    if db.get_referral_for(user["id"]):
        return {"claimed": False, "reason": "already"}
    if not _is_new_account(user):
        return {"claimed": False, "reason": "not_new"}
    db.insert_referral(referrer["id"], user["id"], code)
    logger.info("referral: %s indicou %s", referrer["id"], user["id"])
    return {"claimed": True, "reason": None}
