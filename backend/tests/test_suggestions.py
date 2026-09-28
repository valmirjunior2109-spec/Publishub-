"""A IA sugere, o criador decide: aceitar, rejeitar, ajustar e desfazer cada corte sugerido.

As decisões ficam guardadas (a revisão volta como o criador deixou) e viram as
preferências da conta. Guardar é bom, mas não é o que a pessoa veio fazer: sem a
tabela (migração pendente), a revisão continua e só a decisão não fica guardada.
"""

from app.core.config import get_settings
from tests.conftest import ALICE, auth, register, upload, upload_image

# a análise de exemplo sugere um corte: a pausa entre 3,5s e 6s (kind "pacing")
SUGGESTION = {"start_seconds": 3.5, "end_seconds": 6.0}


def analysed(client, fake_db, sample_video) -> str:
    created = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE))
    assert created.status_code == 201, created.text
    return created.json()["analysis"]["id"]


def decide(client, analysis_id, decisions, token="alice-token"):
    return client.put(f"/api/analyses/{analysis_id}/suggestions", json={"decisions": decisions}, headers=auth(token))


def review(client, analysis_id):
    return client.get(f"/api/analyses/{analysis_id}/edit", headers=auth()).json()


def test_a_fresh_analysis_has_suggestions_and_no_decisions(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)
    body = review(client, analysis_id)
    assert body["suggested"] == [SUGGESTION]
    assert body["decisions"] == [] and body["edit"] is None  # nada decidido, nada cortado


def test_accepting_and_rejecting_is_stored_and_comes_back(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)

    accepted = decide(client, analysis_id, [{"index": 0, "decision": "accepted"}])
    assert accepted.status_code == 200 and accepted.json() == {"saved": True}
    assert review(client, analysis_id)["decisions"] == [{"index": 0, "decision": "accepted", "adjusted": False, **SUGGESTION}]
    [row] = fake_db.suggestion_decisions.values()
    assert row["kind"] == "pacing" and row["user_id"] == ALICE["id"]

    # mudar de ideia substitui a decisão, não acumula
    decide(client, analysis_id, [{"index": 0, "decision": "rejected"}])
    assert [d["decision"] for d in review(client, analysis_id)["decisions"]] == ["rejected"]
    assert len(fake_db.suggestion_decisions) == 1
    # e decidir não corta nada: o vídeo só sai quando o criador aplica
    assert review(client, analysis_id)["edit"] is None


def test_an_adjusted_cut_keeps_the_new_range(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)

    decide(client, analysis_id, [{"index": 0, "decision": "accepted", "start_seconds": 4.0, "end_seconds": 5.6}])

    [decision] = review(client, analysis_id)["decisions"]
    assert decision == {"index": 0, "decision": "accepted", "adjusted": True, "start_seconds": 4.0, "end_seconds": 5.6}
    [row] = fake_db.suggestion_decisions.values()
    # o trecho sugerido fica guardado ao lado do ajustado: é a diferença que ensina
    assert (row["start_seconds"], row["end_seconds"], row["adjusted_start"], row["adjusted_end"]) == (3.5, 6.0, 4.0, 5.6)


def test_the_same_range_is_not_an_adjustment(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)
    decide(client, analysis_id, [{"index": 0, "decision": "accepted", **SUGGESTION}])
    assert review(client, analysis_id)["decisions"][0]["adjusted"] is False


def test_pending_undoes_the_decision(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)
    decide(client, analysis_id, [{"index": 0, "decision": "accepted"}])

    undone = decide(client, analysis_id, [{"index": 0, "decision": "pending"}])

    assert undone.status_code == 200 and review(client, analysis_id)["decisions"] == []
    assert fake_db.suggestion_decisions == {}


