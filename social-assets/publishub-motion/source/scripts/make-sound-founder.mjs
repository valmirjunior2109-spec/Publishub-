// Founder · Valmir construindo em público (9:16, 21,6 s): a trilha. Lê os quadros
// de src/founder/timeline.json, os mesmos que a animação usa. Saída:
// public/soundtrack-founder.wav.
//
// Tudo sintetizado aqui (nenhuma amostra, nenhuma música de terceiros):
//   - de noite: lo-fi a 80 BPM, piano elétrico (FM) em acordes com nona, bumbo
//     macio, aro no 2 e no 4, chiado de vinil e um sub;
//   - quando o dia nasce (a Publishub): um swell, e um arpejo de sinos por cima;
//   - a assinatura: as batidas param e fica um Ré com nona, longo.
// Por cima, os sons de cada gesto: o log, as barras, o contador, a seta, o commit.
//
//   node scripts/make-sound-founder.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createMixer } from "./synth.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const T = JSON.parse(readFileSync(join(here, "../src/founder/timeline.json"), "utf8"));
const { sec, midi, voice, biquad, noise, decay, click, blip, bell, whoosh, swipe, tick, key, render } = createMixer(T);
const END = sec(T.durationInFrames);
const BEAT = 60 / 80;
const BAR = BEAT * 4;

/* ---------- os instrumentos ---------- */

/** Piano elétrico: FM com o índice caindo (o "tine"), um tremolo leve e decaimento longo. */
function epiano(at, note, { gain = 0.05, pan = 0, d = 1.8, len = 3.2 } = {}) {
  const f = midi(note);
  voice(at, len, (t) => {
    const idx = 1.6 * Math.exp(-t / 0.35) + 0.25;
    const v = Math.sin(2 * Math.PI * f * t + idx * Math.sin(2 * Math.PI * f * t)) + 0.12 * Math.sin(2 * Math.PI * f * 4 * t) * Math.exp(-t / 0.05);
    return v * decay(t, 0.004, d) * (1 + 0.12 * Math.sin(2 * Math.PI * 4.6 * t)) * Math.min(1, (len - t) / 0.3);
  }, { gain, pan, send: 0.35 });
}

function chord(at, notes, opts = {}) {
  notes.forEach((n, i) => epiano(at + i * 0.012, n, { pan: -0.35 + (0.7 * i) / Math.max(1, notes.length - 1), ...opts }));
}

/** Bumbo lo-fi: grave e abafado. */
function softKick(at, gain = 0.3) {
  const lp = biquad("lp", 900);
  voice(at, 0.5, (t) => lp(Math.sin(2 * Math.PI * (46 + 64 * Math.exp(-t / 0.03)) * t) * decay(t, 0.002, 0.16)), { gain });
}

/** Aro: um estalo de madeira curto. */
function rim(at, gain = 0.07, pan = 0.1) {
  const bp = biquad("bp", 1900, 3);
  voice(at, 0.1, (t) => bp(noise()) * decay(t, 0.0006, 0.02) * 2 + Math.sin(2 * Math.PI * 820 * t) * decay(t, 0.0005, 0.012) * 0.6, { gain, pan, send: 0.15 });
}

function shaker(at, gain = 0.012, pan = -0.25) {
  const hp = biquad("hp", 6500);
  voice(at, 0.07, (t) => hp(noise()) * decay(t, 0.005, 0.022), { gain, pan });
}

function sub(at, note, dur, gain = 0.11) {
  const f = midi(note);
  voice(at, dur, (t) => Math.sin(2 * Math.PI * f * t) * Math.min(1, t / 0.05) * Math.min(1, (dur - t) / 0.3), { gain });
}

/** Chiado de vinil: um sopro filtrado com estalos esparsos. */
function vinyl(at, dur, gain = 0.02) {
  const bp = biquad("bp", 3500, 0.6);
  voice(at, dur, (t) => {
    const pop = noise() > 0.9993 ? noise() * 4 : 0;
    return (bp(noise()) * 0.5 + pop) * Math.min(1, t / 0.4) * Math.min(1, (dur - t) / 0.6);
  }, { gain, pan: 0 });
}

/** O swell do dia nascendo: ruído e um acorde de senos abrindo. */
function swell(at, dur, notes, gain = 0.05) {
  const lp = biquad("lp", 400, 0.8);
  voice(at, dur, (t, i) => {
    const k = t / dur;
    if (i % 32 === 0) lp.set(400 * Math.pow(12, k));
    let v = lp(noise()) * 0.5;
    for (const n of notes) v += Math.sin(2 * Math.PI * midi(n) * t) * 0.25;
    return v * Math.pow(Math.sin((Math.PI * k) / 1.15), 2);
  }, { gain, send: 0.4 });
}

/* ---------- a harmonia: Ré maior, com nonas ---------- */

const CHORDS = [
  { notes: [50, 54, 57, 61, 64], root: 38 }, // Dmaj9
  { notes: [47, 50, 54, 57, 61], root: 35 }, // Bm9
  { notes: [43, 47, 50, 54, 57], root: 31 }, // Gmaj9
  { notes: [45, 49, 52, 54, 59], root: 33 }, // A6/9
];

const dawn = sec(T.product.dawn);
const stopAt = sec(T.end.title) - 0.1;

