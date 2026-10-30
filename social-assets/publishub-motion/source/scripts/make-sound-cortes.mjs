// Publishub · Reel "Cortes": a trilha. Lê src/cortes/timeline.json, o mesmo que a animação.
// Saída: public/cortes/soundtrack.wav.
//
// Chillhop em meio-tempo: piano elétrico (Rhodes) com acordes de jazz, baixo 808 redondo,
// caixa seca, chimbal e shaker. 120 BPM contados em meio-tempo (o corpo da batida soa a 60):
// todo corte de cena continua caindo num tempo (15 quadros). Dm9 → G13 → Cmaj9 → Am9.
//   - o gancho: o Rhodes sozinho e um chimbal leve a cada número do contador;
//   - o #47: a batida entra com o 808;
//   - "Somewhere": a batida para; "isn't a timestamp" volta na caixa;
//   - o logo e o produto: a batida inteira e uma frase de Rhodes por cima;
//   - o fecho: só os acordes e um 808 em cada palavra; o CTA resolve em Cmaj9.
// Tudo sintetizado aqui e em synth.mjs, nenhuma amostra gravada.
//
//   node scripts/make-sound-cortes.mjs

import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createMixer } from "./synth.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const T = JSON.parse(readFileSync(join(here, "../src/cortes/timeline.json"), "utf8"));
const { sec, midi, voice, biquad, noise, decay, render, SR } = createMixer(T);

const BEAT = 0.5; // 120 BPM (15 quadros)
const BAR = BEAT * 4; // 2 s: um acorde por compasso
const END = sec(T.durationInFrames);

/* ---------- os instrumentos ---------- */

/** Rhodes: FM de dois operadores (o "tine" que brilha no ataque), trêmolo lento, filtro quente. */
function rhodes(at, notes, dur, { gain = 0.05, strum = 0.014, bright = 1 } = {}) {
  notes.forEach((n, i) => {
    const f = midi(n);
    const lp = biquad("lp", 2600 * bright, 0.6);
    const start = at + i * strum;
    voice(start, dur + 0.8, (t) => {
      const index = 1.6 * bright * Math.exp(-t / 0.25) + 0.25;
      const mod = Math.sin(2 * Math.PI * f * t) * index;
      const tine = Math.sin(2 * Math.PI * f * t + mod);
      const env = decay(t, 0.004, 1.6) * (t > dur ? Math.max(0, 1 - (t - dur) / 0.8) : 1);
      const trem = 0.88 + 0.12 * Math.sin(2 * Math.PI * 4.5 * t);
      return lp(tine * env * trem);
    }, { gain, pan: -0.3 + (i / Math.max(1, notes.length - 1)) * 0.6, send: 0.3 });
  });
}

/** 808: senoide com queda de altura no ataque e saturação leve (para aparecer no celular). */
function bass808(at, note, dur = 0.9, gain = 0.32) {
  const f = midi(note);
  let ph = 0;
  voice(at, dur, (t) => {
    const fr = f * (1 + 1.2 * Math.exp(-t / 0.025));
    ph += (2 * Math.PI * fr) / SR;
    const env = Math.min(1, t / 0.003) * Math.exp(-t / (dur * 0.55)) * Math.min(1, (dur - t) / 0.05);
    return Math.tanh(Math.sin(ph) * 1.8) * env;
  }, { gain });
}

/** Bumbo curto, só o soco (o grave longo é do 808). */
function kick(at, gain = 0.4) {
  let ph = 0;
  voice(at, 0.18, (t) => {
    const f = 60 + 110 * Math.exp(-t / 0.018);
    ph += (2 * Math.PI * f) / SR;
    return Math.sin(ph) * decay(t, 0.001, 0.06) + (t < 0.003 ? noise() * 0.4 : 0);
  }, { gain });
}

