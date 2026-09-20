import pytest
from google.genai import errors, types

from app.core.config import get_settings
from app.services import ai_service
from app.services.analysis_service import align_phrase
from app.services.video_processing import extract_audio, extract_signals, parse_silences
from tests.conftest import FakeGemini, sample_copilot, sample_curve, sample_diagnosis, sample_transcript


def test_extract_signals_and_audio_from_real_video(tmp_path, sample_video):
    path = tmp_path / "v.mp4"
    path.write_bytes(sample_video)
    signals = extract_signals(path)
    assert signals.duration_seconds == pytest.approx(8.0, abs=0.1)
    assert (signals.width, signals.height) == (360, 640)
    assert signals.has_audio
    starts = [s["start"] for s in signals.silences]
    assert any(s < 0.1 for s in starts) and any(3.3 < s < 3.8 for s in starts)

    audio = extract_audio(path, tmp_path)
    assert audio is not None and audio.suffix == ".mp3" and audio.stat().st_size > 1024


def test_extract_audio_returns_none_without_audio_track(tmp_path, silent_video):
    path = tmp_path / "s.mp4"
    path.write_bytes(silent_video)
    assert extract_audio(path, tmp_path) is None


def test_parse_silences_closes_trailing_silence():
    stderr = "silence_start: 0\nsilence_end: 1.8 | silence_duration: 1.8\nsilence_start: 9.5\n"
    assert parse_silences(stderr, 12) == [{"start": 0.0, "end": 1.8}, {"start": 9.5, "end": 12}]


def test_align_phrase_prefers_the_segment_containing_the_second():
    transcript = sample_transcript()
    phrase = align_phrase(transcript, 4.0)
    assert phrase["text"].startswith("Então, antes de tudo")
    assert phrase["before"].startswith("Eu fiquei") and phrase["after"].startswith("Eu sempre")

    # fora de qualquer segmento (a leitura do print é aproximada): o mais próximo pelo meio
    phrase = align_phrase(transcript, 9.5)
    assert phrase["text"].startswith("Eu sempre") and phrase["after"] == ""


def test_generate_falls_back_when_the_main_model_is_busy(monkeypatch, env):
    busy = errors.ServerError(503, {"error": {"message": "high demand"}})
    calls = []

    class Flaky(FakeGemini):
        def _generate_content(self, **kwargs):
            calls.append(kwargs["model"])
            if kwargs["model"] == "gemini-3.8-flash":
                raise busy
            return super()._generate_content(**kwargs)

    monkeypatch.setattr(ai_service, "_client", lambda: Flaky(responses=[sample_transcript()]))
    transcript = ai_service.transcribe(b"audio")
    assert transcript.has_speech
    assert calls == ["gemini-3.8-flash", "gemini-3.5-flash"]


def test_generate_maps_errors_to_creator_messages(monkeypatch, env):
    for code, expected in [(401, "chave inválida"), (404, "não existe"), (400, "não conseguiu analisar")]:
        error = errors.ClientError(code, {"error": {"message": "boom"}})
        monkeypatch.setattr(ai_service, "_client", lambda e=error: FakeGemini(error=e))
        with pytest.raises(ai_service.AIServiceError, match=expected):
            ai_service.read_retention_chart(b"png", "image/png")

    # 429 nos dois modelos → sobrecarregada
    monkeypatch.setattr(ai_service, "_client", lambda: FakeGemini(error=errors.ClientError(429, {"error": {"message": "quota"}})))
    with pytest.raises(ai_service.AIServiceError, match="sobrecarregada"):
        ai_service.read_retention_chart(b"png", "image/png")

    monkeypatch.setattr(ai_service, "_client", lambda: FakeGemini(finish_reason=types.FinishReason.SAFETY))
    with pytest.raises(ai_service.AIServiceError, match="não pôde analisar"):
        ai_service.transcribe(b"audio")

    env.setenv("GEMINI_API_KEY", "")
    from app.core.config import get_settings

    get_settings.cache_clear()
    with pytest.raises(ai_service.AINotConfiguredError):
        ai_service.transcribe(b"audio")


