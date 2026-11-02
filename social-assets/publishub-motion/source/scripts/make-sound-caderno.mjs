// Publishub · Reel "O caderno": a trilha. Lê src/caderno/timeline.json, o mesmo que a animação.
// Saída: public/caderno/soundtrack.wav.
//
// Minimalista, de lançamento de produto: um pulso suave de synth em colcheias, notas de piano
// abafado, sub grave e um bumbo macio, 120 BPM (1 tempo = 15 quadros), C → G → Am → F.
// Por cima, o atrito da caneta no papel, baixinho, em cada traço que aparece na tela.
//   - o gancho: só o pulso e a caneta contando os risquinhos;
//   - o post-it: o pulso some, fica o pad; a caneta pergunta "WHERE?";
//   - a etiqueta com o logo: entram o bumbo macio e o sub;
//   - o fecho: o pad sozinho; a página vira e o logo cai num acorde aberto.
// Tudo sintetizado aqui e em synth.mjs, nenhuma amostra gravada.
//
//   node scripts/make-sound-caderno.mjs

import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createMixer } from "./synth.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const T = JSON.parse(readFileSync(join(here, "../src/caderno/timeline.json"), "utf8"));
const { sec, midi, voice, biquad, noise, decay, snip, whoosh, bell, render, SR } = createMixer(T);

const BEAT = 0.5; // 120 BPM
const BAR = BEAT * 4;
const DROP = sec(T.turn.tape);
const GRID = DROP % BEAT;
const END = sec(T.durationInFrames);
const F = (frames) => frames / T.fps;

/* ---------- a caneta: atrito macio, nada de chiado ---------- */

/** Ponta de caneta no papel: ruído em banda média-baixa, com a pressão variando devagar. */
function pen(at, dur, gain = 0.022) {
  const bp = biquad("bp", 1700, 0.55);
  const lp = biquad("lp", 3200);
  // a pressão da mão: valores aleatórios interpolados a ~9 Hz, sempre suaves
  const knots = Array.from({ length: Math.ceil(dur * 9) + 3 }, () => 0.55 + 0.45 * Math.abs(noise()));
  voice(at, dur + 0.04, (t) => {
    const k = t * 9;
    const i = Math.floor(k);
    const fr = k - i;
    const pressure = knots[i] * (1 - fr) + knots[i + 1] * fr;
    const env = Math.min(1, t / 0.02) * Math.min(1, Math.max(0, (dur + 0.04 - t) / 0.04));
    return lp(bp(noise())) * pressure * env * 2;
  }, { gain, pan: 0.08, send: 0.02 });
}

/* ---------- os instrumentos ---------- */

const saw = (ph) => 2 * (ph - Math.floor(ph + 0.5));
const pump = (t) => {
  const since = (((t - GRID) % BEAT) + BEAT) % BEAT;
  return 1 - 0.35 * Math.exp(-since / 0.12);
};

/** O pulso: um synth abafado e curto em colcheias. */
function pulse(at, note, gain = 0.045, pan = 0) {
  const f = midi(note);
  const lp = biquad("lp", 1400, 0.8);
  let ph = 0;
  voice(at, 0.3, (t, i) => {
    if (i % 32 === 0) lp.set(500 + 1100 * Math.exp(-t / 0.05));
    ph += f / SR;
    return lp(saw(ph) * 0.5 + Math.sin(2 * Math.PI * ph) * 0.5) * decay(t, 0.003, 0.09);
  }, { gain, pan, send: 0.25 });
}

/** Piano abafado (felt): senoide com um pouco de 2ª e 3ª, martelo macio, cauda longa. */
function felt(at, note, gain = 0.07, pan = 0) {
  const f = midi(note);
  const lp = biquad("lp", 2200, 0.7);
  voice(at, 2.4, (t) => lp((Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t) * Math.exp(-t / 0.4) + 0.08 * Math.sin(6 * Math.PI * f * t) * Math.exp(-t / 0.15)) * decay(t, 0.006, 0.9)), { gain, pan, send: 0.4 });
}

