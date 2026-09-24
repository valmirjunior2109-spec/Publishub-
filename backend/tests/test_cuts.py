"""O vídeo editado: a análise termina e o Publishub já entrega o vídeo cortado.

O criador diz se gostou; se não, o que escreve vira uma versão nova. E quem
preferir escolhe os cortes à mão. O original nunca é tocado — é o que mais importa aqui. Estes testes cortam com
ffmpeg de verdade sobre o vídeo de exemplo: cortar é a funcionalidade, não dá
para fingir.
"""

import pytest

from app.core.config import get_settings
from app.schemas.analysis import EditRevision
from tests.conftest import ALICE, auth, register, upload, upload_image


def analysed(client, fake_db, sample_video):
    created = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE))
    assert created.status_code == 201, created.text
    return created.json()["analysis"]["id"]


def edited_files(fake_db) -> set[str]:
    return {path for path in fake_db.objects if "/edits/" in path}


def test_the_edited_video_is_delivered_right_after_the_analysis(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)

    body = client.get(f"/api/analyses/{analysis_id}/edit", headers=auth()).json()
    # a sugestão vem do plano: só as recomendações que descrevem um trecho
    assert body["suggested"] == [{"start_seconds": 3.5, "end_seconds": 6.0}]
    # e o vídeo com esses cortes já saiu, sem ninguém pedir
    edit = body["edit"]
    assert edit["status"] == "completed", edit.get("error_code")
    assert edit["source"] == "auto" and edit["revision"] == 1
    assert edit["cuts"] == [{"start_seconds": 3.5, "end_seconds": 6.0}]
    assert edit["removed_seconds"] == 2.5
    assert edit["feedback"] is None  # a pergunta ainda está em aberto
    assert edit["download_url"].startswith("https://")
    # o editado é um arquivo a mais; o original continua lá
    assert len(fake_db.objects) == 2 and len(edited_files(fake_db)) == 1


def test_a_partial_analysis_gets_no_edited_video(client, fake_db, fake_ai, sample_video, env):
    """Passado o grátis, a análise sai sem os cortes: o vídeo cortado também não sai."""
    env.setenv("STRIPE_SECRET_KEY", "sk_test_x")
    env.setenv("STRIPE_WEBHOOK_SECRET", "whsec_x")
    env.setenv("FREE_FULL_ANALYSES", "1")
    get_settings.cache_clear()

    analysed(client, fake_db, sample_video)  # a de cortesia, completa
    partial = analysed(client, fake_db, sample_video)

    assert fake_db.get_video_edit(partial) is None
    assert len(edited_files(fake_db)) == 1  # só o da análise completa


def test_approving_cuts_produces_a_new_video_and_keeps_the_original(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)
    original = {path: obj["data"] for path, obj in fake_db.objects.items() if "/edits/" not in path}
    entregue = edited_files(fake_db)

    asked = client.post(
        f"/api/analyses/{analysis_id}/edit",
        json={"cuts": [{"start_seconds": 0.0, "end_seconds": 1.5}, {"start_seconds": 3.5, "end_seconds": 6.0}]},
        headers=auth(),
    )
    assert asked.status_code == 202, asked.text
    assert asked.json()["edit"]["status"] == "pending"
    assert asked.json()["edit"]["download_url"] is None  # a versão nova ainda não existe

    # o TestClient roda o background antes de devolver: a edição já terminou
    edit = client.get(f"/api/analyses/{analysis_id}/edit", headers=auth()).json()["edit"]
    assert edit["status"] == "completed", edit.get("error_code")
    assert edit["source"] == "manual" and edit["revision"] == 2
    assert edit["removed_seconds"] == 4.0
    assert edit["original_duration_seconds"] == 8.0
    assert 3.5 < edit["duration_seconds"] < 4.5  # sobraram ~4s dos 8
    assert edit["kept"] == [{"start_seconds": 1.5, "end_seconds": 3.5}, {"start_seconds": 6.0, "end_seconds": 8.0}]

    # o editado é outro arquivo, na pasta do dono, e dá para assistir e baixar
    assert edit["download_url"].startswith("https://")
    novos = edited_files(fake_db)
    assert len(novos) == 1 and next(iter(novos)).startswith(f"{ALICE['id']}/edits/")
    assert novos != entregue  # a versão anterior saiu do Storage
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
    # nem chegou a criar versão nova: o vídeo entregue continua o mesmo
    edit = fake_db.get_video_edit(analysis_id)
    assert edit["revision"] == 1 and edit["cuts"] == [{"start_seconds": 3.5, "end_seconds": 6.0}]


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


# ---------------------------------------------------------------- gostou do vídeo editado?


def feedback(client, analysis_id, rating, note=None, token="alice-token"):
    return client.post(f"/api/analyses/{analysis_id}/edit/feedback", json={"rating": rating, "note": note, "ui_locale": "pt-BR"}, headers=auth(token))


def test_liking_the_edited_video_is_recorded(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)
    chamadas = len(fake_ai.calls)

    resposta = feedback(client, analysis_id, "liked")

    assert resposta.status_code == 200, resposta.text
    assert resposta.json()["revision"] is None
    assert resposta.json()["edit"]["feedback"] == "liked"
    assert fake_db.edit_feedback[0]["rating"] == "liked" and fake_db.edit_feedback[0]["revision"] == 1
    assert len(fake_ai.calls) == chamadas  # gostou: nada para refazer, nenhuma IA chamada
    assert any(e["name"] == "edit_feedback" and e["props"]["rating"] == "liked" for e in fake_db.events)


