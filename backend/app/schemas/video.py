from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class VideoCreate(BaseModel):
    """Sent by the frontend after it uploads the video (and, optionally, the Insights screenshot) to Storage."""

    storage_path: str = Field(min_length=10, max_length=300)
    # o print da retenção é opcional: sem ele a IA estima o momento pelo próprio vídeo
    insights_path: str | None = Field(default=None, min_length=10, max_length=300)
    filename: str = Field(min_length=1, max_length=255)
    # "o que você achou que ia prender a pessoa?" — opcional
    hypothesis: str | None = Field(default=None, max_length=500)
    # idioma do site: as explicações saem nele (as reescritas seguem a fala do vídeo)
    ui_locale: str | None = Field(default=None, pattern=r"^[a-zA-Z]{2}(-[a-zA-Z]{2})?$")


class AnalysisRetry(BaseModel):
    """Tentar de novo: o idioma do site pode ter mudado desde a primeira tentativa."""

    ui_locale: str | None = Field(default=None, pattern=r"^[a-zA-Z]{2}(-[a-zA-Z]{2})?$")


class OutcomeCreate(BaseModel):
    """The real retention the creator read in Insights after republishing."""

    actual_retention: float = Field(ge=0, le=100)


class BlindResponseCreate(BaseModel):
    """A resposta à previsão cega: "acertou" ou "errou, a queda foi em X"."""

    response: Literal["hit", "miss"]
    # só quando a resposta é "miss"; o backend aplica a tolerância de ±1 s
    actual_seconds: float | None = Field(default=None, ge=0, le=3600)


class EventCreate(BaseModel):
    """Um evento do funil (a lista de nomes válidos está em events_service)."""

    name: str = Field(min_length=3, max_length=40)
    analysis_id: str | None = Field(default=None, max_length=36)
    props: dict[str, str | int | float | bool | None] = Field(default_factory=dict)


class GuestUploadRequest(BaseModel):
    """Convidado: pede a URL assinada para enviar o vídeo direto ao Storage."""

    content_type: str = Field(min_length=5, max_length=60)


class GuestClaim(BaseModel):
    """A conta nova assume o que o convidado já tinha feito."""

    token: str = Field(min_length=10, max_length=120)


class FollowupCreate(BaseModel):
    """"Quando você vai republicar?" — a data é opcional; sem ela o lembrete sai em 72 h."""

    republish_on: date | None = None
    # idioma do site: o e-mail do lembrete sai nele
    ui_locale: str | None = Field(default=None, pattern=r"^[a-zA-Z]{2}(-[a-zA-Z]{2})?$")


class AccountDelete(BaseModel):
    """Apagar a conta. `confirmation` é o e-mail da própria conta, digitado à mão."""

    confirmation: str = Field(min_length=3, max_length=255)


class ManusConnect(BaseModel):
    """A chave da API do Manus do próprio criador (manus.im → API keys)."""

    api_key: str = Field(min_length=12, max_length=200)


class ManusSend(BaseModel):
    """Manda o plano de ação desta análise para o Manus executar."""

    ui_locale: str | None = Field(default=None, pattern=r"^[a-zA-Z]{2}(-[a-zA-Z]{2})?$")
