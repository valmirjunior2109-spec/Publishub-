"""Integração com o Manus: mandar o plano de ação para um agente executar.

Opcional de propósito. Sem MANUS_KEY_SECRET no servidor, ou sem o criador ter
conectado a conta dele, nada aqui roda e o resto do Publishub funciona igual.

A API é a v2 do Manus (https://open.manus.ai/docs/v2), três chamadas:
  GET  /v2/task.list?limit=1  — confere se a chave do criador vale
  POST /v2/task.create        — cria a tarefa com o plano
  GET  /v2/task.detail        — o status dela depois

A chave é do criador, não nossa: os créditos que a tarefa gasta são dele. Ela é
cifrada (Fernet) antes de ir para o banco e nunca volta para a tela — o que a
tela mostra são os últimos caracteres, para ele saber qual chave conectou.
"""

import base64
import hashlib
import logging
from datetime import datetime, timezone

import httpx
from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings
from app.core.errors import ApiError
from app.services import supabase_service as db

logger = logging.getLogger("publishub")

TIMEOUT_SECONDS = 30
# Quantas recomendações vão no briefing. O plano inteiro cabe: são no máximo 8.
MAX_ITEMS = 8


class ManusError(Exception):
    """Falha falando com o Manus."""


# ---------------------------------------------------------------- chave do criador


def available() -> bool:
    """Sem o segredo de cifra não dá para guardar a chave de ninguém: a integração fica desligada."""
    return bool(get_settings().manus_key_secret)


