"""Enviar a análise para o Notion, na conta de quem edita.

A pessoa entra com a conta dela (OAuth do Notion: nada de API key), escolhe onde
as análises devem cair — uma página ou uma base — e cada análise vira uma página
lá dentro, escrita para ser lida depois, na hora de editar.

O token do Notion fica cifrado no banco e nunca sai daqui: a tela sabe o nome do
workspace e o destino escolhido, mais nada. A integração é opcional: sem as
variáveis de ambiente, `configured()` é falso e o produto segue igual.
"""

import base64
import hashlib
import hmac
import json
import logging
import secrets
import time
from typing import Any
from urllib.parse import urlencode

import httpx
from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings
from app.core.errors import ApiError
from app.services import events_service, supabase_service as db

logger = logging.getLogger("publishub")

API = "https://api.notion.com/v1"
AUTHORIZE = "https://api.notion.com/v1/oauth/authorize"
# A versão da API do Notion que este código conhece. Subir isso é uma decisão,
# não um efeito colateral de um deploy.
VERSION = "2026-03-11"
TIMEOUT_SECONDS = 20
# O `state` do OAuth vale para uma volta ao Notion e só.
STATE_TTL_SECONDS = 900
# Uma página do Notion aceita 100 blocos por chamada; o resto do plano entra em
# chamadas seguintes.
BLOCKS_PER_CALL = 100
MAX_TARGETS = 50


class NotionError(Exception):
    """O Notion recusou ou não respondeu. A mensagem é para quem lê o log."""


# ---------------------------------------------------------------- token cifrado


def _fernet() -> Fernet:
    """A chave vem do client secret: um segredo a menos para configurar, e o
    token no banco continua inútil sem ele."""
    secret = get_settings().notion_client_secret.encode()
    key = base64.urlsafe_b64encode(hashlib.sha256(b"publishub-notion:" + secret).digest())
    return Fernet(key)


def _encrypt(token: str) -> str:
    return _fernet().encrypt(token.encode()).decode()


def _decrypt(value: str) -> str:
    try:
        return _fernet().decrypt(value.encode()).decode()
    except InvalidToken as exc:
        # acontece se o client secret mudar: reconectar resolve, e é o que dizemos
        raise ApiError(409, "NOTION_REAUTH", "Conecte o Notion de novo para continuar.") from exc


# ---------------------------------------------------------------- o vai e vem do OAuth


def configured() -> bool:
    return get_settings().notion_configured


def _require_configured() -> None:
    if not configured():
        raise ApiError(503, "NOTION_NOT_CONFIGURED", "A integração com o Notion ainda não foi configurada neste servidor.")


def _sign_state(user_id: str) -> str:
    """Um `state` que só este servidor consegue produzir, preso a esta conta.

    Sem isso, o código que volta do Notion poderia ser entregue na conta errada.
    """
    payload = base64.urlsafe_b64encode(json.dumps({"u": user_id, "t": int(time.time()), "n": secrets.token_hex(8)}).encode()).decode().rstrip("=")
    assinatura = hmac.new(get_settings().notion_client_secret.encode(), payload.encode(), hashlib.sha256).hexdigest()[:32]
    return f"{payload}.{assinatura}"


def _check_state(user_id: str, state: str) -> None:
    partes = (state or "").split(".")
    if len(partes) != 2:
        raise ApiError(422, "NOTION_BAD_STATE", "A conexão com o Notion expirou. Tente conectar de novo.")
    payload, assinatura = partes
    esperada = hmac.new(get_settings().notion_client_secret.encode(), payload.encode(), hashlib.sha256).hexdigest()[:32]
    if not hmac.compare_digest(assinatura, esperada):
        raise ApiError(422, "NOTION_BAD_STATE", "A conexão com o Notion expirou. Tente conectar de novo.")
    try:
        dados = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
    except (ValueError, json.JSONDecodeError) as exc:
        raise ApiError(422, "NOTION_BAD_STATE", "A conexão com o Notion expirou. Tente conectar de novo.") from exc
    if dados.get("u") != user_id or time.time() - float(dados.get("t", 0)) > STATE_TTL_SECONDS:
        raise ApiError(422, "NOTION_BAD_STATE", "A conexão com o Notion expirou. Tente conectar de novo.")


