"""A memória do criador: a Publishub aprende com cada pessoa e usa isso no vídeo seguinte.

O que entra: os cortes que a pessoa aceita e recusa, o que ela pediu para mudar
no vídeo editado, o que sentiu falta na análise, as notas que ela mesma escreve e
a trajetória dos vídeos. Onde sai: na próxima análise (a IA recebe a memória e
diz o que ela mudou), nos cortes sugeridos (já vêm marcados do jeito que a pessoa
costuma decidir) e na revisão do vídeo editado. A pessoa vê tudo, apaga o que não
quiser, pausa e esquece. Sem a tabela, nada quebra: a memória só fica parada.
"""

import uuid

from app.schemas.analysis import Copilot, EditRevision
from app.services import ai_service, memory_service
from tests.conftest import ALICE, BOB, auth, now, register, sample_copilot, upload, upload_image

OLD = "2026-01-01T00:00:00+00:00"


def analysed(client, fake_db, sample_video) -> str:
    created = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE))
    assert created.status_code == 201, created.text
    return created.json()["analysis"]["id"]


def seed_decisions(fake_db, user, kind, decision, count, when=None):
    """Decisões de análises antigas, direto no banco: é o rastro que a memória lê."""
    for position in range(count):
        analysis_id = str(uuid.uuid4())
        fake_db.suggestion_decisions[(analysis_id, user["id"], position)] = {
            "id": str(uuid.uuid4()),
            "analysis_id": analysis_id,
            "user_id": user["id"],
            "suggestion_index": position,
            "kind": kind,
            "decision": decision,
            "start_seconds": 1.0,
            "end_seconds": 2.0,
            "adjusted_start": None,
            "adjusted_end": None,
            "created_at": when or now(),
            "updated_at": when or now(),
        }


def seed_request(fake_db, user, note, when=None) -> str:
    """Um "o que você mudaria?" de um vídeo editado antigo."""
    row = {"id": str(uuid.uuid4()), "analysis_id": str(uuid.uuid4()), "user_id": user["id"], "revision": 1, "rating": "disliked", "note": note, "cuts": [], "created_at": when or now()}
    fake_db.edit_feedback.append(row)
    return row["id"]


def seed_missing(fake_db, user, text) -> str:
    analysis_id = str(uuid.uuid4())
    row = {"id": str(uuid.uuid4()), "analysis_id": analysis_id, "user_id": user["id"], "useful": False, "missing": text, "created_at": now(), "updated_at": now()}
    fake_db.analysis_feedback[(analysis_id, user["id"])] = row
    return row["id"]


def memory(client, token="alice-token"):
    response = client.get("/api/me/memory", headers=auth(token))
    assert response.status_code == 200, response.text
    return response.json()


def add_note(client, text, token="alice-token"):
    return client.post("/api/me/memory/notes", json={"text": text}, headers=auth(token))


def copilot_call(fake_ai) -> dict:
    return next(c for c in fake_ai.calls if c["config"].response_schema is Copilot)


def sent_text(call) -> str:
    return "".join(part.text or "" for part in call["contents"] if getattr(part, "text", None))


# ---------------------------------------------------------------- o que a memória aprende


def test_a_new_account_starts_with_an_empty_memory(client, fake_db):
    body = memory(client)
    assert body["empty"] is True and body["enabled"] is True and body["stored"] is True
    assert body["stats"] == {"analyses": 0, "decisions": 0, "requests": 0, "notes": 0}
    assert body["cuts"]["leanings"] == {} and body["requests"] == [] and body["notes"] == []


def test_the_memory_learns_what_the_creator_accepts_and_rejects(client, fake_db):
    seed_decisions(fake_db, ALICE, "long_pause", "rejected", 3)
    seed_decisions(fake_db, ALICE, "hesitation", "accepted", 4)
    # duas decisões ainda não dizem nada: chute não vira preferência
    seed_decisions(fake_db, ALICE, "repetition", "accepted", 2)

    body = memory(client)

    assert body["empty"] is False
    assert body["cuts"]["leanings"] == {"long_pause": "reject", "hesitation": "accept"}
    assert body["stats"]["decisions"] == 9


