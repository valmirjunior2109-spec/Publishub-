// Publishub · Reel "O caderno": a trilha. Lê src/caderno/timeline.json, o mesmo que a animação.
// Saída: public/caderno/soundtrack.wav.
//
// Pop eletrônico de lançamento de startup, 120 BPM (1 tempo = 15 quadros), C → G → Am → F:
// bumbo reto, palmas no 2 e no 4, chimbal aberto no contratempo, baixo de house, pad que
// "respira" com o bumbo e um pluck brilhante fazendo o riff. Sem som de caneta.
//   - o gancho: a batida chega abafada e um riser sobe com os risquinhos;
//   - o post-it: a fita da música "freia" e para; o "isn't a timestamp" fecha num baixo seco;
//   - a etiqueta com o logo: o drop, a música inteira entra;
//   - o fecho: breakdown só com pad e pluck; a página vira, sobe de novo e o logo cai no último acorde.
// Tudo sintetizado aqui e em synth.mjs, nenhuma amostra gravada.
//
//   node scripts/make-sound-caderno.mjs

import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createMixer } from "./synth.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const T = JSON.parse(readFileSync(join(here, "../src/caderno/timeline.json"), "utf8"));
const { sec, midi, voice, biquad, noise, decay, kick, boom, snip, whoosh, riser, bell, render, SR } = createMixer(T);

const BEAT = 0.5; // 120 BPM
const BAR = BEAT * 4;
const DROP = sec(T.turn.tape); // a etiqueta com o logo
const GRID = DROP % BEAT; // os tempos caem no mesmo grid do drop
const END = sec(T.durationInFrames);

/* ---------- os instrumentos ---------- */

const saw = (ph) => 2 * (ph - Math.floor(ph + 0.5));

/** Palma: três estalos colados em banda média, com sala. */
function clap(at, gain = 0.22) {
  const bp = biquad("bp", 1250, 0.9);
  voice(at, 0.32, (t) => {
    const burst = [0, 0.008, 0.017].reduce((a, o) => a + (t >= o ? decay(t - o, 0.0005, 0.006) : 0), 0) * 0.5;
    return bp(noise()) * (burst + decay(t, 0.002, 0.08)) * 1.7;
  }, { gain, pan: 0.04, send: 0.32 });
}

function openHat(at, gain = 0.05) {
  const hp = biquad("hp", 8000);
  voice(at, 0.2, (t) => hp(noise()) * decay(t, 0.001, 0.06), { gain, pan: 0.2 });
}

function shaker(at, gain = 0.018, pan = -0.25) {
  const hp = biquad("hp", 6000);
  voice(at, 0.06, (t) => hp(noise()) * decay(t, 0.004, 0.014), { gain, pan });
}

/** Quanto o bumbo "empurra" o resto (sidechain): 1 longe do tempo, ~0,3 logo depois dele. */
const pump = (t) => {
  const since = ((t - GRID) % BEAT + BEAT) % BEAT;
  return 1 - 0.68 * Math.exp(-since / 0.11);
};

/** Pad de serras desafinadas, filtrado, respirando com o bumbo. `cut` é o filtro (Hz). */
function pad(at, dur, notes, { gain = 0.03, cut = 2200 } = {}) {
  notes.forEach((n, k) => {
    [-0.11, 0, 0.13].forEach((det, j) => {
      const f = midi(n + det);
      const lp = biquad("lp", cut, 0.7);
      let ph = (k * 0.37 + j * 0.21) % 1;
      voice(at, dur + 0.25, (t) => {
        ph += f / SR;
        const env = Math.min(1, t / 0.06) * (t > dur ? Math.max(0, 1 - (t - dur) / 0.25) : 1);
        return lp(saw(ph)) * env * pump(at + t);
      }, { gain: gain / 3, pan: (j - 1) * 0.6, send: 0.25 });
    });
  });
}

