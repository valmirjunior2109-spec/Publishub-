"""The AI layer, kept separate from the API.

Four calls, one per pipeline step:
  1. `transcribe`            — audio → segments with timestamps
  2. `read_retention_chart`  — the Insights screenshot → where the drop is
  3. `diagnose`              — the phrase at the drop → why, three rewrites, a prediction
  4. `copilot`               — the whole video → rhythm, hook, dead stretches, cuts

Provider: Google Gemini (google-genai). When the main model answers 429/503
(quota or congestion) the call is retried once on the fallback model.
"""

import json
import logging
from functools import lru_cache
from typing import TypeVar

import httpx
from google import genai
from google.genai import errors, types
from pydantic import BaseModel

from app.core.config import get_settings
from app.schemas.analysis import Copilot, CurveReading, Diagnosis, Transcript

logger = logging.getLogger("publishub")

T = TypeVar("T", bound=BaseModel)


class AINotConfiguredError(Exception):
    """No AI provider key in the environment."""


class AIServiceError(Exception):
    """The AI call failed; `message` is safe to show to the creator."""

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


_REFUSAL_REASONS = {
    types.FinishReason.SAFETY,
    types.FinishReason.PROHIBITED_CONTENT,
    types.FinishReason.BLOCKLIST,
    types.FinishReason.SPII,
    types.FinishReason.RECITATION,
    types.FinishReason.IMAGE_SAFETY,
    types.FinishReason.IMAGE_PROHIBITED_CONTENT,
}

_GENERIC = "A IA não conseguiu analisar o vídeo agora. Tente novamente."


@lru_cache
def _client() -> genai.Client:
    return genai.Client(
        api_key=get_settings().gemini_api_key,
        http_options=types.HttpOptions(timeout=300_000, retry_options=types.HttpRetryOptions(attempts=2)),
    )


def _raise_for_client_error(exc: errors.ClientError) -> None:
    if exc.code in (401, 403):
        logger.error("gemini authentication failed (%s): %s", exc.code, exc)
        raise AIServiceError("A integração com a IA está com a chave inválida. Avise o suporte.") from exc
    if exc.code == 404:
        logger.error("gemini model not found: %s", exc)
        raise AIServiceError("O modelo de IA configurado não existe. Avise o suporte.") from exc
    if exc.code == 429:
        logger.warning("gemini rate limited: %s", exc)
        raise AIServiceError("A IA está sobrecarregada no momento. Tente novamente em alguns minutos.") from exc
    logger.error("gemini API error %s: %s", exc.code, exc)
    raise AIServiceError(_GENERIC) from exc


def _check_response(response: types.GenerateContentResponse) -> None:
    feedback = response.prompt_feedback
    if feedback is not None and feedback.block_reason is not None:
        logger.warning("gemini blocked the prompt: %s", feedback.block_reason)
        raise AIServiceError("A IA não pôde analisar este vídeo.")
    candidate = response.candidates[0] if response.candidates else None
    if candidate is None:
        raise AIServiceError("A IA devolveu uma resposta incompleta. Tente novamente.")
    if candidate.finish_reason in _REFUSAL_REASONS:
        logger.warning("gemini refused: %s", candidate.finish_reason)
        raise AIServiceError("A IA não pôde analisar este vídeo.")
    if candidate.finish_reason == types.FinishReason.MAX_TOKENS:
        raise AIServiceError("A IA devolveu uma resposta incompleta. Tente novamente.")


def _without_dashes(value):
    """Rewrites em/en dashes the model still slips in ("x — y" → "x, y"), in every string field."""
    if isinstance(value, str):
        return value.replace(" — ", ", ").replace(" – ", ", ").replace("—", ",").replace("–", "-")
    if isinstance(value, BaseModel):
        for name in type(value).model_fields:
            setattr(value, name, _without_dashes(getattr(value, name)))
        return value
    if isinstance(value, list):
        return [_without_dashes(item) for item in value]
    return value


