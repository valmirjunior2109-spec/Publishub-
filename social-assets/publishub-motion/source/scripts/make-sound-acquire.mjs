// Publishub · anúncio de aquisição (36 s, 9:16 e 4:5): a trilha. Lê os quadros de
// src/acquire/timeline.json, os mesmos que a animação usa. Saída:
// public/soundtrack-acquire.wav.
//
// Tudo sintetizado aqui (nenhuma amostra, nenhuma música de terceiros):
//   - pop eletrônico limpo a 104 BPM: pluck em colcheias, pad, sub, bumbo e palmas;
//   - em 0:04 (a queda) a música desaba: o filtro fecha, o tom cai e fica um baque;
//   - na décima passada só sobram o pad e um pluck abafado; a batida volta no envio,
//     cresce do segundo exato em diante e fecha num acorde no convite.
// Por cima, a interface: cliques do Accept, o corte do vídeo, o Export.
//
//   node scripts/make-sound-acquire.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createMixer } from "./synth.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const T = JSON.parse(readFileSync(join(here, "../src/acquire/timeline.json"), "utf8"));
const { sec, midi, voice, biquad, noise, decay, click, blip, bell, pad, whoosh, swipe, tick, snip, boom, riser, render } = createMixer(T);
const END = sec(T.durationInFrames);
const BEAT = 60 / 104;
const BAR = BEAT * 4;
const E = BEAT / 2;

/* ---------- os instrumentos ---------- */

function pluck(at, note, { gain = 0.04, pan = 0, d = 0.26, bend = 0 } = {}) {
  const f = midi(note);
  const lp = biquad("lp", 3200, 0.7);
  let ph = 0;
  voice(at, d * 5, (t) => {
    ph += (2 * Math.PI * f * Math.pow(2, (bend * t) / 12)) / 48000;
    const v = Math.sin(ph) + 0.4 * Math.sin(2 * ph) * Math.exp(-t / 0.05) + 0.18 * Math.sin(3 * ph) * Math.exp(-t / 0.03);
    return lp(v * decay(t, 0.002, d));
  }, { gain, pan, send: 0.35 });
}

function kick(at, gain = 0.32) {
  voice(at, 0.45, (t) => Math.sin(2 * Math.PI * (46 + 80 * Math.exp(-t / 0.03)) * t) * decay(t, 0.002, 0.15) + (t < 0.003 ? noise() * 0.2 : 0), { gain });
}

function clap(at, gain = 0.07) {
  const bp = biquad("bp", 1500, 1.2);
  voice(at, 0.25, (t) => {
    const env = [0, 0.011, 0.022].reduce((a, o) => a + (t >= o ? Math.exp(-(t - o) / 0.009) : 0), 0) + (t > 0.03 ? Math.exp(-(t - 0.03) / 0.07) * 0.6 : 0);
    return bp(noise()) * env;
  }, { gain, pan: -0.05, send: 0.25 });
}

function hat(at, gain = 0.016, pan = 0.25) {
  const hp = biquad("hp", 7500);
  voice(at, 0.05, (t) => hp(noise()) * decay(t, 0.001, 0.014), { gain, pan });
}

function sub(at, note, dur, gain = 0.12) {
  const f = midi(note);
  voice(at, dur, (t) => Math.sin(2 * Math.PI * f * t) * Math.min(1, t / 0.02) * Math.min(1, (dur - t) / 0.08), { gain });
}

/** A queda: um tom que despenca de uma oitava e meia, com ruído abafado. */
function fall(at, gain = 0.12) {
  const lp = biquad("lp", 1200);
  let ph = 0;
  voice(at, 0.9, (t) => {
    ph += (2 * Math.PI * 440 * Math.pow(2, -t * 2.2)) / 48000;
    return (Math.sin(ph) * 0.6 + lp(noise()) * 0.3) * decay(t, 0.005, 0.35);
  }, { gain, send: 0.3 });
}

/* ---------- a música ---------- */

// Fá maior, brilhante: Fmaj7 → Am7 → Dm9 → Bbmaj7
const CHORDS = [
  { arp: [53, 57, 60, 64], pad: [53, 57, 60, 64], root: 29 },
  { arp: [57, 60, 64, 67], pad: [57, 60, 64, 67], root: 33 },
  { arp: [50, 53, 57, 64], pad: [50, 53, 57, 60, 64], root: 26 },
  { arp: [58, 62, 65, 69], pad: [58, 62, 65, 69], root: 34 },
];

const dropAt = sec(T.hook.drop);
const passAt = sec(T.pass.title) - 0.05;
const beatAt = sec(T.upload.title) - 0.05;
const fullAt = sec(T.find.title) - 0.05;
const stopAt = sec(T.cta.title);

/** Um compasso. `mode`: "tired" (sem bateria, abafado), "groove" (bumbo e chimbal), "full" (com palmas). */
function bar(t0, i, mode, until) {
  const c = CHORDS[i % CHORDS.length];
  if (t0 >= until) return;
  const len = Math.min(BAR, until - t0);
  pad(t0, len * 0.95, c.pad, { gain: mode === "full" ? 0.011 : 0.009, attack: mode === "tired" ? 0.4 : 0.08, release: 0.3 });
  if (mode !== "tired") sub(t0, c.root + 12, len * 0.95, 0.11);
  for (let k = 0; k < 8; k++) {
    const at = t0 + k * E;
    if (at >= until) break;
    if (mode === "tired") {
      if (k % 2 === 0) pluck(at, c.arp[(k / 2) % 4], { gain: 0.022, pan: k % 4 ? 0.3 : -0.3, d: 0.4 });
      continue;
    }
    pluck(at, c.arp[k % 4] + (k >= 4 ? 12 : 0), { gain: k % 2 ? 0.026 : 0.034, pan: k % 2 ? 0.3 : -0.3 });
    if (k % 2 === 0) kick(at, k === 0 ? 0.3 : 0.24);
    if (mode === "full" && (k === 2 || k === 6)) clap(at);
    hat(at + E / 2, k % 2 ? 0.012 : 0.017);
  }
}