def authorize_url(user: dict) -> str:
    """Para onde mandar a pessoa para ela autorizar o Publishub no Notion dela."""
    _require_configured()
    settings = get_settings()
    parametros = {
        "client_id": settings.notion_client_id,
        "response_type": "code",
        # "user": a autorização é da pessoa, não de um workspace inteiro
        "owner": "user",
        "redirect_uri": settings.notion_redirect_uri,
        "state": _sign_state(user["id"]),
    }
    return f"{AUTHORIZE}?{urlencode(parametros)}"


def _request(method: str, path: str, token: str, payload: dict | None = None) -> dict[str, Any]:
    headers = {"Authorization": f"Bearer {token}", "Notion-Version": VERSION, "Content-Type": "application/json"}
    try:
        response = httpx.request(method, f"{API}{path}", headers=headers, json=payload, timeout=TIMEOUT_SECONDS)
    except httpx.HTTPError as exc:
        raise NotionError(f"não foi possível falar com o Notion: {exc}") from exc

    if response.status_code == 401:
        raise ApiError(409, "NOTION_REAUTH", "O Notion pediu a autorização de novo. Conecte a conta outra vez.")
    if response.status_code >= 400:
        corpo = response.text[:300]
        logger.warning("notion %s %s -> %s: %s", method, path, response.status_code, corpo)
        raise NotionError(f"Notion respondeu {response.status_code}: {corpo}")
    return response.json() or {}


def connect(user: dict, code: str, state: str) -> dict[str, Any]:
    """Troca o código que voltou do Notion pelo token e guarda a conexão."""
    _require_configured()
    _check_state(user["id"], state)
    settings = get_settings()

    basico = base64.b64encode(f"{settings.notion_client_id}:{settings.notion_client_secret}".encode()).decode()
    try:
        response = httpx.post(
            f"{API}/oauth/token",
            headers={"Authorization": f"Basic {basico}", "Notion-Version": VERSION, "Content-Type": "application/json"},
            json={"grant_type": "authorization_code", "code": code, "redirect_uri": settings.notion_redirect_uri},
            timeout=TIMEOUT_SECONDS,
        )
    except httpx.HTTPError as exc:
        raise NotionError(f"não foi possível falar com o Notion: {exc}") from exc

    if response.status_code >= 400:
        logger.warning("notion oauth -> %s: %s", response.status_code, response.text[:300])
        raise ApiError(422, "NOTION_CODE_INVALID", "O Notion não aceitou esta autorização. Tente conectar de novo.")

    dados = response.json() or {}
    token = dados.get("access_token")
    if not token:
        raise NotionError("o Notion não devolveu access_token")

    linha = db.upsert_notion_connection(
        {
            "user_id": user["id"],
            "access_token": _encrypt(token),
            "bot_id": dados.get("bot_id"),
            "workspace_id": dados.get("workspace_id"),
            "workspace_name": dados.get("workspace_name"),
            "workspace_icon": dados.get("workspace_icon"),
            # o destino é escolhido no passo seguinte, entre o que ela autorizou
            "target_type": None,
            "target_id": None,
            "target_title": None,
        }
    )
    events_service.record_for_user(user["id"], "notion_connected", None, {"workspace": bool(dados.get("workspace_id"))})
    logger.info("notion connected for user %s", user["id"])
    return _serialize(linha)


def disconnect(user: dict) -> dict[str, Any]:
    db.delete_notion_connection(user["id"])
    logger.info("notion disconnected for user %s", user["id"])
    return {"connection": None, "configured": configured()}


def _serialize(row: dict | None) -> dict[str, Any]:
    """O que a tela pode saber: o workspace e o destino. Nunca o token."""
    if not row:
        return {"connection": None, "configured": configured()}
    return {
        "configured": configured(),
        "connection": {
            "workspace_name": row.get("workspace_name"),
            "workspace_icon": row.get("workspace_icon"),
            "target_type": row.get("target_type"),
            "target_id": row.get("target_id"),
            "target_title": row.get("target_title"),
            "created_at": row.get("created_at"),
        },
    }