def test_requests_and_what_was_missing_become_memory(client, fake_db):
    seed_request(fake_db, ALICE, "Não corta minhas pausas dramáticas", when=OLD)
    seed_request(fake_db, ALICE, "Deixa a saudação, ela é minha marca")
    seed_missing(fake_db, ALICE, "Faltou falar da legenda")
    # gostar não é pedido: não entra
    fake_db.edit_feedback.append({"id": "x", "analysis_id": "y", "user_id": ALICE["id"], "revision": 1, "rating": "liked", "note": None, "cuts": [], "created_at": now()})

    body = memory(client)

    # o mais novo primeiro: diz mais do estilo de hoje
    assert [r["text"] for r in body["requests"]] == ["Deixa a saudação, ela é minha marca", "Não corta minhas pausas dramáticas"]
    assert [m["text"] for m in body["missing"]] == ["Faltou falar da legenda"]
    assert body["stats"]["requests"] == 2


def test_the_trajectory_notices_a_better_hook_and_what_keeps_coming_back():
    analyses = [
        {"hook_score": score, "pace": "lento", "recommendations": [{"kind": "hook"}, {"kind": "caption"}] if n < 4 else [{"kind": "cut"}]}
        for n, score in enumerate([8, 8, 7, 4, 3, 3])  # do mais novo para o mais velho, como o banco devolve
    ]
    trajectory = memory_service._trajectory(analyses)
    assert trajectory["hook_scores"] == [3.0, 3.0, 4.0, 7.0, 8.0, 8.0]  # do mais velho para o mais novo
    assert trajectory["hook_trend"] == "up"
    assert trajectory["recurring_fronts"][:2] in (["hook", "caption"], ["caption", "hook"])
    assert trajectory["usual_pace"] == "lento"
    # com pouca história, nada de tendência
    assert memory_service._trajectory(analyses[:2])["hook_trend"] is None


# ---------------------------------------------------------------- o controle da pessoa


def test_notes_are_written_and_erased_by_the_creator(client, fake_db):
    created = add_note(client, "  Eu falo   rápido,  não acelere  o vídeo  ")
    assert created.status_code == 201, created.text
    note = created.json()["notes"][0]
    assert note["text"] == "Eu falo rápido, não acelere o vídeo"

    erased = client.delete(f"/api/me/memory/notes/{note['id']}", headers=auth())
    assert erased.status_code == 200 and erased.json()["notes"] == []
    assert client.delete(f"/api/me/memory/notes/{note['id']}", headers=auth()).status_code == 404


def test_notes_have_limits(client, fake_db):
    assert add_note(client, "ok").json()["error"]["code"] == "MEMORY_NOTE_TOO_SHORT"
    assert add_note(client, "a" * 301).json()["error"]["code"] == "MEMORY_NOTE_TOO_LONG"
    for n in range(memory_service.MAX_NOTES):
        assert add_note(client, f"Nota número {n}").status_code == 201
    full = add_note(client, "Uma a mais")
    assert full.status_code == 422 and full.json()["error"]["code"] == "MEMORY_NOTES_LIMIT"


def test_a_learned_request_can_be_taken_out_without_erasing_the_history(client, fake_db):
    request_id = seed_request(fake_db, ALICE, "Corta mais a introdução")

    hidden = client.post("/api/me/memory/hide", json={"source": "request", "id": request_id}, headers=auth())

    assert hidden.status_code == 200, hidden.text
    assert hidden.json()["requests"] == []
    # o feedback continua no histórico; só deixou de orientar a IA
    assert any(f["id"] == request_id for f in fake_db.edit_feedback)
    again = client.post("/api/me/memory/hide", json={"source": "request", "id": request_id}, headers=auth())
    assert again.status_code == 404


def test_forgetting_starts_the_memory_over(client, fake_db):
    seed_decisions(fake_db, ALICE, "long_pause", "rejected", 3, when=OLD)
    seed_request(fake_db, ALICE, "Não corta minhas pausas", when=OLD)
    add_note(client, "Eu gosto de vídeo enxuto")
    assert memory(client)["empty"] is False

    forgotten = client.post("/api/me/memory/forget", headers=auth())

    assert forgotten.status_code == 200, forgotten.text
    body = forgotten.json()
    assert body["empty"] is True and body["notes"] == [] and body["forgotten_at"]
    # o que vem depois do "esquecer" volta a contar
    seed_decisions(fake_db, ALICE, "hesitation", "accepted", 3)
    assert memory(client)["cuts"]["leanings"] == {"hesitation": "accept"}
    # e o histórico em si continua lá
    assert len(fake_db.suggestion_decisions) == 6 and fake_db.edit_feedback


