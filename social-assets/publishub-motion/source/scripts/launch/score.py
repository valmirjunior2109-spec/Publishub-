"""A trilha, o design de som e a mixagem do filme de lançamento "AI builds faster. Publishub makes sure it works."

Tudo sintetizado aqui (numpy + scipy): nenhuma amostra gravada, nenhuma música de terceiros. Os tempos vêm de
src/launch/timeline.json (o mesmo arquivo que a animação lê), então cada som cai no quadro do gesto.

    python scripts/launch/score.py

Saídas em public/launch/: music.wav, sfx.wav, vo.wav (as três pistas, editáveis) e mix.wav (a mixagem final,
-14 LUFS, pico -1 dBTP, normalizada pelo ffmpeg).
"""
import json
import subprocess
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy import signal

ROOT = Path(__file__).resolve().parents[2]
T = json.loads((ROOT / "src/launch/timeline.json").read_text())
OUT = ROOT / "public/launch"
SR = 48000
DUR = T["seconds"]
N = int(DUR * SR)
BEAT = 60 / T["bpm"]
CUE = T["cues"]
SC = T["scenes"]
rng = np.random.default_rng(7)


def bus():
    return np.zeros((2, N), dtype=np.float64)


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def add(b, x, at, gain=1.0, pan=0.0):
    """Soma o sinal x (mono ou estéreo) no bus b a partir de `at` segundos."""
    if x.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        x = np.vstack([x * l * 1.414, x * r * 1.414])
    s = int(round(at * SR))
    if s >= N:
        return
    if s < 0:
        x = x[:, -s:]
        s = 0
    n = min(x.shape[1], N - s)
    b[:, s : s + n] += x[:, :n] * gain


def t_(dur):
    return np.arange(int(dur * SR)) / SR


def env_adsr(n, a=0.005, d=0.1, s=0.7, r=0.2):
    a_, d_, r_ = int(a * SR), int(d * SR), int(r * SR)
    sus = max(0, n - a_ - d_ - r_)
    e = np.concatenate([np.linspace(0, 1, max(1, a_)), np.linspace(1, s, max(1, d_)), np.full(sus, s), np.linspace(s, 0, max(1, r_))])
    return np.pad(e, (0, max(0, n - len(e))))[:n]


def polyblep(ph, dt):
    out = np.zeros_like(ph)
    m = ph < dt
    x = ph[m] / dt
    out[m] = x + x - x * x - 1
    m = ph > 1 - dt
    x = (ph[m] - 1) / dt
    out[m] = x * x + x + x + 1
    return out


def saw(f, dur, phase=0.0):
    n = int(dur * SR)
    dt = f / SR
    ph = (phase + np.arange(n) * dt) % 1.0
    return 2 * ph - 1 - polyblep(ph, dt)


def sine(f, dur, phase=0.0):
    return np.sin(2 * np.pi * f * t_(dur) + phase)


def lp(x, fc, order=2):
    sos = signal.butter(order, min(fc, SR * 0.45), "low", fs=SR, output="sos")
    return signal.sosfilt(sos, x, axis=-1)


def hp(x, fc, order=2):
    sos = signal.butter(order, fc, "high", fs=SR, output="sos")
    return signal.sosfilt(sos, x, axis=-1)


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, min(hi, SR * 0.45)], "band", fs=SR, output="sos")
    return signal.sosfilt(sos, x, axis=-1)


def sweep_lp(x, f0, f1, block=256, curve=2.0):
    """Passa-baixa que abre (ou fecha) de f0 a f1 ao longo do sinal, em blocos, com estado contínuo."""
    out = np.zeros_like(x)
    zi = None
    nb = int(np.ceil(len(x) / block))
    for i in range(nb):
        p = (i / max(1, nb - 1)) ** curve
        fc = f0 * (f1 / f0) ** p
        sos = signal.butter(2, min(fc, SR * 0.45), "low", fs=SR, output="sos")
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        seg = x[i * block : (i + 1) * block]
        y, zi = signal.sosfilt(sos, seg, zi=zi)
        out[i * block : i * block + len(seg)] = y
    return out