/** Pad quente e baixo, só para dar chão. */
function pad(at, dur, notes, gain = 0.018) {
  notes.forEach((n, k) => {
    [-0.08, 0.08].forEach((det, j) => {
      const f = midi(n + det);
      const lp = biquad("lp", 1100, 0.6);
      let ph = (k * 0.31 + j * 0.5) % 1;
      voice(at, dur + 0.5, (t) => {
        ph += f / SR;
        const env = Math.min(1, t / 0.4) * (t > dur ? Math.max(0, 1 - (t - dur) / 0.5) : 1);
        return lp(saw(ph)) * env * pump(at + t);
      }, { gain: gain / 2, pan: j ? 0.5 : -0.5, send: 0.35 });
    });
  });
}

function sub(at, note, dur, gain = 0.06) {
  const f = midi(note);
  voice(at, dur, (t) => Math.sin(2 * Math.PI * f * t) * Math.min(1, t / 0.02) * Math.min(1, (dur - t) / 0.08) * pump(at + t), { gain });
}

/** Bumbo macio, sem estalo. */
function softKick(at, gain = 0.15) {
  let ph = 0;
  voice(at, 0.4, (t) => {
    const f = 48 + 60 * Math.exp(-t / 0.03);
    ph += (2 * Math.PI * f) / SR;
    return Math.sin(ph) * decay(t, 0.003, 0.15);
  }, { gain });
}

/** Estalo de dedo baixinho no 2 e no 4. */
function snap(at, gain = 0.05) {
  const bp = biquad("bp", 2300, 1.2);
  voice(at, 0.12, (t) => bp(noise()) * decay(t, 0.0005, 0.016) * 3, { gain, pan: -0.1, send: 0.35 });
}

function slap(at, gain = 0.18) {
  const lp = biquad("lp", 900);
  voice(at, 0.2, (t) => lp(noise()) * decay(t, 0.001, 0.03) * 2 + Math.sin(2 * Math.PI * 110 * t) * decay(t, 0.001, 0.04) * 0.6, { gain, send: 0.1 });
}

/* ---------- a harmonia ---------- */

const PROG = [
  { root: 36, chord: [60, 64, 67, 71], top: 76 }, // Cmaj7
  { root: 43, chord: [59, 62, 67, 74], top: 74 }, // G
  { root: 45, chord: [57, 60, 64, 67], top: 72 }, // Am7
  { root: 41, chord: [57, 60, 65, 69], top: 72 }, // F
];
const barAt = (t) => PROG[((Math.floor((t - DROP) / BAR) % 4) + 4) % 4];
const PULSE = [0, 2, 1, 2, 0, 2, 1, 3]; // colcheias por compasso (índice no acorde)

function music(a, b, { pulseOn = true, kick = false, snaps = false, subOn = false, piano = true, padOn = true, pulseMul = 1, padGain = 0.018 } = {}) {
  const first = Math.ceil((a - GRID) / BEAT - 1e-6);
  for (let i = first; GRID + i * BEAT < b - 0.01; i++) {
    const t = GRID + i * BEAT;
    const beat = ((Math.round((t - DROP) / BEAT) % 4) + 4) % 4;
    const ch = barAt(t);
    if (pulseOn) {
      [0, 1].forEach((h) => {
        const te = t + h * (BEAT / 2);
        if (te < b) pulse(te, ch.chord[PULSE[beat * 2 + h]], (h ? 0.032 : 0.045) * pulseMul, h ? 0.25 : -0.25);
      });
    }
    if (kick && beat % 2 === 0) softKick(t);
    if (snaps && beat % 2 === 1) snap(t);
    if (beat === 0 || i === first) {
      const len = Math.min(BAR - beat * BEAT, b - t);
      if (padOn) pad(t, len, ch.chord.slice(0, 3), padGain);
      if (subOn) sub(t, ch.root - 12, len);
      if (piano && beat === 0) felt(t, ch.top, 0.06, 0.15);
    }
    if (piano && beat === 2) felt(t, ch.chord[2] + 12, 0.04, -0.15);
  }
}

