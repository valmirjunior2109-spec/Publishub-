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
        if "PGRST205" in cause or "referral_code" in cause or "referrals" in cause:
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
    db.insert_referral(referrer["id"], user["id"], code)
    logger.info("referral_signup: %s indicou %s", referrer["id"], user["id"])
    return {"claimed": True, "reason": None}


# ---------------------------------------------------------------- programa de comissão
# Por cima do mesmo link: quem entra no programa ganha uma fatia do que cada conta
# indicada por ele pagar. O código, as indicações e as compras são os mesmos de
# cima — aqui só entram "quem é Partner", "quantos cliques" e "quanto é devido".

STATUSES = ("pending", "active", "paused")
# Enquanto a migração 20260917 não roda, estas tabelas não existem (mesmo jogo do _guard acima).
_program_unavailable = False


def _program_guard(fn, *, missing=("partners", "commissions", "referral_clicks", "referrals", "referral_code")):
    global _program_unavailable
    if _program_unavailable:
        raise PartnersUnavailable()
    try:
        return fn()
    except db.SupabaseError as exc:
        cause = str(exc.__cause__ or exc)
        if "PGRST205" in cause and any(name in cause for name in missing):
            _program_unavailable = True
            logger.warning("Programa de comissão desligado: rode a migração 20260917000000_partners_program.sql (%s)", cause[:120])
            raise PartnersUnavailable() from exc
        raise


def _earnings(commissions: list[dict]) -> int:
    """O que o Partner ganhou (devido + já pago). Comissão estornada não conta."""
    return sum(c["amount_cents"] for c in commissions if c["status"] in ("pending", "paid"))


def _stats(user_id: str, code: str | None, partner: dict | None) -> dict:
    referred = db.list_referred_ids(user_id)
    commissions = db.list_commissions(partner["id"]) if partner else []
    return {
        "clicks": db.count_referral_clicks(code) if code else 0,
        "signups": len(referred),
        "paid_customers": db.count_paid_purchasers(referred),
        "earnings_cents": _earnings(commissions),
        "currency": (commissions[0]["currency"] if commissions else "usd"),
    }


def program(user: dict) -> dict:
    """O painel do Partner. Quem ainda não entrou no programa vê `enrolled: false`."""
    rate = get_settings().partners_commission_rate

    def read():
        partner = db.get_partner(user["id"])
        code = ensure_code(user) if partner else None
        return partner, code, _stats(user["id"], code, partner)

    try:
        partner, code, stats = _program_guard(read)
    except PartnersUnavailable:
        return {"available": False, "enrolled": False, "code": None, "status": None, "commission_rate": rate, "clicks": 0, "signups": 0, "paid_customers": 0, "earnings_cents": 0, "currency": "usd"}
    return {
        "available": True,
        "enrolled": partner is not None,
        "code": code,
        "status": partner["status"] if partner else None,
        "commission_rate": float(partner["commission_rate"]) if partner else rate,
        **stats,
    }


def join(user: dict) -> dict:
    """Entra no programa (ou devolve o painel de quem já está dentro)."""
    settings = get_settings()
    try:
        partner = _program_guard(lambda: db.get_partner(user["id"]))
        if not partner:
            status = settings.partners_default_status if settings.partners_default_status in STATUSES else "active"
            partner = db.insert_partner(user["id"], settings.partners_commission_rate, status)
            logger.info("partner_signup: %s (status %s)", user["id"], status)
    except PartnersUnavailable as exc:
        raise ApiError(503, "PARTNERS_UNAVAILABLE", "O programa de parceria ainda não está disponível neste servidor.") from exc
    return program(user)


def record_click(raw_code: str) -> dict:
    """Um clique no link /?ref=CODE. Só conta para um código que existe de verdade."""
    code = normalize_code(raw_code)
    if not code:
        return {"recorded": False}
    try:
        owner = _program_guard(lambda: db.get_profile_by_referral_code(code), missing=("partners", "commissions", "referral_clicks", "referral_code", "profiles"))
        if not owner:
            return {"recorded": False}
        db.insert_referral_click(code)
    except PartnersUnavailable:
        return {"recorded": False}
    logger.info("referral_visit: %s", code)
    return {"recorded": True}