def make_ir(dur=2.4, decay=2.6, bright=6000, seed=1):
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    e = np.exp(-np.arange(n) / SR * decay)
    ir = np.vstack([lp(r.standard_normal(n), bright) * e, lp(r.standard_normal(n), bright) * e])
    ir[:, : int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
    return ir / np.sqrt((ir**2).sum(axis=1, keepdims=True))


IR_HALL = make_ir(3.2, 2.0, 5000, 1)
IR_ROOM = make_ir(0.9, 6.0, 7000, 2)


def reverb(b, ir, wet):
    y = np.vstack([signal.fftconvolve(b[0], ir[0])[:N], signal.fftconvolve(b[1], ir[1])[:N]])
    return b + y * wet


def delay(b, secs, fb=0.35, mix=0.3, lpf=4000):
    d = int(secs * SR)
    y = np.zeros_like(b)
    tap = b.copy()
    g = mix
    for k in range(1, 6):
        tap = lp(tap, lpf, 1)
        sh = np.zeros_like(b)
        sh[:, d * k :] = tap[:, : N - d * k]
        # pingue-pongue: alterna os lados
        if k % 2:
            sh = sh[::-1]
        y += sh * g
        g *= fb
    return b + y


# ---------------------------------------------------------------- instrumentos


def kick(gain=1.0, punch=1.0):
    t = t_(0.55)
    f = 46 + 110 * np.exp(-t * 32) * punch
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 6.5)
    click = hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 300) * 0.25
    return np.tanh((body + click) * 1.6) * gain


def clap():
    t = t_(0.35)
    n = rng.standard_normal(len(t))
    e = np.zeros(len(t))
    for k, o in enumerate([0, 0.011, 0.022]):
        s = int(o * SR)
        e[s:] += np.exp(-(t[: len(t) - s]) * (60 if k < 2 else 16))
    return bp(n, 900, 5000) * e * 0.55


def hat(open_=False):
    t = t_(0.25 if open_ else 0.06)
    n = hp(rng.standard_normal(len(t)), 7500)
    return n * np.exp(-t * (14 if open_ else 70)) * 0.32


def snare():
    t = t_(0.3)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.5
    n = bp(rng.standard_normal(len(t)), 1500, 9000) * np.exp(-t * 18)
    return (tone + n) * 0.5


def pluck(m, dur=0.2, bright=4200):
    n = int(dur * SR)
    x = saw(hz(m), dur) * 0.6 + saw(hz(m) * 1.004, dur) * 0.4
    t = t_(dur)
    fc = 300 + bright * np.exp(-t * 26)
    # filtro com envelope: dois blocos bastam para um pluck curto
    y = sweep_lp(x, fc[0], fc[-1], block=128, curve=0.35)
    return y * env_adsr(n, 0.002, 0.08, 0.25, 0.08) * 0.35


def bass_note(m, dur, cutoff=420):
    x = saw(hz(m), dur) * 0.55 + np.sign(np.sin(2 * np.pi * hz(m) * t_(dur))) * 0.25 + sine(hz(m) / 2, dur) * 0.5
    return lp(x, cutoff, 4) * env_adsr(len(x), 0.004, 0.06, 0.8, 0.05) * 0.55


def pad(notes, dur, cutoff=2200, att=0.6, rel=0.9, detune=0.11):
    n = int(dur * SR)
    L = np.zeros(n)
    R = np.zeros(n)
    for m in notes:
        f = hz(m)
        for k, d in enumerate([-detune, 0, detune]):
            ff = f * 2 ** (d / 12)
            s = saw(ff, dur, phase=rng.random())
            if k == 0:
                L += s
            elif k == 2:
                R += s
            else:
                L += s * 0.7
                R += s * 0.7
    e = env_adsr(n, att, 0.3, 0.85, rel)
    st = np.vstack([lp(L, cutoff, 2), lp(R, cutoff, 2)]) * e / (len(notes) * 2.4)
    return st


