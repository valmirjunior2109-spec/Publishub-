import base64

import pytest
from google.genai import errors, types

from app.services import ai_service
from app.services.video_processing import VideoSignals, extract_frames, extract_signals, frame_times, parse_silences
from tests.conftest import FakeGemini, sample_ai_output


def test_extract_signals_measures_real_video(tmp_path, sample_video):
    path = tmp_path / "v.mp4"
    path.write_bytes(sample_video)
    signals = extract_signals(path)
    assert signals.duration_seconds == pytest.approx(8.0, abs=0.1)
    assert (signals.width, signals.height) == (360, 640)
    assert signals.has_audio
    assert signals.mean_volume_db is not None
    starts = [s["start"] for s in signals.silences]
    assert any(s < 0.1 for s in starts) and any(3.3 < s < 3.8 for s in starts)

    frames = extract_frames(path, frame_times(signals.duration_seconds), tmp_path)
    assert len(frames) == len(frame_times(8.0))
    assert frames[0]["time"] == 0.0 and frames[0]["jpeg_base64"]


def test_frame_times_focus_on_hook_and_cap_total():
    times = frame_times(60)
    assert times[:6] == [0.0, 0.5, 1.0, 1.5, 2.0, 3.0]
    assert len(times) <= 20 and max(times) < 60
    assert frame_times(2.0) == [0.0, 0.5, 1.0, 1.5]


def test_parse_silences_closes_trailing_silence():
    stderr = "silence_start: 0\nsilence_end: 1.8 | silence_duration: 1.8\nsilence_start: 9.5\n"
    assert parse_silences(stderr, 12) == [{"start": 0.0, "end": 1.8}, {"start": 9.5, "end": 12}]


def _signals():
    return VideoSignals(duration_seconds=10, width=1080, height=1920, has_audio=True, silences=[{"start": 0, "end": 1.5}])


def test_normalize_clamps_scores_and_timestamps():
    output = sample_ai_output(
        hook={"score": 15, "assessment": "a", "problem": "p", "recommendation": "r"},
        editing={
            "score": -3,
            "assessment": "a",
            "findings": [{"start_seconds": 8, "end_seconds": 40, "problem": "p", "recommendation": "r"}],
        },
    )
    result = ai_service.normalize(output, _signals())
    assert result["hook"]["score"] == 10
    assert result["editing"]["score"] == 0
    assert result["editing"]["findings"][0]["end_seconds"] == 10
    assert 0 <= result["overall_score"] <= 100


def test_analyze_video_request_shape(monkeypatch, env):
    fake = FakeGemini()
    monkeypatch.setattr(ai_service, "_client", lambda: fake)
    frames = [{"time": 0.0, "jpeg_base64": base64.b64encode(b"jpeg-a").decode()}, {"time": 0.5, "jpeg_base64": base64.b64encode(b"jpeg-b").decode()}]
    result = ai_service.analyze_video(_signals(), frames)

    request = fake.calls[0]
    assert request["model"] == "gemini-3.8-flash"
    assert request["config"].response_schema is ai_service.AIAnalysis
    assert request["config"].response_mime_type == "application/json"
    assert request["config"].system_instruction == ai_service.SYSTEM_PROMPT

    parts = request["contents"]
    assert [p.text is not None for p in parts] == [True, False, True, False, True]
    # frames go as raw JPEG bytes, decoded from the base64 the extractor produces
    assert parts[1].inline_data.data == b"jpeg-a" and parts[1].inline_data.mime_type == "image/jpeg"
    assert result["summary"]


def test_analyze_video_refusal_and_missing_key(monkeypatch, env):
    monkeypatch.setattr(ai_service, "_client", lambda: FakeGemini(finish_reason=types.FinishReason.SAFETY))
    with pytest.raises(ai_service.AIServiceError, match="não pôde analisar"):
        ai_service.analyze_video(_signals(), [])

    monkeypatch.setattr(ai_service, "_client", lambda: FakeGemini(finish_reason=types.FinishReason.MAX_TOKENS))
    with pytest.raises(ai_service.AIServiceError, match="incompleta"):
        ai_service.analyze_video(_signals(), [])

    env.setenv("GEMINI_API_KEY", "")
    from app.core.config import get_settings

    get_settings.cache_clear()
    with pytest.raises(ai_service.AINotConfiguredError):
        ai_service.analyze_video(_signals(), [])


def test_analyze_video_maps_api_errors(monkeypatch, env):
    for code, expected in [(401, "chave inválida"), (404, "não existe"), (429, "sobrecarregada"), (400, "não conseguiu analisar")]:
        error = errors.ClientError(code, {"error": {"message": "boom"}})
        monkeypatch.setattr(ai_service, "_client", lambda e=error: FakeGemini(error=e))
        with pytest.raises(ai_service.AIServiceError, match=expected):
            ai_service.analyze_video(_signals(), [])
