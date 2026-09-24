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


class MomentDiagnosis(BaseModel):
    """Sem o print: a IA aponta o segmento da fala com mais chance de perder gente e diagnostica ele."""

    segment_index: int
    reason: str
    diagnosis: str
    rewrites: list[Rewrite]


# ---------------------------------------------------------------- 4. copiloto de edição

Pace = Literal["lento", "bom", "acelerado"]
CutAction = Literal["cortar", "encurtar_pausa", "acelerar", "trocar_plano", "inserir_texto"]

# As sete frentes que o copiloto revisa. Cada recomendação é de uma delas, no
# segundo em que o criador precisa mexer.
RecommendationKind = Literal["hook", "cut", "pacing", "broll", "caption", "structure", "cta"]
# Quanto trabalho de edição a mudança dá — é o que decide o que fazer primeiro
# quando duas sugestões têm o mesmo impacto.
Effort = Literal["rapido", "medio", "pesado"]
# Para que serve o vídeo: alcançar quem não te conhece, aproximar quem já te segue
# ou pedir uma ação. O plano muda conforme a resposta.
Funnel = Literal["descoberta", "relacionamento", "conversao"]


class Recommendation(BaseModel):
    """Uma mudança concreta, no segundo exato em que ela acontece."""

    kind: RecommendationKind
    at_seconds: float
    end_seconds: float | None  # quando cobre um trecho, não um instante
    title: str  # o que fazer, em uma linha ("Corte a saudação")
    action: str  # a instrução para a edição, concreta o bastante para executar
    why: str  # o que o criador ganha com isso
    impact: int  # 0–10: quanto isso muda a retenção. É o que ordena o plano.
    effort: Effort


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
    """O vídeo inteiro: ritmo, gancho e o que mudar, em ordem de prioridade.

    `recommendations` é o plano de ação — as sete frentes (gancho, cortes, ritmo,
    b-roll, legendas, estrutura e CTA) numa lista só, cada item com o segundo e o
    impacto. `slow_stretches` e `cuts` são de análises antigas, mantidos para a
    tela conseguir abrir o que já estava salvo.
    """

    pace: Pace
    pace_note: str
    hook_score: int  # 0–10 para os primeiros 3 segundos
    hook_note: str
    recommendations: list[Recommendation]
    summary: str
    # Nulos nas análises antigas e nas que a IA não completou: quem lê decide o
    # que fazer sem eles, em vez de mostrar um número inventado.
    overall_score: int | None = None  # 0–10 para o vídeo inteiro
    funnel: Funnel | None = None
    funnel_note: str | None = None


# ---------------------------------------------------------------- 5. o criador não gostou do vídeo editado


class RevisedCut(BaseModel):
    start_seconds: float
    end_seconds: float


class EditRevision(BaseModel):
    """O pedido do criador traduzido em cortes: a lista inteira da versão nova.

    `cuts` é o que sai do vídeo ORIGINAL (não a diferença para a versão anterior).
    `can_apply` é falso quando nada do pedido se resolve cortando — aí `reply`
    explica o que fazer no editor.
    """

    can_apply: bool
    cuts: list[RevisedCut]
    reply: str
