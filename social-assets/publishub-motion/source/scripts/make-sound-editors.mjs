// Publishub · Reel para editores ("Rewatch #47"): a trilha. Lê os quadros de
// src/editors/timeline.json, os mesmos que a animação usa. Saída: public/editors/soundtrack.wav.
//
// Tudo sintetizado aqui e em synth.mjs (nenhuma amostra, nenhuma música de terceiros):
//   - o gancho: tique a cada número do contador, o "rebobinar" do playhead e o impacto no #47;
//   - a dor: as teclas J/K/L, a notificação do cliente e o silêncio seco no "Somewhere.";
//   - a virada: riser até a entrada do produto, onde a batida (124 BPM, Am → F → C → G) começa;
//   - o produto: clique nos toques, uma nota por etapa, sino na queda, três pops nos cortes aceitos;
//   - o fecho: a batida sai, fica o pad; o CTA resolve em Fmaj9 → C.
//
//   node scripts/make-sound-editors.mjs

import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createMixer } from "./synth.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const T = JSON.parse(readFileSync(join(here, "../src/editors/timeline.json"), "utf8"));
const { sec, midi, voice, biquad, noise, decay, kick, boom, snip, tick, whoosh, riser, bell, blip, pad, hat, click, swipe, key, render, SR } = createMixer(T);

const BPM = 124;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

/* ---------- instrumentos desta peça ---------- */

/** Palma: ruído em banda média com três estalos colados, e sala. */
function clap(at, gain = 0.2) {
  const bp = biquad("bp", 1300, 0.9);
  voice(at, 0.3, (t) => {
    const burst = [0, 0.009, 0.018].reduce((a, o) => a + (t >= o ? decay(t - o, 0.0005, 0.006) : 0), 0) * 0.5;
    return bp(noise()) * (burst + decay(t, 0.002, 0.07)) * 1.6;
  }, { gain, pan: 0.05, send: 0.35 });
}

/** Baixo pulsado em colcheias, com o "respiro" de sidechain do bumbo. */
function bass(at, note, beats, gain = 0.2) {
  const f = midi(note);
  const lp = biquad("lp", 420, 0.9);
  for (let i = 0; i < beats * 2; i++) {
    const t0 = at + i * (BEAT / 2);
    voice(t0, BEAT / 2, (t) => {
      const ph = 2 * Math.PI * f * t;
      const env = Math.min(1, t / 0.012) * Math.exp(-t / 0.16);
      return lp((Math.sin(ph) + 0.5 * Math.sin(2 * ph) + 0.22 * Math.sin(3 * ph)) * env);
    }, { gain: gain * (i % 2 ? 0.8 : 0.55) });
  }
}

/** Pluck de arpejo: senoide brilhante que fecha rápido. */
function pluck(at, note, gain = 0.05, pan = 0) {
  const f = midi(note);
  const lp = biquad("lp", 3200, 0.8);
  voice(at, 0.4, (t) => lp((Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(4 * Math.PI * f * t)) * decay(t, 0.002, 0.11)), { gain, pan, send: 0.3 });
}

/** O playhead voltando ao zero: um "zip" de fita, curto e descendente. */
function rewind(at, gain = 0.07) {
  whoosh(at, 0.09, 4200, 900, gain, -0.2);
}

/* ---------- 0–2 s · o gancho ---------- */

// drone grave de tensão por baixo do contador
pad(0, sec(T.hook.slam), [33, 40, 45], { gain: 0.03, attack: 0.15, release: 0.2 });

// um tique por número (a mesma conta do contador em Editors.tsx)
const countAt = (f) => {
  const t = Math.min(1, Math.max(0, (f - T.hook.countFrom) / (T.hook.slam - T.hook.countFrom)));
  return 1 + Math.round((T.hook.count - 1) * Math.pow(t, T.hook.countPow));
};
for (let f = T.hook.countFrom; f < T.hook.slam; f++) {
  if (countAt(f) !== countAt(f - 1)) tick(sec(f), { freq: 1800 + countAt(f) * 28, gain: 0.1, pan: (f % 2 ? 0.15 : -0.15) });
}
// o playhead volta ao zero (a mesma conta do Hook)
const headAt = (f) => (f * 0.75 + Math.max(0, f - 18) * 0.6) % 7.5;
for (let f = 1; f < T.hook.out; f++) if (headAt(f) < headAt(f - 1)) rewind(sec(f));

// #47
boom(sec(T.hook.slam), 0.95);
snip(sec(T.hook.slam), 0, 0.45);
kick(sec(T.hook.slam), { gain: 0.8 });

/* ---------- 2–5,7 s · a dor ---------- */

T.pain.keys.forEach((f, i) => {
  key(sec(f), { gain: 0.22, pan: i % 2 ? 0.2 : -0.2 });
  click(sec(f) + 0.004, { gain: 0.12 });
});
// a pulsação baixa e nervosa enquanto o editor caça o ponto
for (let t = sec(T.pain.start); t < sec(T.pain.somewhere); t += BEAT) kick(t, { gain: 0.32, f0: 90, d: 0.12 });

// a notificação do cliente (duas notas, duas mensagens)
for (const f of [T.pain.client, T.pain.client2]) {
  blip(sec(f), 88, { gain: 0.16, d: 0.12 });
  blip(sec(f) + 0.085, 93, { gain: 0.14, d: 0.18 });
}

