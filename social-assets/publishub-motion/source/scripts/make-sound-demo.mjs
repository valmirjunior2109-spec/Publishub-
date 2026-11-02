// Publishub · demo do produto: a trilha, em lofi. Lê os quadros de src/demo/timeline.json,
// os mesmos que a animação usa. Saída: public/soundtrack-demo.wav.
//
// Lofi calmo, tudo sintetizado aqui (nenhuma amostra, nenhuma música de terceiros):
//   - piano elétrico abafado, com trêmolo e o "tape wobble" da fita;
//   - baixo redondo, bateria macia com swing, hi-hat bem para trás;
//   - sem chiado de vinil: o ruído contínuo virava chiado de fundo (tirado na v2).
// 72 BPM, Gmaj7 → F#m7 → Em9 → A7sus, e um Dmaj9 no fechamento. Os sons da
// interface ficam quase escondidos: só o clique, a etapa concluída e o vídeo pronto.
// O volume final é baixado na composição (Demo.tsx, MUSIC_VOLUME).
//
//   node scripts/make-sound-demo.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createMixer } from "./synth.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const T = JSON.parse(readFileSync(join(here, "../src/demo/timeline.json"), "utf8"));
const { sec, midi, voice, biquad, noise, decay, click, blip, bell, render, SR } = createMixer(T);
const END = sec(T.durationInFrames);

const BPM = 72;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const SWING = 0.62; // a colcheia do contratempo atrasada: o balanço do lofi

/* A fita: a afinação oscila devagar (0,5 Hz) e um pouco mais rápido (5 Hz), bem pouco. */
const wobble = (t) => 1 + 0.0028 * Math.sin(2 * Math.PI * 0.5 * t) + 0.0009 * Math.sin(2 * Math.PI * 5.1 * t);

/* ---------- os instrumentos ---------- */

/** Piano elétrico abafado: senoide com um pouco de 2ª harmônica, ataque de martelo, trêmolo, passa-baixa. */
function keys(at, notes, dur, { gain = 0.07, strum = 0.018 } = {}) {
  notes.forEach((n, i) => {
    const f = midi(n);
    const lp = biquad("lp", 1500, 0.6);
    const start = at + i * strum;
    let ph = 0; // a fase acumulada: a oscilação da fita muda a afinação, não a soma dela
    voice(start, dur + 1.2, (t) => {
      ph += (2 * Math.PI * f * wobble(start + t)) / SR;
      const tine = Math.sin(ph) + 0.28 * Math.sin(2 * ph) * Math.exp(-t / 0.25) + 0.08 * Math.sin(3 * ph) * Math.exp(-t / 0.08);
      const env = decay(t, 0.006, 1.8) * (t > dur ? Math.max(0, 1 - (t - dur) / 1.2) : 1);
      const trem = 0.85 + 0.15 * Math.sin(2 * Math.PI * 4 * t);
      return lp(tine * env * trem);
    }, { gain, pan: -0.25 + (i / Math.max(1, notes.length - 1)) * 0.5, send: 0.28 });
  });
}

/** Baixo redondo: senoide com uma pitada de 2ª harmônica, sem ataque duro. */
function bass(at, note, dur, gain = 0.16) {
  const f = midi(note);
  const lp = biquad("lp", 320, 0.7);
  let ph = 0;
  voice(at, dur, (t) => {
    ph += (2 * Math.PI * f * wobble(at + t)) / SR;
    const env = Math.min(1, t / 0.02) * Math.min(1, (dur - t) / 0.08) * Math.exp(-t / 1.6);
    return lp((Math.sin(ph) + 0.18 * Math.sin(2 * ph)) * env);
  }, { gain, pan: 0 });
}

/** Bumbo macio: um "tum" grave sem clique. */
function softKick(at, gain = 0.32) {
  voice(at, 0.5, (t) => {
    const f = 46 + 58 * Math.exp(-t / 0.035);
    return Math.sin(2 * Math.PI * f * t) * decay(t, 0.002, 0.16);
  }, { gain });
}

