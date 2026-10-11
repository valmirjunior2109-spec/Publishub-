"""Publishub · anúncio de 38 s: mixa narração + música + efeitos em public/ad38/mix.wav.

- a narração (public/ad38/vo/vo1..6.wav, Kokoro) entra nos quadros de timeline.json → "vo"
- a música fica ~16 dB abaixo da voz e abaixa mais enquanto ela fala (ducking suave)
- os efeitos ficam ~8 dB abaixo do pico da voz
- loudnorm em duas passadas: −14 LUFS integrados, pico real −1,5 dBTP (o nível do Instagram)

  python scripts/ad38/mix.py <ffmpeg> [sem-voz]

Com "sem-voz", sai só música + efeitos (a mensagem fica nas legendas e textos da tela).
"""
import json
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
FFMPEG = sys.argv[1]
NO_VOICE = len(sys.argv) > 2 and sys.argv[2] == "sem-voz"
PUB = ROOT / "public" / "ad38"
T = json.loads((ROOT / "src" / "ad38" / "timeline.json").read_text("utf-8"))
SR = 48000
LEN = round(T["durationInFrames"] / T["fps"] * SR)


def read(path: Path) -> np.ndarray:
    """Lê qualquer áudio como float32 estéreo a 48 kHz (o ffmpeg converte)."""
    raw = subprocess.run([FFMPEG, "-loglevel", "error", "-i", str(path), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def db(x: float) -> float:
    return 10 ** (x / 20)


# narração, cada fala no seu quadro, filtrada abaixo de 70 Hz e com o mesmo nível
voice = np.zeros((LEN, 2), np.float32)
for k, frame in enumerate(T["vo"]):
    v = read(PUB / "vo" / f"vo{k + 1}.wav")
    rms = np.sqrt(np.mean(v[np.abs(v[:, 0]) > 0.02] ** 2))
    v *= 0.12 / rms
    start = round(frame / T["fps"] * SR)
    end = min(LEN, start + len(v))
    voice[start:end] += v[: end - start]
hp_prev, out_prev = np.zeros(2), np.zeros(2)
alpha = 1 / (1 + 2 * np.pi * 70 / SR)
for n in range(LEN):  # passa-alta de 1ª ordem
    out_prev = alpha * (out_prev + voice[n] - hp_prev)
    hp_prev = voice[n].copy()
    voice[n] = out_prev

# envelope da voz (ataque 40 ms, soltura 350 ms): onde a música abaixa
level = np.abs(voice).max(axis=1)
active = (level > 0.01).astype(np.float32)
env = np.zeros(LEN, np.float32)
a_att, a_rel = np.exp(-1 / (0.04 * SR)), np.exp(-1 / (0.35 * SR))
e = 0.0
for n in range(LEN):
    target = active[n]
    coef = a_att if target > e else a_rel
    e = target + (e - target) * coef
    env[n] = e

music = read(PUB / "music.wav")[:LEN]
sfx = read(PUB / "sfx.wav")[:LEN]
voice_rms = np.sqrt(np.mean(voice[active > 0] ** 2))
music_rms = np.sqrt(np.mean(music ** 2))
music_gain = (voice_rms * db(-16) / music_rms) * (1 - 0.45 * env)  # −16 dB e mais ~5 dB sob a voz
music_gain = np.where(env > 0, music_gain, voice_rms * db(-12) / music_rms)  # sem voz: um pouco mais presente
sfx_gain = np.abs(voice).max() * db(-8) / np.abs(sfx).max()

mix = voice + music * music_gain[:, None] + sfx * sfx_gain
if NO_VOICE:
    # sem narração: a música vira a base e os efeitos ficam um pouco abaixo do pico dela
    mix = music + sfx * (np.abs(music).max() * db(-4) / np.abs(sfx).max())
tmp = PUB / "mix-raw.wav"
with wave.open(str(tmp), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((np.clip(mix / max(1.0, np.abs(mix).max() * 1.05), -1, 1) * 32767).astype(np.int16).tobytes())

# loudnorm em duas passadas
probe = subprocess.run([FFMPEG, "-hide_banner", "-i", str(tmp), "-af", "loudnorm=I=-14:TP=-1.5:LRA=9:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
m = json.loads(probe[probe.rindex("{"): probe.rindex("}") + 1])
af = (f"loudnorm=I=-14:TP=-1.5:LRA=9:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
      f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,aresample={SR}")
subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", str(tmp), "-af", af, "-ar", str(SR), "-ac", "2", "-c:a", "pcm_s16le", str(PUB / "mix.wav")], check=True)
tmp.unlink()
check = subprocess.run([FFMPEG, "-hide_banner", "-i", str(PUB / "mix.wav"), "-af", "loudnorm=I=-14:TP=-1.5:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
c = json.loads(check[check.rindex("{"): check.rindex("}") + 1])
print(f"mix.wav · {LEN / SR:.2f} s · {c['input_i']} LUFS · pico {c['input_tp']} dBTP")
