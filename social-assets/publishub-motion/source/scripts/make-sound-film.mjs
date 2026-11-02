// Filme de lançamento: a trilha. Lê src/film/timeline.json, o mesmo que a animação (tempos em segundos).
// Saída: public/film/soundtrack.wav.
//
// O clique do mouse fica por cima de tudo: a gravação de um mouse de verdade (scripts/film/get-click.mjs), com o
// apertar e o soltar, e uma pequena variação a cada clique, com a música baixa por baixo.
// A música é um groove alegre em dó maior, 120 BPM: marimba, baixo saltado, palmas e teclas no contratempo.
// Toca desde o primeiro quadro, quase para no "Nobody tells you where", volta inteira com a marca, solta na
// ideia e fecha no convite.
//
//   node scripts/make-sound-film.mjs

import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createMixer } from "./synth.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const FILE = JSON.parse(readFileSync(join(here, "../src/film/timeline.json"), "utf8"));
const INTRO = FILE.intro.duration;

// a abertura vem antes de tudo: os tempos do resto do filme andam junto
const shift = (value) => (typeof value === "number" ? value + INTRO : Array.isArray(value) ? value.map(shift) : Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shift(v)])));
const T = Object.fromEntries(Object.entries(FILE).map(([k, v]) => [k, k === "fps" || k === "durationInFrames" || k === "intro" ? v : shift(v)]));
const I = FILE.intro;

const { midi, voice, biquad, noise, decay, bell, whoosh, riser, boom, pad, render, SR } = createMixer(T);

const BEAT = 0.5;
const BAR = BEAT * 4;
const END = T.durationInFrames / T.fps;
const MUSIC = 0.58; // tudo o que é música passa por aqui: o clique precisa ficar por cima

/** A gravação: o "toc" limpo do apertar, que dura uns 20 ms. */
function loadClick() {
  const b = readFileSync(join(here, "../public/film/click-src.wav"));
  let o = 12;
  while (b.toString("ascii", o, o + 4) !== "data") o += 8 + b.readUInt32LE(o + 4);
  const start = o + 8;
  const n = Math.round(0.04 * 48000);
  const smp = new Float64Array(n);
  let peak = 0;
  for (let i = 0; i < n; i++) {
    const fade = Math.min(1, (n - 1 - i) / 480);
    smp[i] = (b.readInt16LE(start + i * 2) / 32768) * fade;
    peak = Math.max(peak, Math.abs(smp[i]));
  }
  return smp.map((v) => v / peak);
}
const CLICK = loadClick();
let clickCount = 0;

function playClick(at, rate, gain, pan) {
  voice(at, CLICK.length / 48000 / rate, (t) => {
    const pos = t * 48000 * rate;
    const i = Math.floor(pos);
    if (i + 1 >= CLICK.length) return 0;
    return CLICK[i] + (CLICK[i + 1] - CLICK[i]) * (pos - i);
  }, { gain, pan, send: 0.05 });
}

/** Apertar e soltar. Cada clique sai um pouco diferente, como na mão de alguém: sem isso, soa como uma máquina repetindo. */
function mouseClick(at) {
  const k = clickCount++;
  const rate = 0.97 + ((k * 7) % 11) * 0.007;
  const gain = 0.95 + ((k * 5) % 7) * 0.025;
  const pan = (((k * 3) % 5) - 2) * 0.04;
  playClick(at, rate, gain, pan);
  playClick(at + 0.078 + (k % 3) * 0.004, rate * 1.14, gain * 0.5, pan);
}

/* ---------- os instrumentos ---------- */

function marimba(at, note, { gain = 0.09, pan = 0 } = {}) {
  const f = midi(note);
  voice(at, 0.5, (t) => (Math.sin(2 * Math.PI * f * t) * decay(t, 0.001, 0.16) + Math.sin(2 * Math.PI * f * 4 * t) * decay(t, 0.0008, 0.018) * 0.45), { gain: gain * MUSIC, pan, send: 0.22 });
}

