"""Trilha do Reel de 15 s, sintetizada (só numpy): nada de sample de terceiros.

    python3 soundtrack.py saida.wav

O mapa segue a scene.html, segundo a segundo:
  0.00–1.50  tique-taque do timecode (0:00 → 0:04) sobre um zumbido que sobe
  1.50       o impacto da queda: sub-grave + ruído, com cauda
  2.6–3.4    "Do you know why?": respiração grave, sopro que sobe até o mergulho
  3.70       a cortina de papel abre e a batida entra (120 BPM, grade a partir de 3.7)
  7.95 8.45 8.95  os três "Accept"
  9.18–9.48  o chicote para a cena azul
  9.45–11.2  as sete frentes: um golpe a cada colcheia
  11.45–11.9 os cortes somem da linha do tempo (zíper descendo) + subida
  12.2       a marca: o acorde final, que fica até o fim
"""
import sys
import wave

import numpy as np

SR = 48000
DUR = 15.0
N = int(SR * DUR)
rng = np.random.default_rng(7)

L = np.zeros(N)
R = np.zeros(N)


def t_axis(d):
    return np.arange(int(d * SR)) / SR


def add(sig, at, gain=1.0, pan=0.0):
    """Mistura `sig` (mono ou (2, n)) a partir de `at` segundos."""
    i = int(at * SR)
    if sig.ndim == 1:
        l, r = sig * (1 - pan) ** 0.5 * gain, sig * (1 + pan) ** 0.5 * gain
    else:
        l, r = sig[0] * gain, sig[1] * gain
    n = min(len(l), N - i)
    if n <= 0:
        return
    L[i:i + n] += l[:n]
    R[i:i + n] += r[:n]


