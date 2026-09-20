"""Manus: mandar o plano de ação para um agente executar.

A integração é opcional. Sem MANUS_KEY_SECRET ela fica desligada e o resto do
produto não muda — é isso que o primeiro teste garante.

As chamadas HTTP ao Manus são falsas aqui; o que se verifica é o contrato que a
documentação v2 descreve: header x-manus-api-key, POST /v2/task.create e
GET /v2/task.detail.
"""

import json

import pytest

from app.core.config import get_settings
from app.services import manus_service
from tests.conftest import ALICE, auth, register, upload, upload_image


@pytest.fixture
def manus(env, monkeypatch):
    """Integração ligada, com o Manus respondendo em memória."""
    env.setenv("MANUS_KEY_SECRET", "segredo-de-cifra-do-servidor")
    get_settings.cache_clear()

    calls: list[dict] = []
    replies: dict[str, dict] = {
        "/v2/task.list": {
            "ok": True,
            "data": [
                {"id": "task_9", "title": "Plano de edição do Reel do café", "status": "stopped", "task_url": "https://manus.im/app/task_9", "created_at": 1790000000, "credit_usage": 142},
                {"id": "task_8", "title": "Roteiro da série de 5 Reels", "status": "running", "task_url": "https://manus.im/app/task_8", "created_at": 1789900000},
            ],
        },
        "/v2/task.create": {"ok": True, "task_id": "task_123", "task_url": "https://manus.im/app/task_123", "task_title": "Publishub"},
        "/v2/task.detail": {"ok": True, "task": {"id": "task_123", "status": "stopped", "task_url": "https://manus.im/app/task_123"}},
    }

    def fake_call(method, path, api_key, **kwargs):
        calls.append({"method": method, "path": path, "api_key": api_key, **kwargs})
        return replies[path]

    monkeypatch.setattr(manus_service, "_call", fake_call)
    return type("Manus", (), {"calls": calls, "replies": replies})


def analysed(client, fake_db, sample_video) -> str:
    created = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE))
    assert created.status_code == 201, created.text
    return created.json()["analysis"]["id"]


def connect(client, key="manus-key-abcdef123456"):
    return client.post("/api/manus/connect", json={"api_key": key}, headers=auth())


def test_without_the_server_secret_the_integration_is_off(client, fake_db, fake_ai, sample_video):
    """Sem MANUS_KEY_SECRET: a tela sabe que não dá, e o resto do produto segue igual."""
    body = client.get("/api/manus", headers=auth()).json()
    assert body == {"available": False, "connected": False, "key_hint": None, "connected_at": None}

    refused = connect(client)
    assert refused.status_code == 503 and refused.json()["error"]["code"] == "MANUS_UNAVAILABLE"

    # a análise continua funcionando inteira
    analysis_id = analysed(client, fake_db, sample_video)
    assert client.get(f"/api/analyses/{analysis_id}", headers=auth()).json()["status"] == "completed"


def test_connecting_checks_the_key_with_manus_and_never_gives_it_back(client, fake_db, manus):
    response = connect(client)
    assert response.status_code == 200
    assert response.json() == {"available": True, "connected": True, "key_hint": "3456", "connected_at": response.json()["connected_at"]}

    # a chave foi conferida com uma chamada barata, com o header que a doc pede
    assert manus.calls[0]["method"] == "GET" and manus.calls[0]["path"] == "/v2/task.list"
    assert manus.calls[0]["params"] == {"limit": 1}
    assert manus.calls[0]["api_key"] == "manus-key-abcdef123456"

    # e no banco ela está cifrada, não em claro
    stored = fake_db.manus_connections[ALICE["id"]]["api_key"]
    assert "manus-key-abcdef123456" not in stored
    assert manus_service._fernet().decrypt(stored.encode()).decode() == "manus-key-abcdef123456"
    # nenhuma resposta da API carrega a chave
    assert "manus-key" not in json.dumps(client.get("/api/manus", headers=auth()).json())


