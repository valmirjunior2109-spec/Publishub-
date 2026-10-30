// Publishub · Reel "O caderno": a trilha. Lê src/caderno/timeline.json, o mesmo que a animação.
// Saída: public/caderno/soundtrack.wav.
//
// A batida é feita de papel: a caneta riscando é o chimbal, o post-it batendo é a caixa,
// o baque do caderno é o bumbo. Por cima, uma marimba e um baixo pizzicato a 100 BPM
// (D → Bm → G → A). Tudo sintetizado aqui e em synth.mjs, nenhuma amostra gravada.
//   - o gancho: só o relógio e a caneta contando 47 risquinhos, cada vez mais rápido;
//   - o post-it: o tapa e o silêncio, e o "isn't a timestamp" fecha num baixo seco;
//   - a fita crepe: a música entra;
//   - a tesoura: um estalo por corte, os pedaços caem com papel voando;
//   - o fim: a página vira e a marimba resolve em D.
//
//   node scripts/make-sound-caderno.mjs

import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createMixer } from "./synth.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const T = JSON.parse(readFileSync(join(here, "../src/caderno/timeline.json"), "utf8"));
const { sec, midi, voice, biquad, noise, decay, snip, tick, whoosh, bell, render, SR } = createMixer(T);

const BPM = 100;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

/* ---------- os sons de papel ---------- */

/** A caneta riscando: ruído agudo com o tremor da mão (modulação de 20–30 Hz). */
function scratch(at, dur, gain = 0.07, pan = 0) {
  const bp = biquad("bp", 3800, 0.8);
  const hp = biquad("hp", 1800);
  const rate = 20 + (noise() + 1) * 6;
  voice(at, dur + 0.03, (t) => {
    const am = 0.55 + 0.45 * Math.abs(Math.sin(Math.PI * rate * t));
    const env = Math.min(1, t / 0.008) * Math.min(1, Math.max(0, (dur + 0.03 - t) / 0.03));
    return bp(hp(noise())) * am * env * 2.2;
  }, { gain, pan, send: 0.05 });
}

/** O post-it batendo no papel: um tapa grave e o estalo do papel. */
function slap(at, gain = 0.5) {
  const lp = biquad("lp", 1100);
  voice(at, 0.25, (t) => lp(noise()) * decay(t, 0.001, 0.035) * 2.5 + Math.sin(2 * Math.PI * 110 * t) * decay(t, 0.001, 0.05), { gain, send: 0.15 });
}

/** A fita crepe saindo do rolo: ruído que sobe, com estalinhos. */
function tapeRip(at, dur = 0.32, gain = 0.16) {
  const hp = biquad("hp", 1500);
  voice(at, dur, (t, i) => {
    if (i % 64 === 0) hp.set(1500 + 5000 * (t / dur));
    const crack = noise() > 0.93 ? noise() * 2.5 : 0;
    return (hp(noise()) * 1.2 + crack) * Math.sin(Math.PI * (t / dur)) ** 0.7;
  }, { gain, pan: 0.1, send: 0.1 });
}

/** O caderno batendo na mesa: um "tum" de madeira. */
function thud(at, gain = 0.45) {
  let ph = 0;
  voice(at, 0.35, (t) => {
    const f = 70 + 90 * Math.exp(-t / 0.02);
    ph += (2 * Math.PI * f) / SR;
    return Math.sin(ph) * decay(t, 0.001, 0.09);
  }, { gain });
}

/** O estalo de dedo / papel dobrado: a caixa da batida. */
function snap(at, gain = 0.14) {
  const bp = biquad("bp", 2400, 1.2);
  voice(at, 0.12, (t) => bp(noise()) * decay(t, 0.0005, 0.018) * 3, { gain, pan: -0.05, send: 0.25 });
}

/** A página virando: ruído com o tremular do papel. */
function pageFlip(at, dur = 0.7, gain = 0.2) {
  const bp = biquad("bp", 900, 0.7);
  voice(at, dur, (t, i) => {
    if (i % 64 === 0) bp.set(700 + 2600 * Math.sin(Math.PI * (t / dur)));
    const flutter = 0.6 + 0.4 * Math.sin(2 * Math.PI * 14 * t);
    return bp(noise()) * flutter * Math.sin(Math.PI * (t / dur)) ** 1.2 * 2;
  }, { gain, pan: -0.2, send: 0.25 });
}