def _generate(parts: list[types.Part], schema: type[T], *, system: str | None = None, temperature: float = 0.2, max_output_tokens: int = 8000) -> T:
    """One structured call, with a single fallback model for quota/congestion errors."""
    settings = get_settings()
    if not settings.ai_configured:
        raise AINotConfiguredError()

    models = [settings.gemini_model]
    if settings.gemini_fallback_model and settings.gemini_fallback_model != settings.gemini_model:
        models.append(settings.gemini_fallback_model)

    last_busy: Exception | None = None
    for index, model in enumerate(models):
        try:
            response = _client().models.generate_content(
                model=model,
                contents=parts,
                config=types.GenerateContentConfig(
                    system_instruction=system,
                    response_mime_type="application/json",
                    response_schema=schema,
                    temperature=temperature,
                    max_output_tokens=max_output_tokens,
                ),
            )
        except errors.ClientError as exc:
            if exc.code == 429 and index < len(models) - 1:
                logger.warning("gemini %s rate limited; trying %s", model, models[index + 1])
                last_busy = exc
                continue
            _raise_for_client_error(exc)
        except errors.ServerError as exc:
            if index < len(models) - 1:
                logger.warning("gemini %s unavailable (%s); trying %s", model, exc.code, models[index + 1])
                last_busy = exc
                continue
            logger.error("gemini server error %s: %s", exc.code, exc)
            raise AIServiceError(_GENERIC) from exc
        except httpx.HTTPError as exc:
            logger.error("gemini connection error: %s", exc)
            raise AIServiceError("Não foi possível falar com a IA agora. Tente novamente.") from exc

        _check_response(response)
        if not isinstance(response.parsed, schema):
            logger.error("gemini returned no parsed output for %s", schema.__name__)
            raise AIServiceError("A IA devolveu uma resposta fora do formato esperado. Tente novamente.")
        return response.parsed

    raise AIServiceError("A IA está sobrecarregada no momento. Tente novamente em alguns minutos.") from last_busy


# ---------------------------------------------------------------- 1. transcrição

_TRANSCRIBE_PROMPT = """Transcreva a fala deste áudio, no idioma em que foi falada.
Divida em segmentos curtos — uma frase ou menos — com start_seconds e end_seconds em segundos desde o início, o mais precisos que conseguir.
Transcreva o que foi dito, sem corrigir nem resumir. Não invente fala: se não houver, has_speech=false e segments=[].
language: código ISO de duas letras (pt, en, es…)."""


def transcribe(audio: bytes, mime_type: str = "audio/mp3") -> Transcript:
    return _generate(
        [types.Part.from_text(text=_TRANSCRIBE_PROMPT), types.Part.from_bytes(data=audio, mime_type=mime_type)],
        Transcript,
        temperature=0.1,
        max_output_tokens=16000,
    )


# ---------------------------------------------------------------- 2. print da curva

_CHART_PROMPT = """Esta imagem deve ser o print da curva de retenção de um Reel, tirado do Instagram Insights.
Leia o gráfico: em que segundo do vídeo acontece a maior queda brusca de audiência?
Devolva drop_second, a porcentagem de pessoas assistindo logo antes e logo depois da queda, e de 10 a 16 pontos [segundo, porcentagem] amostrados ao longo do vídeo inteiro, do início ao fim.
Se a imagem não for um gráfico de retenção legível (outra tela, foto borrada, gráfico sem eixo de tempo), readable=false e os outros campos nulos."""


def read_retention_chart(image: bytes, mime_type: str) -> CurveReading:
    return _generate(
        [types.Part.from_text(text=_CHART_PROMPT), types.Part.from_bytes(data=image, mime_type=mime_type)],
        CurveReading,
        temperature=0.1,
    )


# ---------------------------------------------------------------- 3. diagnóstico

_DIAGNOSIS_SYSTEM = """Você é o Publishub: um editor de Reels experiente explicando, para outro criador, por que a audiência dele foi embora num segundo específico.

Você recebe: a frase exata que o criador estava dizendo no segundo em que a curva de retenção caiu, o que veio logo antes e logo depois, os números da queda, alguns frames desse momento e, às vezes, o que o criador achava que ia prender a pessoa.

Entregue:
- diagnosis: por que a pessoa saiu, em duas ou três linhas. Concreto, apontando o que a frase faz de errado (promete e não entrega, enrola, ressalva, saudação vazia, muda de assunto…). Sem elogio de cortesia, sem jargão.
- rewrites: exatamente três reescritas da frase, prontas para regravar no mesmo trecho — cabem em mais ou menos o mesmo tempo de fala, no tom do criador. Cada uma com `why`: uma linha curta explicando por que segura melhor.
- prediction: uma aposta que dá para checar. predicted_retention é a porcentagem de pessoas assistindo no segundo-alvo que você espera DEPOIS de o criador regravar com uma das reescritas e republicar. Tem que ser maior que o baseline informado e realista — nada de prometer 95%. statement: a aposta em uma frase, citando o segundo-alvo, o baseline e a porcentagem prevista.

Regras:
- Escreva no idioma da fala (informado). Copy direta, como quem explica para um amigo criador. Proibido: "potencialize", "otimize", "engajamento", "insights acionáveis" e variações.
- Nunca use travessão (—) nem meia-risca (–): separe ideias com ponto, vírgula ou dois-pontos.
- Só use o que está nos dados. Não invente o que aparece no vídeo além dos frames enviados."""