def test_not_liking_it_asks_what_to_change(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)

    for nota in (None, "", "  "):
        recusado = feedback(client, analysis_id, "disliked", nota)
        assert recusado.status_code == 422 and recusado.json()["error"]["code"] == "FEEDBACK_NOTE_REQUIRED"
    assert fake_db.edit_feedback == []


def test_what_the_creator_would_change_becomes_a_new_version(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)
    entregue = edited_files(fake_db)
    fake_ai.responses.append(
        EditRevision(can_apply=True, cuts=[{"start_seconds": 0.0, "end_seconds": 2.6}], reply="Devolvi o trecho dos 3,5s aos 6s e tirei a abertura dos 0 aos 2,6s.")
    )
    pedido = "Não corta a parte do contexto, prefiro tirar o começo."

    resposta = feedback(client, analysis_id, "disliked", pedido)

    assert resposta.status_code == 200, resposta.text
    assert resposta.json()["revision"]["status"] == "started"
    assert "0 aos 2,6s" in resposta.json()["revision"]["reply"]
    # o pedido chegou à IA como foi escrito
    assert pedido in str(fake_ai.calls[-1]["contents"])

    # o background já rodou: a versão 2 está pronta, do jeito que foi pedido
    edit = client.get(f"/api/analyses/{analysis_id}/edit", headers=auth()).json()["edit"]
    assert edit["status"] == "completed", edit.get("error_code")
    assert edit["source"] == "revision" and edit["revision"] == 2
    assert edit["instruction"] == pedido
    assert edit["cuts"] == [{"start_seconds": 0.0, "end_seconds": 2.6}]
    assert edit["feedback"] is None  # versão nova, pergunta nova
    # a versão anterior saiu do Storage; o histórico do que foi dito, não
    assert len(edited_files(fake_db)) == 1 and edited_files(fake_db) != entregue
    assert [(f["revision"], f["rating"], f["note"]) for f in fake_db.edit_feedback] == [(1, "disliked", pedido)]
    assert fake_db.edit_feedback[0]["cuts"] == [{"start_seconds": 3.5, "end_seconds": 6.0}]


def test_a_request_that_cuts_cannot_solve_gets_an_honest_answer(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)
    entregue = edited_files(fake_db)
    fake_ai.responses.append(
        EditRevision(can_apply=False, cuts=[{"start_seconds": 3.5, "end_seconds": 6.0}], reply="Legenda eu ainda não coloco sozinho: no CapCut, use Legendas automáticas.")
    )

    resposta = feedback(client, analysis_id, "disliked", "Faltou legenda.")

    assert resposta.json()["revision"]["status"] == "not_applicable"
    edit = client.get(f"/api/analyses/{analysis_id}/edit", headers=auth()).json()["edit"]
    assert edit["revision"] == 1 and edit["feedback"] == "disliked"  # nenhuma versão fingida
    assert edit["reply"].startswith("Legenda")  # a resposta fica para quem voltar à página
    assert edited_files(fake_db) == entregue


def test_when_the_ai_is_down_the_request_is_kept(client, fake_db, fake_ai, sample_video, monkeypatch):
    from app.services import ai_service

    analysis_id = analysed(client, fake_db, sample_video)

    def fora_do_ar(_context):
        raise ai_service.AIServiceError("sobrecarregada", "ai_busy")

    monkeypatch.setattr(ai_service, "revise_edit", fora_do_ar)
    resposta = feedback(client, analysis_id, "disliked", "Tira a pausa do final.")

    assert resposta.status_code == 200 and resposta.json()["revision"]["status"] == "unavailable"
    assert fake_db.edit_feedback[0]["note"] == "Tira a pausa do final."  # o pedido não se perdeu


def test_feedback_waits_for_the_edited_video(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)
    fake_db.upsert_video_edit({"analysis_id": analysis_id, "status": "processing"})

    recusado = feedback(client, analysis_id, "liked")
    assert recusado.status_code == 409 and recusado.json()["error"]["code"] == "EDIT_NOT_READY"


def test_feedback_belongs_to_the_owner(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)
    assert feedback(client, analysis_id, "liked", token="bob-token").status_code == 404
    assert fake_db.edit_feedback == []


@pytest.mark.parametrize("rating", ["maybe", ""])
def test_feedback_only_takes_liked_or_disliked(client, fake_db, fake_ai, sample_video, rating):
    analysis_id = analysed(client, fake_db, sample_video)
    assert feedback(client, analysis_id, rating).status_code == 422


def test_an_edit_still_happens_before_the_migration_runs(monkeypatch):
    """O código sobe antes do SQL rodar: sem as colunas novas, a edição sai sem elas."""
    from types import SimpleNamespace

    from app.services import supabase_service

    enviados = []

    class TabelaFalsa:
        def upsert(self, linha, on_conflict=None):
            enviados.append(linha)
            self.linha = linha
            return self

        def execute(self):
            if "source" in self.linha:
                raise Exception("Could not find the 'source' column of 'video_edits' in the schema cache")
            return SimpleNamespace(data=[{**self.linha, "id": "id-da-edicao"}])

    monkeypatch.setattr(supabase_service, "_client", lambda: SimpleNamespace(table=lambda nome: TabelaFalsa()))
    criada = supabase_service.upsert_video_edit({"analysis_id": "a-1", "status": "pending", "source": "auto", "revision": 1})

    assert criada["id"] == "id-da-edicao"
    assert [("source" in linha) for linha in enviados] == [True, False]  # tentou com, seguiu sem