def sync_commissions(buyer_user_id: str) -> int:
    """Registra a comissão das compras pagas de quem foi indicado. Idempotente (uma por compra).

    O valor vem do `amount_cents` que o Stripe confirmou, nunca do frontend, e só
    existe comissão quando quem indicou é um Partner com status "active".
    """
    try:
        referral = _program_guard(lambda: db.get_referral_for(buyer_user_id))
        if not referral or referral["referrer_id"] == buyer_user_id:
            return 0
        partner = db.get_partner(referral["referrer_id"])
        if not partner or partner["status"] != "active":
            return 0
        rate = float(partner["commission_rate"])
        created = 0
        for purchase in db.list_paid_purchases_of([buyer_user_id]):
            row = {
                "partner_id": partner["id"],
                "referral_id": referral["id"],
                "purchase_id": purchase["id"],
                "amount_cents": round(purchase["amount_cents"] * rate),
                "currency": purchase["currency"],
            }
            if db.insert_commission(row):
                created += 1
                logger.info("referral_conversion: partner %s ganhou %s centavos da compra %s", partner["id"], row["amount_cents"], purchase["id"])
        return created
    except PartnersUnavailable:
        return 0


def reverse_commissions_for_intent(payment_intent: str) -> int:
    """Reembolso: a comissão daquela compra deixa de ser devida."""
    try:
        purchases = _program_guard(lambda: db.list_purchases_by_intent(payment_intent))
        return db.reverse_commissions_for_purchases([p["id"] for p in purchases])
    except PartnersUnavailable:
        return 0


# ---------------------------------------------------------------- admin


def admin_overview() -> dict:
    """A lista de Partners com os números de cada um, para o administrador."""
    try:
        partners, all_commissions = _program_guard(lambda: (db.list_partners(), db.list_all_commissions()))
    except PartnersUnavailable:
        return {"available": False, "partners": [], "totals": {"partners": 0, "clicks": 0, "signups": 0, "paid_customers": 0, "revenue_cents": 0, "commissions_owed_cents": 0}}
    commissions_by_partner: dict[str, list[dict]] = {}
    for commission in all_commissions:
        commissions_by_partner.setdefault(commission["partner_id"], []).append(commission)

    rows, totals = [], {"partners": len(partners), "clicks": 0, "signups": 0, "paid_customers": 0, "revenue_cents": 0, "commissions_owed_cents": 0}
    for partner in partners:  # cada Partner é uma leitura pequena; a lista do MVP é curta
        profile = db.get_profile(partner["user_id"]) or {}
        code = profile.get("referral_code")
        referred = db.list_referred_ids(partner["user_id"])
        purchases = db.list_paid_purchases_of(referred)
        commissions = commissions_by_partner.get(partner["id"], [])
        row = {
            "id": partner["id"],
            "user_id": partner["user_id"],
            "email": profile.get("email"),
            "code": code,
            "status": partner["status"],
            "commission_rate": float(partner["commission_rate"]),
            "created_at": partner["created_at"],
            "clicks": db.count_referral_clicks(code) if code else 0,
            "signups": len(referred),
            "paid_customers": len({p["user_id"] for p in purchases if p.get("user_id")}),
            "revenue_cents": sum(p["amount_cents"] for p in purchases),
            "commissions_owed_cents": sum(c["amount_cents"] for c in commissions if c["status"] == "pending"),
        }
        rows.append(row)
        for key in ("clicks", "signups", "paid_customers", "revenue_cents", "commissions_owed_cents"):
            totals[key] += row[key]
    return {"available": True, "partners": rows, "totals": totals}


def admin_update(partner_id: str, status: str | None, commission_rate: float | None) -> dict:
    fields: dict = {}
    if status is not None:
        if status not in STATUSES:
            raise ApiError(422, "INVALID_STATUS", "Status inválido.")
        fields["status"] = status
    if commission_rate is not None:
        if not 0 <= commission_rate <= 1:
            raise ApiError(422, "INVALID_RATE", "A comissão precisa ficar entre 0 e 1.")
        fields["commission_rate"] = commission_rate
    if not fields:
        raise ApiError(422, "NOTHING_TO_UPDATE", "Nada para alterar.")
    try:
        updated = _program_guard(lambda: db.update_partner(partner_id, fields))
    except PartnersUnavailable as exc:
        raise ApiError(503, "PARTNERS_UNAVAILABLE", "O programa de parceria ainda não está disponível neste servidor.") from exc
    if not updated:
        raise ApiError(404, "PARTNER_NOT_FOUND", "Partner não encontrado.")
    return {**updated, "commission_rate": float(updated["commission_rate"])}
