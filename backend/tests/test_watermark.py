"""A marca da publishub no vídeo editado do plano grátis.

Cada vídeo grátis postado leva "publishub / getpublishub.com" no canto: é o vídeo
que traz o próximo criador. Quem paga (assinatura, Founder Lifetime ou esta
análise) recebe o vídeo limpo. O original nunca é tocado, com marca ou sem.
"""

import subprocess

import pytest

from app.core.config import get_settings
from app.services import edit_service, video_editing
from app.services.video_processing import FFMPEG
from tests.conftest import ALICE, auth, register, upload, upload_image
from tests.test_billing import paid_session, webhook


@pytest.fixture(scope="module")
def black_video(tmp_path_factory):
    """4s de tela preta, 360x640: qualquer pixel claro no canto é a marca."""
    out = tmp_path_factory.mktemp("media") / "black.mp4"
    subprocess.run(
        [FFMPEG, "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=black:size=360x640:rate=25:duration=4",
         "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", str(out)],
        check=True,
    )
    return out


def frame_gray(video, width=360, height=640) -> bytes:
    """O frame do segundo 1 em tons de cinza, um byte por pixel."""
    done = subprocess.run(
        [FFMPEG, "-hide_banner", "-loglevel", "error", "-ss", "1", "-i", str(video), "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", "-"],
        check=True,
        capture_output=True,
    )
    assert len(done.stdout) == width * height
    return done.stdout


def brightest(frame: bytes, x0, x1, y0, y1, width=360) -> int:
    return max(frame[y * width + x] for y in range(y0, y1) for x in range(x0, x1))


def test_the_watermark_is_drawn_in_the_top_right_corner_only_when_asked(tmp_path, black_video):
    limpo, marcado = tmp_path / "limpo.mp4", tmp_path / "marcado.mp4"
    video_editing.render(black_video, limpo, [{"start_seconds": 0.0, "end_seconds": 0.5}], 4.0, has_audio=False)
    resultado = video_editing.render(black_video, marcado, [{"start_seconds": 0.0, "end_seconds": 0.5}], 4.0, has_audio=False, watermark_width=360)

    assert 3.0 < resultado["duration_seconds"] < 4.0  # o corte continua valendo com a marca
    sem, com = frame_gray(limpo), frame_gray(marcado)
    # canto superior direito (largura 20% = 96px mínimo, a 12% do topo e 5% da borda)
    assert brightest(sem, 240, 345, 70, 115) < 40
    assert brightest(com, 240, 345, 70, 115) > 150
    # o resto do quadro continua preto: a marca não cobre o vídeo
    assert brightest(com, 0, 200, 300, 640) < 40


@pytest.fixture
def renders(monkeypatch):
    """Guarda com que largura de marca cada edição foi pedida ao ffmpeg."""
    pedidos = []
    original = video_editing.render

    def spy(*args, **kwargs):
        pedidos.append(kwargs.get("watermark_width"))
        return original(*args, **kwargs)

    monkeypatch.setattr(edit_service.video_editing, "render", spy)
    return pedidos


def edit_once(client, fake_db, sample_video):
    created = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE))
    analysis_id = created.json()["analysis"]["id"]
    asked = client.post(f"/api/analyses/{analysis_id}/edit", json={"cuts": [{"start_seconds": 3.5, "end_seconds": 6.0}]}, headers=auth())
    assert asked.status_code == 202, asked.text
    edit = client.get(f"/api/analyses/{analysis_id}/edit", headers=auth()).json()["edit"]
    assert edit["status"] == "completed", edit.get("error_code")
    return analysis_id


@pytest.fixture
def stripe_on(env, monkeypatch):
    env.setenv("STRIPE_SECRET_KEY", "sk_test_x")
    env.setenv("STRIPE_WEBHOOK_SECRET", "whsec_x")
    get_settings.cache_clear()
    import json

    from app.services import billing_service

    monkeypatch.setattr(billing_service, "_construct_event", lambda payload, signature: json.loads(payload))
    return env


def test_a_free_account_gets_the_marked_video(client, fake_db, fake_ai, sample_video, stripe_on, renders):
    edit_once(client, fake_db, sample_video)
    assert renders[-1] == 360  # a largura do vídeo de exemplo


def test_a_paying_account_gets_a_clean_video(client, fake_db, fake_ai, sample_video, stripe_on, renders):
    assert webhook(client, "checkout.session.completed", paid_session(reference=ALICE["id"])).status_code == 200
    edit_once(client, fake_db, sample_video)
    assert renders[-1] is None


def test_without_stripe_nobody_gets_the_mark(client, fake_db, fake_ai, sample_video, renders):
    """Sem como pagar, a marca seria um castigo sem saída."""
    edit_once(client, fake_db, sample_video)
    assert renders[-1] is None


def test_an_analysis_paid_on_its_own_is_clean_too(fake_db, stripe_on):
    assert edit_service._watermarked({"paid_at": "2026-10-16T00:00:00+00:00"}, ALICE["id"]) is False
    assert edit_service._watermarked({"paid_at": None}, ALICE["id"]) is True
