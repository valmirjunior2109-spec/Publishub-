from dataclasses import dataclass

from fastapi import Depends, Header

from app.core.config import get_settings
from app.core.errors import ApiError
from app.services import guest_service, supabase_service as db


def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    """Validates the Supabase access token sent as `Authorization: Bearer <token>`."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise ApiError(401, "UNAUTHENTICATED", "Faça login para continuar.")
    token = authorization[7:].strip()
    user = db.get_user_from_token(token) if token else None
    if not user:
        raise ApiError(401, "UNAUTHENTICATED", "Sua sessão expirou. Faça login novamente.")
    return user


def get_current_admin(user: dict = Depends(get_current_user)) -> dict:
    """Área do administrador: só os e-mails listados em ADMIN_EMAILS."""
    if not get_settings().is_admin(user.get("email")):
        raise ApiError(403, "ADMIN_ONLY", "Esta área é restrita ao administrador.")
    return user


@dataclass(frozen=True)
class Actor:
    """Quem está pedindo: uma conta ou um convidado (previsão cega sem cadastro)."""

    kind: str  # "user" | "guest"
    user: dict | None = None
    guest: dict | None = None

    @property
    def user_id(self) -> str | None:
        return self.user["id"] if self.user else None

    @property
    def guest_id(self) -> str | None:
        return self.guest["id"] if self.guest else None

    @property
    def is_guest(self) -> bool:
        return self.kind == "guest"


def get_actor(authorization: str | None = Header(default=None), x_guest_token: str | None = Header(default=None)) -> Actor:
    """A conta logada ou, sem ela, a sessão de convidado do header X-Guest-Token.

    A conta vem primeiro: quem já se cadastrou nunca volta a ser convidado, mesmo
    que o token antigo continue no navegador.
    """
    if authorization:
        return Actor(kind="user", user=get_current_user(authorization))
    session = guest_service.session_from_token((x_guest_token or "").strip())
    if not session:
        raise ApiError(401, "UNAUTHENTICATED", "Faça login para continuar.")
    if session.get("claimed_by"):
        # já virou conta: o token antigo no navegador não abre mais a análise
        raise ApiError(401, "GUEST_CLAIMED", "Este teste já está na sua conta. Entre para ver a análise.")
    return Actor(kind="guest", guest=session)