/** Pluck brilhante: serra + quadrada com o filtro fechando rápido. */
function pluck(at, note, gain = 0.07, pan = 0, bright = 1) {
  const f = midi(note);
  const lp = biquad("lp", 5000, 1.2);
  let ph = 0;
  voice(at, 0.45, (t, i) => {
    if (i % 32 === 0) lp.set(500 + 5200 * bright * Math.exp(-t / 0.07));
    ph += f / SR;
    const sq = ph % 1 < 0.5 ? 1 : -1;
    return lp(saw(ph) * 0.6 + sq * 0.4) * decay(t, 0.002, 0.16);
  }, { gain, pan, send: 0.3 });
}

/** Baixo de house: senoide com um pouco de serra, no contratempo. */
function bass(at, note, dur = BEAT * 0.45, gain = 0.2) {
  const f = midi(note);
  const lp = biquad("lp", 380, 0.9);
  let ph = 0;
  voice(at, dur, (t) => {
    ph += f / SR;
    const env = Math.min(1, t / 0.006) * Math.min(1, (dur - t) / 0.03);
    return lp(Math.sin(2 * Math.PI * ph) + 0.35 * saw(ph)) * env;
  }, { gain });
}

/** A fita da música freando: um tom que cai de altura em 0,4 s (o "record stop"). */
function tapeStop(at, notes, dur = 0.45, gain = 0.06) {
  notes.forEach((n) => {
    const f0 = midi(n);
    const lp = biquad("lp", 1800);
    let ph = 0;
    voice(at, dur, (t) => {
      const k = t / dur;
      ph += (f0 * (1 - k) ** 2) / SR;
      return lp(saw(ph)) * (1 - k);
    }, { gain });
  });
}

/** O post-it batendo: tapa grave com estalo de papel. */
function slap(at, gain = 0.45) {
  const lp = biquad("lp", 1100);
  voice(at, 0.25, (t) => lp(noise()) * decay(t, 0.001, 0.035) * 2.5 + Math.sin(2 * Math.PI * 110 * t) * decay(t, 0.001, 0.05), { gain, send: 0.15 });
}

/* ---------- a harmonia ---------- */

const PROG = [
  { root: 36, chord: [60, 64, 67, 72] }, // C
  { root: 43, chord: [59, 62, 67, 71] }, // G
  { root: 45, chord: [57, 60, 64, 69] }, // Am
  { root: 41, chord: [57, 60, 65, 69] }, // F
];
const barAt = (t) => PROG[((Math.floor((t - DROP) / BAR) % 4) + 4) % 4];
// o riff do pluck: semicolcheias com respiros (índice no acorde, uma oitava acima)
const RIFF = [3, null, 2, null, 1, 3, null, 2, null, 3, null, 1, 2, null, 3, null];

/** A batida inteira entre `a` e `b` (segundos). `parts` liga cada camada. */
function groove(a, b, { kickOn = true, clapOn = true, hats = true, bassOn = true, riff = true, padCut = 2600, padGain = 0.03, riffGain = 0.055, kickGain = 0.62 } = {}) {
  const first = Math.ceil((a - GRID) / BEAT - 1e-6);
  for (let i = first; GRID + i * BEAT < b - 0.01; i++) {
    const t = GRID + i * BEAT;
    const beatInBar = (((Math.round((t - DROP) / BEAT)) % 4) + 4) % 4;
    const ch = barAt(t);
    if (kickOn) kick(t, { gain: kickGain, f0: 125, f1: 45, d: 0.2 });
    if (clapOn && beatInBar % 2 === 1) clap(t);
    if (hats) {
      openHat(t + BEAT / 2, 0.045);
      shaker(t + BEAT / 4);
      shaker(t + (3 * BEAT) / 4);
    }
    if (bassOn) bass(t + BEAT / 2, ch.root - 12 + (beatInBar === 3 ? 7 : 0));
    if (beatInBar === 0 || t === GRID + first * BEAT) pad(t, Math.min(BAR - beatInBar * BEAT, b - t), ch.chord, { cut: padCut, gain: padGain });
    if (riff) {
      for (let s = 0; s < 4; s++) {
        const n = RIFF[beatInBar * 4 + s];
        const ts = t + s * (BEAT / 4);
        if (n !== null && ts < b) pluck(ts, ch.chord[n] + 12, riffGain, s % 2 ? 0.3 : -0.3);
      }
    }
  }
}

/* ---------- 0–2,2 s · o gancho: a batida chega abafada ---------- */

