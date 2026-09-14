"""Structured outputs the AI must return, one per step of the pipeline.

The backend validates each with these models before using it, so what reaches
the database (and the frontend) always has the same shape.
"""

from typing import Literal

from pydantic import BaseModel

# ---------------------------------------------------------------- 1. transcrição


class TranscriptSegment(BaseModel):
    start_seconds: float
    end_seconds: float
    text: str


class Transcript(BaseModel):
    language: str  # ISO: pt, en, es…
    has_speech: bool
    segments: list[TranscriptSegment]


# ---------------------------------------------------------------- 2. print da curva


class CurveReading(BaseModel):
    readable: bool
    drop_second: float | None
    retained_before_drop: float | None
    retained_after_drop: float | None
    points: list[list[float]]  # [[segundo, % assistindo], …]


# ---------------------------------------------------------------- 3. diagnóstico


class Rewrite(BaseModel):
    text: str
    why: str


class PredictionOutput(BaseModel):
    predicted_retention: float  # % que a IA aposta para o segundo-alvo, depois da regravação
    statement: str  # a previsão em uma frase, no idioma do criador


class Diagnosis(BaseModel):
    diagnosis: str
    rewrites: list[Rewrite]
    prediction: PredictionOutput


# ---------------------------------------------------------------- 4. copiloto de edição

Pace = Literal["lento", "bom", "acelerado"]
CutAction = Literal["cortar", "encurtar_pausa", "acelerar", "trocar_plano", "inserir_texto"]


class SlowStretch(BaseModel):
    start_seconds: float
    end_seconds: float
    reason: str


class CutSuggestion(BaseModel):
    at_seconds: float
    end_seconds: float | None  # quando a sugestão cobre um trecho, não um instante
    action: CutAction
    why: str


class Copilot(BaseModel):
    """How the whole video behaves: rhythm, hook, dead stretches and where to cut."""

    pace: Pace
    pace_note: str
    hook_score: int  # 0–10 para os primeiros 3 segundos
    hook_note: str
    slow_stretches: list[SlowStretch]
    cuts: list[CutSuggestion]
    summary: str
