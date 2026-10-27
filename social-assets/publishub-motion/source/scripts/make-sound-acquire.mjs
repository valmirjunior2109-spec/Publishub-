// Publishub · anúncio de aquisição (39 s, 9:16 e 4:5): a trilha. Lê os quadros de
// src/acquire/timeline.json, os mesmos que a animação usa. Saída:
// public/soundtrack-acquire.wav.
//
// Eletrônico tech, tudo sintetizado aqui (tech.mjs; nenhuma amostra, nenhuma
// música de terceiros), 120 BPM em lá menor (Am9 → Fmaj7 → Cmaj7 → G6):
//   - o gancho já entra com a batida; em 0:04 a música freia como uma fita parando;
//   - a décima passada: só um pad abafado, o arpejo fechado e um bumbo de coração;
//   - o envio constrói (bumbo 4/4, baixo, o filtro do arpejo abrindo, riser);
//   - do segundo exato em diante: tudo, com palmas e os acordes com sidechain;
//   - o caderno do logo: a batida sai, ficam o pad e os sons do caderno;
//   - o nome do logo: impacto e o acorde, e o convite sobre um pulso leve.
// Os toques da interface são digitais: pings, chirps, cliques, glitches.
//
//   node scripts/make-sound-acquire.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createMixer } from "./synth.mjs";
import { createTech } from "./tech.mjs";
import { logoSfx } from "./logo-sfx.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const T = JSON.parse(readFileSync(join(here, "../src/acquire/timeline.json"), "utf8"));
const mixer = createMixer(T);
const { sec, render } = mixer;
const X = createTech(mixer);
const END = sec(T.durationInFrames);

const BEAT = 0.5; // 120 BPM: um tempo = 15 quadros
const BAR = BEAT * 4;
const S16 = BEAT / 4;

const CHORDS = [
  { stack: [57, 60, 64, 67, 71], root: 33 }, // Am9
  { stack: [53, 57, 60, 64], root: 29 }, // Fmaj7
  { stack: [48, 55, 59, 64], root: 36 }, // Cmaj7
  { stack: [55, 59, 62, 64], root: 31 }, // G6
];
const chordAt = (t) => CHORDS[Math.floor(t / BAR + 1e-6) % CHORDS.length];

const dropAt = sec(T.hook.drop);
const passAt = sec(T.pass.title) - 0.05;
const buildAt = sec(T.upload.title) - 0.05;
const fullAt = sec(T.find.title);
const moreAt = sec(T.fronts.title);
const logoAt = sec(T.logo.at);
const hitAt = sec(T.logo.at + T.logo.word);

/* ---------- 1 · os bumbos primeiro (o sidechain olha para eles) ---------- */

const kickTimes = [];
for (let t = 0; t < dropAt - 0.01; t += BEAT) kickTimes.push(t);
for (let t = passAt; t < buildAt; t += BEAT * 2) kickTimes.push(t); // coração
for (let t = Math.ceil(buildAt / BEAT) * BEAT; t < logoAt - 0.01; t += BEAT) kickTimes.push(t);
for (let t = hitAt + BAR; t < END - 1.2; t += BEAT * 2) kickTimes.push(t); // o pulso leve do convite
kickTimes.forEach((t) => X.markKick(t));
kickTimes.forEach((t) => X.kick(t, t >= passAt && t < buildAt ? 0.2 : t > hitAt ? 0.16 : 0.3));
X.impact(hitAt, 0.26);
X.markKick(hitAt);

/* ---------- 2 · a música, por trechos ---------- */

/** Um compasso no estilo de cada trecho. */
function bar(t0, until, mode) {
  const c = chordAt(t0);
  const len = Math.min(BAR, until - t0);
  if (len <= 0.02) return;
  const arpNotes = c.stack.slice(0, 4).map((n) => n + 12);
  if (mode === "tired") {
    X.pad(t0, len, c.stack.slice(0, 4), { gain: 0.034, cutoff: 650 });
    for (let k = 0; k < 8; k++) if (t0 + k * BEAT / 2 < until) X.arp(t0 + (k * BEAT) / 2, arpNotes[k % 4], { gain: 0.016, pan: k % 2 ? 0.3 : -0.3, cutoff: 900, echo: 0 });
    return;
  }
  const open = mode === "build" ? 1200 + 2600 * ((t0 - buildAt) / (fullAt - buildAt)) : 3600;
  if (mode !== "build") X.stack(t0, len * 0.97, c.stack, { gain: mode === "more" ? 0.052 : 0.046, cutoff: () => open });
  for (let s = 0; s < 16; s++) {
    const at = t0 + s * S16;
    if (at >= until - 0.01) break;
    const pos = s % 4;
    if (pos === 2 || pos === 3) X.bass(at, c.root + 12, { gain: mode === "build" ? 0.11 : 0.13 });
    const every = mode === "more" ? 1 : 2; // de "more" em diante, o arpejo vira semicolcheia
    if (s % every === 0) X.arp(at, arpNotes[(s / every) % 4] + (mode === "more" && s % 8 >= 4 ? 12 : 0), { gain: mode === "more" ? 0.022 : 0.026, pan: s % 4 < 2 ? -0.35 : 0.35, cutoff: open });
    if (mode !== "build" || s % 2 === 0) X.hat(at, { gain: pos === 2 ? 0.032 : 0.018, pan: s % 2 ? 0.25 : -0.15 });
    if (pos === 2 && mode !== "build") X.hat(at, { gain: 0.016, open: true, pan: 0.3 });
    if ((s === 4 || s === 12) && mode !== "build") X.clap(at);
    if (mode === "more" && (s === 7 || s === 14)) X.perc(at);
  }
}

