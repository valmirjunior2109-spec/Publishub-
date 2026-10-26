// Founder · "Build in public." (9:16, 19 s): a trilha. Lê os quadros de
// src/founder/timeline.json, os mesmos que a animação usa: cada som cai no
// movimento certo. Saída: public/soundtrack-founder.wav.
//
// Ambiente eletrônico contido, tudo sintetizado aqui (nenhuma amostra, nenhuma
// música de terceiros):
//   - um drone em Ré desde o primeiro quadro, com o filtro abrindo;
//   - 120 BPM (um tempo = 15 quadros) do código até o ciclo: bumbo macio,
//     chimbal baixinho e um arpejo de pluck em semicolcheias;
//   - o globo sem batida, só pad e sinos; um riser leva à assinatura,
//     que fecha num acorde de Ré com nona, grave e sino.
// Por cima, os sons da interface: teclas, cliques, whooshes nas trocas de tela.
//
//   node scripts/make-sound-founder.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createMixer } from "./synth.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const T = JSON.parse(readFileSync(join(here, "../src/founder/timeline.json"), "utf8"));
const { sec, midi, voice, biquad, noise, decay, click, blip, bell, pad, whoosh, riser, swipe, tick, key, hat, boom, render } = createMixer(T);
const END = sec(T.durationInFrames);
const BEAT = 0.5; // 120 BPM

/* ---------- os instrumentos ---------- */

/** Pluck: senoide com harmônicos que somem rápido e um passa-baixa macio. */
function pluck(at, note, { gain = 0.035, pan = 0, d = 0.22 } = {}) {
  const f = midi(note);
  const lp = biquad("lp", 3000, 0.6);
  voice(at, d * 5, (t) => {
    const w = 2 * Math.PI * f * t;
    return lp((Math.sin(w) + 0.4 * Math.sin(2 * w) * Math.exp(-t / 0.05) + 0.15 * Math.sin(3 * w) * Math.exp(-t / 0.025)) * decay(t, 0.002, d));
  }, { gain, pan, send: 0.4 });
}

/** Bumbo macio, sem o clique do ataque. */
function softKick(at, gain = 0.22) {
  voice(at, 0.45, (t) => Math.sin(2 * Math.PI * (44 + 60 * Math.exp(-t / 0.028)) * t) * decay(t, 0.002, 0.13), { gain });
}

/** Sub: senoide grave com entrada e saída suaves. */
function sub(at, note, dur, gain = 0.12) {
  const f = midi(note);
  voice(at, dur, (t) => Math.sin(2 * Math.PI * f * t) * Math.min(1, t / 0.04) * Math.min(1, (dur - t) / 0.25), { gain });
}

/** O drone: duas serras desafinadas num passa-baixa que vai abrindo. */
function drone(at, dur, note, { gain = 0.05, from = 180, to = 900 } = {}) {
  [-1, 1].forEach((side) => {
    const f = midi(note) * (1 + side * 0.003);
    const lp = biquad("lp", from, 0.9);
    voice(at, dur, (t, i) => {
      if (i % 64 === 0) lp.set(from * Math.pow(to / from, Math.min(1, t / dur)));
      const saw = 2 * ((f * t) % 1) - 1;
      return lp(saw) * Math.min(1, t / 0.6) * Math.min(1, (dur - t) / 0.8);
    }, { gain, pan: side * 0.5, send: 0.3 });
  });
}

/** O "toque" de cada palavra que entra: um baque curto e grave com um estalo em cima. */
function thock(at, gain = 0.16, pan = 0) {
  softKick(at, gain);
  tick(at, { freq: 1800, gain: gain * 0.25, pan, d: 0.008 });
}

/* ---------- 1 · o cursor e a primeira frase ---------- */

const S1 = T.s1;
drone(0, sec(T.s3.out) + 0.6, 38, { gain: 0.05, from: 140, to: 1200 });
pad(0.05, sec(T.s2.window) - 0.2, [50, 57, 64], { gain: 0.011, attack: 0.8, release: 0.8 });
softKick(0, 0.3); // o primeiro quadro: um baque grave com o cursor
tick(0.01, { freq: 3200, gain: 0.05, d: 0.01 });
swipe(sec(1), { gain: 0.028, dur: 0.8 }); // a linha que varre a tela
for (let c = 0; c < 22; c += 2) key(sec(S1.prompt + c / 3), { gain: 0.028, pan: -0.2 });
S1.words.forEach((at, i) => thock(sec(at), i === S1.words.length - 1 ? 0.22 : 0.15, -0.2 + i * 0.08));
whoosh(sec(S1.out) - 0.05, 0.55, 300, 3200, 0.07);

/* ---------- a batida: do código até o ciclo fechar ---------- */

const grooveFrom = sec(T.s2.window);
const grooveTo = sec(T.s3.out);
const CHORDS = [
  { arp: [62, 69, 74, 76], pad: [50, 57, 62, 64], root: 38 }, // Dsus2
  { arp: [58, 65, 69, 72], pad: [46, 53, 57, 60], root: 34 }, // Bbmaj7
  { arp: [55, 62, 65, 69], pad: [43, 50, 53, 57], root: 31 }, // Gm9
  { arp: [57, 64, 69, 71], pad: [45, 52, 57, 59], root: 33 }, // Asus2
];
for (let bar = 0, t0 = grooveFrom; t0 < grooveTo - 0.1; bar++, t0 += BEAT * 4) {
  const ch = CHORDS[bar % CHORDS.length];
  pad(t0, BEAT * 4 * 0.95, ch.pad, { gain: 0.01, attack: 0.3, release: 0.5 });
  sub(t0, ch.root + 12, Math.min(BEAT * 4, grooveTo - t0), 0.1);
  for (let b = 0; b < 4; b++) {
    const at = t0 + b * BEAT;
    if (at >= grooveTo - 0.05) break;
    softKick(at, b % 2 ? 0.14 : 0.2);
    hat(at + BEAT / 2, 0.025, b % 2 ? -0.25 : 0.25);
    for (let s = 0; s < 4; s++) pluck(at + (s * BEAT) / 4, ch.arp[(b * 4 + s) % 4] + (s === 3 ? 12 : 0), { gain: s === 0 ? 0.03 : 0.022, pan: s % 2 ? 0.35 : -0.35 });
  }
}