def test_the_memory_belongs_to_its_owner(client, fake_db):
    note_id = add_note(client, "Só a Alice sabe disso").json()["notes"][0]["id"]
    seed_request(fake_db, ALICE, "Pedido da Alice")

    bob = memory(client, "bob-token")

    assert bob["empty"] is True and bob["notes"] == [] and bob["requests"] == []
    assert client.delete(f"/api/me/memory/notes/{note_id}", headers=auth("bob-token")).status_code == 404
    assert memory(client)["notes"][0]["id"] == note_id
    assert client.get("/api/me/memory").status_code == 401


def test_without_the_table_the_memory_reads_but_does_not_write(client, fake_db):
    fake_db.memory_table_missing = True
    seed_decisions(fake_db, ALICE, "long_pause", "rejected", 3)

    body = memory(client)

    # o que vem das outras tabelas continua aparecendo
    assert body["stored"] is False and body["cuts"]["leanings"] == {"long_pause": "reject"}
    refused = add_note(client, "Não vai dar para guardar")
    assert refused.status_code == 503 and refused.json()["error"]["code"] == "MEMORY_UNAVAILABLE"


# ---------------------------------------------------------------- onde a memória é usada


def test_the_next_analysis_uses_the_memory(client, fake_db, fake_ai, sample_video):
    add_note(client, "Não corte minhas pausas dramáticas")
    seed_request(fake_db, ALICE, "Deixa a saudação no começo")
    # o vídeo de exemplo tem o começo parado (dead_start) e a pausa que a IA quer encurtar (pacing)
    seed_decisions(fake_db, ALICE, "dead_start", "accepted", 3)
    seed_decisions(fake_db, ALICE, "pacing", "rejected", 3)
    fake_ai.responses = [r for r in fake_ai.responses if not isinstance(r, Copilot)] + [sample_copilot(memory_note="Você costuma manter as pausas: só sugeri a de 3,5s.")]

    analysis_id = analysed(client, fake_db, sample_video)

    # a IA recebeu a memória, e as regras de como usar
    call = copilot_call(fake_ai)
    text = sent_text(call)
    assert "creator_memory" in text and "Não corte minhas pausas dramáticas" in text and "Deixa a saudação no começo" in text
    assert "recusa quase sempre" in text and "Memória do criador" in call["config"].system_instruction

    result = client.get(f"/api/analyses/{analysis_id}", headers=auth()).json()["result"]
    assert result["memory"]["used"] is True and result["memory"]["notes"] == 1
    assert result["memory"]["cut_leanings"] == {"dead_start": "accept", "pacing": "reject"}
    assert result["copilot"]["memory_note"] == "Você costuma manter as pausas: só sugeri a de 3,5s."

    # os cortes já vêm marcados do jeito que a pessoa costuma decidir; a lista não muda
    suggestions = client.get(f"/api/analyses/{analysis_id}/edit", headers=auth()).json()["suggestions"]
    assert [(s["reason"], s["memory"]) for s in suggestions] == [("dead_start", "accept"), ("pacing", "reject")]


def test_the_memory_of_an_analysis_is_a_snapshot(client, fake_db, fake_ai, sample_video):
    seed_decisions(fake_db, ALICE, "dead_start", "accepted", 3)
    analysis_id = analysed(client, fake_db, sample_video)
    # a pessoa muda de ideia depois: a análise pronta não muda embaixo dela
    seed_decisions(fake_db, ALICE, "dead_start", "rejected", 10)

    suggestions = client.get(f"/api/analyses/{analysis_id}/edit", headers=auth()).json()["suggestions"]

    assert suggestions[0]["reason"] == "dead_start" and suggestions[0]["memory"] == "accept"


def test_without_memory_the_analysis_is_what_it_always_was(client, fake_db, fake_ai, sample_video):
    # mesmo que a IA escreva uma nota de memória, sem memória ela não aparece
    fake_ai.responses = [r for r in fake_ai.responses if not isinstance(r, Copilot)] + [sample_copilot(memory_note="Lembrei que você gosta de cortes")]

    analysis_id = analysed(client, fake_db, sample_video)

    assert "creator_memory" not in sent_text(copilot_call(fake_ai))
    result = client.get(f"/api/analyses/{analysis_id}", headers=auth()).json()["result"]
    assert "memory" not in result and result["copilot"]["memory_note"] is None
    suggestions = client.get(f"/api/analyses/{analysis_id}/edit", headers=auth()).json()["suggestions"]
    assert all(s["memory"] is None for s in suggestions)


