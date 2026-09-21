"""Enviar a análise para o Notion da própria pessoa.

Nada aqui fala com o Notion de verdade: o que é testado é o nosso lado — a
autorização presa à conta certa, o token guardado cifrado, e a página montada
com o que a análise realmente tem.
"""

import json

import pytest

from tests.conftest import ALICE, BOB, auth, register, upload, upload_image

CLIENT_ID = "1f000000-1111-2222-3333-444444444444"
CLIENT_SECRET = "secret_notion_de_teste"
REDIRECT = "http://localhost:3000/notion/callback"

TOKEN_RESPONSE = {
    "access_token": "ntn_token_da_alice",
    "bot_id": "bot-1",
    "workspace_id": "ws-1",
    "workspace_name": "Conteúdo da Alice",
    "workspace_icon": "https://notion.test/icon.png",
    "owner": {"type": "user"},
}

BASE = {
    "object": "data_source",
    "id": "d0000000-0000-0000-0000-000000000001",
    "title": [{"plain_text": "Meus Reels"}],
    "properties": {"Vídeo": {"type": "title", "title": {}}, "Nota": {"type": "number"}},
    "url": "https://notion.so/base",
}

PAGINA = {
    "object": "page",
    "id": "p0000000-0000-0000-0000-000000000002",
    "properties": {"title": {"type": "title", "title": [{"plain_text": "Roteiros"}]}},
    "icon": {"emoji": "🎬"},
    "url": "https://notion.so/roteiros",
}


@pytest.fixture
def notion_env(env):
    env.setenv("NOTION_CLIENT_ID", CLIENT_ID)
    env.setenv("NOTION_CLIENT_SECRET", CLIENT_SECRET)
    env.setenv("NOTION_REDIRECT_URI", REDIRECT)
    from app.core.config import get_settings

    get_settings.cache_clear()
    yield env
    get_settings.cache_clear()


class FakeNotion:
    """As chamadas que fazemos ao Notion, com respostas plausíveis e o registro delas."""

    def __init__(self):
        self.calls: list[tuple[str, str, dict | None]] = []
        self.pages_created: list[dict] = []
        self.error: Exception | None = None

    def request(self, method, path, token, payload=None):
        assert token == TOKEN_RESPONSE["access_token"], "o token guardado tem de voltar a ser o original"
        self.calls.append((method, path, payload))
        if self.error:
            raise self.error
        if path == "/search":
            tipo = (payload.get("filter") or {}).get("value")
            return {"results": [BASE] if tipo == "data_source" else [PAGINA]}
        if path.startswith("/data_sources/"):
            return BASE
        if path.startswith("/pages/") and method == "GET":
            return PAGINA
        if path == "/pages":
            self.pages_created.append(payload)
            return {"id": "new-page-id", "url": "https://notion.so/analise"}
        if path.startswith("/blocks/"):
            self.pages_created.append(payload)
            return {"results": []}
        raise AssertionError(f"chamada inesperada: {method} {path}")


@pytest.fixture
def fake_notion(monkeypatch):
    from app.services import notion_service

    fake = FakeNotion()
    monkeypatch.setattr(notion_service, "_request", fake.request)

    def troca_token(url, headers=None, json=None, timeout=None):
        assert url.endswith("/oauth/token")
        assert headers["Authorization"].startswith("Basic ")
        assert json["grant_type"] == "authorization_code" and json["redirect_uri"] == REDIRECT
        return FakeResponse(200, TOKEN_RESPONSE)

    monkeypatch.setattr(notion_service.httpx, "post", troca_token)
    return fake


class FakeResponse:
    def __init__(self, status_code, payload):
        self.status_code = status_code
        self._payload = payload
        self.text = json.dumps(payload)

    def json(self):
        return self._payload


def analysed(client, fake_db, sample_video, token="alice-token", user=ALICE):
    created = register(client, fake_db, token, upload(fake_db, user, sample_video), upload_image(fake_db, user))
    assert created.status_code == 201, created.text
    return created.json()["analysis"]["id"]


def connect(client, fake_db, fake_notion):
    resposta = client.get("/api/notion/authorize", headers=auth())
    assert resposta.status_code == 200
    state = resposta.json()["url"].split("state=")[1].split("&")[0]
    feito = client.post("/api/notion/connect", json={"code": "codigo-do-notion", "state": state}, headers=auth())
    assert feito.status_code == 200, feito.text
    return feito.json()


# ---------------------------------------------------------------- integração desligada


def test_without_the_integration_nothing_is_offered(client, fake_db):
    corpo = client.get("/api/notion", headers=auth()).json()
    assert corpo == {"configured": False, "connection": None}
    assert client.get("/api/notion/authorize", headers=auth()).status_code == 503


# ---------------------------------------------------------------- conectar a conta


