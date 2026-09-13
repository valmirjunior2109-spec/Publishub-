"""AI analysis of a video, kept separate from the API.

The model receives measured signals (duration, pauses, volume, scene cuts)
and frames sampled from the video, and must answer in the `AIAnalysis`
JSON schema (structured outputs). Swapping providers means rewriting only
`analyze_video` — the rest of the backend depends on `normalize`'s shape.

Provider: Google Gemini (google-genai SDK, AI Studio key).
"""

import base64
import json
import logging
from functools import lru_cache

import httpx
from google import genai
from google.genai import errors, types

from app.core.config import get_settings
from app.schemas.analysis import AIAnalysis, Finding
from app.services.video_processing import VideoSignals

logger = logging.getLogger("publishub")


class AINotConfiguredError(Exception):
    """No AI provider key in the environment."""


class AIServiceError(Exception):
    """The AI call failed; `message` is safe to show to the creator."""

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


SYSTEM_PROMPT = """Você é o copiloto de edição do Publishub: um editor sênior de vídeos curtos (Reels, TikTok, YouTube Shorts). Seu papel é analisar o vídeo e recomendar melhorias de edição — você não edita o vídeo, o creator aplica as mudanças no editor dele (CapCut, Premiere etc.).

Você recebe frames amostrados do vídeo (os primeiros 3 segundos em detalhe, depois ao longo do vídeo) e sinais medidos com ffmpeg: duração, trechos de silêncio, cortes de cena e volume. Você não recebe a transcrição da fala, então não invente o que foi dito; quando o áudio importar, use os sinais medidos.

Avalie:
- hook: os primeiros ~3 segundos prendem a atenção? Há movimento, texto, rosto, promessa visual? O vídeo demora a começar (ex.: silêncio no início)?
- editing: ritmo, cortes, pausas longas e trechos que poderiam ser removidos. Use os tempos dos silêncios e dos cortes de cena para apontar momentos exatos.
- captions: há legendas ou texto na tela? Avalie clareza, tamanho, contraste, posição, quantidade de texto e se parecem acompanhar o ritmo.
- retention: pontos que podem fazer o espectador sair (trechos parados, repetição visual, áudio baixo, final arrastado).
- funnel: se der para inferir o estágio do conteúdo no funil (top = descoberta/alcance, middle = consideração/educação, bottom = conversão/oferta), indique; caso contrário use "unknown".

Regras:
- Escreva em português do Brasil, de forma prática: o creator deve conseguir transformar cada recomendação em uma ação de edição.
- Notas de 0 a 10, honestas (5 é mediano, 8 ou mais é bom de verdade).
- Tempos em segundos, dentro da duração do vídeo; use null quando o ponto for geral.
- No máximo 6 itens em cada lista de findings e 8 recomendações, ordenadas por impacto."""

# Gemini 2.5 models always spend some output tokens on reasoning before the
# JSON, so the cap has to leave room for both.
MAX_OUTPUT_TOKENS = 32000

_REFUSAL_REASONS = {
    types.FinishReason.SAFETY,
    types.FinishReason.PROHIBITED_CONTENT,
    types.FinishReason.BLOCKLIST,
    types.FinishReason.SPII,
    types.FinishReason.RECITATION,
    types.FinishReason.IMAGE_SAFETY,
    types.FinishReason.IMAGE_PROHIBITED_CONTENT,
}


@lru_cache
def _client() -> genai.Client:
    return genai.Client(
        api_key=get_settings().gemini_api_key,
        http_options=types.HttpOptions(
            timeout=300_000,  # milliseconds
            retry_options=types.HttpRetryOptions(attempts=3),
        ),
    )


def _signals_text(signals: VideoSignals) -> str:
    data = signals.as_dict()
    # Keep the prompt bounded on long videos with many events.
    data["silences"] = data["silences"][:80]
    data["scene_cuts"] = data["scene_cuts"][:150]
    return "SINAIS MEDIDOS (ffmpeg):\n" + json.dumps(data, ensure_ascii=False, indent=2)


def _clamp_score(score: int) -> int:
    return max(0, min(10, int(score)))


def _clean_findings(findings: list[Finding], duration: float) -> list[dict]:
    cleaned = []
    for f in findings[:6]:
        start = None if f.start_seconds is None else round(max(0.0, min(duration, f.start_seconds)), 1)
        end = None if f.end_seconds is None else round(max(0.0, min(duration, f.end_seconds)), 1)
        if start is not None and end is not None and end < start:
            end = start
        cleaned.append({"start_seconds": start, "end_seconds": end, "problem": f.problem, "recommendation": f.recommendation})
    return cleaned


