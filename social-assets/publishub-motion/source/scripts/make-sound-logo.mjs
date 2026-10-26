// Publishub · o logo em movimento (6 s): a trilha. Lê os quadros de
// src/logo/timeline.json, os mesmos que a animação usa. Saída:
// public/soundtrack-logo.wav.
//
// Tudo sintetizado aqui (nenhuma amostra): o caderno pousando, o estalo do
// elástico, a capa virando, a caneta riscando o papel, o sublinhado, o caderno
// fechando e, quando o nome entra, um acorde curto com sino.
//
//   node scripts/make-sound-logo.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createMixer } from "./synth.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const T = JSON.parse(readFileSync(join(here, "../src/logo/timeline.json"), "utf8"));
const { sec, midi, voice, biquad, noise, decay, bell, pad, swipe, render } = createMixer(T);
const END = sec(T.durationInFrames);

/** Um baque de papel e papelão: grave abafado com um pouco de ruído. */
function thud(at, gain = 0.3) {
  const lp = biquad("lp", 700);
  voice(at, 0.4, (t) => Math.sin(2 * Math.PI * (70 + 60 * Math.exp(-t / 0.02)) * t) * decay(t, 0.002, 0.08) + lp(noise()) * decay(t, 0.001, 0.03) * 0.8, { gain, send: 0.12 });
}

/** O elástico: um estalo com uma nota que cai rápido. */
function snap(at, gain = 0.12) {
  const bp = biquad("bp", 2400, 2);
  voice(at, 0.25, (t) => bp(noise()) * decay(t, 0.0005, 0.01) * 2 + Math.sin(2 * Math.PI * (260 - 120 * Math.min(1, t / 0.12)) * t) * decay(t, 0.002, 0.07) * 0.7, { gain, pan: 0.3, send: 0.1 });
}

/** A capa virando: um sopro de papel que abre e fecha o filtro. */
function flip(at, dur, gain = 0.09, up = true) {
  const bp = biquad("bp", 800, 0.9);
  voice(at, dur, (t, i) => {
    const k = t / dur;
    if (i % 32 === 0) bp.set(up ? 600 + 2600 * k : 3200 - 2600 * k);
    return bp(noise()) * Math.sin(Math.PI * k) ** 1.5 * 2;
  }, { gain, send: 0.25 });
}

/** A caneta no papel: ruído agudo e granulado, no ritmo dos traços das letras. */
function scribble(at, dur, strokes, gain = 0.06) {
  const bp = biquad("bp", 3600, 1.4);
  const hp = biquad("hp", 1500);
  voice(at, dur, (t) => {
    const k = t / dur;
    const stroke = Math.abs(Math.sin(Math.PI * strokes * k)) ** 0.6;
    const grain = noise() > 0.97 ? noise() * 1.5 : 0;
    return (bp(hp(noise())) * 1.6 + grain * 0.4) * stroke * Math.min(1, t / 0.03) * Math.min(1, (dur - t) / 0.05);
  }, { gain, pan: 0.15, send: 0.08 });
}

thud(sec(T.appear + 6), 0.32); // o caderno pousa
snap(sec(T.bandOff + 2));
flip(sec(T.open[0]), sec(T.open[1] - T.open[0]), 0.1, true);
thud(sec(T.open[1] - 1), 0.14); // a capa deita
scribble(sec(T.write[0]), sec(T.write[1] - T.write[0]), 8, 0.065);
swipe(sec(T.underline[0]), { gain: 0.04, dur: sec(T.underline[1] - T.underline[0]) });
flip(sec(T.close[0]), sec(T.close[1] - T.close[0]), 0.09, false);
thud(sec(T.close[1] - 1), 0.3); // fecha
snap(sec(T.bandOn + 2), 0.1);
bell(sec(T.halo), 86, { gain: 0.02, d: 0.6 }); // a caneta encaixa

// o nome: um acorde curto em Fá, com sino
const hit = sec(T.word);
pad(hit, END - hit - 0.5, [53, 57, 60, 64, 69], { gain: 0.012, attack: 0.05, release: 0.9 });
voice(hit, END - hit, (t) => Math.sin(2 * Math.PI * midi(41) * t) * Math.min(1, t / 0.03) * Math.exp(-t / 1.2), { gain: 0.12 });
[77, 81, 84, 89].forEach((n, i) => bell(hit + i * 0.06, n, { gain: 0.028 - i * 0.004, d: 1.4, pan: -0.3 + i * 0.2 }));

render(join(here, "../public/soundtrack-logo.wav"));
