"""Measured signals from the video file, using the ffmpeg binary bundled by imageio-ffmpeg.

This module never edits the video: it only reads it to extract facts
(duration, pauses, volume, scene cuts) and a few frames for the AI.
"""

import base64
import re
import subprocess
from dataclasses import dataclass, field
from pathlib import Path

import imageio_ffmpeg

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

# Pauses: audio below -35 dB for at least 0.5 s (gaps between words are shorter).
SILENCE_NOISE_DB = -35
SILENCE_MIN_SECONDS = 0.5
# Scene change score above 0.4 counts as a hard cut.
SCENE_THRESHOLD = 0.4
MAX_FRAMES = 20


class InvalidVideoError(Exception):
    """The file can't be read as a video."""


@dataclass
class VideoSignals:
    duration_seconds: float
    width: int | None
    height: int | None
    has_audio: bool
    silences: list[dict] = field(default_factory=list)  # [{"start": s, "end": s}]
    scene_cuts: list[float] = field(default_factory=list)
    mean_volume_db: float | None = None
    max_volume_db: float | None = None

    def as_dict(self) -> dict:
        return {
            "duration_seconds": round(self.duration_seconds, 2),
            "width": self.width,
            "height": self.height,
            "has_audio": self.has_audio,
            "silences": self.silences,
            "scene_cuts": self.scene_cuts,
            "mean_volume_db": self.mean_volume_db,
            "max_volume_db": self.max_volume_db,
        }


def _ffmpeg(args: list[str], timeout: int = 600) -> str:
    """Runs ffmpeg and returns stderr (where ffmpeg writes its analysis output)."""
    completed = subprocess.run(
        [FFMPEG, "-hide_banner", "-nostats", *args],
        capture_output=True,
        text=True,
        errors="replace",
        timeout=timeout,
    )
    return completed.stderr


_DURATION_RE = re.compile(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)")
_VIDEO_RE = re.compile(r"Stream #\d+:\d+.*?: Video: .*?(\d{2,5})x(\d{2,5})")
_AUDIO_RE = re.compile(r"Stream #\d+:\d+.*?: Audio:")
_ROTATION_RE = re.compile(r"rotation of (-?\d+(?:\.\d+)?) degrees|rotate\s*:\s*(-?\d+)")
_SILENCE_START_RE = re.compile(r"silence_start:\s*(-?[\d.]+)")
_SILENCE_END_RE = re.compile(r"silence_end:\s*([\d.]+)")
_MEAN_RE = re.compile(r"mean_volume:\s*(-?[\d.]+)\s*dB")
_MAX_RE = re.compile(r"max_volume:\s*(-?[\d.]+)\s*dB")
_PTS_RE = re.compile(r"pts_time:([\d.]+)")


def probe(path: Path) -> VideoSignals:
    info = _ffmpeg(["-i", str(path)], timeout=60)
    duration = _DURATION_RE.search(info)
    video = _VIDEO_RE.search(info)
    if not duration or not video:
        raise InvalidVideoError("no video stream or duration")

    h, m, s = duration.groups()
    seconds = int(h) * 3600 + int(m) * 60 + float(s)
    if seconds <= 0.3:
        raise InvalidVideoError("video too short")

    width, height = int(video.group(1)), int(video.group(2))
    rotation = _ROTATION_RE.search(info)
    if rotation:
        degrees = abs(round(float(rotation.group(1) or rotation.group(2))))
        if degrees % 180 == 90:  # phone videos recorded in portrait
            width, height = height, width

    return VideoSignals(duration_seconds=seconds, width=width, height=height, has_audio=bool(_AUDIO_RE.search(info)))


def parse_silences(stderr: str, duration: float) -> list[dict]:
    silences: list[dict] = []
    pending: float | None = None
    for line in stderr.splitlines():
        start = _SILENCE_START_RE.search(line)
        if start:
            pending = max(0.0, float(start.group(1)))
            continue
        end = _SILENCE_END_RE.search(line)
        if end and pending is not None:
            silences.append({"start": round(pending, 2), "end": round(min(float(end.group(1)), duration), 2)})
            pending = None
    # A silence that lasts until the end of the file has no silence_end line.
    if pending is not None and duration - pending >= SILENCE_MIN_SECONDS:
        silences.append({"start": round(pending, 2), "end": round(duration, 2)})
    return silences


def detect_audio(path: Path, signals: VideoSignals) -> None:
    if not signals.has_audio:
        return
    stderr = _ffmpeg(
        [
            "-i", str(path), "-vn",
            "-af", f"silencedetect=noise={SILENCE_NOISE_DB}dB:d={SILENCE_MIN_SECONDS},volumedetect",
            "-f", "null", "-",
        ]
    )
    signals.silences = parse_silences(stderr, signals.duration_seconds)
    mean, peak = _MEAN_RE.search(stderr), _MAX_RE.search(stderr)
    signals.mean_volume_db = float(mean.group(1)) if mean else None
    signals.max_volume_db = float(peak.group(1)) if peak else None


def detect_scene_cuts(path: Path, signals: VideoSignals) -> None:
    # Downscaling first makes this several times faster on phone footage.
    stderr = _ffmpeg(
        ["-i", str(path), "-an", "-vf", f"scale=320:-2,select='gt(scene,{SCENE_THRESHOLD})',showinfo", "-f", "null", "-"]
    )
    signals.scene_cuts = [round(float(t), 2) for t in _PTS_RE.findall(stderr)]


def frame_times(duration: float) -> list[float]:
    """Dense sampling of the first 3 seconds (the hook), then evenly spread samples."""
    hook = [t for t in (0.0, 0.5, 1.0, 1.5, 2.0, 3.0) if t < duration - 0.1]
    remaining = MAX_FRAMES - len(hook)
    rest: list[float] = []
    if duration > 4 and remaining > 0:
        step = (duration - 4) / remaining
        rest = [round(4 + step * i, 2) for i in range(remaining) if 4 + step * i < duration - 0.1]
    return hook + rest


def extract_frames(path: Path, times: list[float], work_dir: Path) -> list[dict]:
    """Small JPEG frames as base64: [{"time": seconds, "jpeg_base64": ...}]."""
    frames = []
    for index, time in enumerate(times):
        out = work_dir / f"frame-{index:02d}.jpg"
        _ffmpeg(
            ["-y", "-ss", f"{time:.2f}", "-i", str(path), "-frames:v", "1", "-vf", "scale='min(512,iw)':-2", "-q:v", "5", str(out)],
            timeout=60,
        )
        if out.exists() and out.stat().st_size > 0:
            frames.append({"time": time, "jpeg_base64": base64.b64encode(out.read_bytes()).decode("ascii")})
    return frames


def extract_audio(path: Path, work_dir: Path) -> Path | None:
    """The speech track as a small mono MP3 for transcription. None when the video has no audio."""
    out = work_dir / "audio.mp3"
    _ffmpeg(["-y", "-i", str(path), "-vn", "-ac", "1", "-ar", "16000", "-b:a", "48k", str(out)], timeout=300)
    if not out.exists() or out.stat().st_size < 1024:
        return None
    return out


def extract_signals(path: Path) -> VideoSignals:
    signals = probe(path)
    detect_audio(path, signals)
    detect_scene_cuts(path, signals)
    return signals