def bell(m, dur=1.6):
    t = t_(dur)
    f = hz(m)
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 3) + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 6)
    return x * np.exp(-t * 2.8) * 0.18


def impact(size=1.0):
    t = t_(3.0)
    f = 32 + 70 * np.exp(-t * 9)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6)
    n = lp(rng.standard_normal(len(t)), 1800) * np.exp(-t * 7) * 0.6
    crack = hp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 40) * 0.4
    return np.tanh((sub * 1.2 + n + crack) * 1.3) * 0.8 * size


def riser(dur, f0=300, f1=9000, gain=0.35):
    n = int(dur * SR)
    x = rng.standard_normal(n)
    y = sweep_lp(x, f0, f1, curve=1.6)
    y = hp(y, 200)
    t = t_(dur)
    tone = saw(1, dur) * 0  # sem tom de sirene: só o ar subindo
    e = (t / dur) ** 2.2
    return (y + tone) * e * gain


def reverse_swell(dur=0.7, gain=0.5):
    n = int(dur * SR)
    x = lp(rng.standard_normal(n), 6000) * np.exp(-np.arange(n) / SR * 5)
    x = signal.fftconvolve(x, IR_HALL[0][: int(1.2 * SR)])[:n]
    x = x[::-1]
    return x / (np.abs(x).max() + 1e-9) * gain


def whoosh(dur=0.5, up=True, gain=0.35):
    n = int(dur * SR)
    x = rng.standard_normal(n)
    y = sweep_lp(x, 400 if up else 7000, 7000 if up else 400, curve=1.0)
    t = np.linspace(0, 1, n)
    e = np.sin(np.pi * t) ** 1.5
    return hp(y, 250) * e * gain


def ui_click(gain=0.4):
    t = t_(0.04)
    x = bp(rng.standard_normal(len(t)), 1800, 7000) * np.exp(-t * 260) + np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 180) * 0.4
    return x * gain


def tick(gain=0.18, f=3200):
    t = t_(0.025)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 300) * gain


def ping(m=88, gain=0.22):
    t = t_(0.5)
    x = np.sin(2 * np.pi * hz(m) * t) + 0.5 * np.sin(2 * np.pi * hz(m + 7) * t) * np.exp(-t * 8)
    return x * np.exp(-t * 9) * gain


def blip(m, dur=0.07, gain=0.12):
    """Blip 8-bit (onda quadrada), a voz da marca pixel-art."""
    t = t_(dur)
    x = np.sign(np.sin(2 * np.pi * hz(m) * t))
    return lp(x, 6000, 1) * env_adsr(len(t), 0.001, 0.02, 0.6, 0.02) * gain


def error_buzz(gain=0.3):
    out = np.zeros(int(0.42 * SR))
    for o in (0, 0.16):
        t = t_(0.12)
        x = np.sign(np.sin(2 * np.pi * 110 * t)) * 0.6 + saw(116.5, 0.12) * 0.4
        x = lp(x, 1600) * env_adsr(len(t), 0.002, 0.02, 0.8, 0.03)
        s = int(o * SR)
        out[s : s + len(x)] += x
    return out * gain


def glitch(dur=0.35, gain=0.35):
    n = int(dur * SR)
    x = np.zeros(n)
    pos = 0
    while pos < n:
        seg = int(rng.uniform(0.012, 0.05) * SR)
        kind = rng.integers(0, 3)
        tt = np.arange(seg) / SR
        if kind == 0:
            s = np.sign(np.sin(2 * np.pi * rng.uniform(180, 1400) * tt))
        elif kind == 1:
            s = rng.standard_normal(seg)
            s = np.round(s * 3) / 3
        else:
            s = np.zeros(seg)
        x[pos : pos + seg] = s[: n - pos]
        pos += seg
    return lp(x, 7000) * gain