def diagnose(context: dict, frames: list[dict]) -> Diagnosis:
    """`context` is the JSON-serialisable summary built by the analysis service."""
    parts: list[types.Part] = [types.Part.from_text(text="DADOS DA QUEDA:\n" + json.dumps(context, ensure_ascii=False, indent=2))]
    for frame in frames:
        parts.append(types.Part.from_text(text=f"Frame em {frame['time']:.1f}s:"))
        parts.append(types.Part.from_bytes(data=frame["jpeg"], mime_type="image/jpeg"))
    result = _generate(parts, Diagnosis, system=_DIAGNOSIS_SYSTEM, temperature=0.5)
    if len(result.rewrites) < 3:
        logger.error("gemini returned %s rewrites", len(result.rewrites))
        raise AIServiceError("A IA devolveu uma resposta incompleta. Tente novamente.")
    result.rewrites = result.rewrites[:3]
    return _without_dashes(result)


# ---------------------------------------------------------------- 4. copiloto de edição

MAX_SLOW_STRETCHES = 4
MAX_CUTS = 6

_COPILOT_SYSTEM = """Você é o copiloto de edição do Publishub: um editor de Reels experiente revisando o corte de um vídeo para outro criador.

Você recebe: a transcrição com tempos, a duração, as pausas de áudio medidas (silêncios de 0,5 s ou mais), os cortes de cena detectados, a curva de retenção (segundo → % assistindo), o segundo da maior queda e frames espalhados pelo vídeo inteiro.

Entregue:
- pace: "lento", "bom" ou "acelerado" — o ritmo geral, julgando pela densidade de fala, pelas pausas, pela frequência de cortes e pela curva.
- pace_note: uma ou duas linhas concretas sobre o ritmo, citando segundos.
- hook_score: nota de 0 a 10 para os primeiros 3 segundos. 9–10: promete ou mostra algo que obriga a ficar. 5–6: começa direto, mas sem promessa. 0–3: saudação, contexto ou enrolação.
- hook_note: uma linha sobre o gancho.
- slow_stretches: até 4 trechos em que o vídeo fica parado — pausa longa, enrolação, mesmo enquadramento por muito tempo sem nada acontecer, fala sem informação nova. start_seconds e end_seconds reais, reason em uma linha. Lista vazia se não houver.
- cuts: até 6 sugestões de edição, na ordem do vídeo. action: "cortar" (tirar o trecho), "encurtar_pausa", "acelerar" (speed-up do trecho), "trocar_plano" (zoom, corte seco ou b-roll para quebrar um plano parado) ou "inserir_texto" (texto na tela reforçando o ponto). at_seconds sempre; end_seconds quando a sugestão cobre um trecho. why em uma linha, dizendo o que o criador ganha.
- summary: duas ou três linhas dizendo o que fazer primeiro.

Regras:
- Escreva no idioma da fala (informado). Direto, como quem explica para um amigo criador. Proibido: "potencialize", "otimize", "engajamento", "insights acionáveis" e variações.
- Nunca use travessão (—) nem meia-risca (–): separe ideias com ponto, vírgula ou dois-pontos.
- Cite segundos reais dos dados. Só use o que está nos dados e nos frames enviados."""


def copilot(context: dict, frames: list[dict]) -> Copilot:
    """`context` carries transcript, measured signals and the curve; `frames` span the whole video."""
    parts: list[types.Part] = [types.Part.from_text(text="DADOS DO VÍDEO:\n" + json.dumps(context, ensure_ascii=False, indent=2))]
    for frame in frames:
        parts.append(types.Part.from_text(text=f"Frame em {frame['time']:.1f}s:"))
        parts.append(types.Part.from_bytes(data=frame["jpeg"], mime_type="image/jpeg"))
    result = _generate(parts, Copilot, system=_COPILOT_SYSTEM, temperature=0.4)
    result.hook_score = max(0, min(10, result.hook_score))
    result.slow_stretches = result.slow_stretches[:MAX_SLOW_STRETCHES]
    result.cuts = sorted(result.cuts, key=lambda c: c.at_seconds)[:MAX_CUTS]
    return _without_dashes(result)
