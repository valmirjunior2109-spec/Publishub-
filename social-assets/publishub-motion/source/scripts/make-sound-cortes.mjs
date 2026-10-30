// Publishub · Reel "Cortes": a trilha. Lê src/cortes/timeline.json, o mesmo que a animação.
// Saída: public/cortes/soundtrack.wav.
//
// Minimalista, como a do "O caderno": pulso suave de synth, piano abafado, pad baixo e, na parte
// do produto, sub e bumbo macio. 120 BPM: 1 tempo = 15 quadros, e todo corte de cena cai num tempo.
// Cada corte ganha um clique baixinho (o "corte" do editor); nada de whoosh nem impacto.
// Tudo sintetizado aqui e em synth.mjs, nenhuma amostra gravada.
//
//   node scripts/make-sound-cortes.mjs

import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createMixer } from "./synth.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const T = JSON.parse(readFileSync(join(here, "../src/cortes/timeline.json"), "utf8"));
const { sec, midi, voice, biquad, noise, decay, tick, bell, render, SR } = createMixer(T);

const BEAT = 0.5;
const BAR = BEAT * 4;
const START = sec(T.upload.start); // os compassos contam a partir do produto
const END = sec(T.durationInFrames);

/* ---------- os instrumentos (os mesmos do "O caderno") ---------- */

const saw = (ph) => 2 * (ph - Math.floor(ph + 0.5));
const pump = (t) => {
  const since = ((t % BEAT) + BEAT) % BEAT;
  return 1 - 0.35 * Math.exp(-since / 0.12);
};

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

function felt(at, note, gain = 0.07, pan = 0) {
  const f = midi(note);
  const lp = biquad("lp", 2200, 0.7);
  voice(at, 2.4, (t) => lp((Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t) * Math.exp(-t / 0.4) + 0.08 * Math.sin(6 * Math.PI * f * t) * Math.exp(-t / 0.15)) * decay(t, 0.006, 0.9)), { gain, pan, send: 0.4 });
}

function pad(at, dur, notes, gain = 0.02) {
  notes.forEach((n, k) => {
    [-0.08, 0.08].forEach((det, j) => {
      const f = midi(n + det);
      const lp = biquad("lp", 1100, 0.6);
      let ph = (k * 0.31 + j * 0.5) % 1;
      voice(at, dur + 0.5, (t) => {
        ph += f / SR;
        const env = Math.min(1, t / 0.3) * (t > dur ? Math.max(0, 1 - (t - dur) / 0.5) : 1);
        return lp(saw(ph)) * env * pump(at + t);
      }, { gain: gain / 2, pan: j ? 0.5 : -0.5, send: 0.35 });
    });
  });
}

function sub(at, note, dur, gain = 0.06) {
  const f = midi(note);
  voice(at, dur, (t) => Math.sin(2 * Math.PI * f * t) * Math.min(1, t / 0.02) * Math.min(1, (dur - t) / 0.08) * pump(at + t), { gain });
}

function softKick(at, gain = 0.15) {
  let ph = 0;
  voice(at, 0.4, (t) => {
    const f = 48 + 60 * Math.exp(-t / 0.03);
    ph += (2 * Math.PI * f) / SR;
    return Math.sin(ph) * decay(t, 0.003, 0.15);
  }, { gain });
}

function snap(at, gain = 0.05) {
  const bp = biquad("bp", 2300, 1.2);
  voice(at, 0.12, (t) => bp(noise()) * decay(t, 0.0005, 0.016) * 3, { gain, pan: -0.1, send: 0.35 });
}

/** O corte: um clique seco e baixo, como o da lâmina num editor. */
function cut(at, gain = 0.05) {
  tick(at, { freq: 1700, gain, d: 0.008 });
}

/* ---------- a harmonia ---------- */

const PROG = [
  { root: 36, chord: [60, 64, 67, 71], top: 76 }, // Cmaj7
  { root: 43, chord: [59, 62, 67, 74], top: 74 }, // G
  { root: 45, chord: [57, 60, 64, 67], top: 72 }, // Am7
  { root: 41, chord: [57, 60, 65, 69], top: 72 }, // F
];
const barAt = (t) => PROG[((Math.floor((t - START) / BAR) % 4) + 4) % 4];
const PULSE = [0, 2, 1, 2, 0, 2, 1, 3];

function music(a, b, { pulseOn = true, kick = false, snaps = false, subOn = false, piano = true, padOn = true, pulseMul = 1, padGain = 0.02 } = {}) {
  const first = Math.ceil(a / BEAT - 1e-6);
  for (let i = first; i * BEAT < b - 0.01; i++) {
    const t = i * BEAT;
    const beat = ((Math.round((t - START) / BEAT) % 4) + 4) % 4;
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

/* ---------- a música ---------- */

const productEnd = sec(T.payoff.words[0]);
music(0, sec(T.client.words[0]), { piano: false, padOn: false, pulseMul: 2.4 }); // o gancho: o pulso
music(sec(T.client.words[0]), START, { pulseOn: false, piano: false, padGain: 0.05 }); // o cliente e a marca: o pad
music(START, productEnd, { kick: true, snaps: true, subOn: true }); // o produto
music(productEnd, sec(T.end.start), { pulseOn: false, padGain: 0.04 }); // o fecho
const endAt = sec(T.end.start);
[48, 55, 64, 71, 76].forEach((n, i) => felt(endAt + i * 0.05, n, 0.07, -0.3 + i * 0.15));
pad(endAt, END - endAt - 0.8, [48, 55, 64, 71], 0.024);
music(endAt + BAR, END - 0.8, { piano: false, padOn: false });
bell(sec(T.end.url), 88, { gain: 0.03, d: 1.4 });

/* ---------- os cortes e os detalhes ---------- */

// o contador: um tique leve a cada número novo, como um relógio acelerando
const countAt = (f) => 1 + Math.floor(46 * Math.pow(Math.min(1, Math.max(0, (f - T.hook.count[0]) / (T.hook.count[1] - T.hook.count[0]))), 2));
for (let f = 1; f < T.hook.slam; f++) if (countAt(f) !== countAt(f - 1)) tick(sec(f), { freq: 2100, gain: 0.03, d: 0.006 });
softKick(sec(T.hook.slam), 0.3);
felt(sec(T.hook.slam), 72, 0.08);

// um clique em cada corte de cena
const cuts = [
  T.hook.slam, T.hook.out, ...T.client.words.slice(1), T.client.quote, T.client.out, T.logo.out,
  T.second.start, T.line.start, T.cuts.start, T.export.start, ...T.payoff.words, T.end.start,
];
for (const f of cuts) cut(sec(f));
felt(sec(T.client.quote), 79, 0.06);
T.line.strikes.forEach((f) => tick(sec(f), { freq: 1300, gain: 0.025, d: 0.01 }));
T.cuts.rows.forEach((f, i) => felt(sec(f) + 0.02, [76, 79, 84][i], 0.05));
felt(sec(T.export.out1), 84, 0.05);
T.payoff.words.forEach((f, i) => felt(sec(f), [72, 74, 76][i], 0.05));

mkdirSync(join(here, "../public/cortes"), { recursive: true });
render(join(here, "../public/cortes/soundtrack.wav"));