def typing(dur, rate=18, gain=0.08):
    n = int(dur * SR)
    out = np.zeros(n)
    tt = 0.0
    while tt < dur:
        c = tick(gain * rng.uniform(0.6, 1.0), rng.uniform(2200, 4200))
        add_mono(out, c, tt)
        tt += rng.uniform(0.6, 1.4) / rate
    return out


def add_mono(buf, x, at):
    s = int(at * SR)
    n = min(len(x), len(buf) - s)
    if n > 0:
        buf[s : s + n] += x[:n]


# ---------------------------------------------------------------- harmonia

CH = {
    "Am": (45, [57, 60, 64, 67]),
    "F": (41, [53, 57, 60, 64]),
    "C": (48, [55, 60, 64, 67]),
    "G": (43, [55, 59, 62, 69]),
    "Dm": (38, [53, 57, 62, 65]),
    "Bb": (34, [53, 58, 62, 65]),
    "E": (40, [52, 56, 59, 64]),
    "Fmaj9": (41, [53, 57, 60, 64, 67]),
}

music = bus()
drums = bus()
arp = bus()
sfx = bus()


def chords(seq, start, bar=2 * 4 * BEAT / 2, cutoff=2200, gain=1.0, bass=True, bass_cut=420, bass_gain=1.0, eighths=True):
    """seq: lista de (acorde, compassos). bar = 2 s (4 tempos a 120 BPM)."""
    bar = 4 * BEAT
    t = start
    for name, bars in seq:
        root, notes = CH[name]
        d = bars * bar
        add(music, pad(notes, d + 0.6, cutoff=cutoff), t, gain)
        if bass:
            if eighths:
                k = 0
                while k * BEAT / 2 < d - 1e-6:
                    m = root + (12 if k % 8 == 6 else 0)
                    add(music, bass_note(m, BEAT / 2 * 0.9, bass_cut), t + k * BEAT / 2, 0.75 * bass_gain)
                    k += 1
            else:
                add(music, bass_note(root, d, bass_cut), t, 0.7 * bass_gain)
        t += d
    return t


def arpeggio(seq, start, gain=0.5, octave=12, pattern=(0, 1, 2, 3, 2, 1, 3, 2)):
    bar = 4 * BEAT
    t = start
    for name, bars in seq:
        _, notes = CH[name]
        steps = int(bars * 16)
        for k in range(steps):
            m = notes[pattern[k % len(pattern)] % len(notes)] + octave
            add(arp, pluck(m, 0.16), t + k * BEAT / 4, gain * (1.0 if k % 4 == 0 else 0.7), pan=0.35 * np.sin(k * 0.7))
        t += bars * bar


def groove(a, b, kick_on=True, clap_on=True, hats="16", gain=1.0):
    k = 0
    t = a
    while t < b - 1e-6:
        if kick_on:
            add(drums, kick(), t, 0.9 * gain)
        if clap_on and k % 2 == 1:
            add(drums, clap(), t, 0.55 * gain, pan=0.0)
        if hats == "16":
            for j in range(4):
                v = [0.35, 0.18, 0.6, 0.22][j]
                add(drums, hat(open_=(j == 2 and k % 4 == 3)), t + j * BEAT / 4, v * gain, pan=0.25)
        elif hats == "8":
            add(drums, hat(), t + BEAT / 2, 0.45 * gain, pan=0.25)
        k += 1
        t += BEAT


# ---- HOOK 0–4: tenso. Tique-taque, dois "ok", o clique e o erro.
h0, h1 = SC["hook"]
add(sfx, impact(0.45), 0.0, 0.7)
add(sfx, typing(0.45, 22, 0.1), 0.02)
drone = np.vstack([lp(saw(hz(33), 4.2) + saw(hz(33) * 1.003, 4.2), 300), lp(saw(hz(33) * 0.997, 4.2) + saw(hz(33), 4.2), 300)]) * 0.12
drone *= np.linspace(0.4, 1.0, drone.shape[1])
add(music, drone, 0.0)
for j in range(int(2.0 / (BEAT / 4))):
    add(drums, hat(), j * BEAT / 4, 0.18 if j % 4 else 0.3, pan=0.3)
