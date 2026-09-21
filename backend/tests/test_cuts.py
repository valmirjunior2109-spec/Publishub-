"""Cortes: o Publishub sugere, o criador aprova, o backend gera um vídeo novo.

O original nunca é tocado — é o que mais importa aqui. Estes testes cortam com
ffmpeg de verdade sobre o vídeo de exemplo: cortar é a funcionalidade, não dá
para fingir.
"""

from tests.conftest import ALICE, auth, register, upload, upload_image


def analysed(client, fake_db, sample_video):
    created = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE))
    assert created.status_code == 201, created.text
    return created.json()["analysis"]["id"]


def test_the_plan_suggests_cuts_and_nothing_happens_until_approval(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)

    body = client.get(f"/api/analyses/{analysis_id}/edit", headers=auth()).json()
    assert body["edit"] is None  # nada foi aplicado
    # a sugestão vem do plano: só as recomendações que descrevem um trecho
    assert body["suggested"] == [{"start_seconds": 3.5, "end_seconds": 6.0}]
    assert len(fake_db.objects) == 1  # o original continua sozinho no Storage


def test_approving_cuts_produces_a_new_video_and_keeps_the_original(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)
    original = {path: obj["data"] for path, obj in fake_db.objects.items()}

    asked = client.post(
        f"/api/analyses/{analysis_id}/edit",
        json={"cuts": [{"start_seconds": 0.0, "end_seconds": 1.5}, {"start_seconds": 3.5, "end_seconds": 6.0}]},
        headers=auth(),
    )
    assert asked.status_code == 202, asked.text
    assert asked.json()["edit"]["status"] == "pending"

    # o TestClient roda o background antes de devolver: a edição já terminou
    edit = client.get(f"/api/analyses/{analysis_id}/edit", headers=auth()).json()["edit"]
    assert edit["status"] == "completed", edit.get("error_code")
    assert edit["removed_seconds"] == 4.0
    assert edit["original_duration_seconds"] == 8.0
    assert 3.5 < edit["duration_seconds"] < 4.5  # sobraram ~4s dos 8
    assert edit["kept"] == [{"start_seconds": 1.5, "end_seconds": 3.5}, {"start_seconds": 6.0, "end_seconds": 8.0}]

    # o editado é outro arquivo, na pasta do dono, e dá para assistir e baixar
    assert edit["download_url"].startswith("https://")
    novos = set(fake_db.objects) - set(original)
    assert len(novos) == 1 and next(iter(novos)).startswith(f"{ALICE['id']}/edits/")
    assert edit["size_bytes"] == fake_db.objects[next(iter(novos))]["size"]
    # e o original continua byte a byte igual
    assert {path: obj["data"] for path, obj in fake_db.objects.items() if path in original} == original


def test_reapplying_cuts_replaces_the_previous_edit(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)
    client.post(f"/api/analyses/{analysis_id}/edit", json={"cuts": [{"start_seconds": 0.0, "end_seconds": 1.5}]}, headers=auth())
    first = client.get(f"/api/analyses/{analysis_id}/edit", headers=auth()).json()["edit"]

    client.post(f"/api/analyses/{analysis_id}/edit", json={"cuts": [{"start_seconds": 3.5, "end_seconds": 6.0}]}, headers=auth())
    second = client.get(f"/api/analyses/{analysis_id}/edit", headers=auth()).json()["edit"]

    assert len(fake_db.video_edits) == 1  # uma edição por análise
    assert second["cuts"] == [{"start_seconds": 3.5, "end_seconds": 6.0}]
    assert second["removed_seconds"] == 2.5 and first["removed_seconds"] == 1.5


def test_cuts_that_would_eat_the_whole_video_are_refused(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)
    refused = client.post(
        f"/api/analyses/{analysis_id}/edit",
        json={"cuts": [{"start_seconds": 0.0, "end_seconds": 8.0}]},
        headers=auth(),
    )
    assert refused.status_code == 422 and refused.json()["error"]["code"] == "NOTHING_LEFT"
    assert fake_db.video_edits == {}  # nem chegou a criar edição


def test_a_request_without_cuts_is_rejected(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)
    assert client.post(f"/api/analyses/{analysis_id}/edit", json={"cuts": []}, headers=auth()).status_code == 422


def test_cuts_belong_to_the_owner(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)
    cut = {"cuts": [{"start_seconds": 0.0, "end_seconds": 1.5}]}
    assert client.post(f"/api/analyses/{analysis_id}/edit", json=cut, headers=auth("bob-token")).status_code == 404
    assert client.get(f"/api/analyses/{analysis_id}/edit", headers=auth("bob-token")).status_code == 404


def test_a_broken_render_fails_the_edit_without_touching_the_original(client, fake_db, fake_ai, sample_video, monkeypatch):
    from app.services import edit_service

    analysis_id = analysed(client, fake_db, sample_video)
    original = {path: obj["data"] for path, obj in fake_db.objects.items()}

    def breaks(*_args, **_kwargs):
        raise edit_service.InvalidVideoError("ffmpeg morreu no meio")

    monkeypatch.setattr(edit_service.video_editing, "render", breaks)
    client.post(f"/api/analyses/{analysis_id}/edit", json={"cuts": [{"start_seconds": 0.0, "end_seconds": 1.5}]}, headers=auth())

    edit = client.get(f"/api/analyses/{analysis_id}/edit", headers=auth()).json()["edit"]
    assert edit["status"] == "failed" and edit["error_code"] == "invalid_video"
    assert edit["download_url"] is None
    assert {path: obj["data"] for path, obj in fake_db.objects.items()} == original  # nada novo, nada alterado


def test_a_silent_video_can_be_cut_too(tmp_path, silent_video):
    """Sem faixa de áudio o filtro não pode pedir áudio: pela API não chega (a
    análise exige som), mas o render tem de aguentar."""
    from app.services import video_editing
    from app.services.video_processing import probe

    origem = tmp_path / "mudo.mp4"
    origem.write_bytes(silent_video)
    destino = tmp_path / "cortado.mp4"

    resultado = video_editing.render(origem, destino, [{"start_seconds": 0.0, "end_seconds": 1.0}], 4.0, has_audio=False)

    assert resultado["removed_seconds"] == 1.0
    assert 2.5 < resultado["duration_seconds"] < 3.5
    assert probe(destino).has_audio is False
    assert origem.read_bytes() == silent_video  # o original intacto


def test_an_interrupted_edit_does_not_stay_processing_forever(client, fake_db, fake_ai, sample_video):
    from app.services import edit_service

    analysis_id = analysed(client, fake_db, sample_video)
    fake_db.upsert_video_edit({"analysis_id": analysis_id, "user_id": ALICE["id"], "status": "processing", "cuts": []})

    edit_service.recover_interrupted()  # o que o boot faz

    edit = client.get(f"/api/analyses/{analysis_id}/edit", headers=auth()).json()["edit"]
    assert edit["status"] == "failed" and edit["error_code"] == "interrupted"