def status(user: dict) -> dict[str, Any]:
    return _serialize(db.get_notion_connection(user["id"]) if configured() else None)


def _connection(user: dict) -> tuple[dict, str]:
    _require_configured()
    linha = db.get_notion_connection(user["id"])
    if not linha:
        raise ApiError(409, "NOTION_NOT_CONNECTED", "Conecte sua conta do Notion para enviar a análise.")
    return linha, _decrypt(linha["access_token"])


# ---------------------------------------------------------------- onde a análise vai cair


def _plain_text(rich: Any) -> str:
    if isinstance(rich, list):
        return "".join(parte.get("plain_text") or "" for parte in rich if isinstance(parte, dict)).strip()
    return ""


def _result_title(item: dict) -> str:
    """O nome de uma página ou base, do jeito que aparece no Notion."""
    if item.get("object") == "data_source":
        return _plain_text(item.get("title")) or "Sem título"
    for propriedade in (item.get("properties") or {}).values():
        if isinstance(propriedade, dict) and propriedade.get("type") == "title":
            return _plain_text(propriedade.get("title")) or "Sem título"
    return "Sem título"


def _icon(item: dict) -> str | None:
    icone = item.get("icon") or {}
    return icone.get("emoji") if isinstance(icone, dict) else None


def targets(user: dict) -> dict[str, Any]:
    """As páginas e bases que a pessoa autorizou o Publishub a usar."""
    _, token = _connection(user)
    encontrados: list[dict[str, Any]] = []
    for tipo in ("data_source", "page"):
        resposta = _request(
            "POST",
            "/search",
            token,
            {"filter": {"property": "object", "value": tipo}, "sort": {"direction": "descending", "timestamp": "last_edited_time"}, "page_size": MAX_TARGETS},
        )
        for item in resposta.get("results") or []:
            if item.get("in_trash") or item.get("archived"):
                continue
            encontrados.append({"id": item.get("id"), "type": item.get("object"), "title": _result_title(item), "icon": _icon(item), "url": item.get("url")})
    return {"targets": encontrados[: MAX_TARGETS * 2]}


def choose_target(user: dict, target_type: str, target_id: str, target_title: str | None = None) -> dict[str, Any]:
    """Guarda o destino escolhido, conferindo que ele existe para esta conta."""
    _, token = _connection(user)
    if target_type not in ("page", "data_source"):
        raise ApiError(422, "NOTION_BAD_TARGET", "Escolha uma página ou uma base do Notion.")

    caminho = f"/pages/{target_id}" if target_type == "page" else f"/data_sources/{target_id}"
    try:
        item = _request("GET", caminho, token)
    except NotionError as exc:
        logger.info("notion target %s rejeitado: %s", target_id, exc)
        raise ApiError(422, "NOTION_BAD_TARGET", "Não conseguimos abrir esse destino no Notion. Escolha outro.") from exc

    linha = db.update_notion_connection(
        user["id"],
        {"target_type": target_type, "target_id": item.get("id") or target_id, "target_title": target_title or _result_title(item)},
    )
    return _serialize(linha)


def _title_property(data_source: dict) -> str:
    """O nome da coluna de título da base: é a única obrigatória ao criar a página."""
    for nome, propriedade in (data_source.get("properties") or {}).items():
        if isinstance(propriedade, dict) and propriedade.get("type") == "title":
            return nome
    return "Name"


# ---------------------------------------------------------------- a página da análise


def _rich(text: str) -> list[dict]:
    """O Notion aceita 2000 caracteres por trecho de texto."""
    return [{"type": "text", "text": {"content": text[:2000]}}]


def _paragraph(text: str) -> dict:
    return {"object": "block", "type": "paragraph", "paragraph": {"rich_text": _rich(text)}}


def _heading(text: str) -> dict:
    return {"object": "block", "type": "heading_2", "heading_2": {"rich_text": _rich(text)}}