add(sfx, ping(88), CUE["hookCheck1"], 0.9, pan=-0.2)
add(sfx, ping(91), CUE["hookCheck2"], 0.9, pan=0.2)
add(sfx, ui_click(0.55), CUE["hookClick"])
add(sfx, glitch(0.32, 0.3), CUE["hookError"])
add(sfx, error_buzz(0.32), CUE["hookError"])
add(sfx, impact(0.6), CUE["hookError"], 0.7)
# dissonância depois do erro: lá e si bemol juntos
dis = pad([57, 58, 64], 1.4, cutoff=1400, att=0.3, rel=0.4)
add(music, dis, 2.8, 0.7)
add(sfx, reverse_swell(0.7, 0.45), h1 - 0.7)

# ---- ERA 4–11.5: a revolução. Groove entra, otimista.
e0, e1 = SC["era"]
seq_era = [("Am", 1), ("F", 1), ("C", 1), ("G", 0.75)]
chords(seq_era, e0, cutoff=2600)
arpeggio([("F", 1), ("C", 1), ("G", 0.75)], e0 + 2.0, gain=0.42)
groove(e0, e1 - 0.5, kick_on=True, clap_on=True, hats="8")
add(sfx, impact(0.5), e0, 0.6)
for c in ("eraTool1", "eraTool2", "eraTool3"):
    add(sfx, blip(84 if c != "eraTool3" else 91, 0.08, 0.1), CUE[c])
    add(sfx, tick(0.15), CUE[c])
add(sfx, whoosh(0.45, True, 0.28), CUE["eraMinutes"] - 0.3)
# a música "afunda" no fim: fita desacelerando
add(sfx, whoosh(0.5, False, 0.3), e1 - 0.5)

# ---- PROBLEM 11.5–20: escuro. Batimento, harmonia tensa, a quebra e o silêncio.
p0, p1 = SC["problem"]
seq_prob = [("Dm", 1), ("Am", 1), ("Bb", 1), ("E", 1.25)]
chords(seq_prob, p0, cutoff=900, bass=True, bass_cut=220, bass_gain=0.8, eighths=False)
t = p0
while t < p1 - 0.6:
    add(drums, kick(punch=0.5), t, 0.55)
    add(drums, kick(punch=0.4), t + 0.22, 0.32)
    t += 1.0
# tom alto e frio
add(music, np.vstack([sine(hz(88), p1 - p0 - 0.3), sine(hz(88) * 1.004, p1 - p0 - 0.3)]) * np.linspace(0, 0.03, int((p1 - p0 - 0.3) * SR)), p0)
add(sfx, whoosh(0.6, True, 0.3), CUE["probZoom"] - 0.35)
add(sfx, glitch(0.25, 0.25), CUE["probBreak"])
add(sfx, error_buzz(0.22), CUE["probBreak"])
add(sfx, impact(0.4), CUE["probBreak"], 0.6)
add(sfx, ui_click(0.45), CUE["probUserClick"])
add(sfx, riser(p1 - 0.25 - CUE["probUser"], 250, 10000, 0.3), CUE["probUser"])

# ---- REVEAL 20–24: o silêncio, o impacto e a luz. O logo se monta em blips 8-bit.
r0, r1 = SC["reveal"]
add(sfx, impact(1.0), r0, 1.0)
add(music, pad(CH["Fmaj9"][1], r1 - r0 + 0.8, cutoff=3400, att=0.25, rel=1.2), r0, 1.1)
add(music, bass_note(29, r1 - r0, 160), r0, 0.6)
for k, m in enumerate([77, 81, 84, 88, 91, 84, 88, 93]):
    add(music, bell(m, 1.4), r0 + 0.5 + k * BEAT / 2, 0.55, pan=0.5 * np.sin(k))