def test_bad_decisions_are_refused(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)
    # uma sugestão que não existe nesta análise
    unknown = decide(client, analysis_id, [{"index": 1, "decision": "accepted"}])
    assert unknown.status_code == 422 and unknown.json()["error"]["code"] == "UNKNOWN_SUGGESTION"
    # um trecho curto demais ou além do fim do vídeo (8s)
    tiny = decide(client, analysis_id, [{"index": 0, "decision": "accepted", "start_seconds": 4.0, "end_seconds": 4.1}])
    assert tiny.status_code == 422 and tiny.json()["error"]["code"] == "INVALID_RANGE"
    beyond = decide(client, analysis_id, [{"index": 0, "decision": "accepted", "start_seconds": 4.0, "end_seconds": 9.5}])
    assert beyond.status_code == 422 and beyond.json()["error"]["code"] == "INVALID_RANGE"
    # uma decisão que não é aceitar, rejeitar nem desfazer
    assert decide(client, analysis_id, [{"index": 0, "decision": "maybe"}]).status_code == 422
    assert fake_db.suggestion_decisions == {}


def test_decisions_belong_to_the_owner(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)
    assert decide(client, analysis_id, [{"index": 0, "decision": "accepted"}], token="bob-token").status_code == 404
    assert fake_db.suggestion_decisions == {}


def test_a_partial_analysis_has_no_suggestions_to_decide(client, fake_db, fake_ai, sample_video, env):
    env.setenv("STRIPE_SECRET_KEY", "sk_test_x")
    env.setenv("STRIPE_WEBHOOK_SECRET", "whsec_x")
    env.setenv("FREE_FULL_ANALYSES", "1")
    get_settings.cache_clear()

    analysed(client, fake_db, sample_video)  # a de cortesia, completa
    partial = analysed(client, fake_db, sample_video)

    refused = decide(client, partial, [{"index": 0, "decision": "accepted"}])
    assert refused.status_code == 402 and fake_db.suggestion_decisions == {}


def test_without_the_table_the_review_keeps_working(client, fake_db, fake_ai, sample_video):
    """A migração ainda não rodou: a decisão não fica guardada, mas nada quebra."""
    analysis_id = analysed(client, fake_db, sample_video)
    fake_db.decisions_table_missing = True

    saved = decide(client, analysis_id, [{"index": 0, "decision": "accepted"}])
    assert saved.status_code == 200 and saved.json() == {"saved": False}
    body = review(client, analysis_id)
    assert body["decisions"] == [] and body["suggested"] == [SUGGESTION]
    assert client.get("/api/me/preferences", headers=auth()).json() == {"available": False, "total": 0, "by_kind": {}}
    # e aplicar os cortes continua gerando o vídeo
    assert client.post(f"/api/analyses/{analysis_id}/edit", json={"cuts": [SUGGESTION]}, headers=auth()).status_code == 202


def test_preferences_summarise_what_the_creator_decides(client, fake_db, fake_ai, sample_video):
    first = analysed(client, fake_db, sample_video)
    second = analysed(client, fake_db, sample_video)
    third = analysed(client, fake_db, sample_video)

    decide(client, first, [{"index": 0, "decision": "accepted"}])
    decide(client, second, [{"index": 0, "decision": "accepted", "start_seconds": 4.0, "end_seconds": 6.0}])
    decide(client, third, [{"index": 0, "decision": "rejected"}])

    prefs = client.get("/api/me/preferences", headers=auth()).json()
    assert prefs["available"] is True and prefs["total"] == 3
    assert prefs["by_kind"] == {"pacing": {"accepted": 2, "rejected": 1, "adjusted": 1, "acceptance_rate": 0.67}}
    # de outra pessoa, nada
    assert client.get("/api/me/preferences", headers=auth("bob-token")).json()["total"] == 0


def test_the_second_video_of_the_account_is_reported(client, fake_db, fake_ai, sample_video):
    analysed(client, fake_db, sample_video)
    assert not [e for e in fake_db.events if e["name"] == "second_video_uploaded"]

    second = analysed(client, fake_db, sample_video)
    analysed(client, fake_db, sample_video)  # o terceiro não é o segundo

    [event] = [e for e in fake_db.events if e["name"] == "second_video_uploaded"]
    assert event["analysis_id"] == second and event["user_id"] == ALICE["id"]


def test_the_review_events_are_known_to_the_funnel(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)
    for name in ("suggestion_viewed", "suggestion_accepted", "suggestion_rejected", "suggestion_edited", "video_exported"):
        r = client.post("/api/events", json={"name": name, "analysis_id": analysis_id, "props": {"index": 0}}, headers=auth())
        assert r.status_code == 202 and r.json()["recorded"] is True, name