def _bullet(text: str) -> dict:
    return {"object": "block", "type": "bulleted_list_item", "bulleted_list_item": {"rich_text": _rich(text)}}


def _todo(text: str) -> dict:
    return {"object": "block", "type": "to_do", "to_do": {"rich_text": _rich(text), "checked": False}}


def _quote(text: str) -> dict:
    return {"object": "block", "type": "quote", "quote": {"rich_text": _rich(text)}}


def _divider() -> dict:
    return {"object": "block", "type": "divider", "divider": {}}


def _timestamp(seconds: float | None) -> str:
    if seconds is None:
        return "?"
    total = int(round(float(seconds)))
    return f"{total // 60}:{total % 60:02d}"


FUNNEL_LABEL = {"descoberta": "Descoberta", "relacionamento": "Relacionamento", "conversao": "Conversão"}
PACE_LABEL = {"lento": "lento", "bom": "bom", "acelerado": "acelerado"}
KIND_LABEL = {
    "hook": "Gancho",
    "cut": "Corte",
    "pacing": "Ritmo",
    "broll": "B-roll",
    "caption": "Legenda",
    "structure": "Estrutura",
    "cta": "CTA",
}


def _blocks(analysis: dict, cortes: list[dict]) -> list[dict]:
    """A análise virada página: o que abrir no Notion na hora de editar.

    Só entra o que a análise tem. Campo vazio não vira seção vazia, e nada é
    inventado para preencher a página.
    """
    resultado = analysis.get("result") or {}
    copilot = resultado.get("copilot") or {}
    video = analysis.get("videos") or {}
    blocos: list[dict] = []

    # ---- o cabeçalho: a nota, o ritmo e a etapa do funil, numa linha
    resumo = []
    if copilot.get("overall_score") is not None:
        resumo.append(f"Nota geral: {copilot['overall_score']}/10")
    if copilot.get("hook_score") is not None:
        resumo.append(f"Gancho: {copilot['hook_score']}/10")
    if copilot.get("pace"):
        resumo.append(f"Ritmo: {PACE_LABEL.get(copilot['pace'], copilot['pace'])}")
    if copilot.get("funnel"):
        resumo.append(f"Funil: {FUNNEL_LABEL.get(copilot['funnel'], copilot['funnel'])}")
    if video.get("duration_seconds"):
        resumo.append(f"Duração: {_timestamp(video['duration_seconds'])}")
    if resumo:
        blocos.append(_paragraph(" · ".join(resumo)))
    if copilot.get("summary"):
        blocos.append(_paragraph(copilot["summary"]))
    if copilot.get("funnel_note"):
        blocos.append(_paragraph(copilot["funnel_note"]))

    # ---- onde o vídeo perde gente
    queda = resultado.get("drop") or {}
    frase = resultado.get("phrase") or {}
    if queda.get("at_seconds") is not None:
        blocos.append(_heading(f"A queda: {_timestamp(queda.get('at_seconds'))}"))
        if queda.get("retained_before") is not None and queda.get("retained_after") is not None:
            blocos.append(_paragraph(f"A retenção cai de {round(queda['retained_before'])}% para {round(queda['retained_after'])}%."))
        elif queda.get("reason"):
            blocos.append(_paragraph(queda["reason"]))
        if frase.get("text"):
            blocos.append(_quote(f"{frase['text']} ({_timestamp(frase.get('start_seconds'))})"))
        if resultado.get("diagnosis"):
            blocos.append(_paragraph(resultado["diagnosis"]))

    # ---- o gancho e o ritmo, o que a IA escreveu sobre cada um
    if copilot.get("hook_note") or copilot.get("pace_note"):
        blocos.append(_heading("Gancho e ritmo"))
        if copilot.get("hook_note"):
            blocos.append(_bullet(f"Gancho ({copilot.get('hook_score', '?')}/10): {copilot['hook_note']}"))
        if copilot.get("pace_note"):
            blocos.append(_bullet(f"Ritmo ({PACE_LABEL.get(copilot.get('pace'), copilot.get('pace') or '?')}): {copilot['pace_note']}"))

    # ---- o plano de ação, na ordem em que a tela mostra
    recomendacoes = copilot.get("recommendations") or []
    if recomendacoes:
        blocos.append(_heading("Plano de ação"))
        for item in recomendacoes:
            quando = _timestamp(item.get("at_seconds"))
            if item.get("end_seconds") is not None:
                quando += f"–{_timestamp(item.get('end_seconds'))}"
            etiqueta = KIND_LABEL.get(item.get("kind"), item.get("kind") or "")
            titulo = item.get("title") or item.get("action") or ""
            blocos.append(_todo(f"{quando} · {etiqueta} · {titulo}"))
            if item.get("action") and item.get("title"):
                blocos.append(_paragraph(item["action"]))

    # ---- os cortes, do jeito que o Publishub sugere aplicar
    if cortes:
        blocos.append(_heading("Cortes sugeridos"))
        for corte in cortes:
            blocos.append(_bullet(f"{_timestamp(corte['start_seconds'])} → {_timestamp(corte['end_seconds'])} ({round(corte['end_seconds'] - corte['start_seconds'], 1)}s)"))

    # ---- as frases alternativas para o gancho
    reescritas = resultado.get("rewrites") or []
    if reescritas:
        blocos.append(_heading("Ganchos alternativos"))
        for reescrita in reescritas:
            blocos.append(_quote(reescrita.get("text") or ""))
            if reescrita.get("why"):
                blocos.append(_paragraph(reescrita["why"]))

    # ---- a previsão, que é o que se confere depois de republicar
    previsao = resultado.get("prediction") or {}
    if previsao.get("statement"):
        blocos.append(_heading("A previsão"))
        blocos.append(_paragraph(previsao["statement"]))

    blocos.append(_divider())
    blocos.append(_paragraph(f"Análise do Publishub · {get_settings().app_url}/results/{analysis['id']}"))
    return blocos


