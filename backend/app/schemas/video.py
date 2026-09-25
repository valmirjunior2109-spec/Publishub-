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


class CutSegment(BaseModel):
    """Um trecho aprovado para sair do vídeo."""

    start_seconds: float = Field(ge=0, le=36000)
    end_seconds: float = Field(gt=0, le=36000)


class EditRequest(BaseModel):
    """Os cortes que o criador aprovou. Sem isto, nada é aplicado."""

    cuts: list[CutSegment] = Field(min_length=1, max_length=20)


class EditFeedback(BaseModel):
    """"Gostou do vídeo editado?" — e, se não, o que o criador mudaria."""

    rating: Literal["liked", "disliked"]
    # obrigatório quando não gostou (o backend confere); é o que vira a versão nova
    note: str | None = Field(default=None, max_length=1000)
    # idioma do site: a resposta sobre a versão nova sai nele
    ui_locale: str | None = Field(default=None, pattern=r"^[a-zA-Z]{2}(-[a-zA-Z]{2})?$")


class LeadCreate(BaseModel):
    """"Te mando o plano no e-mail": o endereço de quem viu a análise grátis."""

    # validado de verdade no backend (lead_service); aqui só o tamanho
    email: str = Field(min_length=3, max_length=254)
    # idioma do site: a mensagem sai nele
    ui_locale: str | None = Field(default=None, pattern=r"^[a-zA-Z]{2}(-[a-zA-Z]{2})?$")


class NotionConnect(BaseModel):
    """O código que o Notion devolve depois da autorização, com o state que mandamos."""

    code: str = Field(min_length=5, max_length=500)
    state: str = Field(min_length=10, max_length=500)


class NotionTarget(BaseModel):
    """Onde as análises entram no Notion: uma página ou uma base."""

    target_type: Literal["page", "data_source"]
    target_id: str = Field(min_length=10, max_length=100)
    target_title: str | None = Field(default=None, max_length=300)


class AccountDelete(BaseModel):
    """Apagar a conta. `confirmation` é o e-mail da própria conta, digitado à mão."""

    confirmation: str = Field(min_length=3, max_length=255)