for k in range(9):
    add(sfx, blip(72 + [0, 4, 7, 12, 7, 12, 16, 19, 24][k], 0.05, 0.06), r0 + 0.12 + k * 0.075)
add(sfx, ping(96, 0.15), CUE["revLogo"] + 0.95)
add(sfx, reverse_swell(0.8, 0.5), r1 - 0.8)
add(drums, snare(), r1 - 0.25, 0.35)
add(drums, snare(), r1 - 0.125, 0.45)

# ---- PRODUCT 24–41.5: o groove principal, limpo. A interface dita os sons.
q0, q1 = SC["product"]
seq_prod = [("Am", 1), ("F", 1), ("C", 1), ("G", 1)] * 2 + [("Am", 0.75)]
chords(seq_prod, q0, cutoff=2400, gain=0.85)
arpeggio(seq_prod, q0, gain=0.34)
groove(q0, q1 - 0.5, hats="16", gain=0.85)
add(sfx, impact(0.45), q0, 0.5)
for k in range(5):
    add(sfx, tick(0.22, 2900 + k * 180), CUE["prodSelect"] + k * 0.24)
add(sfx, ui_click(0.5), CUE["prodRun"])
for k, at in enumerate([28.55, 29.25, 29.95]):
    add(sfx, ping(88 + k * 2, 0.17), at, pan=-0.2 + k * 0.2)
add(sfx, error_buzz(0.3), CUE["prodFail"])
add(sfx, whoosh(0.5, True, 0.26), CUE["prodCompare"] - 0.3)
add(sfx, whoosh(0.9, False, 0.16), CUE["prodCompare"] + 0.9)  # a cortina da comparação
add(sfx, whoosh(0.5, True, 0.26), CUE["prodReport"] - 0.3)
add(sfx, ui_click(0.5), CUE["prodCopy"])
add(sfx, ping(93, 0.17), CUE["prodCopy"] + 0.2)
add(sfx, whoosh(0.5, False, 0.3), q1 - 0.5)

# ---- PAYOFF 41.5–45: a subida.
y0, y1 = SC["payoff"]
add(music, pad([53, 57, 60, 65], 1.5 + 0.4, cutoff=1800), y0, 0.9)
add(music, pad([55, 59, 62, 67], 2.0 + 0.4, cutoff=3000), y0 + 1.5, 0.9)
add(music, bass_note(41, 1.5, 300), y0, 0.6)
add(music, bass_note(43, 2.0, 300), y0 + 1.5, 0.6)
roll_t = y0 + 0.5
step = BEAT / 2
while roll_t < y1 - 0.02:
    v = 0.12 + 0.4 * (roll_t - y0) / (y1 - y0)
    add(drums, snare(), roll_t, v)
    if roll_t > y1 - 1.0:
        step = BEAT / 4
    roll_t += step
add(drums, kick(), y0, 0.8)
add(sfx, riser(y1 - y0 - 0.1, 300, 12000, 0.32), y0)

# ---- END 45–58: o hino. Tudo junto, os CTAs, o último impacto e a cauda.
z0, z1 = SC["end"]
hit = CUE["endHit"]
add(sfx, impact(1.0), z0, 0.95)
seq_end = [("F", 1), ("G", 1), ("Am", 1), ("F", 1), ("G", 1.25)]
chords(seq_end, z0, cutoff=3200, gain=1.0)
arpeggio(seq_end, z0, gain=0.36)
groove(z0, hit - 0.01, hats="16", gain=0.9)
# acorde final: dó maior aberto, com sino e cauda longa
add(music, pad([48, 55, 60, 64, 67, 72], z1 - hit, cutoff=3800, att=0.02, rel=1.6), hit, 1.25)
add(music, bass_note(36, 1.8, 200), hit, 0.8)
add(sfx, impact(0.9), hit, 0.9)
for k, m in enumerate([84, 88, 91, 96]):
    add(music, bell(m, 2.5), hit + k * 0.09, 0.6, pan=-0.3 + k * 0.2)