function section(from, to, mode) {
  for (let t0 = from, i = 0; t0 < to - 0.05; t0 += BAR, i++) bar(t0, i, mode, to);
}

// o gancho: começa no primeiro quadro e despenca em 0:04
section(0, dropAt, "full");
fall(dropAt, 0.14);
kick(dropAt, 0.36);
boom(dropAt, 0.3);
snip(dropAt + 0.02, 0, 0.12);
section(passAt, beatAt, "tired");
section(beatAt, fullAt, "groove");
section(fullAt, stopAt, "full");
riser(stopAt - 1.6, 1.6, 0.08);

// o convite: o acorde, longo
kick(stopAt, 0.34);
boom(stopAt, 0.35);
pad(stopAt, END - stopAt - 0.6, [41, 53, 57, 60, 64, 67], { gain: 0.014, attack: 0.03, release: 1.2 });
sub(stopAt, 29, END - stopAt - 0.2, 0.12);
[72, 77, 81, 84].forEach((n, i) => bell(stopAt + 0.04 + i * 0.08, n, { gain: 0.026 - i * 0.003, d: 1.6, pan: -0.3 + i * 0.2 }));
[65, 69, 72, 76, 77, 81].forEach((n, i) => pluck(stopAt + 0.3 + (i * E) / 2, n, { gain: 0.026, pan: -0.4 + i * 0.16, d: 0.4 }));
T.cta.facts && [0, 1, 2].forEach((i) => tick(sec(T.cta.facts + i * 4), { freq: 2400 + i * 200, gain: 0.03, d: 0.01 }));

/* ---------- a interface ---------- */

const out = (f) => whoosh(sec(f) - 0.05, 0.45, 2600, 500, 0.035);

// a décima passada: cada volta da timeline é um "rebobinar" curto
T.pass.passes.forEach((f, i) => {
  whoosh(sec(f) - 0.02, 0.22, 3200, 900, 0.03, -0.3 + i * 0.2);
  tick(sec(f), { freq: 1800 + i * 150, gain: 0.03, d: 0.01 });
});
out(T.pass.out);

// o envio
click(sec(T.upload.file) - 0.03, { gain: 0.14 }); // pega o arquivo
swipe(sec(T.upload.file), { gain: 0.03, dur: sec(T.upload.drop - T.upload.file) });
click(sec(T.upload.drop), { gain: 0.18 }); // solta
blip(sec(T.upload.drop) + 0.05, 81, { gain: 0.03, d: 0.12 });
T.upload.steps.forEach((f, i) => blip(sec(f), [84, 86, 88][i], { gain: 0.028, d: 0.1, pan: -0.2 + i * 0.2 }));
swipe(sec(T.upload.note), { gain: 0.024, dur: 0.5 });
out(T.upload.out);

// o segundo exato
whoosh(sec(T.find.window) - 0.1, 0.5, 500, 2600, 0.04);
blip(sec(T.find.drop), 81, { gain: 0.04, d: 0.14 });
blip(sec(T.find.drop) + 0.08, 76, { gain: 0.034, d: 0.2 });
swipe(sec(T.find.note), { gain: 0.03, dur: 0.6 });
out(T.find.out);

// o porquê
swipe(sec(T.why.mark), { gain: 0.04, dur: 0.7 }); // o marca-texto
swipe(sec(T.why.instead), { gain: 0.026, dur: 0.5 });
blip(sec(T.why.instead + 12), 84, { gain: 0.03, d: 0.14 });
out(T.why.out);

// as sete frentes, cada uma com o seu visto
for (let i = 0; i < 7; i++) {
  tick(sec(T.fronts.rows + i * 5), { freq: 2000 + i * 120, gain: 0.022, d: 0.008 });
  blip(sec(T.fronts.rows + i * 5 + 8), [72, 74, 76, 77, 79, 81, 84][i], { gain: 0.02, d: 0.08, pan: -0.3 + i * 0.1 });
}
out(T.fronts.out);

// o plano
T.plan.cards.forEach((f, i) => tick(sec(f), { freq: 2200 + i * 200, gain: 0.03, d: 0.01 }));
T.plan.accept.forEach((f, i) => {
  click(sec(f) - 0.03, { gain: 0.2 });
  blip(sec(f) + 0.05, [84, 88][i], { gain: 0.034, d: 0.12 });
});
swipe(sec(T.plan.note), { gain: 0.026, dur: 0.7 });
out(T.plan.out);

// o vídeo novo
const cutAt = sec(T.edit.cut);
[0, 0.14, 0.28].forEach((o, i) => snip(cutAt + o, -0.3 + i * 0.3, 0.16)); // três cortes fechando
swipe(cutAt, { gain: 0.03, dur: 0.7 });
click(sec(T.edit.export) - 0.03, { gain: 0.2 });
blip(sec(T.edit.export) + 0.06, 86, { gain: 0.034, d: 0.12 });
blip(sec(T.edit.export) + 0.14, 93, { gain: 0.028, d: 0.2 });
out(T.edit.out);

// a memória
T.memory.rows.forEach((f, i) => blip(sec(f + 6), [79, 81, 84][i], { gain: 0.026, d: 0.1 }));
bell(sec(T.memory.learned), 88, { gain: 0.03, d: 1.2, pan: 0.2 });
whoosh(sec(T.memory.out) - 0.05, 0.5, 2600, 400, 0.04);

render(join(here, "../public/soundtrack-acquire.wav"));
