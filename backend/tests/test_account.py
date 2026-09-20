"""Apagar a conta: precisa apagar de verdade."""

from tests.conftest import ALICE, auth, register, upload, upload_image


def test_deleting_the_account_removes_the_files_and_the_login(client, fake_db, fake_ai, sample_video):
    criado = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE))
    assert criado.status_code == 201
    assert fake_db.objects and fake_db.images

    resposta = client.post("/api/me/delete", json={"confirmation": ALICE["email"]}, headers=auth())
    assert resposta.status_code == 200 and resposta.json()["deleted"] is True
    assert resposta.json()["files_removed"] == 2  # o vídeo e o print

    # os arquivos sairam do Storage e a conta saiu do Auth
    assert fake_db.objects == {} and fake_db.images == {}
    assert ALICE["id"] in fake_db.deleted_users


def test_the_confirmation_has_to_be_the_account_email(client, fake_db):
    errado = client.post("/api/me/delete", json={"confirmation": "apagar"}, headers=auth())
    assert errado.status_code == 422 and errado.json()["error"]["code"] == "CONFIRMATION_MISMATCH"
    assert fake_db.deleted_users == []

    # maiúsculas e espaços não deveriam atrapalhar quem digitou certo
    certo = client.post("/api/me/delete", json={"confirmation": f"  {ALICE['email'].upper()}  "}, headers=auth())
    assert certo.status_code == 200


def test_deleting_needs_a_session(client, fake_db):
    assert client.post("/api/me/delete", json={"confirmation": ALICE["email"]}).status_code == 401