def _fernet() -> Fernet:
    # O segredo do .env vira uma chave Fernet estável (32 bytes, base64).
    digest = hashlib.sha256(get_settings().manus_key_secret.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def _require_available() -> None:
    if not available():
        raise ApiError(503, "MANUS_UNAVAILABLE", "A integração com o Manus não está configurada neste servidor.")


def _call(method: str, path: str, api_key: str, **kwargs) -> dict:
    """Uma chamada à API do Manus. Erros viram ApiError com mensagem para o criador."""
    settings = get_settings()
    try:
        response = httpx.request(
            method,
            f"{settings.manus_api_base}{path}",
            headers={"x-manus-api-key": api_key, "Content-Type": "application/json"},
            timeout=TIMEOUT_SECONDS,
            **kwargs,
        )
    except httpx.HTTPError as exc:
        logger.warning("manus %s %s: %s", method, path, exc)
        raise ApiError(502, "MANUS_UNREACHABLE", "Não foi possível falar com o Manus agora. Tente novamente.") from exc

    if response.status_code in (401, 403):
        raise ApiError(400, "MANUS_INVALID_KEY", "O Manus não aceitou esta chave. Confira em manus.im e tente de novo.")
    if response.status_code == 429:
        raise ApiError(429, "MANUS_RATE_LIMITED", "O Manus está limitando as chamadas agora. Tente daqui a pouco.")
    if response.status_code >= 400:
        logger.warning("manus %s %s answered %s: %s", method, path, response.status_code, response.text[:300])
        raise ApiError(502, "MANUS_ERROR", "O Manus recusou a chamada. Tente novamente.")

    body = response.json() if response.content else {}
    if body.get("ok") is False:
        # o formato de erro do Manus: {"ok": false, "error": {"code", "message"}}
        detail = (body.get("error") or {}).get("message") or "sem detalhe"
        logger.warning("manus %s %s not ok: %s", method, path, detail)
        raise ApiError(502, "MANUS_ERROR", "O Manus não conseguiu completar a chamada. Tente novamente.")
    return body


def connect(user: dict, api_key: str) -> dict:
    """Guarda a chave do criador, depois de conferir com o Manus que ela vale."""
    _require_available()
    key = api_key.strip()
    if len(key) < 12:
        raise ApiError(422, "MANUS_INVALID_KEY", "Essa chave parece curta demais. Copie a chave inteira do Manus.")

    _call("GET", "/v2/task.list", key, params={"limit": 1})  # 401 aqui vira MANUS_INVALID_KEY

    db.upsert_manus_connection(
        {
            "user_id": user["id"],
            "api_key": _fernet().encrypt(key.encode()).decode(),
            "key_hint": key[-4:],
            "connected_at": datetime.now(timezone.utc).isoformat(),
            "last_error": None,
        }
    )
    logger.info("manus connected for user %s", user["id"])
    return connection(user)


def disconnect(user: dict) -> dict:
    db.delete_manus_connection(user["id"])
    return {"available": available(), "connected": False, "key_hint": None, "connected_at": None}


def connection(user: dict) -> dict:
    """O que a tela precisa saber. A chave nunca sai daqui."""
    row = db.get_manus_connection(user["id"]) if available() else None
    return {
        "available": available(),
        "connected": bool(row),
        "key_hint": row["key_hint"] if row else None,
        "connected_at": row["connected_at"] if row else None,
    }


def _api_key_of(user: dict) -> str:
    _require_available()
    row = db.get_manus_connection(user["id"])
    if not row:
        raise ApiError(409, "MANUS_NOT_CONNECTED", "Conecte sua conta do Manus antes de mandar o plano.")
    try:
        return _fernet().decrypt(row["api_key"].encode()).decode()
    except InvalidToken as exc:
        # MANUS_KEY_SECRET mudou: a chave guardada virou lixo, o criador reconecta
        logger.error("could not decrypt manus key for user %s", user["id"])
        db.delete_manus_connection(user["id"])
        raise ApiError(409, "MANUS_NOT_CONNECTED", "Conecte sua conta do Manus de novo: a chave guardada não vale mais.") from exc


# ---------------------------------------------------------------- o briefing


def _timestamp(seconds: float) -> str:
    whole = max(0, round(seconds))
    return f"{whole // 60}:{whole % 60:02d}"


def brief(analysis: dict, video: dict) -> str:
    """O plano de ação em texto, do jeito que um editor receberia a tarefa.

    Só o que a análise produziu: nada é inventado aqui, e o vídeo em si não sai
    do Publishub (o Manus recebe o plano, não o arquivo).
    """
    result = analysis.get("result") or {}
    copilot = result.get("copilot") or {}
    items = (copilot.get("recommendations") or [])[:MAX_ITEMS]
    drop = result.get("drop") or {}

    lines = [
        "Sou criador de conteúdo e preciso de ajuda para executar a edição deste vídeo curto.",
        "",
        f"VÍDEO: {video.get('filename') or 'Reel'}"
        + (f" ({_timestamp(video['duration_seconds'])} de duração)" if video.get("duration_seconds") else ""),
    ]
    if drop.get("at_seconds") is not None:
        lines.append(f"ONDE A AUDIÊNCIA CAI: {_timestamp(drop['at_seconds'])}")
    if (result.get("phrase") or {}).get("text"):
        lines.append(f'FRASE DITA NESSE MOMENTO: "{result["phrase"]["text"]}"')
    if copilot.get("summary"):
        lines.append(f"RESUMO DO DIAGNÓSTICO: {copilot['summary']}")

    lines += ["", "PLANO DE AÇÃO (em ordem de impacto, do maior para o menor):"]
    for index, item in enumerate(items, start=1):
        when = _timestamp(item["at_seconds"])
        if item.get("end_seconds"):
            when += f" a {_timestamp(item['end_seconds'])}"
        lines.append(f"{index}. [{item['kind']}] {when} - {item.get('title') or ''}".rstrip(" -"))
        if item.get("action"):
            lines.append(f"   O que fazer: {item['action']}")
        if item.get("why"):
            lines.append(f"   Por quê: {item['why']}")

    if result.get("rewrites"):
        lines += ["", "REESCRITAS SUGERIDAS PARA O TRECHO DA QUEDA:"]
        lines += [f'- "{rewrite["text"]}"' for rewrite in result["rewrites"]]

    lines += [
        "",
        "O QUE EU PRECISO DE VOCÊ:",
        "1. Transforme o plano acima numa lista de edição executável, na ordem em que devo mexer, com os tempos.",
        "2. Escreva os textos que faltam: legendas na tela e a chamada final, prontos para copiar.",
        "3. Para cada item de b-roll, diga o que filmar ou onde conseguir a imagem.",
        "4. Diga quanto tempo cada passo deve levar e o que dá para pular se eu tiver só 15 minutos.",
        "",
        "Não invente nada sobre o vídeo além do que está aqui.",
    ]
    return "\n".join(lines)


# ---------------------------------------------------------------- tarefas


def send_plan(user: dict, analysis: dict, locale: str | None) -> dict:
    """Cria no Manus a tarefa que executa o plano desta análise."""
    result = analysis.get("result") or {}
    if analysis.get("status") != "completed" or not (result.get("copilot") or {}).get("recommendations"):
        raise ApiError(409, "NO_PLAN", "Esta análise ainda não tem plano de ação para mandar.")

    api_key = _api_key_of(user)
    video = analysis.get("videos") or {}
    title = f"Publishub: plano de edição de {video.get('filename') or 'um Reel'}"[:120]
    payload = {
        "message": {"content": brief(analysis, video)},
        "title": title,
        "agent_profile": get_settings().manus_agent_profile,
    }
    if locale:
        payload["locale"] = locale

    body = _call("POST", "/v2/task.create", api_key, json=payload)
    task = db.upsert_manus_task(
        {
            "analysis_id": analysis["id"],
            "user_id": user["id"],
            "task_id": body.get("task_id") or "",
            "task_url": body.get("task_url"),
            "status": "running",
        }
    )
    logger.info("manus task %s created for analysis %s", task.get("task_id"), analysis["id"])
    return _serialize(task)


def task_for(analysis_id: str) -> dict | None:
    row = db.get_manus_task(analysis_id)
    return _serialize(row) if row else None


def refresh(user: dict, analysis_id: str) -> dict | None:
    """Pergunta ao Manus como está a tarefa e guarda o status."""
    row = db.get_manus_task(analysis_id)
    if not row or row["user_id"] != user["id"]:
        return None
    body = _call("GET", "/v2/task.detail", _api_key_of(user), params={"task_id": row["task_id"]})
    task = body.get("task") or {}
    status = task.get("status") or row["status"]
    if status != row["status"] or task.get("task_url") != row.get("task_url"):
        db.update_manus_task(row["id"], {"status": status, "task_url": task.get("task_url") or row.get("task_url")})
    return {**_serialize(row), "status": status, "task_url": task.get("task_url") or row.get("task_url")}


def _serialize(row: dict) -> dict:
    return {
        "analysis_id": row["analysis_id"],
        "task_id": row["task_id"],
        "task_url": row.get("task_url"),
        "status": row.get("status"),
        "created_at": row.get("created_at"),
    }
