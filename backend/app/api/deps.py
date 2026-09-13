from fastapi import Header

from app.core.errors import ApiError
from app.services import supabase_service as db


def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    """Validates the Supabase access token sent as `Authorization: Bearer <token>`."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise ApiError(401, "UNAUTHENTICATED", "Faça login para continuar.")
    token = authorization[7:].strip()
    user = db.get_user_from_token(token) if token else None
    if not user:
        raise ApiError(401, "UNAUTHENTICATED", "Sua sessão expirou. Faça login novamente.")
    return user