/** Caixa de lofi: ruído filtrado e um corpo grave, abafada, com bastante sala. */
function softSnare(at, gain = 0.085) {
  const bp = biquad("bp", 1500, 0.8);
  const lp = biquad("lp", 2600);
  voice(at, 0.35, (t) => lp(bp(noise()) * 1.6 * decay(t, 0.002, 0.07) + Math.sin(2 * Math.PI * 190 * t) * decay(t, 0.001, 0.045) * 0.6), { gain, pan: 0.08, send: 0.4 });
}

/** Hi-hat fechado, abafado e baixinho: só marca o tempo, sem brilho. */
function softHat(at, gain = 0.016, pan = 0.22) {
  const hp = biquad("hp", 5000);
  const lp = biquad("lp", 7000);
  voice(at, 0.06, (t) => lp(hp(noise())) * decay(t, 0.001, 0.018), { gain, pan });
}

/* ---------- a harmonia ---------- */

const PROGRESSION = [
  { keys: [55, 59, 62, 66, 69], root: 43 }, // Gmaj7(9)
  { keys: [54, 57, 61, 64, 69], root: 42 }, // F#m7(11)
  { keys: [52, 55, 59, 62, 66], root: 40 }, // Em9
  { keys: [55, 57, 61, 62, 67], root: 45 }, // A7sus
];
const FINAL = { keys: [50, 57, 61, 64, 66, 69], root: 38 }; // Dmaj9

const grooveFrom = sec(T.upload.start) - BEAT * 0.5; // a bateria entra quando a janela sobe
const grooveTo = sec(T.end.start);
const firstBar = 0.25;

for (let bar = 0, t0 = firstBar; t0 < sec(T.end.start); bar++, t0 += BAR) {
  const chord = PROGRESSION[bar % PROGRESSION.length];
  // o acorde no 1 e uma repetição mais leve no "e" do 3, como quem toca solto
  keys(t0, chord.keys, BEAT * 2.4, { gain: 0.06 });
  keys(t0 + BEAT * (2 + SWING), chord.keys.slice(1), BEAT * 1.2, { gain: 0.035, strum: 0.012 });
  if (t0 >= grooveFrom - 0.01) {
    bass(t0, chord.root, BEAT * 1.8);
    bass(t0 + BEAT * (2 + SWING), chord.root + 7, BEAT * 1.1, 0.11);
  }
  // bateria: bumbo no 1 e no "e" do 2, caixa no 2 e no 4, hi-hat em colcheias com swing
  if (t0 >= grooveFrom - 0.01 && t0 < grooveTo) {
    softKick(t0);
    softKick(t0 + BEAT * (1 + SWING), 0.22);
    softSnare(t0 + BEAT);
    softSnare(t0 + BEAT * 3);
    for (let b = 0; b < 4; b++) {
      softHat(t0 + BEAT * b, 0.016);
      softHat(t0 + BEAT * (b + SWING), 0.01, -0.18);
    }
  }
}

// o fechamento: o Dmaj9 sozinho, longo, sobre o vinil
const finalAt = sec(T.end.logo);
keys(finalAt, FINAL.keys, END - finalAt - 1.5, { gain: 0.065, strum: 0.035 });
bass(finalAt, FINAL.root, END - finalAt - 1.2, 0.12);


/* ---------- a interface, quase escondida ---------- */
click(sec(T.upload.press), { gain: 0.14 });
T.plan.accept.forEach((f) => click(sec(f - 2), { gain: 0.13 }));
click(sec(T.cuts.press), { gain: 0.14 });
T.processing.steps.forEach((f, i) => blip(sec(f), [81, 83, 85, 86, 88][i], { gain: 0.018, d: 0.12 }));
bell(sec(T.result.drop), 81, { gain: 0.03, d: 1.4 });
[81, 85, 88].forEach((n, i) => bell(sec(T.cuts.ready) + i * 0.08, n, { gain: 0.026, d: 1.4, pan: -0.2 + i * 0.2 }));

render(join(here, "../public/soundtrack-demo.wav"));