def test_connecting_stores_an_encrypted_token_and_shows_only_the_workspace(client, fake_db, notion_env, fake_notion):
    corpo = connect(client, fake_db, fake_notion)

    assert corpo["configured"] is True
    assert corpo["connection"]["workspace_name"] == "Conteúdo da Alice"
    # o token não pode aparecer em nada que a tela recebe
    assert TOKEN_RESPONSE["access_token"] not in json.dumps(corpo)
    # nem em claro no banco
    guardado = fake_db.notion_connections[ALICE["id"]]["access_token"]
    assert guardado != TOKEN_RESPONSE["access_token"]

    from app.services import notion_service

    assert notion_service._decrypt(guardado) == TOKEN_RESPONSE["access_token"]
    assert [e["name"] for e in fake_db.events if e["name"] == "notion_connected"] == ["notion_connected"]


def test_a_state_from_somewhere_else_is_refused(client, fake_db, notion_env, fake_notion):
    """O state é assinado e preso à conta: sem isso, um código podia cair na conta errada."""
    inventado = client.post("/api/notion/connect", json={"code": "codigo", "state": "naoassinado.0123456789abcdef"}, headers=auth())
    assert inventado.status_code == 422 and inventado.json()["error"]["code"] == "NOTION_BAD_STATE"

    da_alice = client.get("/api/notion/authorize", headers=auth()).json()["url"].split("state=")[1].split("&")[0]
    do_bob = client.post("/api/notion/connect", json={"code": "codigo", "state": da_alice}, headers=auth("bob-token"))
    assert do_bob.status_code == 422
    assert fake_db.notion_connections == {}


def test_disconnecting_forgets_the_account(client, fake_db, notion_env, fake_notion):
    connect(client, fake_db, fake_notion)
    assert client.post("/api/notion/disconnect", headers=auth()).json()["connection"] is None
    assert fake_db.notion_connections == {}


# ---------------------------------------------------------------- escolher o destino


def test_the_targets_are_the_pages_and_databases_the_person_authorized(client, fake_db, notion_env, fake_notion):
    connect(client, fake_db, fake_notion)
    alvos = client.get("/api/notion/targets", headers=auth()).json()["targets"]

    assert [(a["type"], a["title"]) for a in alvos] == [("data_source", "Meus Reels"), ("page", "Roteiros")]
    assert alvos[1]["icon"] == "🎬"


def test_choosing_a_target_checks_it_exists(client, fake_db, notion_env, fake_notion):
    connect(client, fake_db, fake_notion)
    escolhido = client.post("/api/notion/target", json={"target_type": "data_source", "target_id": BASE["id"]}, headers=auth())

    assert escolhido.status_code == 200
    assert escolhido.json()["connection"]["target_title"] == "Meus Reels"
    assert ("GET", f"/data_sources/{BASE['id']}", None) in fake_notion.calls


def test_a_target_the_notion_does_not_open_is_refused(client, fake_db, notion_env, fake_notion):
    from app.services import notion_service

    connect(client, fake_db, fake_notion)
    fake_notion.error = notion_service.NotionError("Notion respondeu 404")
    recusado = client.post("/api/notion/target", json={"target_type": "page", "target_id": PAGINA["id"]}, headers=auth())

    assert recusado.status_code == 422 and recusado.json()["error"]["code"] == "NOTION_BAD_TARGET"
    assert fake_db.notion_connections[ALICE["id"]].get("target_id") is None


# ---------------------------------------------------------------- exportar a análise


def test_the_exported_page_carries_the_whole_analysis(client, fake_db, fake_ai, notion_env, fake_notion, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)
    connect(client, fake_db, fake_notion)
    client.post("/api/notion/target", json={"target_type": "data_source", "target_id": BASE["id"]}, headers=auth())

    enviado = client.post(f"/api/analyses/{analysis_id}/notion", headers=auth())
    assert enviado.status_code == 201, enviado.text
    assert enviado.json()["export"]["page_url"] == "https://notion.so/analise"

    criada = fake_notion.pages_created[0]
    # a página nasce dentro da base escolhida, na coluna de título que ela usa
    assert criada["parent"] == {"type": "data_source_id", "data_source_id": BASE["id"]}
    assert criada["properties"]["Vídeo"]["title"][0]["text"]["content"] == "meu vídeo.mp4"
    assert len(criada["children"]) <= 100

    texto = json.dumps(criada["children"], ensure_ascii=False)
    assert "Nota geral: 8/10" in texto  # a nota do vídeo inteiro
    assert "Gancho: 6/10" in texto
    assert "Funil: Descoberta" in texto
    assert "0:04" in texto  # o segundo da queda
    assert "Plano de ação" in texto and "Encurte a pausa dos 3,5s" in texto
    assert "Cortes sugeridos" in texto and "0:04 → 0:06" in texto
    assert "Ganchos alternativos" in texto and "No dia 12 eu quase desisti" in texto
    assert "A previsão" in texto
    assert f"/results/{analysis_id}" in texto  # o caminho de volta para a análise

    # a tela passa a mostrar o link, e o evento fica registrado
    lido = client.get(f"/api/analyses/{analysis_id}/notion", headers=auth()).json()
    assert lido["export"]["page_url"] == "https://notion.so/analise"
    assert lido["connection"]["target_title"] == "Meus Reels"
    assert "notion_exported" in [e["name"] for e in fake_db.events]


