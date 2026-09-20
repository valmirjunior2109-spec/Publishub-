"""Consistent JSON errors: {"error": {"code": ..., "message": ...}}.

Messages are always safe to show to the creator; details go to the log only.
"""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import current_request_id

logger = logging.getLogger("publishub")


class ApiError(Exception):
    def __init__(self, status_code: int, code: str, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


def error_response(status_code: int, code: str, message: str) -> JSONResponse:
    """O formato de erro do produto. `request_id` é o que liga a tela ao log."""
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message, "request_id": current_request_id()}},
        headers={"X-Request-Id": current_request_id()},
    )


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def handle_api_error(_: Request, exc: ApiError):
        return error_response(exc.status_code, exc.code, exc.message)

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(_: Request, exc: RequestValidationError):
        logger.info("validation error: %s", exc.errors())
        return error_response(422, "VALIDATION_ERROR", "Dados inválidos. Verifique as informações enviadas.")

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_error(_: Request, exc: StarletteHTTPException):
        if exc.status_code == 404:
            return error_response(404, "NOT_FOUND", "Recurso não encontrado.")
        if exc.status_code == 405:
            return error_response(405, "METHOD_NOT_ALLOWED", "Método não permitido.")
        return error_response(exc.status_code, "HTTP_ERROR", "Não foi possível processar a requisição.")

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception):
        # com contexto: qual rota, qual método. O corpo da requisição nunca entra.
        logger.exception("unexpected error on %s %s", request.method, request.url.path, exc_info=exc)
        return error_response(500, "INTERNAL_ERROR", "Ocorreu um erro inesperado. Tente novamente.")
