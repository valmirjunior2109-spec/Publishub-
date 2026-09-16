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