const hookEnd = sec(T.sticky.slap);
groove(0, hookEnd, { clapOn: false, bassOn: false, riff: false, padCut: 700, kickGain: 0.4 });
riser(0.1, sec(T.tally.circle[1]) - 0.1, 0.22);
pluck(sec(T.tally.circle[1]), 84, 0.08, 0, 1.2);
pluck(sec(T.tally.circle[1]) + 0.08, 91, 0.06, 0.2, 1.2);

/* ---------- 2,3–5,6 s · o post-it: a música freia ---------- */

slap(hookEnd, 0.55);
tapeStop(hookEnd, [48, 55, 60], 0.5, 0.05);
// o relógio volta sozinho enquanto a caneta pergunta "WHERE?"
// sem música, mas com pulso: bumbo baixo, chimbal e o pad abafado esperando o drop
groove(hookEnd + 0.5, sec(T.sticky.under[1]), { clapOn: false, bassOn: false, riff: false, padCut: 500, kickGain: 0.3 });
bass(sec(T.sticky.under[1]), 36, 0.35, 0.32); // o ponto final, seco
riser(sec(T.sticky.under[1]) + 0.05, DROP - sec(T.sticky.under[1]) - 0.05, 0.3);

/* ---------- 5,6–18,7 s · o drop: a música inteira ---------- */

const breakdown = sec(T.payoff.l1[0]);
boom(DROP, 0.55);
whoosh(DROP - 0.2, 0.3, 600, 4000, 0.1);
groove(DROP, breakdown);

/* ---------- os gestos, sem caneta ---------- */

bell(sec(T.chart.dot), 84, { gain: 0.06, d: 0.8 });
for (const f of [T.chart.photo, T.decide.photo]) slap(sec(f), 0.28);
T.decide.ticks.forEach((f, i) => pluck(sec(f) + 0.05, [76, 79, 84][i], 0.09, 0, 1.3));
T.strip.snips.forEach((f, i) => snip(sec(f), i % 2 ? 0.15 : -0.15, 0.38));
whoosh(sec(T.strip.fall), 0.5, 2000, 400, 0.1);
whoosh(sec(T.strip.slide[0]), (T.strip.slide[1] - T.strip.slide[0]) / T.fps, 300, 1200, 0.06);
[72, 76, 79, 84].forEach((n, i) => pluck(sec(T.strip.big[1]) + i * 0.06, n + 12, 0.07, -0.3 + i * 0.2, 1.3));

/* ---------- 18,7–21,3 s · breakdown; a página vira; o logo ---------- */

const turnAt = sec(T.end.turn[0]);
groove(breakdown, turnAt, { kickOn: false, clapOn: true, bassOn: false, hats: true, padCut: 2200, padGain: 0.075, riffGain: 0.075 });
for (let t = turnAt - BAR / 2; t < turnAt; t += BEAT / 4) clap(t, 0.06 + 0.12 * ((t - (turnAt - BAR / 2)) / (BAR / 2))); // as palmas acelerando para a volta
riser(turnAt - 0.9, 0.9 + (T.end.zoom[1] - T.end.turn[0]) / T.fps, 0.26);
whoosh(turnAt, (T.end.turn[1] - T.end.turn[0]) / T.fps + 0.2, 500, 3000, 0.16);

const logoAt = sec(T.end.zoom[1]);
boom(logoAt, 0.5);
kick(logoAt, { gain: 0.7 });
pad(logoAt, END - logoAt - 0.6, [48, 60, 64, 67, 71, 74], { gain: 0.045, cut: 3200 }); // Cmaj9
[72, 76, 79, 83, 86].forEach((n, i) => pluck(logoAt + i * 0.07, n, 0.07, -0.4 + i * 0.2, 1.2));
// uma última frase da batida embaixo do CTA, e o sino no endereço
groove(logoAt + BEAT, END - 0.8, { clapOn: true, bassOn: true, riff: false, padCut: 1800, kickGain: 0.45 });
bell(sec(T.end.url), 88, { gain: 0.05, d: 1.4 });

mkdirSync(join(here, "../public/caderno"), { recursive: true });
render(join(here, "../public/caderno/soundtrack.wav"));
