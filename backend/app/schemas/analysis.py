"""Structured outputs the AI must return, one per step of the pipeline.

The backend validates each with these models before using it, so what reaches
the database (and the frontend) always has the same shape.
"""

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