/** O tique-taque do relógio da madrugada. */
function clock(at, tock) {
  tick(at, { freq: tock ? 1500 : 1900, gain: 0.07, d: 0.01, pan: tock ? -0.15 : 0.15 });
}

/* ---------- os instrumentos ---------- */

/** Marimba: fundamental, o 4º parcial (3,9×) que some rápido, e o toque da baqueta. */
function marimba(at, note, gain = 0.09, pan = 0) {
  const f = midi(note);
  voice(at, 0.9, (t) => {
    const body = Math.sin(2 * Math.PI * f * t) * decay(t, 0.002, 0.32);
    const ring = 0.35 * Math.sin(2 * Math.PI * f * 3.93 * t) * decay(t, 0.001, 0.05);
    const mallet = 0.12 * Math.sin(2 * Math.PI * f * 9.8 * t) * decay(t, 0.0005, 0.012);
    return body + ring + mallet;
  }, { gain, pan, send: 0.22 });
}

/** Baixo pizzicato: corda beliscada, redonda. */
function pizz(at, note, gain = 0.2) {
  const f = midi(note);
  const lp = biquad("lp", 700, 0.8);
  voice(at, 0.7, (t) => lp((Math.sin(2 * Math.PI * f * t) + 0.45 * Math.sin(4 * Math.PI * f * t) + 0.15 * Math.sin(6 * Math.PI * f * t)) * decay(t, 0.004, 0.22)), { gain, send: 0.1 });
}

/* ---------- 0–2,2 s · o gancho: 47 risquinhos ---------- */

for (let f = 0; f < T.sticky.slap; f += 15) clock(sec(f), (f / 15) % 2 === 1);
const { from, to, count, pow } = T.tally;
const times = Array.from({ length: count }, (_, k) => from + (to - from) * Math.pow(k / (count - 1), pow));
times.forEach((t, k) => {
  const gap = k < count - 1 ? times[k + 1] - t : 3;
  scratch(sec(t), Math.min(4, Math.max(1.1, gap * 0.85)) / T.fps, 0.09, k % 2 ? 0.12 : -0.12);
});
scratch(sec(T.tally.num[0]), (T.tally.num[1] - T.tally.num[0]) / T.fps, 0.08);
scratch(sec(T.tally.circle[0]), (T.tally.circle[1] - T.tally.circle[0]) / T.fps, 0.09);
thud(sec(T.tally.circle[1]), 0.5);
tapeRip(sec(T.tally.tape) - 0.12, 0.2, 0.08);

/* ---------- 2,2–5,4 s · o post-it ---------- */

whoosh(sec(66), 0.22, 500, 2500, 0.08);
slap(sec(T.sticky.slap), 0.6);
for (const k of ["circle", "arrow", "where", "line1", "line2"]) {
  const [a, b] = T.sticky[k];
  scratch(sec(a), (b - a) / T.fps, 0.075);
}
scratch(sec(T.sticky.under[0]), 0.09, 0.09);
scratch(sec(T.sticky.under[0]) + 0.12, 0.09, 0.09);
pizz(sec(T.sticky.under[1]), 38, 0.3); // o ponto final: D seco

/* ---------- 5,6 s em diante · a fita, e a música entra ---------- */

tapeRip(sec(T.turn.tape) - 0.3, 0.32, 0.18);
slap(sec(T.turn.tape), 0.35);
scratch(sec(T.turn.later[0]), (T.turn.later[1] - T.turn.later[0]) / T.fps, 0.06);

const PROG = [
  { root: 38, chord: [62, 66, 69, 74] }, // D
  { root: 35, chord: [59, 62, 66, 71] }, // Bm
  { root: 31, chord: [55, 59, 62, 67] }, // G
  { root: 33, chord: [57, 61, 64, 69] }, // A
];
// o riff: semicolcheias com respiros, a mesma figura em cada acorde
const RIFF = [0, null, 2, 1, null, 3, 2, null, 0, 2, null, 3, 1, null, 2, null];
const musicFrom = sec(T.turn.tape);
const musicTo = sec(T.payoff.l1[0]);
for (let bar = 0, t0 = musicFrom; t0 < musicTo - 0.05; bar++, t0 += BAR) {
  const ch = PROG[bar % PROG.length];
  RIFF.forEach((n, i) => {
    const t = t0 + i * (BEAT / 4);
    if (n !== null && t < musicTo) marimba(t, ch.chord[n], 0.075, i % 2 ? 0.25 : -0.25);
  });
  for (let b = 0; b < 4; b++) {
    const tb = t0 + b * BEAT;
    if (tb >= musicTo) break;
    pizz(tb, ch.root + (b === 2 ? 7 : 0), b % 2 ? 0.13 : 0.2);
    if (b % 2 === 0) thud(tb, 0.32);
    else snap(tb, 0.13);
    scratch(tb + BEAT / 2, 0.035, 0.035, 0.3); // o "chimbal" de caneta
  }
}

