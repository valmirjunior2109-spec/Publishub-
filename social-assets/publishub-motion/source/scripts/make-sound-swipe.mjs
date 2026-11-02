// Reel "Swipe": a trilha. Lê src/swipe/timeline.json, o mesmo que a animação. Saída: public/swipe/soundtrack.wav.
//
// O chillhop aprovado no Reel "Cortes" (Rhodes, 808, caixa seca, 120 BPM em meio-tempo), com um arpejo
// discreto por cima. Até o 0:04 só os acordes e o arpejo; quando a curva cai, a batida entra.
//
//   node scripts/make-sound-swipe.mjs

import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createMixer } from "./synth.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const T = JSON.parse(readFileSync(join(here, "../src/swipe/timeline.json"), "utf8"));
const { sec, midi, voice, biquad, noise, decay, click, bell, whoosh, riser, boom, render, SR } = createMixer(T);

const BEAT = 0.5;
const BAR = BEAT * 4;
const END = sec(T.durationInFrames);

function rhodes(at, notes, dur, { gain = 0.05, strum = 0.014, bright = 1 } = {}) {
  notes.forEach((n, i) => {
    const f = midi(n);
    const lp = biquad("lp", 2600 * bright, 0.6);
    voice(at + i * strum, dur + 0.8, (t) => {
      const mod = Math.sin(2 * Math.PI * f * t) * (1.6 * bright * Math.exp(-t / 0.25) + 0.25);
      const env = decay(t, 0.004, 1.6) * (t > dur ? Math.max(0, 1 - (t - dur) / 0.8) : 1);
      return lp(Math.sin(2 * Math.PI * f * t + mod) * env);
    }, { gain, pan: -0.3 + (i / Math.max(1, notes.length - 1)) * 0.6, send: 0.3 });
  });
}

function pluck(at, note, { gain = 0.016, pan = 0 } = {}) {
  const f = midi(note);
  const lp = biquad("lp", 3200, 0.7);
  voice(at, 0.22, (t) => lp(Math.sin(2 * Math.PI * f * t + Math.sin(2 * Math.PI * f * 2 * t) * Math.exp(-t / 0.04)) * decay(t, 0.002, 0.06)), { gain, pan, send: 0.35 });
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

function snare(at, gain = 0.14) {
  const bp = biquad("bp", 1900, 0.7);
  voice(at, 0.3, (t) => bp(noise()) * 1.6 * decay(t, 0.001, 0.09) + Math.sin(2 * Math.PI * 190 * t) * decay(t, 0.001, 0.05) * 0.8, { gain, pan: 0.05, send: 0.18 });
}

function hat(at, gain = 0.02) {
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

function drums(a, b) {
  for (let t0 = Math.ceil(a / BAR - 1e-6) * BAR; t0 < b - 0.01; t0 += BAR) {
    const ch = chordAt(t0);
    const hit = (dt, fn) => { if (t0 + dt < b - 0.005) fn(t0 + dt); };
    hit(0, (t) => { kick(t); bass808(t, ch.root, 0.95); });
    hit(BEAT * 1.5, (t) => { kick(t, 0.22); bass808(t, ch.root, 0.4, 0.18); });
    hit(BEAT * 2, (t) => snare(t));
    hit(BEAT * 3.5, (t) => bass808(t, ch.root + 7, 0.35, 0.14));
    for (let e = 0; e < 8; e++) hit(e * (BEAT / 2), (t) => hat(t, e % 2 ? 0.013 : 0.02));
  }
}

/* ---------- a forma ---------- */

const drop = sec(T.line.drop);
const cta = sec(T.cta.in);

keys(0, cta);
arpeggio(0, drop, 0.018);
kick(0, 0.3); bass808(0, 38, 0.9, 0.2); // o primeiro quadro já bate
riser(drop - 1, 1, 0.05);

// a curva cai, a batida entra
boom(drop, 0.34);
drums(drop, cta);
arpeggio(drop, cta, 0.012);

rhodes(cta, [48, 52, 55, 59, 62, 67], BAR * 2, { gain: 0.05, strum: 0.03 }); // o convite: Cmaj9
bass808(cta, 36, 1.6, 0.24);
keys(cta + BAR * 2, END - 0.6, 0.04);
drums(cta + BAR, END - 0.6);
arpeggio(cta + BAR, END - 0.6, 0.012);

/* ---------- os gestos ---------- */

for (const f of T.wipes) whoosh(sec(f) - 0.12, 0.26, 500, 3500, 0.05);
for (const f of [T.ui.dot, T.upload.drop, T.plan.click, T.cta.click]) click(sec(f), { gain: 0.26 });
rhodes(sec(T.hook.strike), [74], 0.2, { gain: 0.05, bright: 1.3 });
rhodes(sec(T.ui.swap), [74, 81], 0.5, { gain: 0.05, bright: 1.3 });
T.steps.checks.forEach((f, i) => rhodes(sec(f), [[76, 79, 83][i]], 0.25, { gain: 0.045, bright: 1.3 }));
for (let k = 0; k < 10; k++) rhodes(sec(T.counter.in + 4) + k * ((T.counter.done - T.counter.in - 4) / T.fps / 10), [88], 0.05, { gain: 0.014, bright: 1.4 });
bell(sec(T.counter.done), 84, { gain: 0.04, d: 1 });
bell(sec(T.cta.url), 88, { gain: 0.025, d: 1.2 });

mkdirSync(join(here, "../public/swipe"), { recursive: true });
render(join(here, "../public/swipe/soundtrack.wav"));