def test_diagnose_requires_three_rewrites_and_sends_frames(monkeypatch, env):
    fake = FakeGemini(responses=[sample_diagnosis()])
    monkeypatch.setattr(ai_service, "_client", lambda: fake)
    result = ai_service.diagnose({"language": "pt"}, [{"time": 4.0, "jpeg": b"jpeg-a"}])
    assert len(result.rewrites) == 3
    request = fake.calls[0]
    assert request["config"].response_schema is ai_service.Diagnosis
    assert request["config"].system_instruction.startswith("Você é o Publishub")
    assert request["contents"][-1].inline_data.data == b"jpeg-a"

    short = sample_diagnosis(rewrites=[{"text": "só uma", "why": "…"}])
    monkeypatch.setattr(ai_service, "_client", lambda: FakeGemini(responses=[short]))
    with pytest.raises(ai_service.AIServiceError, match="incompleta"):
        ai_service.diagnose({}, [])


def test_curve_reading_schema_round_trip():
    curve = sample_curve()
    assert curve.points[3] == [6, 61] and curve.readable


def test_generate_falls_back_when_the_main_model_no_longer_exists(monkeypatch, env):
    """Um GEMINI_MODEL aposentado (404) cai no modelo reserva em vez de falhar a análise."""
    env.setenv("GEMINI_MODEL", "gemini-2.5-pro")
    get_settings.cache_clear()
    retired = errors.ClientError(404, {"error": {"message": "This model is no longer available to new users"}})
    calls = []

    class Retired(FakeGemini):
        def _generate_content(self, **kwargs):
            calls.append(kwargs["model"])
            if kwargs["model"] == "gemini-2.5-pro":
                raise retired
            return super()._generate_content(**kwargs)

    monkeypatch.setattr(ai_service, "_client", lambda: Retired(responses=[sample_transcript()]))
    assert ai_service.transcribe(b"audio").has_speech
    assert calls == ["gemini-2.5-pro", "gemini-3.5-flash"]

    # se o reserva também não existir, a mensagem de modelo inexistente continua aparecendo
    monkeypatch.setattr(ai_service, "_client", lambda: FakeGemini(error=retired))
    with pytest.raises(ai_service.AIServiceError, match="modelo de IA configurado não existe"):
        ai_service.transcribe(b"audio")


def test_prompts_ask_for_explanations_in_the_site_language_and_rewrites_in_the_speech(monkeypatch, env):
    """O criador lê as explicações (idioma do site) e regrava as reescritas (idioma do vídeo)."""
    fake = FakeGemini(responses=[sample_diagnosis()])
    monkeypatch.setattr(ai_service, "_client", lambda: fake)
    ai_service.diagnose({"language": "pt", "ui_language": "en"}, [])
    first = fake.calls[0]["contents"][0].text
    assert "IDIOMA DAS EXPLICAÇÕES: English (en)" in first
    assert "IDIOMA DAS REESCRITAS: português (pt)" in first and "regravar falando essa frase" in first
    assert "DADOS DA QUEDA" in first

    # o copiloto não escreve reescritas: só a regra das explicações
    fake = FakeGemini(responses=[sample_copilot()])
    monkeypatch.setattr(ai_service, "_client", lambda: fake)
    ai_service.copilot({"language": "pt", "ui_language": "es"}, [])
    copilot_text = fake.calls[0]["contents"][0].text
    assert "IDIOMA DAS EXPLICAÇÕES: español (es)" in copilot_text and "IDIOMA DAS REESCRITAS" not in copilot_text
    assert "A fala do vídeo está em português (pt)" in copilot_text

    # sem idioma do site, tudo segue a fala do vídeo
    fake = FakeGemini(responses=[sample_diagnosis()])
    monkeypatch.setattr(ai_service, "_client", lambda: fake)
    ai_service.diagnose({"language": "en"}, [])
    assert "IDIOMA DAS EXPLICAÇÕES: English (en)" in fake.calls[0]["contents"][0].text

    fake = FakeGemini(responses=[sample_diagnosis()])
    monkeypatch.setattr(ai_service, "_client", lambda: fake)
    ai_service.diagnose({}, [])
    assert fake.calls[0]["contents"][0].text.startswith("DADOS DA QUEDA")