/* ---------- os gestos ---------- */

// cada palavra e cada traço da caneta riscam
const pairs = [
  T.chart.circle, T.chart.note, T.chart.arrow, T.chart.photoNote,
  ...T.transcript.strike, ...T.transcript.notes, T.transcript.tick, T.transcript.keep,
  T.decide.head, T.decide.note, T.strip.lines, T.strip.big,
  T.payoff.l1, T.payoff.l2, T.payoff.wave,
];
for (const [a, b] of pairs) scratch(sec(a), (b - a) / T.fps, 0.055);
whoosh(sec(T.chart.curve[0]), (T.chart.curve[1] - T.chart.curve[0]) / T.fps, 400, 1800, 0.05);
marimba(sec(T.chart.dot), 81, 0.14);
marimba(sec(T.chart.dot) + 0.09, 86, 0.11);
for (const f of [T.chart.photo, T.decide.photo]) {
  slap(sec(f), 0.35);
  tapeRip(sec(f) + 0.05, 0.16, 0.07);
}
// os três ticks sobem como uma escada
T.decide.ticks.forEach((f, i) => {
  scratch(sec(f), 5 / T.fps, 0.08);
  marimba(sec(f) + 0.12, [74, 78, 81][i], 0.13);
});
// a fita: marca-texto, tesoura, pedaços caindo
scratch(sec(T.strip.marker[0]), (T.strip.marker[1] - T.strip.marker[0]) / T.fps, 0.05);
T.strip.snips.forEach((f, i) => {
  whoosh(sec(f - 5), 0.15, 2500, 5000, 0.04, 0.2);
  snip(sec(f), i % 2 ? 0.15 : -0.15, 0.42);
});
pageFlip(sec(T.strip.fall), 0.6, 0.12);
whoosh(sec(T.strip.slide[0]), (T.strip.slide[1] - T.strip.slide[0]) / T.fps, 300, 900, 0.07);
thud(sec(T.strip.slide[1]), 0.35);
[74, 78, 81, 86].forEach((n, i) => marimba(sec(T.strip.big[1]) + i * 0.07, n, 0.1, -0.3 + i * 0.2));

/* ---------- o fecho e o fim ---------- */

// a música sai; ficam acordes longos de marimba (trêmolo) enquanto a frase é escrita
for (let t = sec(T.payoff.l1[0]); t < sec(T.end.turn[0]); t += BEAT / 4) {
  const ch = t < sec(T.payoff.print) ? PROG[2] : PROG[3];
  marimba(t, ch.chord[Math.floor((t * 8) % 4)], 0.035, Math.sin(t * 3) * 0.4);
}
pizz(sec(T.payoff.l1[0]), 31, 0.25);
pizz(sec(T.payoff.print), 33, 0.25);
pageFlip(sec(T.end.turn[0]), (T.end.turn[1] - T.end.turn[0]) / T.fps + 0.2, 0.3);
thud(sec(T.end.zoom[1]), 0.5);
pizz(sec(T.end.zoom[1]), 38, 0.3);
[62, 66, 69, 74, 78].forEach((n, i) => marimba(sec(T.end.word) + i * 0.09, n, 0.11, -0.4 + i * 0.2));
scratch(sec(T.end.tag[0]), (T.end.tag[1] - T.end.tag[0]) / T.fps, 0.05);
scratch(sec(T.end.arrow[0]), (T.end.arrow[1] - T.end.arrow[0]) / T.fps, 0.06);
slap(sec(T.end.cta), 0.25);
bell(sec(T.end.url), 86, { gain: 0.06, d: 1.6 });
for (let t = sec(T.end.word) + 0.6; t < sec(T.durationInFrames) - 1; t += BEAT / 2) marimba(t, [62, 66, 69, 74][Math.round(t / (BEAT / 2)) % 4], 0.03);
pizz(sec(T.end.url), 38, 0.18);

mkdirSync(join(here, "../public/caderno"), { recursive: true });
render(join(here, "../public/caderno/soundtrack.wav"));
