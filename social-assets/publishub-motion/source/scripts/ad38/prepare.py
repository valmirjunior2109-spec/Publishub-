"""Publishub · anúncio de 38 s: prepara os materiais da composição Ad38.

Entradas (ad38-src/ e public/ad38/, gerados pelos scripts desta pasta):
  public/ad38/demo-reel.mp4      o Reel de demonstração enviado ao teste grátis
  ad38-src/demo-words.json       palavras do Reel de demonstração (words.py)
  ad38-src/capture/cast.json     a gravação de tela do envio (record.mjs)
Saídas:
  public/ad38/demo-edited.mp4    o Reel com as sugestões 01 e 02 aplicadas (começa em "weeknight")
  public/ad38/thumbs/*.jpg       miniaturas da timeline
  public/ad38/cast/*.jpg         os quadros escolhidos da gravação do envio
  src/ad38/waveform.json         a forma de onda real do Reel de demonstração

  python scripts/ad38/prepare.py <ffmpeg> <pasta-da-gravacao>
"""
import json
import shutil
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
FFMPEG = sys.argv[1]
CAST_DIR = Path(sys.argv[2])
PUB = ROOT / "public" / "ad38"
SRC = ROOT / "ad38-src"
T = json.loads((ROOT / "src" / "ad38" / "timeline.json").read_text("utf-8"))
FPS = T["fps"]


def ff(*args):
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", *args], check=True)


# 1. o Reel editado: as sugestões 01 e 02 tiram a saudação, a história e o silêncio,
#    então o vídeo passa a abrir em "weeknight bolognese" (10,94 s no original)
demo_words = json.loads((SRC / "demo-words.json").read_text("utf-8"))["demo16k.wav"]
cut_at = next(w["s"] for w in demo_words if w["w"].lower().startswith("weeknight"))
ff("-ss", f"{cut_at}", "-i", str(PUB / "demo-reel.mp4"), "-c:v", "libx264", "-crf", "18", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(PUB / "demo-edited.mp4"))

# 2. miniaturas da timeline: 12 quadros espaçados do Reel original
for k in range(12):
    t = 22 * (k + 0.5) / 12
    ff("-ss", f"{t:.2f}", "-i", str(PUB / "demo-reel.mp4"), "-frames:v", "1", "-vf", "scale=180:-1", "-q:v", "3", str(PUB / "thumbs" / f"t{k:02d}.jpg"))

# 3. forma de onda real (RMS em 220 colunas): o silêncio entre 8,4 s e 10,4 s aparece de verdade
tmp = SRC / "demo-mono.wav"
ff("-i", str(PUB / "demo-reel.mp4"), "-vn", "-ac", "1", "-ar", "16000", str(tmp))
with wave.open(str(tmp)) as w:
    pcm = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
bins = np.array_split(pcm, 220)
rms = np.array([np.sqrt(np.mean(b ** 2)) for b in bins])
rms = (rms / rms.max()).round(3).tolist()
(ROOT / "src" / "ad38" / "waveform.json").write_text(json.dumps({"duration": 22, "cutAt": cut_at, "rms": rms}), "utf-8")
tmp.unlink()

# 4. quadros da gravação do envio: escolhido + barra de progresso + análise em andamento
cast = json.loads((SRC / "capture" / "cast.json").read_text("utf-8"))
t0 = cast[0]["t"]
upload = [c for c in cast if 0.5 < c["t"] - t0 < 18.9]
pick = [upload[round(i * (len(upload) - 1) / 23)] for i in range(24)]
processing = min(cast, key=lambda c: abs((c["t"] - t0) - 20.1))
for old in (PUB / "cast").glob("*.jpg"):
    old.unlink()
names = []
for i, c in enumerate(pick):
    shutil.copy(CAST_DIR / c["name"], PUB / "cast" / f"u{i:02d}.jpg")
    names.append(f"u{i:02d}.jpg")
shutil.copy(CAST_DIR / processing["name"], PUB / "cast" / "processing.jpg")
(ROOT / "src" / "ad38" / "cast.json").write_text(json.dumps({"upload": names, "processing": "processing.jpg"}), "utf-8")

print("cut at", cut_at, "· upload frames", len(names))