def band(x, lo, hi):
    """Filtro passa-faixa no domínio da frequência (sem fase, sem scipy)."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if lo:
        m *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi:
        m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))


def env(n, a, d, curve=1.0):
    """Envelope ataque/decaimento exponencial."""
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)
    return e ** curve


def note(f):
    return 440.0 * 2 ** ((f - 69) / 12)


# ---------------- sons ----------------
def tick(pitch=3200, d=0.05):
    t = t_axis(d)
    s = np.sin(2 * np.pi * pitch * t) * np.exp(-t / 0.008)
    s += band(rng.standard_normal(len(t)), 2000, 9000) * np.exp(-t / 0.004) * 0.6
    return s


def kick(d=0.45, f0=120, f1=42, punch=1.0):
    t = t_axis(d)
    f = f1 + (f0 - f1) * np.exp(-t / 0.045)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t / 0.16)
    s += band(rng.standard_normal(len(t)), 1500, 6000) * np.exp(-t / 0.003) * 0.25 * punch
    return np.tanh(s * 1.6)


def hat(d=0.06, gain=1.0):
    t = t_axis(d)
    return band(rng.standard_normal(len(t)), 7000, 16000) * np.exp(-t / 0.012) * gain


def boom(d=2.4):
    t = t_axis(d)
    f = 34 + 56 * np.exp(-t / 0.18)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.7)
    s += band(rng.standard_normal(len(t)), 40, 900) * np.exp(-t / 0.25) * 0.7
    return np.tanh(s * 1.8)


def whoosh(d, lo0, hi0, lo1, hi1, shape="up"):
    """Ruído cuja faixa vai de (lo0, hi0) a (lo1, hi1), em 8 fatias com crossfade."""
    n = int(d * SR)
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    steps = 8
    for k in range(steps):
        a = k / (steps - 1)
        lo, hi = lo0 + (lo1 - lo0) * a, hi0 + (hi1 - hi0) * a
        w = np.exp(-(((np.arange(n) / n) - a) ** 2) / (2 * (0.6 / steps) ** 2))
        out += band(noise, lo, hi) * w
    x = np.arange(n) / n
    e = x ** 2.2 if shape == "up" else (np.sin(np.pi * x) ** 1.5 if shape == "mid" else (1 - x) ** 2)
    return out * e / (np.abs(out).max() + 1e-9)


def pad(freqs, d, bright=1800, attack=0.6, release=1.2):
    """Acorde com serras desafinadas, filtradas: largo, quente."""
    t = t_axis(d)
    st = np.zeros((2, len(t)))
    for f in freqs:
        for side, det in ((0, -0.08), (1, 0.08)):
            for cents in (-7, 0, 7):
                ff = f * 2 ** ((cents + det * 100 * 0) / 1200) * (1 + det * 0.003)
                ph = rng.uniform(0, 2 * np.pi)
                w = np.zeros(len(t))
                for h in range(1, 14):
                    if ff * h > 9000:
                        break
                    w += np.sin(2 * np.pi * ff * h * t + ph * h) / h
                st[side] += w
    st[0], st[1] = band(st[0], 0, bright), band(st[1], 0, bright)
    e = np.minimum(1, t / attack) * np.minimum(1, (d - t) / release)
    st *= np.clip(e, 0, 1)
    return st / (np.abs(st).max() + 1e-9)


def pluck(f, d=0.5):
    t = t_axis(d)
    s = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t))
    return s * np.exp(-t / 0.16) * np.minimum(1, t / 0.003)


def bell(f, d=2.5):
    t = t_axis(d)
    s = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (dd)) for m, a, dd in ((1, 1, 1.4), (2.01, 0.4, 0.8), (3.0, 0.2, 0.5), (4.2, 0.12, 0.3)))
    return s * np.minimum(1, t / 0.004)


def reverb(x, secs=2.2, wet=0.25):
    n = int(secs * SR)
    t = np.arange(n) / SR
    out = []
    for side in range(2):
        ir = rng.standard_normal(n) * np.exp(-t / (secs / 6.5))
        ir = band(ir, 200, 7000)
        ir /= np.sqrt((ir ** 2).sum())
        m = len(x[side]) + n
        y = np.fft.irfft(np.fft.rfft(x[side], m) * np.fft.rfft(ir, m), m)[: len(x[side])]
        out.append(x[side] * (1 - wet) + y * wet * 3)
    return np.array(out)


# ---------------- 0 – 3.7: o gancho ----------------
# o zumbido que sobe até a queda
t = t_axis(1.55)
drone = np.sin(2 * np.pi * np.cumsum(55 + 30 * (t / 1.55) ** 2) / SR) * (t / 1.55) ** 1.5
drone += band(rng.standard_normal(len(t)), 200, 2500) * (t / 1.55) ** 3 * 0.35
add(drone, 0.0, 0.32)
for i, at in enumerate([0.25, 0.5625, 0.875, 1.1875]):
    add(tick(2600 + 250 * i), at, 0.42, pan=-0.3 + 0.2 * i)
add(boom(), 1.5, 0.95)
add(tick(1800, 0.2), 1.5, 0.35)
add(bell(note(57), 2.0), 1.52, 0.10)  # um lá distante, metálico, na queda
# a respiração grave e o sopro até o mergulho
t = t_axis(1.3)
add(np.sin(2 * np.pi * note(29) * t) * np.sin(np.pi * t / 1.3) ** 2, 2.4, 0.22)
add(whoosh(0.45, 300, 1200, 600, 3000, "mid"), 2.5, 0.18, pan=-0.2)
add(whoosh(0.7, 200, 900, 2500, 12000, "up"), 3.05, 0.45)

# ---------------- 3.7 – 12.2: a batida ----------------
BEAT = 0.5
G0 = 3.7
CH = {  # acordes em Fá maior
    "F": [note(41), note(57), note(60), note(64), note(67)],
    "Am": [note(45), note(55), note(60), note(64), note(69)],
    "Dm": [note(38), note(53), note(57), note(60), note(64)],
    "Bb": [note(46), note(53), note(57), note(62), note(65)],
    "C": [note(36), note(55), note(60), note(64), note(67)],
}
prog = [("F", 3.7, 2.0), ("Am", 5.7, 2.0), ("Dm", 7.7, 2.0), ("Bb", 9.7, 1.0), ("C", 10.7, 0.8)]
pads = np.zeros((2, N))
for name, at, d in prog:
    p = pad(CH[name], d + 0.5, bright=1400 if at < 9.5 else 2400, attack=0.08, release=0.5)
    i = int(at * SR)
    n = min(p.shape[1], N - i)
    pads[:, i:i + n] += p[:, :n]
# o primeiro acorde nasce com a cortina
for side in range(2):
    pads[side] *= 0.55
add(pads, 0.0, 0.22)

# bumbo, chimbal e o arpejo
end_groove = 11.45
k = 0
bt = G0
while bt < end_groove - 1e-6:
    if bt < 9.18 or bt >= 9.45:
        add(kick(), bt, 0.55)
    add(hat(gain=0.8), bt + BEAT / 2, 0.16, pan=0.35)
    if bt >= 9.45:
        add(hat(0.03), bt + BEAT / 4, 0.08, pan=-0.35)
        add(hat(0.03), bt + 3 * BEAT / 4, 0.08, pan=-0.35)
    bt += BEAT
    k += 1
arp_notes = {"F": [65, 69, 72, 76], "Am": [64, 69, 72, 76], "Dm": [62, 65, 69, 72], "Bb": [62, 65, 70, 74], "C": [64, 67, 72, 76]}
for name, at, d in prog:
    seq = arp_notes[name]
    s = at
    j = 0
    while s < at + d - 0.01 and s < 11.4:
        add(pluck(note(seq[j % 4]) * (2 if j % 8 == 7 else 1)), s, 0.07, pan=(-0.4 if j % 2 else 0.4))
        s += 0.25
        j += 1
# o baixo, um por tempo
for name, at, d in prog:
    s = at
    while s < at + d - 0.01 and s < 11.4:
        tt = t_axis(0.45)
        b = np.sin(2 * np.pi * CH[name][0] * tt) * np.exp(-tt / 0.25) * np.minimum(1, tt / 0.01)
        add(np.tanh(b * 2), s, 0.22)
        s += BEAT

# a cortina e os detalhes do produto
add(whoosh(0.5, 2000, 8000, 300, 1500, "down"), 3.66, 0.28)
add(kick(0.8, 90, 38, 0.3), 3.7, 0.5)
for at in (4.28, 4.6, 4.92):  # as etiquetas do escaneamento
    add(bell(note(84), 0.5), at, 0.05, pan=0.3)
add(whoosh(0.4, 500, 2000, 1500, 6000, "mid"), 5.2, 0.14, pan=0.2)  # o celular vira miniatura
for i, at in enumerate((6.95, 7.1, 7.25)):  # o risco de caneta
    add(band(rng.standard_normal(int(0.2 * SR)), 1500, 6000) * np.sin(np.pi * np.arange(int(0.2 * SR)) / (0.2 * SR)), at, 0.06, pan=-0.2 + 0.2 * i)
add(whoosh(0.45, 400, 1500, 900, 4000, "mid"), 7.4, 0.12)  # a rolagem
for i, at in enumerate((7.95, 8.45, 8.95)):  # os três "Accept"
    add(tick(4200, 0.04), at - 0.01, 0.35, pan=0.25)
    add(bell(note(76 + [0, 3, 7][i]), 0.9), at + 0.02, 0.09, pan=0.25)

# o chicote
add(whoosh(0.34, 300, 1200, 3000, 14000, "mid"), 9.14, 0.55)
add(kick(0.6, 110, 40, 1.0), 9.45, 0.6)
# as sete frentes: um golpe por palavra
for i in range(7):
    at = 9.45 + i * 0.25
    add(tick(1500 + 120 * i, 0.08), at, 0.22, pan=(-0.25 if i % 2 else 0.25))
# os cortes somem: um zíper que desce
t = t_axis(0.42)
zip_f = 1800 * np.exp(-t / 0.18) + 180
z = np.sign(np.sin(2 * np.pi * np.cumsum(zip_f) / SR)) * np.exp(-t / 0.3)
add(band(z, 150, 5000), 11.45, 0.08)
# a subida até a marca
add(whoosh(1.0, 300, 1500, 4000, 15000, "up"), 11.22, 0.5)
t = t_axis(1.0)
add(np.sin(2 * np.pi * np.cumsum(110 + 330 * (t / 1.0) ** 2) / SR) * (t / 1.0) ** 2, 11.22, 0.07)

# ---------------- 12.2: a marca ----------------
add(boom(2.8), 12.2, 0.75)
add(kick(0.7, 130, 40, 1.0), 12.2, 0.5)
final = pad(CH["F"] + [note(72), note(76)], 2.8, bright=3000, attack=0.02, release=0.9)
add(final, 12.2, 0.3)
for i, n_ in enumerate([65, 69, 72, 79]):
    add(bell(note(n_ + 12), 2.4), 12.2 + i * 0.07, 0.07, pan=-0.3 + 0.2 * i)
add(tick(2200, 0.06), 12.88, 0.2)   # a caneta assenta
add(bell(note(91), 1.2), 13.32, 0.07)  # o botão
add(tick(3000, 0.05), 13.32, 0.18)

# ---------------- mixagem ----------------
mix = reverb(np.array([L, R]), 2.4, 0.22)
fade = np.ones(N)
fn = int(0.7 * SR)
fade[-fn:] = np.linspace(1, 0, fn) ** 1.5
mix *= fade
mix = np.tanh(mix / (np.abs(mix).max() + 1e-9) * 1.3) / np.tanh(1.3)
mix *= 10 ** (-1.0 / 20)
pcm = (mix.T * 32767).astype(np.int16)

with wave.open(sys.argv[1] if len(sys.argv) > 1 else "soundtrack.wav", "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
