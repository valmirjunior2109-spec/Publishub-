""""Essa análise foi útil?" e o número da análise no evento de análise pronta.

A resposta fica numa linha por análise e por pessoa (responder de novo
substitui); o "o que faltou" só é guardado quando a análise não foi útil. O
evento leva só se houve texto, nunca o texto.
"""

from tests.conftest import ALICE, BOB, auth, register, upload, upload_image


def analyse(client, fake_db, video: bytes) -> str:
    created = register(client, fake_db, "alice-token", upload(fake_db, ALICE, video), upload_image(fake_db, ALICE))
    assert created.status_code == 201, created.text
    return created.json()["analysis"]["id"]


def test_useful_feedback_is_stored_once_per_analysis(client, fake_db, fake_ai, sample_video):
    analysis_id = analyse(client, fake_db, sample_video)

    first = client.post(f"/api/analyses/{analysis_id}/feedback", json={"useful": True}, headers=auth())
    assert first.status_code == 200, first.text
    assert first.json() == {"useful": True, "missing": None}

    # mudou de ideia: a mesma linha, agora com o que faltou
    second = client.post(f"/api/analyses/{analysis_id}/feedback", json={"useful": False, "missing": "  Queria saber o que mudar no meio.  "}, headers=auth())
    assert second.json() == {"useful": False, "missing": "Queria saber o que mudar no meio."}

    rows = list(fake_db.analysis_feedback.values())
    assert len(rows) == 1 and rows[0]["user_id"] == ALICE["id"] and rows[0]["useful"] is False


def test_missing_text_is_dropped_when_the_analysis_was_useful(client, fake_db, fake_ai, sample_video):
    analysis_id = analyse(client, fake_db, sample_video)
    body = client.post(f"/api/analyses/{analysis_id}/feedback", json={"useful": True, "missing": "nada"}, headers=auth()).json()
    assert body["missing"] is None


def test_feedback_event_never_carries_the_text(client, fake_db, fake_ai, sample_video):
    analysis_id = analyse(client, fake_db, sample_video)
    client.post(f"/api/analyses/{analysis_id}/feedback", json={"useful": False, "missing": "faltou o ritmo"}, headers=auth())

    event = next(e for e in fake_db.events if e["name"] == "analysis_feedback")
    assert event["props"] == {"useful": False, "has_note": True}
    assert "faltou o ritmo" not in str(event)


def test_another_account_cannot_rate_the_analysis(client, fake_db, fake_ai, sample_video):
    analysis_id = analyse(client, fake_db, sample_video)
    response = client.post(f"/api/analyses/{analysis_id}/feedback", json={"useful": True}, headers=auth("bob-token"))
    assert response.status_code == 404
    assert not fake_db.analysis_feedback
    assert BOB["id"] not in str(fake_db.analysis_feedback)


def test_analysis_completed_says_which_analysis_of_the_account_it_is(client, fake_db, fake_ai, sample_video):
    analyse(client, fake_db, sample_video)
    analyse(client, fake_db, sample_video)

    numbers = [e["props"].get("analysis_number") for e in fake_db.events if e["name"] == "analysis_completed"]
    assert numbers == [1, 2]
