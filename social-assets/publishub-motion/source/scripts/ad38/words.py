"""Transcreve WAVs com faster-whisper e imprime/salva os tempos de cada palavra.
   python words.py <saida.json|-> <a.wav> [b.wav ...]
"""
import json
import sys

import numpy as np
import soundfile as sf
from faster_whisper import WhisperModel

out, files = sys.argv[1], sys.argv[2:]
model = WhisperModel("large-v3", device="cpu", compute_type="int8")
result = {}
for path in files:
    audio, rate = sf.read(path, dtype="float32")
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    if rate != 16000:  # reamostragem linear simples para os 16 kHz do Whisper
        n = int(len(audio) * 16000 / rate)
        audio = np.interp(np.linspace(0, len(audio) - 1, n), np.arange(len(audio)), audio).astype(np.float32)
    segments, _ = model.transcribe(audio, language="en", word_timestamps=True, beam_size=5)
    words = [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)} for seg in segments for w in seg.words]
    result[path] = words
    print(path, "|", " ".join(w["w"] for w in words))
if out != "-":
    with open(out, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=1)