function section(from, to, mode) {
  for (let t0 = from; t0 < to - 0.02; t0 += BAR) bar(t0, to, mode);
}

// o gancho: tudo desde o primeiro quadro, e a fita parando em 0:04
section(0, dropAt, "full");
X.tapeStop(dropAt, chordAt(dropAt).stack, 0.75, 0.09);
X.impact(dropAt, 0.25);
X.glitch(dropAt + 0.02, 0.06);

section(passAt, buildAt, "tired");
section(buildAt, fullAt, "build");
X.riser(fullAt - 2, 2, 0.07);
X.impact(fullAt, 0.22);
section(fullAt, moreAt, "full");
section(moreAt, logoAt, "more");

// o caderno: a batida sai, fica o pad e os sons dele
X.downer(logoAt - 0.1, 1.2, 0.05);
X.pad(logoAt, hitAt - logoAt, [45, 57, 60, 64], { gain: 0.018, cutoff: 700 });
logoSfx(mixer, T.logo, T.logo.at, X);
X.riser(hitAt - 1.2, 1.2, 0.06);

// o nome do logo: o acorde, e o convite sobre um pulso leve
X.stack(hitAt, END - hitAt - 1, [45, 57, 60, 64, 67, 71], { gain: 0.03, cutoff: (t) => 800 + 2400 * Math.exp(-(t - hitAt) / 0.9), attack: 0.005, release: 0.9, side: false });
[69, 72, 76, 79, 81, 84].forEach((n, i) => X.arp(hitAt + 0.1 + i * 0.083, n, { gain: 0.024, pan: -0.4 + i * 0.16 }));
for (let t = hitAt + BAR; t < END - 1.2; t += BEAT / 2) X.hat(t, { gain: 0.014, pan: 0.2 });

/* ---------- 3 · os toques da interface ---------- */

const out = (f) => X.swoosh(sec(f) - 0.08, 0.35, { gain: 0.035, up: false });

// a décima passada: cada volta é um "rebobinar"
T.pass.passes.forEach((f, i) => {
  X.chirp(sec(f) - 0.03, 2600, 500, { dur: 0.16, gain: 0.03, pan: -0.3 + i * 0.2 });
  X.blipTick(sec(f), 3000 + i * 300);
});
out(T.pass.out);

// o envio
X.uiClick(sec(T.upload.file) - 0.02, { gain: 0.1 });
X.swoosh(sec(T.upload.file), sec(T.upload.drop - T.upload.file), { gain: 0.03 });
X.uiClick(sec(T.upload.drop), { gain: 0.12 });
X.success(sec(T.upload.drop) + 0.05, { gain: 0.035, base: 880 });
T.upload.steps.forEach((f, i) => X.success(sec(f), { gain: 0.035, base: [1046.5, 1174.7, 1318.5][i], pan: -0.2 + i * 0.2 }));
X.chirp(sec(T.upload.note), 600, 1800, { dur: 0.2, gain: 0.025 });
out(T.upload.out);

// o segundo exato
X.swoosh(sec(T.find.window) - 0.1, 0.4, { gain: 0.04, up: true });
X.ping(sec(T.find.drop), 1760, { gain: 0.05, d: 0.1 });
X.glitch(sec(T.find.drop) + 0.03, 0.04);
X.chirp(sec(T.find.note), 1800, 700, { dur: 0.25, gain: 0.025 });
out(T.find.out);

// o porquê
X.chirp(sec(T.why.mark), 700, 2200, { dur: 0.6, gain: 0.025 }); // o marca-texto
X.success(sec(T.why.instead + 12), { gain: 0.035 });
out(T.why.out);

// as sete frentes
const UP = [880, 987.8, 1046.5, 1174.7, 1318.5, 1396.9, 1568];
for (let i = 0; i < 7; i++) {
  X.blipTick(sec(T.fronts.rows + i * 5), 3200);
  X.ping(sec(T.fronts.rows + i * 5 + 8), UP[i], { gain: 0.03, d: 0.05, pan: -0.3 + i * 0.1 });
}
out(T.fronts.out);

// o plano
T.plan.cards.forEach((f) => X.blipTick(sec(f), 2800));
T.plan.accept.forEach((f, i) => {
  X.uiClick(sec(f) - 0.03, { gain: 0.12 });
  X.success(sec(f) + 0.03, { gain: 0.04, base: [1318.5, 1568][i] });
});
X.chirp(sec(T.plan.note), 900, 1800, { dur: 0.3, gain: 0.02 });
out(T.plan.out);

// o vídeo novo: três cortes digitais, e o export
const cutAt = sec(T.edit.cut);
[0, 0.14, 0.28].forEach((o, i) => X.glitch(cutAt + o, 0.05, -0.3 + i * 0.3));
X.chirp(cutAt, 2400, 600, { dur: 0.6, gain: 0.025 });
X.uiClick(sec(T.edit.export) - 0.03, { gain: 0.12 });
X.success(sec(T.edit.export) + 0.04, { gain: 0.045, base: 1568 });
out(T.edit.out);

// a memória
T.memory.rows.forEach((f, i) => X.ping(sec(f + 6), [1046.5, 1318.5, 1568][i], { gain: 0.03, d: 0.06 }));
X.success(sec(T.memory.learned), { gain: 0.04, base: 1760 });
X.chirp(sec(T.memory.learned) + 0.15, 900, 2600, { dur: 0.3, gain: 0.02 });

// o convite
[0, 1, 2].forEach((i) => X.blipTick(sec(T.cta.facts + i * 4), 3000 + i * 400));
X.ping(sec(T.cta.button), 1318.5, { gain: 0.035, d: 0.12 });

render(join(here, "../public/soundtrack-acquire.wav"));
