"""A auditoria grátis (/tools/video-audit): sai da análise pronta, sem IA a mais, e sem o que é pago."""

from app.services import analysis_service
from tests.conftest import sample_copilot
from tests.test_guest import analyse_as_guest, blind_ai  # noqa: F401 (fixture)


def test_a_guest_gets_the_audit_with_the_top_three_and_nothing_paid(client, fake_db, blind_ai, sample_video):
    headers, analysis_id = analyse_as_guest(client, fake_db, sample_video)
    body = client.get(f"/api/analyses/{analysis_id}", headers=headers).json()
    assert body["status"] == "completed", body["error_message"]

    audit = body["audit"]
    assert audit["overall_score"] == 8
    assert audit["hook"] == {"score": 6, "note": "Começa direto, mas sem prometer o resultado."}
    assert audit["pace"]["value"] == "lento"
    status = {d["key"]: d["status"] for d in audit["dimensions"]}
    # gancho com impacto 9 é prioridade; ritmo (impacto 6, e lento) e legenda (5) pedem atenção; o resto está ok
    assert status == {"hook": "priority", "pacing": "attention", "structure": "ok", "captions": "attention", "visuals": "ok", "cta": "ok"}
    assert [t["title"] for t in audit["top"]] == ["Abra com o resultado, não com o contexto", "Encurte a pausa dos 3,5s", "Ponha o número na tela"]
    assert audit["remaining"] == 0
    # só o título, o porquê e o segundo: a instrução de cada mudança continua no plano pago
    assert all(set(item) == {"kind", "at_seconds", "end_seconds", "title", "why"} for item in audit["top"])
    for pago in ("Troque os 3 primeiros segundos", "30 dias sem café", "Encurte a pausa do 3,5s e coloque"):
        assert pago not in str(audit)
    assert set(audit["measured"]) == {"duration_seconds", "pauses", "longest_pause_seconds", "silence_start_seconds", "silence_end_seconds", "scene_changes"}


def test_the_measured_facts_come_from_the_file_signals():
    result = {
        "copilot": sample_copilot().model_dump(),
        "signals": {
            "duration_seconds": 10.0,
            "silences": [{"start": 0.0, "end": 0.8}, {"start": 2.0, "end": 2.7}, {"start": 5.0, "end": 5.3}, {"start": 9.6, "end": 10.0}],
            "scene_cuts": [1.5, 4.0, 7.2],
        },
    }
    assert analysis_service.build_audit(result)["measured"] == {
        "duration_seconds": 10.0,
        "pauses": 1,  # a de 0,3 s é curta demais para contar
        "longest_pause_seconds": 0.7,
        "silence_start_seconds": 0.8,
        "silence_end_seconds": 0.4,
        "scene_changes": 3,
    }


def test_a_weak_hook_is_a_priority_even_without_a_hook_suggestion():
    copilot = sample_copilot(hook_score=3, pace="bom", recommendations=[]).model_dump()
    audit = analysis_service.build_audit({"copilot": copilot, "signals": {}})
    status = {d["key"]: d["status"] for d in audit["dimensions"]}
    assert status["hook"] == "priority" and status["pacing"] == "ok"
    assert audit["top"] == [] and audit["remaining"] == 0


def test_no_audit_without_the_copilot():
    assert analysis_service.build_audit(None) is None
    assert analysis_service.build_audit({"copilot": None}) is None


def test_more_suggestions_than_the_top_are_only_counted():
    base = sample_copilot().model_dump()["recommendations"]
    many = [{**base[1], "title": f"Mudança {n}", "impact": 9 - n} for n in range(6)]
    audit = analysis_service.build_audit({"copilot": {**sample_copilot().model_dump(), "recommendations": many}, "signals": {}})
    assert len(audit["top"]) == 3 and audit["remaining"] == 3
    assert "Mudança 4" not in str(audit)