function keysStab(at, notes, { gain = 0.038 } = {}) {
  notes.forEach((n, i) => {
    const f = midi(n);
    const lp = biquad("lp", 2800, 0.6);
    voice(at + i * 0.006, 0.3, (t) => lp(Math.sin(2 * Math.PI * f * t + Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.08) * 1.2) * decay(t, 0.002, 0.11)), { gain: gain * MUSIC, pan: -0.25 + (i / Math.max(1, notes.length - 1)) * 0.5, send: 0.2 });
  });
}

function bass(at, note, dur = 0.22, gain = 0.26) {
  const f = midi(note);
  voice(at, dur, (t) => Math.tanh(Math.sin(2 * Math.PI * f * t) * 1.6) * Math.min(1, t / 0.003) * Math.min(1, (dur - t) / 0.03), { gain: gain * MUSIC });
}

function kick(at, gain = 0.34) {
  let ph = 0;
  voice(at, 0.16, (t) => {
    ph += (2 * Math.PI * (60 + 120 * Math.exp(-t / 0.016))) / SR;
    return Math.sin(ph) * decay(t, 0.001, 0.055);
  }, { gain: gain * MUSIC });
}

function clap(at, gain = 0.16) {
  const bp = biquad("bp", 1500, 0.9);
  voice(at, 0.2, (t) => {
    const burst = (t < 0.012 ? 1 : 0) * (Math.floor(t / 0.004) % 2 === 0 ? 1 : 0.2);
    return bp(noise()) * 2.1 * (burst * 0.7 + decay(t, 0.012, 0.05));
  }, { gain: gain * MUSIC, pan: 0.04, send: 0.2 });
}

function shaker(at, gain = 0.012) {
  const hp = biquad("hp", 6500);
  voice(at, 0.05, (t) => hp(noise()) * decay(t, 0.004, 0.012), { gain: gain * MUSIC, pan: 0.2 });
}

/* ---------- a música: C, G, Am, F, um acorde por compasso ---------- */

const PROG = [
  { root: 36, chord: [52, 55, 60], hook: [76, 79, 84, null, 79, 76, 81, 79] },
  { root: 43, chord: [50, 55, 59], hook: [74, 79, 83, null, 79, 74, 81, 79] },
  { root: 45, chord: [52, 57, 60], hook: [72, 76, 81, null, 76, 72, 79, 76] },
  { root: 41, chord: [53, 57, 60], hook: [72, 77, 81, null, 77, 72, 79, 81] },
];
const chordAt = (t) => PROG[((Math.floor(t / BAR + 1e-6) % 4) + 4) % 4];

/** O groove, de a até b. `level` 1 é a banda inteira; 0 é só a marimba e as teclas. */
function groove(a, b, { level = 1, hookGain = 0.09 } = {}) {
  const eighth = BEAT / 2;
  for (let n = Math.ceil(a / eighth - 1e-6); n * eighth < b - 0.01; n++) {
    const t = n * eighth;
    const step = n % 8;
    const ch = chordAt(t);
    const note = ch.hook[step];
    if (note) marimba(t, note, { gain: hookGain, pan: step % 2 ? 0.28 : -0.28 });
    if (step % 2 === 1) keysStab(t, ch.chord); // as teclas no contratempo: é o que dá o balanço
    if (level > 0) {
      if (step === 0 || step === 3 || step === 4) bass(t, ch.root + (step === 3 ? 12 : 0));
      if (step === 6) bass(t, ch.root + 7, 0.2, 0.2);
      if (step === 0 || step === 4) kick(t);
      if (step === 2 || step === 6) clap(t);
      shaker(t, step % 2 ? 0.012 : 0.008);
    }
  }
}

