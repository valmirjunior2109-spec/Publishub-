"""Structured output the AI must return. The backend validates it with these
models before saving, so the frontend always receives the same shape."""

from typing import Literal

from pydantic import BaseModel

Priority = Literal["high", "medium", "low"]
Category = Literal["hook", "editing", "captions", "retention"]


class Finding(BaseModel):
    start_seconds: float | None
    end_seconds: float | None
    problem: str
    recommendation: str


class HookAssessment(BaseModel):
    score: int  # 0-10
    assessment: str
    problem: str
    recommendation: str


class EditingAssessment(BaseModel):
    score: int
    assessment: str
    findings: list[Finding]  # cortes, ritmo, pausas, trechos que podem sair


class CaptionsAssessment(BaseModel):
    score: int
    has_captions: bool
    assessment: str  # clareza, timing, quantidade de texto
    recommendations: list[str]


class RetentionAssessment(BaseModel):
    score: int
    assessment: str
    findings: list[Finding]


class Recommendation(BaseModel):
    priority: Priority
    category: Category
    text: str


class FunnelStage(BaseModel):
    # Prepared for later: the AI fills it when it can tell, "unknown" otherwise.
    stage: Literal["top", "middle", "bottom", "unknown"]
    reason: str


class AIAnalysis(BaseModel):
    summary: str
    hook: HookAssessment
    editing: EditingAssessment
    captions: CaptionsAssessment
    retention: RetentionAssessment
    weak_points: list[str]
    recommendations: list[Recommendation]
    funnel: FunnelStage