// "Somewhere." — impacto e silêncio; "isn't a timestamp." — o segundo golpe
boom(sec(T.pain.somewhere), 1);
snip(sec(T.pain.somewhere), 0, 0.3);
kick(sec(T.pain.timestamp), { gain: 0.85 });
snip(sec(T.pain.timestamp), 0.1, 0.35);

/* ---------- 5,7–6,7 s · a virada ---------- */

whoosh(sec(T.turn.start), 0.45, 300, 4200, 0.2);
riser(sec(T.turn.start), sec(T.turn.out - T.turn.start), 0.32);
bell(sec(T.turn.logo + 8), 81, { gain: 0.07, d: 1.2 });

/* ---------- 6,7–21,5 s · a batida, sob o produto ---------- */

const PROG = [
  { root: 33, pad: [57, 60, 64], arp: [69, 72, 76, 72] }, // Am
  { root: 29, pad: [53, 57, 60], arp: [65, 69, 72, 69] }, // F
  { root: 36, pad: [55, 60, 64], arp: [67, 72, 76, 72] }, // C
  { root: 31, pad: [55, 59, 62], arp: [67, 71, 74, 71] }, // G
];
const grooveFrom = sec(T.upload.start);
const grooveTo = sec(T.payoff.start);
boom(grooveFrom, 0.6);
for (let bar = 0, t0 = grooveFrom; t0 < grooveTo - 0.05; bar++, t0 += BAR) {
  const ch = PROG[bar % PROG.length];
  pad(t0, Math.min(BAR, grooveTo - t0), ch.pad, { gain: 0.028, attack: 0.05, release: 0.3 });
  bass(t0, ch.root + 12, Math.min(4, Math.round((grooveTo - t0) / BEAT)));
  for (let b = 0; b < 4; b++) {
    const tb = t0 + b * BEAT;
    if (tb >= grooveTo) break;
    kick(tb, { gain: 0.6, f0: 115, d: 0.18 });
    if (b % 2) clap(tb, 0.17);
    hat(tb + BEAT / 2, 0.045, 0.25);
    hat(tb + BEAT / 4, 0.018, -0.25);
    hat(tb + (3 * BEAT) / 4, 0.018, -0.25);
  }
  // arpejo em semicolcheias a partir dos cortes: a energia sobe no fim
  if (t0 >= sec(T.cuts.start) - BAR / 2) {
    for (let i = 0; i < 16; i++) {
      const ta = t0 + i * (BEAT / 4);
      if (ta < grooveTo) pluck(ta, ch.arp[i % 4], 0.035, i % 2 ? 0.3 : -0.3);
    }
  }
}

/* ---------- os gestos da interface ---------- */

for (const f of [T.processing.start, T.drop.start, T.cuts.start, T.apply.start]) whoosh(sec(f) - 0.06, 0.26, 600, 3600, 0.11);
click(sec(T.upload.tap), { gain: 0.42 });
blip(sec(T.upload.file), 84, { gain: 0.12 });
blip(sec(T.upload.file) + 0.06, 88, { gain: 0.1 });
T.processing.rows.forEach((f, i) => blip(sec(f), [76, 79, 83, 86, 88][i], { gain: 0.09, d: 0.1, pan: -0.2 + i * 0.1 }));
bell(sec(T.drop.dot), 81, { gain: 0.12, d: 1.1 });
kick(sec(T.drop.dot), { gain: 0.4, f0: 80, d: 0.3 });
swipe(sec(T.drop.quote), { gain: 0.1, dur: 0.38 });
click(sec(T.cuts.tap), { gain: 0.42 });
[83, 86, 90].forEach((n, i) => blip(sec(T.cuts.accepted) + i * 0.1, n, { gain: 0.13, pan: -0.25 + i * 0.25 }));
click(sec(T.apply.tap), { gain: 0.45 });
[81, 85, 88].forEach((n, i) => bell(sec(T.apply.ready) + i * 0.08, n, { gain: 0.08, d: 1.3, pan: -0.2 + i * 0.2 }));
snip(sec(T.apply.stat), 0, 0.25);

/* ---------- 21,5–27 s · o fecho e o CTA ---------- */

boom(sec(T.payoff.start), 0.55);
pad(sec(T.payoff.start), sec(T.end.start - T.payoff.start), [45, 57, 60, 64, 71], { gain: 0.03, attack: 0.2, release: 0.4 });
bell(sec(T.payoff.line2), 76, { gain: 0.09, d: 1.4 });
whoosh(sec(T.end.start) - 0.1, 0.4, 500, 3000, 0.12);
const endAt = sec(T.end.start);
pad(endAt, sec(T.durationInFrames) - endAt - 0.6, [41, 53, 57, 60, 64, 67], { gain: 0.032, attack: 0.25, release: 0.6 }); // Fmaj9
kick(endAt, { gain: 0.5 });
[72, 76, 79, 84].forEach((n, i) => bell(sec(T.end.logo + 6) + i * 0.11, n, { gain: 0.06, d: 1.6, pan: -0.3 + i * 0.2 }));
click(sec(T.end.cta), { gain: 0.25 });
pad(sec(T.end.url), sec(T.durationInFrames) - sec(T.end.url) - 0.5, [36, 48, 55, 60, 64], { gain: 0.022, attack: 0.5, release: 0.5 }); // C

mkdirSync(join(here, "../public/editors"), { recursive: true });
render(join(here, "../public/editors/soundtrack.wav"));
