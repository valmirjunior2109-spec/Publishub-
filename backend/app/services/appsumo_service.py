"""Os códigos do AppSumo: o resgate e o plano que eles dão.

Quem compra no AppSumo recebe um código (PUB-XXXX-XXXX-XXXX) e resgata em
getpublishub.com/appsumo, já com a conta criada. O banco guarda só o sha256 de
cada código (a lista vem do CSV enviado ao AppSumo), então quem lê o banco não
consegue usar nenhum.

  - Um código vale para uma conta só, uma vez. Resgatar de novo na mesma conta
    não faz nada (e não dá erro); em outra conta, é recusado.
  - A conta soma até len(APPSUMO_MONTHLY_ANALYSES) códigos (3 por padrão):
    1 código = Creator, 2 ou mais = Pro (a análise profunda).
  - Cada nível tem um limite de análises por mês (30, 80 e 200 por padrão),
    contado no mês do calendário (UTC). O uso justo diário vale também.
  - Reembolso no AppSumo: `deactivate` tira o código, e o plano cai um nível.

Errar um código não ajuda a adivinhar outro (são 32^12 combinações), mas as
tentativas erradas por conta são limitadas mesmo assim.
"""

import hashlib
import logging
import re
import threading
import time
from collections import deque
from datetime import datetime, timezone

from app.core.config import get_settings
from app.core.errors import ApiError
from app.services import events_service, supabase_service as db

logger = logging.getLogger("publishub")

CODE_RE = re.compile(r"^PUB-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$")
TIER_CREATOR = "creator"
TIER_PRO = "pro"

# tentativas erradas por conta, numa janela de 1 h (em memória: o backend é um processo só)
WRONG_PER_HOUR = 10
_lock = threading.Lock()
_wrong: dict[str, deque[float]] = {}


def normalize(raw: str | None) -> str:
    """Como a pessoa colou → como está no CSV: sem espaços, em maiúsculas."""
    return re.sub(r"\s+", "", raw or "").upper()


def code_hash(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


def _levels() -> list[int]:
    return get_settings().appsumo_monthly_analyses


def plan_for(codes: int) -> dict | None:
    """O que `codes` códigos ativos dão: o nível, o limite mensal. None sem código."""
    levels = _levels()
    if codes <= 0 or not levels:
        return None
    n = min(codes, len(levels))
    return {"codes": n, "tier": TIER_CREATOR if n == 1 else TIER_PRO, "monthly_limit": levels[n - 1], "max_codes": len(levels)}


def active_codes(user_id: str) -> int:
    return sum(1 for row in db.list_appsumo_codes(user_id) if row.get("status") == "redeemed")


def summary(user_id: str) -> dict | None:
    """O plano AppSumo da conta agora, ou None (nenhum código ativo)."""
    return plan_for(active_codes(user_id))


def month_start() -> str:
    now = datetime.now(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()


def used_this_month(user_id: str) -> int:
    return db.count_videos_since(user_id, month_start())


def _too_many_wrong(user_id: str) -> bool:
    now = time.monotonic()
    with _lock:
        tries = _wrong.setdefault(user_id, deque())
        while tries and now - tries[0] > 3600:
            tries.popleft()
        return len(tries) >= WRONG_PER_HOUR


def _count_wrong(user_id: str) -> None:
    with _lock:
        _wrong.setdefault(user_id, deque()).append(time.monotonic())


def reset_attempts() -> None:
    """Zera as tentativas (testes)."""
    with _lock:
        _wrong.clear()


def _invalid(user_id: str) -> ApiError:
    _count_wrong(user_id)
    return ApiError(404, "APPSUMO_CODE_INVALID", "Este código não existe. Confira se copiou o código inteiro, como PUB-XXXX-XXXX-XXXX.")


def status(user: dict) -> dict:
    """O que a página /appsumo mostra para quem está logado."""
    plan = summary(user["id"])
    return {"plan": plan, "used_this_month": used_this_month(user["id"]) if plan else 0, "max_codes": len(_levels())}


def redeem(user: dict, raw_code: str) -> dict:
    """Liga um código à conta. Devolve o plano AppSumo depois do resgate."""
    if _too_many_wrong(user["id"]):
        raise ApiError(429, "APPSUMO_TOO_MANY_ATTEMPTS", "Muitas tentativas com códigos errados. Espere uma hora e tente de novo, ou fale com o suporte.")
    code = normalize(raw_code)
    if not CODE_RE.match(code):
        raise _invalid(user["id"])
    digest = code_hash(code)
    row = db.get_appsumo_code(digest)
    if not row:
        raise _invalid(user["id"])
    if row.get("status") == "deactivated":
        raise ApiError(410, "APPSUMO_CODE_DEACTIVATED", "Este código foi desativado (o pedido foi reembolsado no AppSumo).")
    if row.get("user_id") == user["id"]:
        return status(user)  # resgatar de novo na mesma conta: nada muda
    if row.get("user_id") or row.get("status") == "redeemed":
        raise ApiError(409, "APPSUMO_CODE_USED", "Este código já foi resgatado em outra conta.")
    if active_codes(user["id"]) >= len(_levels()):
        raise ApiError(409, "APPSUMO_MAX_CODES", f"Esta conta já tem {len(_levels())} códigos, o máximo que se soma.")
    claimed = db.claim_appsumo_code(digest, user["id"], datetime.now(timezone.utc).isoformat())
    if not claimed:
        # outra conta resgatou no mesmo instante
        raise ApiError(409, "APPSUMO_CODE_USED", "Este código já foi resgatado em outra conta.")
    result = status(user)
    events_service.record_for_user(user["id"], "appsumo_redeemed", props={"codes": result["plan"]["codes"] if result["plan"] else 0})
    logger.info("appsumo code redeemed by %s (%s codes)", user["id"], result["plan"]["codes"] if result["plan"] else 0)
    return result


def deactivate(raw_code: str) -> dict:
    """Administração: tira um código reembolsado. O plano da conta cai um nível na hora."""
    code = normalize(raw_code)
    if not CODE_RE.match(code):
        raise ApiError(400, "APPSUMO_CODE_INVALID", "Formato de código inválido.")
    row = db.deactivate_appsumo_code(code_hash(code), datetime.now(timezone.utc).isoformat())
    if not row:
        raise ApiError(404, "APPSUMO_CODE_INVALID", "Código não encontrado.")
    logger.info("appsumo code deactivated (was on user %s)", row.get("user_id"))
    return {"deactivated": True, "user_id": row.get("user_id")}