def test_sending_the_plan_creates_a_task_with_the_timestamps(client, fake_db, fake_ai, sample_video, manus):
    analysis_id = analysed(client, fake_db, sample_video)
    connect(client)

    response = client.post(f"/api/analyses/{analysis_id}/manus", json={"ui_locale": "pt-BR"}, headers=auth())
    assert response.status_code == 200, response.text
    task = response.json()["task"]
    assert task["task_id"] == "task_123" and task["task_url"] == "https://manus.im/app/task_123"

    create = next(c for c in manus.calls if c["path"] == "/v2/task.create")
    payload = create["json"]
    assert payload["locale"] == "pt-BR" and payload["agent_profile"] == "standard"
    content = payload["message"]["content"]
    # o briefing leva o plano com os segundos e o que fazer, não o vídeo
    assert "PLANO DE AÇÃO" in content and "0:00" in content
    assert "Abra com o resultado" in content and "Encurte a pausa" in content
    assert "O QUE EU PRECISO DE VOCÊ" in content

    # e a tarefa fica ligada à análise
    assert client.get(f"/api/analyses/{analysis_id}/manus", headers=auth()).json()["task"]["task_id"] == "task_123"


def test_sending_needs_a_connected_account_and_a_finished_plan(client, fake_db, fake_ai, sample_video, manus):
    analysis_id = analysed(client, fake_db, sample_video)

    without_key = client.post(f"/api/analyses/{analysis_id}/manus", json={}, headers=auth())
    assert without_key.status_code == 409 and without_key.json()["error"]["code"] == "MANUS_NOT_CONNECTED"

    connect(client)
    # análise de outra conta: 404, como em todo o resto da API
    assert client.post(f"/api/analyses/{analysis_id}/manus", json={}, headers=auth("bob-token")).status_code == 404


def test_the_status_of_the_task_comes_from_manus(client, fake_db, fake_ai, sample_video, manus):
    analysis_id = analysed(client, fake_db, sample_video)
    connect(client)
    client.post(f"/api/analyses/{analysis_id}/manus", json={}, headers=auth())

    body = client.get(f"/api/analyses/{analysis_id}/manus?refresh=true", headers=auth()).json()
    assert body["task"]["status"] == "stopped"
    detail = next(c for c in manus.calls if c["path"] == "/v2/task.detail")
    assert detail["method"] == "GET" and detail["params"] == {"task_id": "task_123"}
    assert fake_db.manus_tasks[analysis_id]["status"] == "stopped"


def test_disconnecting_forgets_the_key(client, fake_db, manus):
    connect(client)
    assert client.post("/api/manus/disconnect", headers=auth()).json()["connected"] is False
    assert ALICE["id"] not in fake_db.manus_connections


def test_a_key_the_manus_refuses_is_not_stored(client, fake_db, manus, monkeypatch):
    from app.core.errors import ApiError

    def refuse(*_args, **_kwargs):
        raise ApiError(400, "MANUS_INVALID_KEY", "O Manus não aceitou esta chave.")

    monkeypatch.setattr(manus_service, "_call", refuse)
    response = connect(client)
    assert response.status_code == 400 and response.json()["error"]["code"] == "MANUS_INVALID_KEY"
    assert fake_db.manus_connections == {}


def test_a_changed_server_secret_asks_the_creator_to_reconnect(client, fake_db, fake_ai, sample_video, manus, env):
    """Se MANUS_KEY_SECRET mudar, a chave guardada vira lixo: melhor pedir de novo do que estourar."""
    analysis_id = analysed(client, fake_db, sample_video)
    connect(client)

    env.setenv("MANUS_KEY_SECRET", "outro-segredo-qualquer")
    get_settings.cache_clear()

    response = client.post(f"/api/analyses/{analysis_id}/manus", json={}, headers=auth())
    assert response.status_code == 409 and response.json()["error"]["code"] == "MANUS_NOT_CONNECTED"
    assert fake_db.manus_connections == {}  # a inútil foi descartada


def test_the_creator_sees_their_manus_work_without_leaving_publishub(client, fake_db, manus):
    connect(client)
    body = client.get("/api/manus/tasks", headers=auth()).json()

    assert body["connected"] is True
    assert [t["task_id"] for t in body["tasks"]] == ["task_9", "task_8"]
    primeira = body["tasks"][0]
    assert primeira["title"] == "Plano de edição do Reel do café"
    assert primeira["status"] == "stopped" and primeira["task_url"].startswith("https://manus.im/app/")
    assert primeira["credit_usage"] == 142

    listagem = [c for c in manus.calls if c["path"] == "/v2/task.list"][-1]
    assert listagem["params"] == {"limit": 10, "order": "desc"}


def test_without_a_connection_there_is_nothing_to_list(client, fake_db, manus):
    assert client.get("/api/manus/tasks", headers=auth()).json() == {"connected": False, "tasks": []}
