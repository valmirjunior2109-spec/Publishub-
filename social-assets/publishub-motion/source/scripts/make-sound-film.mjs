// Filme de lançamento: a trilha. Lê src/film/timeline.json, o mesmo que a animação (tempos em segundos).
// Saída: public/film/soundtrack.wav.
//
// O clique do mouse é a estrela: alto, seco e com o som de apertar e soltar, com a música baixa por baixo.
// A música é da família do chillhop aprovado no Reel "Cortes" (Rhodes, 808, 120 BPM em meio-tempo): só as
// teclas no problema, abre na marca, batida no produto, solta na ideia e volta no convite.
//
//   node scripts/make-sound-film.mjs

import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createMixer } from "./synth.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const T = JSON.parse(readFileSync(join(here, "../src/film/timeline.json"), "utf8"));
const { midi, voice, biquad, noise, decay, bell, whoosh, riser, boom, pad, render, SR } = createMixer(T);

const BEAT = 0.5;
const BAR = BEAT * 4;
const END = T.durationInFrames / T.fps;
const MUSIC = 0.6; // tudo o que é música passa por aqui: o clique precisa ficar por cima

/** O clique de um mouse de verdade: apertar (estalo agudo + corpo de plástico) e soltar, 80 ms depois. */
function mouseClick(at, { gain = 0.85, pan = 0 } = {}) {
  const part = (t0, level, snap, body) => {
    const hp = biquad("hp", 2200);
    const res = biquad("bp", snap, 3.5);
    voice(t0, 0.05, (t) => {
      const n = noise();
      const crack = hp(n) * decay(t, 0.0002, 0.0016) * 1.5;
      const ring = res(n) * decay(t, 0.0003, 0.005) * 3.4;
      const thock = Math.sin(2 * Math.PI * body * t) * decay(t, 0.0004, 0.009) * 0.9;
      return Math.tanh((crack + ring + thock) * 1.5);
    }, { gain: level, pan });
  };
  part(at, gain, 3300, 240);
  part(at + 0.08, gain * 0.62, 4300, 320);
}

function rhodes(at, notes, dur, { gain = 0.05, strum = 0.014, bright = 1 } = {}) {
  notes.forEach((n, i) => {
    const f = midi(n);
    const lp = biquad("lp", 2600 * bright, 0.6);
    voice(at + i * strum, dur + 0.9, (t) => {
      const mod = Math.sin(2 * Math.PI * f * t) * (1.6 * bright * Math.exp(-t / 0.25) + 0.25);
      const env = decay(t, 0.004, 1.6) * (t > dur ? Math.max(0, 1 - (t - dur) / 0.9) : 1);
      return lp(Math.sin(2 * Math.PI * f * t + mod) * env);
    }, { gain: gain * MUSIC, pan: -0.3 + (i / Math.max(1, notes.length - 1)) * 0.6, send: 0.3 });
  });
}

function pluck(at, note, { gain = 0.016, pan = 0 } = {}) {
  const f = midi(note);
  const lp = biquad("lp", 3000, 0.7);
  voice(at, 0.24, (t) => lp(Math.sin(2 * Math.PI * f * t + Math.sin(2 * Math.PI * f * 2 * t) * Math.exp(-t / 0.04)) * decay(t, 0.002, 0.07)), { gain: gain * MUSIC, pan, send: 0.35 });
}

function bass808(at, note, dur = 0.9, gain = 0.26) {
  const f = midi(note);
  let ph = 0;
  voice(at, dur, (t) => {
    ph += (2 * Math.PI * f * (1 + 1.2 * Math.exp(-t / 0.025))) / SR;
    return Math.tanh(Math.sin(ph) * 1.8) * Math.min(1, t / 0.003) * Math.exp(-t / (dur * 0.55)) * Math.min(1, (dur - t) / 0.05);
  }, { gain: gain * MUSIC });
}

function kick(at, gain = 0.3) {
  let ph = 0;
  voice(at, 0.18, (t) => {
    ph += (2 * Math.PI * (60 + 110 * Math.exp(-t / 0.018))) / SR;
    return Math.sin(ph) * decay(t, 0.001, 0.06);
  }, { gain: gain * MUSIC });
}