/** O desenho descendo, quando a curva cai: um "uooo" engraçado, sem pesar. */
function slideDown(at, from, to, dur, gain = 0.1) {
  let ph = 0;
  const lp = biquad("lp", 1600, 0.7);
  voice(at, dur, (t) => {
    const k = t / dur;
    const f = midi(from + (to - from) * k * k);
    ph += (2 * Math.PI * f) / SR;
    return lp(Math.sin(ph) + Math.sin(ph * 2) * 0.3) * Math.min(1, t / 0.01) * Math.min(1, (dur - t) / 0.08);
  }, { gain: gain * MUSIC, send: 0.2 });
}

const P = T.problem;
const R = T.reveal;
const M = T.manifesto;

// a abertura: alegre desde o primeiro quadro
boom(0, 0.1);
groove(0, I.duration);

// o problema: mais leve, e a música cai junto com a curva
groove(I.duration, P.drop, { level: 0, hookGain: 0.075 });
slideDown(P.drop, 79, 55, 0.7);
pad(P.drop + 0.6, R.at - P.drop - 0.6, [48, 55], { gain: 0.012, attack: 0.6, release: 0.5 });
marimba(P.where, 72, { gain: 0.05 });
marimba(P.where + 1, 67, { gain: 0.05 });
riser(R.at - 0.8, 0.8, 0.025);

// "Publishub does.": a banda volta inteira
boom(R.at, 0.14);
[60, 64, 67, 72, 76, 79, 84].forEach((n, i) => marimba(R.at + i * 0.05, n, { gain: 0.08 }));
groove(R.at + BAR / 2, M.finds);

// a ideia: só a marimba e as teclas
groove(M.finds, M.out, { level: 0, hookGain: 0.07 });
for (const at of [M.finds, M.decide, M.editor]) bass(at, 36, 0.5, 0.3);
riser(T.cta.in - 0.8, 0.8, 0.025);

// o convite
boom(T.cta.in, 0.1);
groove(T.cta.in, END - 2.5);
[48, 52, 55, 60, 64, 67, 72, 76, 84].forEach((n, i) => marimba(END - 2.5 + i * 0.05, n, { gain: 0.08 }));
keysStab(END - 2.5, [52, 55, 60], { gain: 0.05 });
bass(END - 2.5, 36, 1.2, 0.3);

/* ---------- os cliques e os gestos ---------- */

const CLICKS = [
  I.drop, I.accept,
  P.drag[0], P.drag2[0], ...P.plays, P.post, P.out,
  T.upload.drop, T.upload.click,
  ...T.find.clicks, ...T.cuts.marks, T.cuts.acceptAll, T.cuts.apply,
  T.plan.tab,
  T.result.out, T.cta.click,
];
for (const at of CLICKS) mouseClick(at);

for (const at of [T.upload.zoom, T.upload.pan, T.analyze.zoom, T.find.zoom, T.cuts.zoom, T.cuts.pan, T.plan.scroll[0], T.plan.scroll[1]]) whoosh(at, 0.5, 300, 1600, 0.018);
for (const at of [I.what, I.decide, I.editor, I.duration, R.at, T.result.in, T.plan.in, T.bento.in, M.finds, M.decide, M.editor, T.cta.in]) whoosh(at - 0.05, 0.5, 400, 2800, 0.03);
T.analyze.steps.forEach((at, i) => marimba(at, [76, 79, 83, 86][i], { gain: 0.09 }));
I.results.forEach((at, i) => marimba(at, [79, 84, 88][i], { gain: 0.09 }));
T.bento.cards.forEach((at, i) => marimba(at, [72, 74, 76, 79, 81, 84][i], { gain: 0.09 }));
for (let k = 0; k < 9; k++) marimba(T.result.in + 0.5 + k * 0.1, 84 + (k % 2) * 3, { gain: 0.05 });
bell(T.result.in + 1.4, 84, { gain: 0.03, d: 1.1 });
bell(T.cta.url, 88, { gain: 0.016, d: 1.2 });

mkdirSync(join(here, "../public/film"), { recursive: true });
render(join(here, "../public/film/soundtrack.wav"));