add(sfx, whoosh(0.45, True, 0.25), CUE["endWaitlist"] - 0.25)
add(sfx, whoosh(0.45, True, 0.25), CUE["endFounding"] - 0.25)
for k, m in enumerate([84, 91, 96]):
    add(sfx, blip(m, 0.07, 0.11), CUE["endZero"] + k * 0.07)
add(sfx, ui_click(0.55), CUE["endClick"])
add(sfx, ping(96, 0.16), CUE["endClick"] + 0.15)
add(sfx, typing(0.6, 26, 0.08), CUE["endUrl"])

# ---------------------------------------------------------------- mixagem

# a música ganha espaço: delay no arpejo, sala na bateria, sala grande nos pads
arp_d = delay(arp, BEAT * 0.75, fb=0.35, mix=0.28, lpf=3500)
music_full = reverb(music, IR_HALL, 0.22) + reverb(arp_d, IR_HALL, 0.15) * 0.9 + reverb(drums, IR_ROOM, 0.08)
music_full = hp(music_full, 28)
sfx_full = reverb(sfx, IR_HALL, 0.12)

# a voz
vo = np.zeros(N)
VO = json.loads((ROOT / "src/launch/vo.json").read_text())
for line in VO["lines"]:
    x, rate = sf.read(OUT / "vo" / f"{line['id']}.wav")
    if x.ndim > 1:
        x = x.mean(axis=1)
    x = signal.resample_poly(x, SR, rate)
    add_mono(vo, x, T["vo"][line["id"]])
vo = hp(vo, 90)
# presença suave (2–5 kHz) e um compressor simples
vo = vo + bp(vo, 2500, 6000) * 0.25
env = np.abs(vo)
env = signal.filtfilt(*signal.butter(1, 25, fs=SR), env)
gain = np.where(env > 0.12, (0.12 / np.maximum(env, 1e-9)) ** 0.5, 1.0)
vo = vo * gain
vo = vo / (np.abs(vo).max() + 1e-9) * 0.8
vo_st = np.vstack([vo, vo])
vo_st = reverb(vo_st, IR_ROOM, 0.05)

# ducking: a música abaixa ~7 dB enquanto a voz fala (ataque 30 ms, soltura 350 ms)
lvl = np.abs(vo)
att, rel = np.exp(-1 / (0.03 * SR)), np.exp(-1 / (0.35 * SR))
# envelope com ataque e soltura, em numpy: aproximado por dois filtros
fast = signal.lfilter([1 - att], [1, -att], lvl)
slow = signal.lfilter([1 - rel], [1, -rel], lvl)
e = np.maximum(fast, slow)
e = e / (e.max() + 1e-9)
duck = 1 - 0.68 * np.clip(e * 6, 0, 1)
music_d = music_full * duck

master = music_d * 0.5 + sfx_full * 0.7 + vo_st * 1.0
# fade de saída na cauda
fo = int(1.2 * SR)
master[:, -fo:] *= np.linspace(1, 0, fo) ** 1.5
master = np.tanh(master * 1.1) / 1.1

OUT.mkdir(parents=True, exist_ok=True)
sf.write(OUT / "music.wav", (music_d * 0.5).T.astype(np.float32), SR, subtype="FLOAT")
sf.write(OUT / "sfx.wav", (sfx_full * 0.7).T.astype(np.float32), SR, subtype="FLOAT")
sf.write(OUT / "vo.wav", vo_st.T.astype(np.float32), SR, subtype="FLOAT")
pre = OUT / "mix-pre.wav"
sf.write(pre, master.T.astype(np.float32), SR, subtype="FLOAT")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(pre), "-af", "loudnorm=I=-14:TP=-1.0:LRA=9", "-ar", "48000", "-c:a", "pcm_s16le", str(OUT / "mix.wav")], check=True)
pre.unlink()
print("ok", OUT / "mix.wav")