/** Caixa seca de hip-hop: corpo a 190 Hz e ruído em banda média. */
function snare(at, gain = 0.2) {
  const bp = biquad("bp", 1900, 0.7);
  voice(at, 0.3, (t) => bp(noise()) * 1.6 * decay(t, 0.001, 0.09) + Math.sin(2 * Math.PI * 190 * t) * decay(t, 0.001, 0.05) * 0.8, { gain, pan: 0.05, send: 0.18 });
}

function hat(at, gain = 0.03, open = false) {
  const hp = biquad("hp", 7500);
  voice(at, open ? 0.25 : 0.06, (t) => hp(noise()) * decay(t, 0.0008, open ? 0.08 : 0.016), { gain, pan: 0.22 });
}

function shaker(at, gain = 0.014) {
  const bp = biquad("bp", 6500, 0.9);
  voice(at, 0.08, (t) => bp(noise()) * decay(t, 0.012, 0.02) * 2, { gain, pan: -0.3 });
}

/* ---------- a harmonia ---------- */

const PROG = [
  { root: 38, chord: [53, 57, 60, 64], lead: [69, 72, 74] }, // Dm9  (F A C E sobre D)
  { root: 43, chord: [53, 59, 64, 69], lead: [71, 74, 76] }, // G13  (F B E A sobre G)
  { root: 36, chord: [52, 55, 59, 62], lead: [67, 71, 74] }, // Cmaj9 (E G B D sobre C)
  { root: 45, chord: [55, 60, 64, 67], lead: [72, 71, 67] }, // Am9  (G C E G sobre A)
];
const barIndex = (t) => Math.floor(t / BAR + 1e-6);
const chordAt = (t) => PROG[((barIndex(t) % 4) + 4) % 4];

/** A batida de meio-tempo de um compasso que começa em `t0`, cortada em `until`. */
function drums(t0, until, { full = true } = {}) {
  const hit = (dt, fn) => {
    if (t0 + dt < until - 0.005) fn(t0 + dt);
  };
  const ch = chordAt(t0);
  hit(0, (t) => {
    kick(t);
    bass808(t, ch.root, 0.95);
  });
  hit(BEAT * 1.5, (t) => {
    kick(t, 0.3);
    bass808(t, ch.root, 0.4, 0.22);
  });
  hit(BEAT * 2, (t) => snare(t));
  if (full) {
    hit(BEAT * 3.25, (t) => kick(t, 0.22));
    hit(BEAT * 3.5, (t) => bass808(t, ch.root + 7, 0.35, 0.18));
  }
  for (let e = 0; e < 8; e++) hit(e * (BEAT / 2), (t) => hat(t, e % 2 ? 0.02 : 0.032, full && e === 7));
  if (full) for (let s = 0; s < 4; s++) hit(s * BEAT + BEAT * 0.75, (t) => shaker(t));
}

/** Os acordes de Rhodes, um por compasso, e (se `lead`) uma frase de três notas por cima. */
function keys(a, b, { lead = false, gain = 0.05, bright = 1 } = {}) {
  for (let bi = Math.ceil(a / BAR - 1e-6); bi * BAR < b - 0.01; bi++) {
    const t0 = bi * BAR;
    const ch = chordAt(t0);
    rhodes(t0, ch.chord, Math.min(BAR, b - t0) - 0.1, { gain, bright });
    if (lead) ch.lead.forEach((n, i) => { const tl = t0 + BEAT * (1 + i * 0.75); if (tl < b) rhodes(tl, [n], 0.4, { gain: gain * 0.9, bright: 1.2 }); });
  }
}

/* ---------- a forma ---------- */

const slam = sec(T.hook.slam);
const stop = sec(T.client.quote);
const back = sec(T.client.timestamp);
const product = sec(T.logo.start);
const payoff = sec(T.payoff.words[0]);
const endAt = sec(T.end.start);