def test_supabase_retries_once_on_dropped_connections_and_timeouts():
    """Um download que estoura o tempo não pode derrubar a análise inteira: tenta mais uma vez."""
    import httpx

    from app.services import supabase_service as db

    assert db._is_transient(httpx.ReadTimeout("slow")) and db._is_transient(Exception("The read operation timed out"))
    assert db._is_transient(Exception("Server disconnected")) and not db._is_transient(Exception("duplicate key value"))

    calls = []

    def flaky():
        calls.append(1)
        if len(calls) == 1:
            raise Exception("The read operation timed out")
        return "ok"

    assert db._run("storage.download", flaky) == "ok" and len(calls) == 2

    def broken():
        raise Exception("duplicate key value")

    with pytest.raises(db.SupabaseError):
        db._run("videos.insert", broken)


def test_the_action_plan_comes_back_ordered_by_impact_and_capped(env, monkeypatch):
    """O plano sai pronto para executar: maior impacto primeiro, no maximo 8 itens."""
    from tests.conftest import FakeGemini, sample_copilot

    def item(kind, at, impact):
        return {
            "kind": kind,
            "at_seconds": at,
            "end_seconds": None,
            "title": f"{kind} em {at}s",
            "action": "acao",
            "why": "motivo",
            "impact": impact,
            "effort": "rapido",
        }

    muitas = [item("cut", 9.0, 3), item("hook", 0.0, 10), item("cta", 20.0, 3)] + [item("broll", float(i), 5) for i in range(1, 9)]
    fake = FakeGemini(responses=[sample_copilot(recommendations=muitas)])
    monkeypatch.setattr(ai_service, "_client", lambda: fake)

    plano = ai_service.copilot({"language": "pt", "duration_seconds": 30}, []).recommendations

    assert len(plano) == ai_service.MAX_RECOMMENDATIONS
    assert [r.impact for r in plano] == sorted((r.impact for r in plano), reverse=True)
    assert plano[0].kind == "hook"  # impacto 10
    # empate de impacto: quem vem antes no video vem antes no plano
    empatados = [r.at_seconds for r in plano if r.impact == 5]
    assert empatados == sorted(empatados)


def test_the_copilot_prompt_covers_the_seven_fronts():
    """As sete frentes precisam estar no prompt: e o que o produto promete entregar."""
    for kind in ("hook", "cut", "pacing", "broll", "caption", "structure", "cta"):
        assert f'"{kind}"' in ai_service._COPILOT_SYSTEM, kind
    assert "impact" in ai_service._COPILOT_SYSTEM and "effort" in ai_service._COPILOT_SYSTEM


def test_every_response_carries_a_request_id(client):
    """O id liga a tela ao log: e o que alguem cita quando escreve para o suporte."""
    ok = client.get("/api/health")
    assert ok.headers.get("x-request-id")

    erro = client.get("/api/videos")  # sem login
    assert erro.status_code == 401
    corpo = erro.json()["error"]
    assert corpo["code"] == "UNAUTHENTICATED"
    assert corpo["request_id"] and corpo["request_id"] == erro.headers.get("x-request-id")


def test_an_incoming_request_id_is_kept(client):
    """Quando a Vercel encadeia a chamada, o mesmo id segue ate o backend."""
    resposta = client.get("/api/health", headers={"X-Request-Id": "abc123-da-vercel"})
    assert resposta.headers["x-request-id"] == "abc123-da-vercel"


def test_logs_never_carry_the_video_content(caplog, client, fake_db, fake_ai, sample_video):
    """Log serve para achar defeito, nao para ler o material de quem usa."""
    import logging

    from tests.conftest import ALICE, auth, register, upload, upload_image

    with caplog.at_level(logging.DEBUG):
        criado = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE))
        assert criado.status_code == 201
        client.get(f"/api/analyses/{criado.json()['analysis']['id']}", headers=auth())

    registrado = "\n".join(r.getMessage() for r in caplog.records)
    for segredo in ("Então, antes de tudo", "service-role-test", "gemini-key-test", "alice-token"):
        assert segredo not in registrado, segredo