function snare(at, gain = 0.12) {
  const bp = biquad("bp", 1500, 0.7);
  voice(at, 0.3, (t) => bp(noise()) * 1.5 * decay(t, 0.001, 0.09) + Math.sin(2 * Math.PI * 190 * t) * decay(t, 0.001, 0.05) * 0.8, { gain: gain * MUSIC, pan: 0.05, send: 0.18 });
}

function hat(at, gain = 0.014) {
  const hp = biquad("hp", 8000);
  voice(at, 0.06, (t) => hp(noise()) * decay(t, 0.0008, 0.016), { gain: gain * MUSIC, pan: 0.22 });
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
    hit(BEAT * 1.5, (t) => { kick(t, 0.2); bass808(t, ch.root, 0.4, 0.17); });
    hit(BEAT * 2, (t) => snare(t));
    hit(BEAT * 3.5, (t) => bass808(t, ch.root + 7, 0.35, 0.13));
    for (let e = 0; e < 8; e++) hit(e * (BEAT / 2), (t) => hat(t, e % 2 ? 0.009 : 0.014));
  }
}

/* ---------- a música ---------- */

const P = T.problem;
const R = T.reveal;
const M = T.manifesto;

keys(0, P.drop, 0.04);
arpeggio(P.watched, P.drop, 0.008);
bass808(P.drop, 33, 2.2, 0.22);
rhodes(P.drop, [57, 60, 64], 1.4, { gain: 0.03 });
pad(P.where, R.at - P.where, [45, 52], { gain: 0.012, attack: 0.8, release: 0.5 });
riser(R.at - 1, 1, 0.03);

boom(R.at, 0.2);
rhodes(R.at, [48, 52, 55, 59, 62, 67], 3.6, { gain: 0.05, strum: 0.03 });
pad(R.at, T.upload.in - R.at + 0.4, [48, 55, 59, 64], { gain: 0.02, attack: 0.5, release: 0.7 });
arpeggio(R.at + BAR, T.upload.in, 0.012);

kick(T.upload.in, 0.3);
drums(T.upload.in, M.finds);
keys(T.upload.in, M.finds, 0.042);
arpeggio(T.upload.in, M.finds, 0.012);

keys(M.finds, M.out, 0.04);
for (const at of [M.finds, M.decide, M.editor]) bass808(at, 36, 1.3, 0.22);
riser(T.cta.in - 0.8, 0.8, 0.03);

boom(T.cta.in, 0.14);
rhodes(T.cta.in, [48, 52, 55, 59, 62, 67], BAR * 2, { gain: 0.05, strum: 0.03 });
keys(T.cta.in + BAR * 2, END - 3, 0.04);
drums(T.cta.in + BAR, END - 3);
arpeggio(T.cta.in + BAR, END - 3, 0.011);
rhodes(END - 3, [48, 52, 55, 59, 62, 67], 1.8, { gain: 0.05, strum: 0.03 });
bass808(END - 3, 36, 2.4, 0.22);

/* ---------- os cliques e os gestos ---------- */

const CLICKS = [
  P.drag[0], P.drag2[0], ...P.plays, P.post, P.out,
  T.upload.drop, T.upload.click,
  ...T.find.clicks, ...T.cuts.marks, T.cuts.acceptAll, T.cuts.apply,
  T.plan.tab,
  ...T.bento.clicks,
  M.finds, M.decide, M.editor, T.cta.in, T.cta.click,
];
for (const at of CLICKS) mouseClick(at);

for (const at of [T.upload.zoom, T.upload.pan, T.analyze.zoom, T.find.zoom, T.cuts.zoom, T.cuts.pan, T.plan.scroll[0], T.plan.scroll[1]]) whoosh(at, 0.5, 300, 1600, 0.022);
for (const at of [R.at, T.result.in, T.plan.in, T.bento.in, M.finds]) whoosh(at - 0.05, 0.5, 400, 2800, 0.035);
T.analyze.steps.forEach((at, i) => rhodes(at, [[76, 79, 83, 86][i]], 0.25, { gain: 0.04, bright: 1.3 }));
for (let k = 0; k < 9; k++) rhodes(T.result.in + 0.5 + k * 0.1, [88], 0.05, { gain: 0.016, bright: 1.4 });
bell(T.result.in + 1.4, 84, { gain: 0.03, d: 1.1 });
bell(T.cta.url, 88, { gain: 0.016, d: 1.2 });

mkdirSync(join(here, "../public/film"), { recursive: true });
render(join(here, "../public/film/soundtrack.wav"));
