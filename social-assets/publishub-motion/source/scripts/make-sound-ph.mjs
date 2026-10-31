// Publishub · demo do Product Hunt: a trilha. Lê src/ph/timeline.json, o mesmo que a animação.
// Saída: public/ph/soundtrack.wav.
//
// O chillhop do Reel "Cortes" (o que foi aprovado), mais baixo e de fundo: Rhodes com acordes de
// jazz (Dm9 → G13 → Cmaj9 → Am9), baixo 808, caixa seca e chimbal, 120 BPM em meio-tempo.
// Por cima, só o que a tela faz: o clique do mouse, uma nota por etapa da análise, um "pop" nos
// cortes aceitos e um acorde quando o vídeo editado fica pronto. Sintetizado aqui e em synth.mjs.
//
//   node scripts/make-sound-ph.mjs

import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createMixer } from "./synth.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const T = JSON.parse(readFileSync(join(here, "../src/ph/timeline.json"), "utf8"));
const { sec, midi, voice, biquad, noise, decay, click, bell, render, SR } = createMixer(T);

const BEAT = 0.5;
const BAR = BEAT * 4;
const END = sec(T.durationInFrames);

function rhodes(at, notes, dur, { gain = 0.05, strum = 0.014, bright = 1 } = {}) {
  notes.forEach((n, i) => {
    const f = midi(n);
    const lp = biquad("lp", 2600 * bright, 0.6);
    const start = at + i * strum;
    voice(start, dur + 0.8, (t) => {
      const mod = Math.sin(2 * Math.PI * f * t) * (1.6 * bright * Math.exp(-t / 0.25) + 0.25);
      const env = decay(t, 0.004, 1.6) * (t > dur ? Math.max(0, 1 - (t - dur) / 0.8) : 1);
      return lp(Math.sin(2 * Math.PI * f * t + mod) * env * (0.88 + 0.12 * Math.sin(2 * Math.PI * 4.5 * t)));
    }, { gain, pan: -0.3 + (i / Math.max(1, notes.length - 1)) * 0.6, send: 0.3 });
  });
}

function bass808(at, note, dur = 0.9, gain = 0.26) {
  const f = midi(note);
  let ph = 0;
  voice(at, dur, (t) => {
    ph += (2 * Math.PI * f * (1 + 1.2 * Math.exp(-t / 0.025))) / SR;
    return Math.tanh(Math.sin(ph) * 1.8) * Math.min(1, t / 0.003) * Math.exp(-t / (dur * 0.55)) * Math.min(1, (dur - t) / 0.05);
  }, { gain });
}

function kick(at, gain = 0.32) {
  let ph = 0;
  voice(at, 0.18, (t) => {
    ph += (2 * Math.PI * (60 + 110 * Math.exp(-t / 0.018))) / SR;
    return Math.sin(ph) * decay(t, 0.001, 0.06);
  }, { gain });
}

function snare(at, gain = 0.15) {
  const bp = biquad("bp", 1900, 0.7);
  voice(at, 0.3, (t) => bp(noise()) * 1.6 * decay(t, 0.001, 0.09) + Math.sin(2 * Math.PI * 190 * t) * decay(t, 0.001, 0.05) * 0.8, { gain, pan: 0.05, send: 0.18 });
}

function hat(at, gain = 0.022) {
  const hp = biquad("hp", 7500);
  voice(at, 0.06, (t) => hp(noise()) * decay(t, 0.0008, 0.016), { gain, pan: 0.22 });
}

const PROG = [
  { root: 38, chord: [53, 57, 60, 64], lead: [69, 72, 74] }, // Dm9
  { root: 43, chord: [53, 59, 64, 69], lead: [71, 74, 76] }, // G13
  { root: 36, chord: [52, 55, 59, 62], lead: [67, 71, 74] }, // Cmaj9
  { root: 45, chord: [55, 60, 64, 67], lead: [72, 71, 67] }, // Am9
];
const chordAt = (t) => PROG[((Math.floor(t / BAR + 1e-6) % 4) + 4) % 4];

function keys(a, b, { lead = false, gain = 0.045 } = {}) {
  for (let bi = Math.ceil(a / BAR - 1e-6); bi * BAR < b - 0.01; bi++) {
    const t0 = bi * BAR;
    const ch = chordAt(t0);
    rhodes(t0, ch.chord, Math.min(BAR, b - t0) - 0.1, { gain });
    if (lead) ch.lead.forEach((n, i) => { const tl = t0 + BEAT * (1 + i * 0.75); if (tl < b) rhodes(tl, [n], 0.4, { gain: gain * 0.8, bright: 1.2 }); });
  }
}

function drums(a, b, full = true) {
  for (let t0 = Math.ceil(a / BAR - 1e-6) * BAR; t0 < b - 0.01; t0 += BAR) {
    const ch = chordAt(t0);
    const hit = (dt, fn) => { if (t0 + dt < b - 0.005) fn(t0 + dt); };
    hit(0, (t) => { kick(t); bass808(t, ch.root, 0.95); });
    hit(BEAT * 1.5, (t) => { kick(t, 0.22); bass808(t, ch.root, 0.4, 0.18); });
    hit(BEAT * 2, (t) => snare(t));
    if (full) hit(BEAT * 3.5, (t) => bass808(t, ch.root + 7, 0.35, 0.14));
    for (let e = 0; e < 8; e++) hit(e * (BEAT / 2), (t) => hat(t, e % 2 ? 0.014 : 0.022));
  }
}

/* ---------- a forma ---------- */

const win = sec(T.landing.start);
const result = sec(T.result.start);
const recap = sec(T.recap.start);
const endAt = sec(T.end.start);

keys(0, win, { gain: 0.05 }); // a abertura: o Rhodes sozinho
keys(win, recap);
drums(win, result, false); // a janela: a batida entra leve
drums(result, recap, true); // o resultado: a batida inteira
keys(result, recap, { lead: true, gain: 0.035 });
keys(recap, endAt, { gain: 0.05 }); // "you stay the editor": só os acordes
rhodes(endAt, [48, 52, 55, 59, 62, 67], END - endAt - 0.6, { gain: 0.05, strum: 0.03 }); // o CTA: Cmaj9
bass808(endAt, 36, 1.6, 0.24);
drums(endAt + BAR, END - 0.8, false);

/* ---------- o que a tela faz ---------- */

for (const f of [T.landing.click, T.upload.drop, T.upload.click, T.cuts.acceptAll, T.cuts.apply, T.plan.click, T.end.cta]) click(sec(f), { gain: 0.32 });
T.processing.steps.forEach((f, i) => rhodes(sec(f), [[76, 79, 83][i]], 0.3, { gain: 0.05, bright: 1.3 }));
rhodes(result, [74, 81], 0.6, { gain: 0.045, bright: 1.2 });
[76, 79, 84].forEach((n, i) => rhodes(sec(T.cuts.acceptAll) + 0.05 + i * 0.06, [n], 0.25, { gain: 0.045, bright: 1.3 }));
bell(sec(T.cuts.ready), 84, { gain: 0.05, d: 1.2 });
bell(sec(T.end.url), 88, { gain: 0.03, d: 1.4 });

mkdirSync(join(here, "../public/ph"), { recursive: true });
render(join(here, "../public/ph/soundtrack.wav"));