/* ---------- 2 · a janela ---------- */

const S2 = T.s2;
whoosh(sec(S2.window) - 0.05, 0.6, 500, 2600, 0.06); // a janela sobe
thock(sec(S2.line1), 0.12);
thock(sec(S2.line2), 0.12);
for (let fr = S2.panels[0] + 2; fr < S2.panels[0] + 24; fr += 1.5) key(sec(fr), { gain: 0.03, pan: -0.3 + noise() * 0.2 }); // o código
S2.panels.slice(1).forEach((at) => whoosh(sec(at) - 0.22, 0.38, 900, 4200, 0.045, 0.2)); // troca de tela
click(sec(S2.click), { gain: 0.2 }); // "Publish"
blip(sec(S2.click + 3), 81, { gain: 0.03, d: 0.1 }); // Draft → Live
blip(sec(S2.click + 3) + 0.08, 88, { gain: 0.026, d: 0.16 });
for (let c = 0; c < 14; c += 2) key(sec(S2.url + c / 2), { gain: 0.03, pan: 0.2 }); // localhost:3000
tick(sec(S2.enter), { freq: 2400, gain: 0.05 }); // enter
for (let k = 0; k < 7; k++) blip(sec(S2.enter + 2 + k * 2), [74, 76, 78, 81, 83, 86, 88][k], { gain: 0.012, d: 0.06, pan: -0.3 + k * 0.1 }); // a página pinta
click(sec(S2.drag[0]), { gain: 0.16 }); // pega o cartão
swipe(sec(S2.drag[0] + 1), { gain: 0.03, dur: sec(S2.drag[1] - S2.drag[0]) });
click(sec(S2.drag[1]), { gain: 0.14 }); // solta em SHIPPED
blip(sec(S2.drag[1] + 2), 86, { gain: 0.03, d: 0.14 });
whoosh(sec(S2.out) - 0.05, 0.5, 3000, 600, 0.05); // a janela vira o ciclo

/* ---------- 3 · o ciclo ---------- */

const S3 = T.s3;
[74, 78, 81, 86].forEach((n, i) => blip(sec(S3.nodes + i * 4 + 8), n, { gain: 0.022, d: 0.12, pan: [0, 0.4, 0, -0.4][i] }));
S3.lines.forEach((at) => thock(sec(at), 0.12));
swipe(sec(S3.ring), { gain: 0.022, dur: sec(28) });
tick(sec(S3.version), { freq: 2000, gain: 0.04 });
// o pulso passando por cada nó (a mesma conta de passes() em Founder.tsx)
const L = S3.laps;
const NOTES = [86, 88, 90, 93];
const PANS = [0, 0.45, 0, -0.45];
for (let k = 0; k < L.length - 1; k++) {
  for (let i = 0; i < 4; i++) {
    const at = sec(L[k] + ((L[k + 1] - L[k]) * i) / 4);
    tick(at, { freq: 2600, gain: 0.03, pan: PANS[i], d: 0.008 });
    blip(at, NOTES[i] - 12, { gain: 0.016, d: 0.08, pan: PANS[i] });
  }
  bell(sec(L[k + 1]), 86, { gain: 0.02, d: 0.7, pan: 0.1 }); // a versão sobe
}
whoosh(sec(S3.out) - 0.05, 0.6, 3600, 220, 0.06); // o ciclo fecha no ponto

/* ---------- 4 · o globo ---------- */

const S4 = T.s4;
const E = T.end;
boom(sec(S4.globe), 0.32);
pad(sec(S4.globe), sec(E.collapse - S4.globe) + 0.2, [41, 53, 57, 60, 64, 67], { gain: 0.012, attack: 0.9, release: 0.6 }); // Fmaj9
sub(sec(S4.globe), 29, sec(E.collapse - S4.globe), 0.08);
S4.lines.forEach((at) => thock(sec(at), 0.1));
const PING = [74, 81, 78, 86, 83, 90, 88, 93];
S4.pings.forEach((at, i) => bell(sec(at), PING[i], { gain: 0.016, d: 0.9, pan: -0.5 + (i % 4) * 0.33 }));
riser(sec(S4.pings[3]), sec(E.collapse + 14 - S4.pings[3]), 0.12);
whoosh(sec(E.collapse) - 0.05, 0.6, 3000, 300, 0.05);

/* ---------- a assinatura ---------- */

const hit = sec(E.title[0]);
boom(hit, 0.55);
softKick(hit, 0.32);
tick(sec(E.rule), { freq: 3000, gain: 0.04 });
pad(hit, END - hit - 0.6, [38, 50, 57, 62, 66, 69, 76], { gain: 0.012, attack: 0.05, release: 1.4 }); // Dadd9
sub(hit, 38, END - hit - 0.2, 0.12);
[74, 81, 86, 90].forEach((n, i) => bell(hit + i * 0.07, n, { gain: 0.03 - i * 0.004, d: 1.6, pan: -0.3 + i * 0.2 }));
thock(sec(E.title[1]), 0.1);
for (let c = 0; c < 43; c += 3) key(sec(E.sub + c / 1.5), { gain: 0.018, pan: 0.1 });

render(join(here, "../public/soundtrack-founder.wav"));