def test_exporting_into_a_page_creates_a_subpage(client, fake_db, fake_ai, notion_env, fake_notion, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)
    connect(client, fake_db, fake_notion)
    client.post("/api/notion/target", json={"target_type": "page", "target_id": PAGINA["id"], "target_title": "Roteiros"}, headers=auth())

    assert client.post(f"/api/analyses/{analysis_id}/notion", headers=auth()).status_code == 201
    criada = fake_notion.pages_created[0]
    assert criada["parent"] == {"type": "page_id", "page_id": PAGINA["id"]}
    assert criada["properties"]["title"]["title"][0]["text"]["content"] == "meu vídeo.mp4"


def test_exporting_twice_replaces_the_link(client, fake_db, fake_ai, notion_env, fake_notion, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)
    connect(client, fake_db, fake_notion)
    client.post("/api/notion/target", json={"target_type": "page", "target_id": PAGINA["id"]}, headers=auth())

    client.post(f"/api/analyses/{analysis_id}/notion", headers=auth())
    client.post(f"/api/analyses/{analysis_id}/notion", headers=auth())
    assert len(fake_db.notion_exports) == 1


def test_exporting_needs_a_connection_and_a_target(client, fake_db, fake_ai, notion_env, fake_notion, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)

    sem_conta = client.post(f"/api/analyses/{analysis_id}/notion", headers=auth())
    assert sem_conta.status_code == 409 and sem_conta.json()["error"]["code"] == "NOTION_NOT_CONNECTED"

    connect(client, fake_db, fake_notion)
    sem_destino = client.post(f"/api/analyses/{analysis_id}/notion", headers=auth())
    assert sem_destino.status_code == 409 and sem_destino.json()["error"]["code"] == "NOTION_NO_TARGET"


def test_only_the_owner_exports_an_analysis(client, fake_db, fake_ai, notion_env, fake_notion, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)
    assert client.post(f"/api/analyses/{analysis_id}/notion", headers=auth("bob-token")).status_code == 404
    assert client.get(f"/api/analyses/{analysis_id}/notion", headers=auth("bob-token")).status_code == 404


def test_a_locked_free_analysis_is_not_exported(client, fake_db, fake_ai, notion_env, fake_notion, sample_video):
    """O que o grátis não mostra também não sai para o Notion."""
    notion_env.setenv("STRIPE_SECRET_KEY", "sk_test_123")
    notion_env.setenv("FREE_FULL_ANALYSES", "0")
    from app.core.config import get_settings

    get_settings.cache_clear()

    analysis_id = analysed(client, fake_db, sample_video)
    connect(client, fake_db, fake_notion)
    client.post("/api/notion/target", json={"target_type": "page", "target_id": PAGINA["id"]}, headers=auth())

    bloqueado = client.post(f"/api/analyses/{analysis_id}/notion", headers=auth())
    assert bloqueado.status_code == 402 and bloqueado.json()["error"]["code"] == "FREE_LIMIT_REACHED"
    assert fake_notion.pages_created == []


def test_the_notion_being_down_does_not_look_like_our_bug(client, fake_db, fake_ai, notion_env, fake_notion, sample_video):
    from app.services import notion_service

    analysis_id = analysed(client, fake_db, sample_video)
    connect(client, fake_db, fake_notion)
    client.post("/api/notion/target", json={"target_type": "page", "target_id": PAGINA["id"]}, headers=auth())

    fake_notion.error = notion_service.NotionError("Notion respondeu 502")
    caiu = client.post(f"/api/analyses/{analysis_id}/notion", headers=auth())
    assert caiu.status_code == 502 and caiu.json()["error"]["code"] == "NOTION_ERROR"
    assert fake_db.notion_exports == {}


def test_a_long_plan_is_sent_in_batches_of_a_hundred_blocks(client, fake_db, fake_ai, notion_env, fake_notion, sample_video, monkeypatch):
    """O Notion aceita 100 blocos por chamada: o que passa disso vai na chamada seguinte."""
    from app.services import notion_service

    analysis_id = analysed(client, fake_db, sample_video)
    connect(client, fake_db, fake_notion)
    client.post("/api/notion/target", json={"target_type": "page", "target_id": PAGINA["id"]}, headers=auth())

    longos = [notion_service._paragraph(f"bloco {i}") for i in range(230)]
    monkeypatch.setattr(notion_service, "_blocks", lambda analysis, cortes: longos)
    assert client.post(f"/api/analyses/{analysis_id}/notion", headers=auth()).status_code == 201

    enviados = [len(p["children"]) for p in fake_notion.pages_created]
    assert enviados == [100, 100, 30]
    assert [c[1] for c in fake_notion.calls if c[1].startswith("/blocks/")] == ["/blocks/new-page-id/children"] * 2


def test_bob_cannot_read_alices_connection(client, fake_db, notion_env, fake_notion):
    connect(client, fake_db, fake_notion)
    assert client.get("/api/notion", headers=auth("bob-token")).json()["connection"] is None
    assert BOB["id"] not in fake_db.notion_connections