def export(user: dict, analysis: dict, cortes: list[dict]) -> dict[str, Any]:
    """Cria (ou recria) a página desta análise no destino escolhido."""
    linha, token = _connection(user)
    if not linha.get("target_id"):
        raise ApiError(409, "NOTION_NO_TARGET", "Escolha em qual página ou base do Notion as análises devem entrar.")

    video = analysis.get("videos") or {}
    titulo = video.get("filename") or "Análise do Publishub"
    blocos = _blocks(analysis, cortes)

    if linha["target_type"] == "data_source":
        base = _request("GET", f"/data_sources/{linha['target_id']}", token)
        propriedades = {_title_property(base): {"title": _rich(titulo)}}
        pai = {"type": "data_source_id", "data_source_id": linha["target_id"]}
    else:
        propriedades = {"title": {"title": _rich(titulo)}}
        pai = {"type": "page_id", "page_id": linha["target_id"]}

    pagina = _request("POST", "/pages", token, {"parent": pai, "properties": propriedades, "children": blocos[:BLOCKS_PER_CALL]})
    page_id = pagina.get("id")
    if not page_id:
        raise NotionError("o Notion não devolveu a página criada")

    # o que não cabe na criação entra em seguida, na mesma ordem
    for inicio in range(BLOCKS_PER_CALL, len(blocos), BLOCKS_PER_CALL):
        _request("PATCH", f"/blocks/{page_id}/children", token, {"children": blocos[inicio : inicio + BLOCKS_PER_CALL]})

    registro = db.upsert_notion_export(
        {"analysis_id": analysis["id"], "user_id": user["id"], "page_id": page_id, "page_url": pagina.get("url") or ""}
    )
    events_service.record_for_user(user["id"], "notion_exported", analysis["id"], {"target": linha["target_type"], "blocks": len(blocos)})
    logger.info("notion export ok: analysis %s -> page %s", analysis["id"], page_id)
    return {"export": {"page_url": registro["page_url"], "created_at": registro.get("created_at")}}


def for_analysis(analysis_id: str) -> dict[str, Any] | None:
    linha = db.get_notion_export(analysis_id)
    return {"page_url": linha["page_url"], "created_at": linha.get("created_at")} if linha else None
