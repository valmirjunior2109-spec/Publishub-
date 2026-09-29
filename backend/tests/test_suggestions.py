"""A IA sugere, o criador decide: aceitar, rejeitar, ajustar, criar e desfazer cada corte.

As sugestões juntam o que a IA apontou com o que foi medido (pausas, recomeços,
hesitações), sem sobreposição e com uma confiança que vem de sinais medidos. As
decisões ficam guardadas (a revisão volta como o criador deixou) e viram as
preferências da conta. Guardar é bom, mas não é o que a pessoa veio fazer: sem a
tabela (migração pendente), a revisão continua e só a decisão não fica guardada.
"""

from app.core.config import get_settings
from app.services import cut_suggestions
from tests.conftest import ALICE, auth, register, upload, upload_image

# o vídeo de exemplo: 1,5s de silêncio no começo (medido) e a pausa de 3,5s a 6s,
# que a IA sugere cortar e o ffmpeg confirma
DEAD_START = {"start_seconds": 0.0, "end_seconds": 1.41}
PAUSE = {"start_seconds": 3.5, "end_seconds": 6.0}
I_DEAD, I_PAUSE = 0, 1


def analysed(client, fake_db, sample_video) -> str:
    created = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE))
    assert created.status_code == 201, created.text
    return created.json()["analysis"]["id"]


def decide(client, analysis_id, decisions, token="alice-token"):
    return client.put(f"/api/analyses/{analysis_id}/suggestions", json={"decisions": decisions}, headers=auth(token))


def review(client, analysis_id):
    return client.get(f"/api/analyses/{analysis_id}/edit", headers=auth()).json()


# ---------------------------------------------------------------- as sugestões


def test_suggestions_join_the_ai_and_the_measurements_without_overlap(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)
    body = review(client, analysis_id)

    assert body["suggested"] == [DEAD_START, PAUSE]
    dead, pause = body["suggestions"]
    # o silêncio do começo, medido: confiança alta, com o quanto é silêncio
    assert dead["index"] == I_DEAD and dead["reason"] == "dead_start" and dead["source"] == "measured"
    assert dead["confidence"] == "high" and dead["evidence"]["silence_pct"] >= 90
    # a IA e a pausa medida apontaram o mesmo trecho: um card só, o da IA, com o texto dela
    assert pause["index"] == I_PAUSE and pause["source"] == "ai" and pause["reason"] == "pacing"
    assert pause["merged"] == ["long_pause"] and pause["title"] == "Encurte a pausa dos 3,5s"
    assert pause["confidence"] == "high"
    assert body["decisions"] == [] and body["edit"] is None  # nada decidido, nada cortado


def test_retakes_and_hesitations_are_found_in_the_transcript():
    result = {
        "signals": {"duration_seconds": 20.0, "silences": [{"start": 17.5, "end": 20.0}]},
        "transcript": [
            {"start_seconds": 0.0, "end_seconds": 2.0, "text": "Hoje eu vou te mostrar"},
            {"start_seconds": 2.2, "end_seconds": 6.0, "text": "Hoje eu vou te mostrar como editar mais rápido."},
            {"start_seconds": 6.0, "end_seconds": 7.2, "text": "É... hum..."},
            {"start_seconds": 7.2, "end_seconds": 12.0, "text": "Isso aqui muda tudo."},
        ],
        "copilot": {"recommendations": []},
    }
    cuts = cut_suggestions.build(result, 20.0)
    assert [(c["reason"], c["start_seconds"], c["end_seconds"], c["confidence"]) for c in cuts] == [
        ("repetition", 0.0, 2.2, "high"),  # o recomeço: a frase dita de novo, inteira, logo depois
        ("hesitation", 6.0, 7.2, "medium"),  # só "é… hum…": sem medida de áudio, confiança média
        ("dead_end", 17.6, 20.0, "high"),  # 2,5s parados depois da última fala
    ]


def test_ai_only_cuts_that_remove_speech_are_not_high_confidence():
    result = {
        "signals": {"duration_seconds": 10.0, "silences": []},
        "transcript": [{"start_seconds": 0.0, "end_seconds": 10.0, "text": "Uma frase longa sem pausa nenhuma no meio dela."}],
        "copilot": {"recommendations": [
            {"kind": "cut", "at_seconds": 2.0, "end_seconds": 4.0, "title": "Tire a explicação", "impact": 8},
            {"kind": "cut", "at_seconds": 6.0, "end_seconds": 7.0, "title": "Tire o detalhe", "impact": 4},
        ]},
    }
    cuts = cut_suggestions.build(result, 10.0)
    # só a IA, tirando fala, sem medida que confirme: vale o peso que ela deu, nunca "alta"
    assert [c["confidence"] for c in cuts] == ["medium", "low"]
    assert all(c["evidence"] == {"silence_pct": 0, "speech_pct": 100} for c in cuts)


# ---------------------------------------------------------------- as decisões


