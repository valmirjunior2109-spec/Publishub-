// Filme de lançamento: a trilha. Lê src/film/timeline.json, o mesmo que a animação (tempos em segundos).
// Saída: public/film/soundtrack.wav.
//
// A família do chillhop aprovado no Reel "Cortes" (Rhodes, 808, caixa seca, 120 BPM em meio-tempo), em forma
// de filme: começa só com as teclas, quase para quando "nobody tells you where", abre com a marca, e a
// batida inteira acompanha o produto. Solta na ideia ("you stay the editor") e volta para o convite.
//
//   node scripts/make-sound-film.mjs

import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createMixer } from "./synth.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const T = JSON.parse(readFileSync(join(here, "../src/film/timeline.json"), "utf8"));
const { midi, voice, biquad, noise, decay, click, bell, whoosh, riser, boom, pad, tick, render, SR } = createMixer(T);

const BEAT = 0.5;
const BAR = BEAT * 4;
const END = T.durationInFrames / T.fps;

function rhodes(at, notes, dur, { gain = 0.05, strum = 0.014, bright = 1 } = {}) {
  notes.forEach((n, i) => {
    const f = midi(n);
    const lp = biquad("lp", 2600 * bright, 0.6);
    voice(at + i * strum, dur + 0.9, (t) => {
      const mod = Math.sin(2 * Math.PI * f * t) * (1.6 * bright * Math.exp(-t / 0.25) + 0.25);
      const env = decay(t, 0.004, 1.6) * (t > dur ? Math.max(0, 1 - (t - dur) / 0.9) : 1);
      return lp(Math.sin(2 * Math.PI * f * t + mod) * env);
    }, { gain, pan: -0.3 + (i / Math.max(1, notes.length - 1)) * 0.6, send: 0.3 });
  });
}

function pluck(at, note, { gain = 0.016, pan = 0 } = {}) {
  const f = midi(note);
  const lp = biquad("lp", 3200, 0.7);
  voice(at, 0.24, (t) => lp(Math.sin(2 * Math.PI * f * t + Math.sin(2 * Math.PI * f * 2 * t) * Math.exp(-t / 0.04)) * decay(t, 0.002, 0.07)), { gain, pan, send: 0.35 });
}

function bass808(at, note, dur = 0.9, gain = 0.26) {
  const f = midi(note);
  let ph = 0;
  voice(at, dur, (t) => {
    ph += (2 * Math.PI * f * (1 + 1.2 * Math.exp(-t / 0.025))) / SR;
    return Math.tanh(Math.sin(ph) * 1.8) * Math.min(1, t / 0.003) * Math.exp(-t / (dur * 0.55)) * Math.min(1, (dur - t) / 0.05);
  }, { gain });
}

function kick(at, gain = 0.3) {
  let ph = 0;
  voice(at, 0.18, (t) => {
    ph += (2 * Math.PI * (60 + 110 * Math.exp(-t / 0.018))) / SR;
    return Math.sin(ph) * decay(t, 0.001, 0.06);
  }, { gain });
}

function snare(at, gain = 0.13) {
  const bp = biquad("bp", 1900, 0.7);
  voice(at, 0.3, (t) => bp(noise()) * 1.6 * decay(t, 0.001, 0.09) + Math.sin(2 * Math.PI * 190 * t) * decay(t, 0.001, 0.05) * 0.8, { gain, pan: 0.05, send: 0.18 });
}

function hat(at, gain = 0.018) {
  const hp = biquad("hp", 7500);
  voice(at, 0.06, (t) => hp(noise()) * decay(t, 0.0008, 0.016), { gain, pan: 0.22 });
}

const PROG = [
  { root: 38, chord: [53, 57, 60, 64], arp: [69, 72, 76, 72] }, // Dm9
  { root: 43, chord: [53, 59, 64, 69], arp: [71, 74, 77, 74] }, // G13
  { root: 36, chord: [52, 55, 59, 62], arp: [67, 71, 74, 71] }, // Cmaj9
  { root: 45, chord: [55, 60, 64, 67], arp: [72, 76, 79, 76] }, // Am9
];
const chordAt = (t) => PROG[((Math.floor(t / BAR + 1e-6) % 4) + 4) % 4];

function keys(a, b, gain = 0.045) {
  for (let bi = Math.ceil(a / BAR - 1e-6); bi * BAR < b - 0.01; bi++) {
    const t0 = bi * BAR;
    rhodes(t0, chordAt(t0).chord, Math.min(BAR, b - t0) - 0.1, { gain });
  }
}

function arpeggio(a, b, gain) {
  const step = BEAT / 2;
  for (let n = Math.ceil(a / step - 1e-6); n * step < b - 0.01; n++) {
    const t = n * step;
    pluck(t, chordAt(t).arp[n % 4], { gain, pan: n % 2 ? 0.35 : -0.35 });
  }
}