// o gancho: o Rhodes sozinho, abafado; um chimbal a cada número novo do contador
keys(0, slam, { gain: 0.09, bright: 0.7 });
rhodes(BAR / 2, PROG[0].chord.slice(1), slam - BAR / 2 - 0.05, { gain: 0.07, bright: 0.7 }); // o acorde de novo, no meio do contador
const countAt = (f) => 1 + Math.floor(46 * Math.pow(Math.min(1, Math.max(0, (f - T.hook.count[0]) / (T.hook.count[1] - T.hook.count[0]))), 2));
for (let f = 1; f < T.hook.slam; f++) if (countAt(f) !== countAt(f - 1)) hat(sec(f), 0.022);

// #47: a batida entra (o compasso começa no #47, a 2 s)
for (let t0 = slam; t0 < stop - 0.01; t0 += BAR) drums(t0, stop, { full: false });
keys(slam, stop, { gain: 0.05 });
// "Somewhere": tudo para, fica só o acorde soando; "isn't a timestamp" volta na caixa e no 808
rhodes(stop, [52, 55, 59, 62], back - stop + 0.6, { gain: 0.045, bright: 0.7 });
snare(back, 0.24);
bass808(back, 36, 0.6, 0.3);
// a marca e o produto: a batida inteira, com a frase de Rhodes por cima
for (let t0 = Math.ceil(product / BAR - 1e-6) * BAR - BAR / 2; t0 < payoff - 0.01; t0 += BAR) drums(Math.max(product, t0), payoff, { full: true });
keys(product, payoff, { lead: true });
// o fecho: só os acordes e um 808 em cada palavra
keys(payoff, endAt, { gain: 0.05, bright: 0.8 });
T.payoff.words.forEach((f, i) => bass808(sec(f), [38, 43, 36][i], 0.7, 0.28));
// o CTA: Cmaj9 longo, e a batida volta baixinha até o fim
rhodes(endAt, [48, 52, 55, 59, 62, 67], END - endAt - 0.6, { gain: 0.05, strum: 0.03 });
bass808(endAt, 36, 1.6, 0.3);
for (let t0 = endAt + BAR; t0 < END - 0.8; t0 += BAR) drums(t0, END - 0.8, { full: false });

/* ---------- os detalhes digitais (a cara de ferramenta) ---------- */

/** O glitch do corte: ruído agudo "esmigalhado" (sample-and-hold), 60 ms, baixinho. */
function zap(at, gain = 0.05) {
  const hp = biquad("hp", 2500);
  let held = 0;
  voice(at, 0.07, (t, i) => {
    if (i % 24 === 0) held = noise();
    return hp(held) * decay(t, 0.001, 0.025);
  }, { gain, pan: 0.15 });
}

/** Um bipe de dado: quadrada curta e filtrada. */
function data(at, note, gain = 0.035) {
  const f = midi(note);
  const lp = biquad("lp", 3500);
  voice(at, 0.12, (t) => lp(Math.sin(2 * Math.PI * f * t) > 0 ? 1 : -1) * decay(t, 0.001, 0.035), { gain, pan: -0.15, send: 0.15 });
}

const sceneCuts = [T.client.words[0], T.client.quote, T.logo.start, T.upload.start, T.second.start, T.line.start, T.cuts.start, T.export.start, T.payoff.words[0], T.end.start];
for (const f of sceneCuts) zap(sec(f));
data(sec(T.client.words[3]), 88); // ERR_NO_TIMESTAMP
data(sec(T.client.words[3]) + 0.08, 84);
data(sec(T.logo.out - 4), 91); // 100%
data(sec(T.second.note + 10), 86); // o marcador da queda
T.line.strikes.slice(0, 3).forEach((f) => data(sec(f), 79, 0.025));
T.cuts.rows.forEach((f, i) => data(sec(f), [84, 88, 91][i]));

mkdirSync(join(here, "../public/cortes"), { recursive: true });
render(join(here, "../public/cortes/soundtrack.wav"));