vinyl(0, END, 0.022);
for (let bar = 0, t0 = 0; t0 < stopAt; bar++, t0 += BAR) {
  const c = CHORDS[bar % CHORDS.length];
  chord(t0, c.notes, { gain: 0.034 });
  chord(t0 + BEAT * 2.5, c.notes.slice(1, 4).map((n) => n + 12), { gain: 0.018, d: 0.9, len: 1.6 }); // o "eco" na contratempo
  sub(t0, c.root + 12, Math.min(BAR, stopAt - t0), 0.1);
  for (let b = 0; b < 4; b++) {
    const at = t0 + b * BEAT;
    if (at >= stopAt) break;
    if (b === 0 || b === 2) softKick(at, bar === 0 && b === 0 ? 0.34 : 0.26);
    if (b === 1 || b === 3) rim(at, 0.06);
    if (at > 1.5) for (let s = 0; s < 2; s++) shaker(at + (s * BEAT) / 2, s ? 0.008 : 0.012);
  }
  // de dia, um arpejo de sinos por cima
  if (t0 + BAR > dawn) c.notes.forEach((n, i) => { const at = t0 + i * (BEAT / 2); if (at > dawn && at < stopAt) bell(at, n + 24, { gain: 0.012, d: 0.6, pan: -0.4 + i * 0.2 }); });
}

/* ---------- os gestos ---------- */

// 1 · o log
for (let i = 0; i < 12; i++) tick(sec(2 + i * 1.5), { freq: 1800 + i * 40, gain: 0.012, pan: -0.3, d: 0.006 });
blip(sec(T.hook.glow), 78, { gain: 0.03, d: 0.18 }); // a linha das 02:34 acende
whoosh(sec(T.hook.out) - 0.05, 0.5, 2400, 500, 0.04);

// 2 · as barras sobem, a noite acende, o almoço
for (let h = 0; h < 24; h++) tick(sec(T.hours.bars + h * 1.1), { freq: 1500 + h * 45, gain: 0.014, pan: -0.5 + h / 24, d: 0.006 });
bell(sec(T.hours.evening), 81, { gain: 0.03, d: 1, pan: 0.4 });
swipe(sec(T.hours.evening + 8), { gain: 0.025, dur: 0.4, pan: 0.4 }); // a seta de caneta
bell(sec(T.hours.lunch), 76, { gain: 0.024, d: 0.9, pan: -0.1 });
swipe(sec(T.hours.lunch + 8), { gain: 0.022, dur: 0.4 });
for (let i = 0; i < 10; i++) tick(sec(T.hours.stat + i * 2.4), { freq: 2400, gain: 0.012, d: 0.005 }); // o contador
whoosh(sec(T.hours.out) - 0.05, 0.5, 2400, 500, 0.035);

// 3 · quem é
blip(sec(T.who.name + 6), 74, { gain: 0.03, d: 0.25 });
for (let c = 0; c < 10; c++) key(sec(T.who.card + c * 1.4), { gain: 0.03, pan: 0.15 });
for (let i = 0; i < 12; i++) tick(sec(T.who.count + i * 2.5), { freq: 2200 + i * 30, gain: 0.012, d: 0.005 });
swipe(sec(T.who.alone), { gain: 0.03, dur: 0.6, pan: 0.3 }); // "building it alone" sendo escrito

// 4 · o dia nasce
swell(dawn - 0.2, 1.6, [62, 66, 69, 74], 0.05);
whoosh(dawn, 1.0, 300, 3000, 0.05);
blip(sec(T.product.logo + 12), 86, { gain: 0.03, d: 0.15 }); // a caneta encaixa no caderno
click(sec(T.product.logo + 14), { gain: 0.08 });
softKick(sec(T.product.drop), 0.2); // a queda
blip(sec(T.product.drop), 69, { gain: 0.035, d: 0.2 });
swipe(sec(T.product.note), { gain: 0.03, dur: 0.6 });
whoosh(sec(T.product.out) - 0.05, 0.5, 2400, 500, 0.035);

// 5 · o commit em português e os 11 idiomas
for (let c = 0; c < 40; c += 2) key(sec(T.global.type + c / 2.2), { gain: 0.03, pan: -0.15 });
[74, 76, 78, 81, 83, 86, 88, 90, 93, 95, 98].forEach((n, i) => blip(sec(T.global.chips + i * 2), n, { gain: 0.016, d: 0.08, pan: -0.5 + i * 0.1 }));
whoosh(sec(T.global.out) - 0.05, 0.6, 2400, 400, 0.04);

// a assinatura: as batidas param, fica o acorde
const hit = sec(T.end.title);
softKick(hit, 0.34);
chord(hit, [38, 50, 57, 61, 64, 66, 69], { gain: 0.04, d: 3.2, len: END - hit });
sub(hit, 38, END - hit - 0.1, 0.12);
[74, 81, 86, 88].forEach((n, i) => bell(hit + 0.05 + i * 0.09, n, { gain: 0.026 - i * 0.003, d: 1.8, pan: -0.3 + i * 0.2 }));
swipe(sec(T.end.title - 6), { gain: 0.02, dur: 1.1 }); // o arco caramelo
swipe(sec(T.end.place), { gain: 0.026, dur: 0.6 });

render(join(here, "../public/soundtrack-founder.wav"));