def test_accepting_and_rejecting_is_stored_and_comes_back(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)

    accepted = decide(client, analysis_id, [{"index": I_PAUSE, "decision": "accepted"}])
    assert accepted.status_code == 200 and accepted.json() == {"saved": True}
    assert review(client, analysis_id)["decisions"] == [{"index": I_PAUSE, "decision": "accepted", "adjusted": False, "manual": False, **PAUSE}]
    [row] = fake_db.suggestion_decisions.values()
    # o motivo fica na decisão: é ele que forma as preferências
    assert row["kind"] == "pacing" and row["user_id"] == ALICE["id"]

    # mudar de ideia substitui a decisão, não acumula
    decide(client, analysis_id, [{"index": I_PAUSE, "decision": "rejected"}])
    assert [d["decision"] for d in review(client, analysis_id)["decisions"]] == ["rejected"]
    assert len(fake_db.suggestion_decisions) == 1
    # e decidir não corta nada: o vídeo só sai quando o criador aplica
    assert review(client, analysis_id)["edit"] is None


def test_accept_all_in_one_request(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)
    decide(client, analysis_id, [{"index": I_DEAD, "decision": "accepted"}, {"index": I_PAUSE, "decision": "accepted"}])
    assert [d["decision"] for d in review(client, analysis_id)["decisions"]] == ["accepted", "accepted"]


def test_an_adjusted_cut_keeps_the_new_range(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)

    decide(client, analysis_id, [{"index": I_PAUSE, "decision": "accepted", "start_seconds": 4.0, "end_seconds": 5.6}])

    [decision] = review(client, analysis_id)["decisions"]
    assert decision == {"index": I_PAUSE, "decision": "accepted", "adjusted": True, "manual": False, "start_seconds": 4.0, "end_seconds": 5.6}
    [row] = fake_db.suggestion_decisions.values()
    # o trecho sugerido fica guardado ao lado do ajustado: é a diferença que ensina
    assert (row["start_seconds"], row["end_seconds"], row["adjusted_start"], row["adjusted_end"]) == (3.5, 6.0, 4.0, 5.6)


def test_the_same_range_is_not_an_adjustment(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)
    decide(client, analysis_id, [{"index": I_PAUSE, "decision": "accepted", **PAUSE}])
    assert review(client, analysis_id)["decisions"][0]["adjusted"] is False


def test_pending_undoes_the_decision(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)
    decide(client, analysis_id, [{"index": I_PAUSE, "decision": "accepted"}])

    undone = decide(client, analysis_id, [{"index": I_PAUSE, "decision": "pending"}])

    assert undone.status_code == 200 and review(client, analysis_id)["decisions"] == []
    assert fake_db.suggestion_decisions == {}


def test_a_manual_cut_is_stored_and_removed(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)

    added = decide(client, analysis_id, [{"index": 60, "decision": "accepted", "start_seconds": 6.5, "end_seconds": 7.5}])

    assert added.status_code == 200
    assert review(client, analysis_id)["decisions"] == [{"index": 60, "decision": "accepted", "adjusted": False, "manual": True, "start_seconds": 6.5, "end_seconds": 7.5}]
    assert next(iter(fake_db.suggestion_decisions.values()))["kind"] == "manual"
    # um corte à mão precisa de começo e fim, e só existe aceito
    assert decide(client, analysis_id, [{"index": 61, "decision": "accepted"}]).status_code == 422
    assert decide(client, analysis_id, [{"index": 61, "decision": "rejected", "start_seconds": 1, "end_seconds": 2}]).status_code == 422
    # tirar o corte à mão é voltá-lo para pendente
    decide(client, analysis_id, [{"index": 60, "decision": "pending"}])
    assert review(client, analysis_id)["decisions"] == []


def test_a_stale_decision_never_lands_on_another_cut(client, fake_db, fake_ai, sample_video):
    """A lista de sugestões mudou (um detector novo): a decisão velha não vale para o corte novo."""
    analysis_id = analysed(client, fake_db, sample_video)
    decide(client, analysis_id, [{"index": I_PAUSE, "decision": "accepted"}])
    row = next(iter(fake_db.suggestion_decisions.values()))
    row["start_seconds"], row["end_seconds"] = 5.0, 7.0  # como se naquela posição houvesse outro trecho

    assert review(client, analysis_id)["decisions"] == []


def test_bad_decisions_are_refused(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)
    # uma sugestão que não existe nesta análise
    unknown = decide(client, analysis_id, [{"index": 2, "decision": "accepted"}])
    assert unknown.status_code == 422 and unknown.json()["error"]["code"] == "UNKNOWN_SUGGESTION"
    # um trecho curto demais ou além do fim do vídeo (8s)
    tiny = decide(client, analysis_id, [{"index": I_PAUSE, "decision": "accepted", "start_seconds": 4.0, "end_seconds": 4.1}])
    assert tiny.status_code == 422 and tiny.json()["error"]["code"] == "INVALID_RANGE"
    beyond = decide(client, analysis_id, [{"index": I_PAUSE, "decision": "accepted", "start_seconds": 4.0, "end_seconds": 9.5}])
    assert beyond.status_code == 422 and beyond.json()["error"]["code"] == "INVALID_RANGE"
    # uma decisão que não é aceitar, rejeitar nem desfazer
    assert decide(client, analysis_id, [{"index": I_PAUSE, "decision": "maybe"}]).status_code == 422
    assert fake_db.suggestion_decisions == {}


