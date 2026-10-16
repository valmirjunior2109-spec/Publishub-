"""O link público do resultado: o criador mostra a queda, nunca o plano nem o vídeo."""

from tests.conftest import ALICE, BOB, auth, register, upload, upload_image


def analysed(client, fake_db, sample_video):
    created = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE))
    assert created.status_code == 201, created.text
    return created.json()["analysis"]["id"]


def test_sharing_opens_only_the_free_part_of_the_result(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)
    assert client.get(f"/api/analyses/{analysis_id}", headers=auth()).json()["share_token"] is None

    shared = client.post(f"/api/analyses/{analysis_id}/share", headers=auth())
    assert shared.status_code == 200, shared.text
    token = shared.json()["token"]
    assert len(token) >= 8
    # o mesmo link, por mais que o botão seja clicado
    assert client.post(f"/api/analyses/{analysis_id}/share", headers=auth()).json()["token"] == token
    assert client.get(f"/api/analyses/{analysis_id}", headers=auth()).json()["share_token"] == token
    assert [e["name"] for e in fake_db.events].count("result_shared") == 1

    public = client.get(f"/api/share/{token}")  # sem login
    assert public.status_code == 200
    body = public.json()
    assert set(body) == {"token", "language", "retention_source", "drop", "phrase", "diagnosis", "shared_at"}
    assert body["drop"]["at_seconds"] is not None and body["phrase"] and body["diagnosis"]
    # nada do que é pago ou privado
    texto = str(body)
    for privado in ("rewrites", "copilot", "recommendations", "transcript", "playback_url", "filename", "storage_path", ALICE["id"], ALICE["email"]):
        assert privado not in texto


def test_unsharing_closes_the_link(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)
    token = client.post(f"/api/analyses/{analysis_id}/share", headers=auth()).json()["token"]

    assert client.delete(f"/api/analyses/{analysis_id}/share", headers=auth()).json() == {"token": None}
    assert client.get(f"/api/share/{token}").status_code == 404
    # ligar de novo cria outro link: o antigo continua morto
    novo = client.post(f"/api/analyses/{analysis_id}/share", headers=auth()).json()["token"]
    assert novo != token and client.get(f"/api/share/{token}").status_code == 404


def test_only_the_owner_shares(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)
    assert client.post(f"/api/analyses/{analysis_id}/share", headers=auth("bob-token")).status_code == 404
    assert client.post(f"/api/analyses/{analysis_id}/share").status_code == 401
    assert client.delete(f"/api/analyses/{analysis_id}/share", headers=auth("bob-token")).status_code == 404


def test_an_unfinished_analysis_cannot_be_shared(client, fake_db, fake_ai, sample_video):
    analysis_id = analysed(client, fake_db, sample_video)
    fake_db.analyses[analysis_id]["status"] = "processing"
    r = client.post(f"/api/analyses/{analysis_id}/share", headers=auth())
    assert r.status_code == 409 and r.json()["error"]["code"] == "NOT_READY"


def test_guessing_tokens_finds_nothing(client, fake_db):
    for token in ("abc", "x" * 12, "../etc/passwd", "a" * 64):
        assert client.get(f"/api/share/{token}").status_code == 404
