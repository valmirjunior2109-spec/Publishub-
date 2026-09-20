"""Logs com contexto: cada linha sabe de qual requisição veio.

O id vai no log e na resposta (header `X-Request-Id` e, nos erros, no corpo).
Quando alguém escreve para o suporte com esse código, dá para achar exatamente o
que aconteceu — sem precisar de nada do conteúdo do vídeo nem da conta.

O que nunca entra em log: senha, chave de API, dado de cartão e o que a pessoa
fala no vídeo (transcrição, frase da queda, reescritas). Log serve para achar
defeito, não para ler o material de quem usa.
"""

import logging
import time
import uuid
from contextvars import ContextVar

from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("publishub")

_request_id: ContextVar[str] = ContextVar("request_id", default="-")

# Rotas cujo ruído não ajuda ninguém: o cron e o health batem o tempo todo.
QUIET_PATHS = ("/api/health",)


def current_request_id() -> str:
    return _request_id.get()


class RequestIdFilter(logging.Filter):
    """Coloca o id em toda linha, inclusive nas que bibliotecas emitem."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = _request_id.get()
        return True


def configure(level: int = logging.INFO) -> None:
    handler = logging.StreamHandler()
    handler.addFilter(RequestIdFilter())
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s [%(request_id)s] %(name)s: %(message)s"))
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level)
    # o httpx loga cada chamada ao Supabase em INFO: vira ruído em produção
    logging.getLogger("httpx").setLevel(logging.WARNING)


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Um id por requisição, mais uma linha dizendo como ela terminou."""

    async def dispatch(self, request, call_next):
        incoming = request.headers.get("x-request-id", "").strip()
        # aceita o id de quem chamou (útil quando a Vercel encadeia), mas não confia no tamanho
        request_id = incoming[:36] if incoming else uuid.uuid4().hex[:12]
        token = _request_id.set(request_id)
        started = time.monotonic()
        try:
            response = await call_next(request)
        except Exception:
            # o handler de erro do FastAPI responde 500; aqui fica o rastro com contexto
            logger.exception("unhandled error on %s %s", request.method, request.url.path)
            _request_id.reset(token)
            raise

        elapsed_ms = round((time.monotonic() - started) * 1000)
        response.headers["X-Request-Id"] = request_id
        path = request.url.path
        if path not in QUIET_PATHS and (response.status_code >= 400 or elapsed_ms > 2000):
            # o que interessa no log: o que falhou e o que demorou
            logger.info("%s %s -> %s in %sms", request.method, path, response.status_code, elapsed_ms)
        _request_id.reset(token)
        return response