function drums(a, b, { full = true } = {}) {
  for (let t0 = Math.ceil(a / BAR - 1e-6) * BAR; t0 < b - 0.01; t0 += BAR) {
    const ch = chordAt(t0);
    const hit = (dt, fn) => { if (t0 + dt < b - 0.005) fn(t0 + dt); };
    hit(0, (t) => { kick(t); bass808(t, ch.root, 0.95); });
    hit(BEAT * 1.5, (t) => { kick(t, 0.2); bass808(t, ch.root, 0.4, 0.17); });
    hit(BEAT * 2, (t) => snare(t));
    if (full) hit(BEAT * 3.5, (t) => bass808(t, ch.root + 7, 0.35, 0.13));
    for (let e = 0; e < 8; e++) hit(e * (BEAT / 2), (t) => hat(t, e % 2 ? 0.011 : 0.018));
  }
}

/* ---------- a forma ---------- */

const P = T.problem;
const R = T.reveal;

// ato 1: só as teclas, depois quase nada
keys(0, P.drop, 0.04);
arpeggio(P.watched, P.drop, 0.008);
for (let t = 0; t < P.drop; t += BEAT) if (Math.round(t / BEAT) % 2 === 0) tick(t, { freq: 2400, gain: 0.018 });
bass808(P.drop, 33, 2.2, 0.2);
rhodes(P.drop, [57, 60, 64], 1.4, { gain: 0.03 });
for (let t = P.where; t < R.logo; t += 1) tick(t, { freq: 1800, gain: 0.03 });
pad(P.where, R.logo - P.where, [45, 52], { gain: 0.016, attack: 1, release: 0.6 });
riser(R.logo - 1.4, 1.4, 0.05);

// ato 2: a marca
boom(R.logo, 0.32);
rhodes(R.logo, [48, 52, 55, 59, 62, 67], 4, { gain: 0.05, strum: 0.03 });
pad(R.logo, T.upload.in - R.logo + 0.4, [48, 55, 59, 64], { gain: 0.03, attack: 0.6, release: 0.7 });
arpeggio(R.logo + BAR, T.upload.in, 0.012);

// ato 3: o produto, com a batida
const tourEnd = T.manifesto.finds;
kick(T.upload.in, 0.3);
drums(T.upload.in, tourEnd);
keys(T.upload.in, tourEnd, 0.042);
arpeggio(T.upload.in, tourEnd, 0.012);

// ato 4: solta
boom(T.manifesto.finds, 0.16);
keys(T.manifesto.finds, T.manifesto.out, 0.04);
for (const at of [T.manifesto.finds, T.manifesto.decide, T.manifesto.editor]) bass808(at, 36, 1.3, 0.2);
riser(T.cta.in - 1, 1, 0.05);

// ato 5: o convite
boom(T.cta.in, 0.22);
rhodes(T.cta.in, [48, 52, 55, 59, 62, 67], BAR * 2, { gain: 0.05, strum: 0.03 });
keys(T.cta.in + BAR * 2, END - 3, 0.04);
drums(T.cta.in + BAR, END - 3);
arpeggio(T.cta.in + BAR, END - 3, 0.011);
rhodes(END - 3, [48, 52, 55, 59, 62, 67], 1.8, { gain: 0.05, strum: 0.03 }); // o último acorde
bass808(END - 3, 36, 2.4, 0.22);

/* ---------- os gestos ---------- */

for (const at of [T.upload.in, T.analyze.in, T.find.in, T.cuts.in, T.result.in, T.plan.in, T.bento.in]) whoosh(at - 0.12, 0.34, 400, 2800, 0.05);
for (const at of [T.upload.drop, T.upload.click, T.cuts.acceptAll, T.cuts.apply, T.cta.click]) click(at, { gain: 0.24 });
T.analyze.steps.forEach((at, i) => rhodes(at, [[76, 79, 83, 86][i]], 0.25, { gain: 0.035, bright: 1.3 }));
[T.find.second, T.find.line, T.find.reason].forEach((at, i) => rhodes(at, [[74, 79, 81][i]], 0.4, { gain: 0.045, bright: 1.3 }));
for (let k = 0; k < 9; k++) rhodes(T.result.in + 0.2 + k * 0.1, [88], 0.05, { gain: 0.012, bright: 1.4 });
bell(T.result.in + 1.1, 84, { gain: 0.035, d: 1.1 });
bell(T.cta.url, 88, { gain: 0.022, d: 1.2 });

mkdirSync(join(here, "../public/film"), { recursive: true });
render(join(here, "../public/film/soundtrack.wav"));