/* ---------- a música, seção por seção ---------- */

const slapAt = sec(T.sticky.slap);
const breakdown = sec(T.payoff.l1[0]);
const turnAt = sec(T.end.turn[0]);
const logoAt = sec(T.end.zoom[1]);

music(0, slapAt, { piano: false, padOn: false, pulseMul: 2.6 }); // o gancho: só o pulso
music(slapAt, DROP, { pulseOn: false, piano: false, padGain: 0.05 }); // o post-it: fica o pad
music(DROP, breakdown, { kick: true, snaps: true, subOn: true }); // o produto
music(breakdown, turnAt, { pulseOn: false, padGain: 0.035 }); // o fecho: pad e piano
pad(turnAt, logoAt - turnAt, [53, 57, 60, 64], 0.02); // a página virando, sobre Fmaj7
whoosh(turnAt, F(T.end.turn[1] - T.end.turn[0]) + 0.2, 400, 1800, 0.06); // a página virando
// o logo: acorde aberto, e o pulso volta embaixo do CTA
[48, 55, 64, 71, 76].forEach((n, i) => felt(logoAt + i * 0.05, n, 0.07, -0.3 + i * 0.15));
pad(logoAt, END - logoAt - 0.8, [48, 55, 64, 71], 0.022);
music(logoAt + BEAT * 2, END - 0.8, { piano: false, padOn: false });
bell(sec(T.end.url), 88, { gain: 0.03, d: 1.4 });

/* ---------- os gestos, discretos ---------- */

slap(slapAt, 0.2);
slap(DROP, 0.12);
for (const f of [T.chart.photo, T.decide.photo]) slap(sec(f), 0.12);
felt(sec(T.chart.dot), 84, 0.05);
T.decide.ticks.forEach((f, i) => felt(sec(f) + 0.08, [76, 79, 84][i], 0.05));
T.strip.snips.forEach((f, i) => snip(sec(f), i % 2 ? 0.12 : -0.12, 0.16));
whoosh(sec(T.strip.fall), 0.4, 1500, 400, 0.04);
[72, 76, 79, 84].forEach((n, i) => felt(sec(T.strip.big[1]) + i * 0.06, n, 0.04));

/* ---------- a caneta: cada traço escrito na tela ---------- */

// os 47 risquinhos (a mesma conta de Caderno.tsx)
const { from, to, count, pow } = T.tally;
const times = Array.from({ length: count }, (_, k) => from + (to - from) * Math.pow(k / (count - 1), pow));
times.forEach((t, k) => {
  const gap = k < count - 1 ? times[k + 1] - t : 3;
  pen(sec(t), F(Math.min(4, Math.max(1.1, gap * 0.85))), 0.026);
});
const strokes = [
  T.tally.num, T.tally.circle,
  T.sticky.circle, T.sticky.arrow, T.sticky.where, T.sticky.line1, T.sticky.line2, T.sticky.under,
  T.turn.later,
  T.chart.circle, T.chart.note, T.chart.arrow, T.chart.photoNote,
  ...T.transcript.strike, ...T.transcript.notes, T.transcript.tick, T.transcript.keep,
  T.decide.head, T.decide.note, T.strip.lines, T.strip.big,
  T.payoff.l1, T.payoff.l2, T.payoff.wave,
  T.end.tag, T.end.arrow,
];
for (const [a, b] of strokes) pen(sec(a), F(b - a));
T.decide.ticks.forEach((f) => pen(sec(f), F(5)));

mkdirSync(join(here, "../public/caderno"), { recursive: true });
render(join(here, "../public/caderno/soundtrack.wav"));
