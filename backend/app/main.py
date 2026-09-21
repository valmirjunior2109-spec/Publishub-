import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import get_settings
from app.core.errors import error_response, register_error_handlers
from app.core.logging import RequestContextMiddleware, configure as configure_logging
from app.services import analysis_service, edit_service
from app.services.notion_service import NotionError
from app.services.supabase_service import SupabaseError, SupabaseNotConfigured

configure_logging()
logger = logging.getLogger("publishub")


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    if not settings.supabase_configured:
        logger.warning("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — API calls will return 503")
    else:
        # uma de cada vez: se a tabela de uma ainda não existe (migração não
        # rodada), a outra continua sendo recuperada — e o log diz qual falhou
        for what, recover in (("analyses", analysis_service.recover_interrupted), ("edits", edit_service.recover_interrupted)):
            try:
                recover()
            except Exception:
                logger.exception("could not recover interrupted %s", what)
    if not settings.ai_configured:
        logger.warning("GEMINI_API_KEY not set — analyses will fail with 'IA não configurada'")
    yield


app = FastAPI(title="Publishub API", version="0.1.0", lifespan=lifespan)

# o id da requisição nasce aqui, antes de tudo: todo log da chamada carrega ele
app.add_middleware(RequestContextMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_methods=["GET", "POST"],
    # X-Guest-Token: a sessão de quem está testando a previsão cega sem cadastro
    allow_headers=["Authorization", "Content-Type", "X-Guest-Token", "X-Request-Id"],
    # o navegador só lê headers expostos: sem isto o site não consegue mostrar o código do erro
    expose_headers=["X-Request-Id"],
)

register_error_handlers(app)


@app.exception_handler(SupabaseNotConfigured)
async def handle_not_configured(_: Request, __: SupabaseNotConfigured):
    return error_response(503, "SERVICE_UNAVAILABLE", "O servidor ainda não foi configurado. Tente novamente mais tarde.")


@app.exception_handler(SupabaseError)
async def handle_supabase_error(_: Request, __: SupabaseError):
    return error_response(502, "DATABASE_ERROR", "Não foi possível falar com o banco de dados agora. Tente novamente.")


@app.exception_handler(NotionError)
async def handle_notion_error(_: Request, __: NotionError):
    """O Notion fora do ar não é bug nosso, e a tela precisa dizer isso direito."""
    return error_response(502, "NOTION_ERROR", "O Notion não respondeu agora. Tente enviar de novo em alguns instantes.")


app.include_router(router)