def test_decisions_belong_to_the_owner(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)
    assert decide(client, analysis_id, [{"index": I_PAUSE, "decision": "accepted"}], token="bob-token").status_code == 404
    assert fake_db.suggestion_decisions == {}


def test_a_partial_analysis_has_no_suggestions_to_decide(client, fake_db, fake_ai, sample_video, env):
    env.setenv("STRIPE_SECRET_KEY", "sk_test_x")
    env.setenv("STRIPE_WEBHOOK_SECRET", "whsec_x")
    env.setenv("FREE_FULL_ANALYSES", "1")
    get_settings.cache_clear()

    analysed(client, fake_db, sample_video)  # a de cortesia, completa
    partial = analysed(client, fake_db, sample_video)

    refused = decide(client, partial, [{"index": I_PAUSE, "decision": "accepted"}])
    assert refused.status_code == 402 and fake_db.suggestion_decisions == {}
    assert review(client, partial)["suggestions"] == []  # o card não vaza o plano bloqueado


def test_without_the_table_the_review_keeps_working(client, fake_db, fake_ai, sample_video):
    """A migração ainda não rodou: a decisão não fica guardada, mas nada quebra."""
    analysis_id = analysed(client, fake_db, sample_video)
    fake_db.decisions_table_missing = True

    saved = decide(client, analysis_id, [{"index": I_PAUSE, "decision": "accepted"}])
    assert saved.status_code == 200 and saved.json() == {"saved": False}
    body = review(client, analysis_id)
    assert body["decisions"] == [] and body["suggested"] == [DEAD_START, PAUSE]
    assert client.get("/api/me/preferences", headers=auth()).json() == {"available": False, "total": 0, "by_type": {}, "preferences": {}}
    # e aplicar os cortes continua gerando o vídeo
    assert client.post(f"/api/analyses/{analysis_id}/edit", json={"cuts": [PAUSE]}, headers=auth()).status_code == 202


# ---------------------------------------------------------------- as preferências


def test_preferences_summarise_what_the_creator_decides(client, fake_db, fake_ai, sample_video):
    ids = [analysed(client, fake_db, sample_video) for _ in range(3)]

    decide(client, ids[0], [{"index": I_PAUSE, "decision": "accepted"}, {"index": I_DEAD, "decision": "accepted"}])
    decide(client, ids[1], [{"index": I_PAUSE, "decision": "accepted", "start_seconds": 4.0, "end_seconds": 6.0}, {"index": I_DEAD, "decision": "accepted"}])
    decide(client, ids[2], [{"index": I_PAUSE, "decision": "rejected"}, {"index": I_DEAD, "decision": "accepted"}])

    prefs = client.get("/api/me/preferences", headers=auth()).json()
    assert prefs["available"] is True and prefs["total"] == 6
    assert prefs["by_type"]["pacing"] == {"accepted": 2, "rejected": 1, "edited": 1, "acceptance_rate": 0.67}
    assert prefs["by_type"]["dead_start"] == {"accepted": 3, "rejected": 0, "edited": 0, "acceptance_rate": 1.0}
    # 5 de 6 aceitos; um ajuste só ainda não diz se prefere cortar menos: gosta de vídeo enxuto
    assert prefs["preferences"]["aggressive_cuts"] is True
    assert prefs["preferences"]["trim_dead_air"] is True
    # sem decisões suficientes daquele tipo, a preferência fica em aberto: nada de chute
    assert prefs["preferences"]["remove_filler_words"] is None and prefs["preferences"]["remove_long_pauses"] is None
    # de outra pessoa, nada
    assert client.get("/api/me/preferences", headers=auth("bob-token")).json()["total"] == 0


# ---------------------------------------------------------------- o funil


def test_the_second_video_of_the_account_is_reported(client, fake_db, fake_ai, sample_video):
    analysed(client, fake_db, sample_video)
    assert not [e for e in fake_db.events if e["name"] == "second_video_uploaded"]

    second = analysed(client, fake_db, sample_video)
    analysed(client, fake_db, sample_video)  # o terceiro não é o segundo

    [event] = [e for e in fake_db.events if e["name"] == "second_video_uploaded"]
    assert event["analysis_id"] == second and event["user_id"] == ALICE["id"]


def test_suggestions_generated_counts_the_cuts_to_review(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)
    [event] = [e for e in fake_db.events if e["name"] == "suggestions_generated"]
    assert event["analysis_id"] == analysis_id and event["props"] == {"count": 2, "high": 2, "medium": 0, "low": 0}


def test_the_review_events_are_known_to_the_funnel(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)
    names = ("suggestion_viewed", "suggestion_previewed", "suggestion_accepted", "suggestion_rejected", "suggestion_edited", "accept_all_clicked", "reject_all_clicked", "video_exported")
    for name in names:
        r = client.post("/api/events", json={"name": name, "analysis_id": analysis_id, "props": {"index": 0}}, headers=auth())
        assert r.status_code == 202 and r.json()["recorded"] is True, name
