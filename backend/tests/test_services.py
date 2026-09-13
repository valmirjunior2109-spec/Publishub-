import pytest
from google.genai import errors, types

from app.services import ai_service
from app.services.analysis_service import align_phrase
from app.services.video_processing import extract_audio, extract_signals, parse_silences
from tests.conftest import FakeGemini, sample_curve, sample_diagnosis, sample_transcript


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