def test_a_paused_memory_is_not_used(client, fake_db, fake_ai, sample_video):
    add_note(client, "Não corte minhas pausas dramáticas")
    paused = client.put("/api/me/memory", json={"enabled": False}, headers=auth())
    assert paused.status_code == 200 and paused.json()["enabled"] is False

    analysis_id = analysed(client, fake_db, sample_video)

    assert "creator_memory" not in sent_text(copilot_call(fake_ai))
    assert "memory" not in client.get(f"/api/analyses/{analysis_id}", headers=auth()).json()["result"]
    # pausar não apaga: as notas continuam lá para quando ligar de novo
    assert memory(client)["notes"][0]["text"] == "Não corte minhas pausas dramáticas"


def test_the_first_analysis_teaches_the_next_one(client, fake_db, fake_ai, sample_video):
    """O ciclo inteiro pela API: decidir os cortes de um vídeo muda como o próximo chega."""
    first = analysed(client, fake_db, sample_video)
    for _ in range(3):
        # três vídeos em que a pessoa recusou o corte do começo parado
        client.put(f"/api/analyses/{first}/suggestions", json={"decisions": [{"index": 0, "decision": "rejected"}]}, headers=auth())
        seed_decisions(fake_db, ALICE, "dead_start", "rejected", 1)

    second = analysed(client, fake_db, sample_video)

    suggestions = client.get(f"/api/analyses/{second}/edit", headers=auth()).json()["suggestions"]
    assert suggestions[0]["reason"] == "dead_start" and suggestions[0]["memory"] == "reject"
    # e a trajetória já conta o primeiro vídeo
    assert memory(client)["stats"]["analyses"] == 2


def test_guests_have_no_memory():
    assert memory_service.for_analysis(None) == (None, None)


def test_the_revision_of_the_edited_video_uses_the_memory(client, fake_db, fake_ai, sample_video):
    add_note(client, "Eu gosto de vídeo enxuto")
    seed_request(fake_db, ALICE, "Corta mais a introdução", when=OLD)
    analysis_id = analysed(client, fake_db, sample_video)
    assert client.post(f"/api/analyses/{analysis_id}/edit", json={"cuts": [{"start_seconds": 3.5, "end_seconds": 6.0}]}, headers=auth()).status_code == 202
    fake_ai.responses.append(EditRevision(can_apply=True, cuts=[{"start_seconds": 0.0, "end_seconds": 2.6}], reply="Tirei a abertura."))
    pedido = "Tira o começo também"

    resposta = client.post(f"/api/analyses/{analysis_id}/edit/feedback", json={"rating": "disliked", "note": pedido, "ui_locale": "pt-BR"}, headers=auth())

    assert resposta.status_code == 200, resposta.text
    call = next(c for c in fake_ai.calls if c["config"].response_schema is EditRevision)
    text = sent_text(call)
    assert "creator_memory" in text and "Eu gosto de vídeo enxuto" in text and "Corta mais a introdução" in text
    # o pedido de agora vai como pedido, não repetido como "anterior"
    assert text.count(pedido) == 1


def test_the_memory_events_are_known_to_the_funnel(client, fake_db):
    memory(client)
    add_note(client, "Eu falo rápido")
    client.put("/api/me/memory", json={"enabled": False}, headers=auth())
    client.post("/api/me/memory/forget", headers=auth())
    names = [e["name"] for e in fake_db.events]
    assert {"memory_viewed", "memory_note_added", "memory_toggled", "memory_forgotten"} <= set(names)


def test_the_browser_may_send_what_teaches_the_memory(client):
    """O site grava as decisões dos cortes com PUT e apaga notas com DELETE, de outro domínio:
    sem esses métodos no CORS, o navegador barra o pedido e a memória nunca recebe nada."""
    for method in ("PUT", "DELETE"):
        preflight = client.options(
            "/api/analyses/x/suggestions",
            headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": method, "Access-Control-Request-Headers": "authorization,content-type"},
        )
        assert preflight.status_code == 200, (method, preflight.text)


def test_the_ai_only_keeps_a_memory_note_when_it_had_memory(env, fake_ai):
    # uma resposta por chamada: a primeira é ajustada no lugar
    fake_ai.responses = [sample_copilot(memory_note="Você prefere cortes curtos."), sample_copilot(memory_note="Você prefere cortes curtos.")]
    base = {"language": "pt", "duration_seconds": 10.0, "transcript": []}

    assert ai_service.copilot(base, []).memory_note is None
    assert ai_service.copilot({**base, "creator_memory": {"creator_notes": ["cortes curtos"]}}, []).memory_note == "Você prefere cortes curtos."