def normalize(result: AIAnalysis, signals: VideoSignals) -> dict:
    """Clamps scores and timestamps to the real video and computes the overall score."""
    duration = signals.duration_seconds
    data = {
        "summary": result.summary,
        "hook": {**result.hook.model_dump(), "score": _clamp_score(result.hook.score)},
        "editing": {
            "score": _clamp_score(result.editing.score),
            "assessment": result.editing.assessment,
            "findings": _clean_findings(result.editing.findings, duration),
        },
        "captions": {**result.captions.model_dump(), "score": _clamp_score(result.captions.score)},
        "retention": {
            "score": _clamp_score(result.retention.score),
            "assessment": result.retention.assessment,
            "findings": _clean_findings(result.retention.findings, duration),
        },
        "weak_points": result.weak_points[:8],
        "recommendations": [r.model_dump() for r in result.recommendations[:8]],
        "funnel": result.funnel.model_dump(),
    }
    scores = [data[k]["score"] for k in ("hook", "editing", "captions", "retention")]
    data["overall_score"] = round(sum(scores) / len(scores) * 10)
    return data


def _build_contents(signals: VideoSignals, frames: list[dict]) -> list[types.Part]:
    parts: list[types.Part] = []
    for frame in frames:
        parts.append(types.Part.from_text(text=f"Frame em {frame['time']:.1f}s:"))
        parts.append(types.Part.from_bytes(data=base64.b64decode(frame["jpeg_base64"]), mime_type="image/jpeg"))
    parts.append(types.Part.from_text(text=_signals_text(signals)))
    return parts


def _raise_for_client_error(exc: errors.ClientError) -> None:
    if exc.code in (401, 403):
        logger.error("gemini authentication failed (%s): %s", exc.code, exc)
        raise AIServiceError("A integração com a IA está com a chave inválida. Avise o suporte.") from exc
    if exc.code == 404:
        logger.error("gemini model not found (%s): %s", get_settings().gemini_model, exc)
        raise AIServiceError("O modelo de IA configurado não existe. Avise o suporte.") from exc
    if exc.code == 429:
        logger.warning("gemini rate limited: %s", exc)
        raise AIServiceError("A IA está sobrecarregada no momento. Tente novamente em alguns minutos.") from exc
    logger.error("gemini API error %s: %s", exc.code, exc)
    raise AIServiceError("A IA não conseguiu analisar o vídeo agora. Tente novamente.") from exc


def _check_response(response: types.GenerateContentResponse) -> None:
    """Turns a blocked or truncated answer into a message the creator can act on."""
    feedback = response.prompt_feedback
    if feedback is not None and feedback.block_reason is not None:
        logger.warning("gemini blocked the prompt: %s", feedback.block_reason)
        raise AIServiceError("A IA não pôde analisar este vídeo.")

    candidate = response.candidates[0] if response.candidates else None
    if candidate is None:
        logger.error("gemini returned no candidates")
        raise AIServiceError("A IA devolveu uma resposta incompleta. Tente novamente.")
    if candidate.finish_reason in _REFUSAL_REASONS:
        logger.warning("gemini refused: %s", candidate.finish_reason)
        raise AIServiceError("A IA não pôde analisar este vídeo.")
    if candidate.finish_reason == types.FinishReason.MAX_TOKENS:
        logger.error("gemini hit the output token limit")
        raise AIServiceError("A IA devolveu uma resposta incompleta. Tente novamente.")


def analyze_video(signals: VideoSignals, frames: list[dict]) -> dict:
    settings = get_settings()
    if not settings.ai_configured:
        raise AINotConfiguredError()

    try:
        response = _client().models.generate_content(
            model=settings.gemini_model,
            contents=_build_contents(signals, frames),
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=AIAnalysis,
                max_output_tokens=MAX_OUTPUT_TOKENS,
                temperature=0.4,
            ),
        )
    except errors.ClientError as exc:
        _raise_for_client_error(exc)
    except errors.ServerError as exc:
        logger.error("gemini server error %s: %s", exc.code, exc)
        raise AIServiceError("A IA não conseguiu analisar o vídeo agora. Tente novamente.") from exc
    except httpx.HTTPError as exc:
        logger.error("gemini connection error: %s", exc)
        raise AIServiceError("Não foi possível falar com a IA agora. Tente novamente.") from exc

    _check_response(response)

    if not isinstance(response.parsed, AIAnalysis):
        logger.error("gemini returned no parsed output (parsed=%s)", type(response.parsed).__name__)
        raise AIServiceError("A IA devolveu uma resposta fora do formato esperado. Tente novamente.")

    return normalize(response.parsed, signals)
