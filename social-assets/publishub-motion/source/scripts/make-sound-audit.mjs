// Publishub · vídeo da auditoria grátis (X, 16:9): a trilha. Lê os quadros de
// src/audit/timeline.json, os mesmos que a animação usa: cada som cai no clique
// certo. Saída: public/soundtrack-audit.wav.
//
// Outra música, não o lofi do demo: eletrônico calmo e limpo, tudo sintetizado
// aqui (nenhuma amostra, nenhuma música de terceiros).
//   - pluck em arpejo de colcheias, alternando os lados;
//   - pad quente por baixo e um sub grave na fundamental;
//   - bumbo macio no 1 e no 3, shaker baixinho em semicolcheias (entram com a janela).
// 100 BPM, Amaj9 → F#m11 → Dmaj9 → E6sus, e o Amaj9 sozinho no fechamento.
// Os sons da interface ficam por cima, discretos: clique, upload pronto, etapas,
// a nota do relatório, os itens marcados e o "copiado".
//
//   node scripts/make-sound-audit.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createMixer } from "./synth.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const T = JSON.parse(readFileSync(join(here, "../src/audit/timeline.json"), "utf8"));
const { sec, midi, voice, biquad, noise, decay, click, blip, bell, pad, whoosh, swipe, tick, render } = createMixer(T);
const END = sec(T.durationInFrames);

const BPM = 100;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const EIGHTH = BEAT / 2;

/* ---------- os instrumentos ---------- */

/** Pluck: senoide com harmônicos que somem rápido, decaimento curto, passa-baixa macio. */
function pluck(at, note, { gain = 0.045, pan = 0, d = 0.32 } = {}) {
  const f = midi(note);
  const lp = biquad("lp", 2600, 0.6);
  voice(at, d * 5, (t) => {
    const w = 2 * Math.PI * f * t;
    const tone = Math.sin(w) + 0.45 * Math.sin(2 * w) * Math.exp(-t / 0.06) + 0.18 * Math.sin(3 * w) * Math.exp(-t / 0.03);
    return lp(tone * decay(t, 0.003, d));
  }, { gain, pan, send: 0.38 });
}

/** Sub: senoide grave, entrada e saída suaves. */
function sub(at, note, dur, gain = 0.14) {
  const f = midi(note);
  voice(at, dur, (t) => Math.sin(2 * Math.PI * f * t) * Math.min(1, t / 0.03) * Math.min(1, (dur - t) / 0.1) * Math.exp(-t / 2.5), { gain });
}

/** Bumbo macio: "tum" grave, sem o clique do ataque. */
function softKick(at, gain = 0.26) {
  voice(at, 0.45, (t) => Math.sin(2 * Math.PI * (44 + 56 * Math.exp(-t / 0.03)) * t) * decay(t, 0.002, 0.14), { gain });
}

/** Shaker: ruído agudo, curtinho e bem baixo. */
function shaker(at, gain = 0.01, pan = 0.25) {
  const hp = biquad("hp", 6000);
  voice(at, 0.06, (t) => hp(noise()) * decay(t, 0.004, 0.02), { gain, pan });
}

/* ---------- a harmonia ---------- */

const PROGRESSION = [
  { arp: [57, 61, 64, 68, 71, 68, 64, 61], pad: [57, 61, 64, 68], root: 33 }, // Amaj9
  { arp: [54, 57, 61, 64, 66, 64, 61, 57], pad: [54, 57, 61, 64], root: 30 }, // F#m11
  { arp: [50, 54, 57, 61, 64, 61, 57, 54], pad: [50, 54, 57, 61], root: 26 }, // Dmaj9
  { arp: [52, 56, 59, 61, 66, 61, 59, 56], pad: [52, 57, 59, 61], root: 28 }, // E6sus
];

const grooveFrom = sec(T.window);
const musicTo = sec(T.end.start);
const first = 0.1;

for (let bar = 0, t0 = first; t0 < musicTo; bar++, t0 += BAR) {
  const chord = PROGRESSION[bar % PROGRESSION.length];
  pad(t0, BAR * 0.95, chord.pad, { gain: 0.012, attack: 0.5, release: 0.6 });
  chord.arp.forEach((n, i) => pluck(t0 + i * EIGHTH, n, { gain: i === 0 ? 0.05 : 0.038, pan: i % 2 ? 0.3 : -0.3 }));
  if (t0 >= grooveFrom - BAR) {
    sub(t0, chord.root + 12, BEAT * 1.9);
    sub(t0 + BEAT * 2, chord.root + 12, BEAT * 1.9, 0.1);
  }
  if (t0 >= grooveFrom - 0.01) {
    softKick(t0);
    softKick(t0 + BEAT * 2, 0.2);
    for (let s = 0; s < 16; s++) shaker(t0 + (s * BEAT) / 4, s % 2 ? 0.006 : 0.011, s % 2 ? -0.2 : 0.25);
  }
}

// o fechamento: o Amaj9 sozinho, longo, com um arpejo lento por cima
const finalAt = sec(T.end.logo);
pad(finalAt, END - finalAt - 1.2, [45, 57, 61, 64, 68, 71], { gain: 0.014, attack: 0.4, release: 1.0 });
[57, 61, 64, 68, 71, 76].forEach((n, i) => pluck(finalAt + 0.2 + i * 0.22, n, { gain: 0.04, pan: -0.3 + i * 0.12, d: 0.6 }));
sub(finalAt, 45, END - finalAt - 1.2, 0.1);

/* ---------- a interface ---------- */

const U = T.upload;
const R = T.report;

whoosh(sec(T.window) - 0.1, 0.6, 400, 2200, 0.05); // a janela sobe
click(sec(U.drop), { gain: 0.18 }); // solta o arquivo
softKick(sec(U.card), 0.1); // o arquivo pousa
blip(sec(U.received), 81, { gain: 0.035, d: 0.12 }); // upload pronto
blip(sec(U.received) + 0.09, 88, { gain: 0.03, d: 0.16 });
click(sec(U.press), { gain: 0.19 }); // "Audit my video"

T.processing.steps.forEach((f, i) => blip(sec(f), [76, 78, 80, 81, 83][i], { gain: 0.022, d: 0.1, pan: -0.2 + i * 0.1 }));

whoosh(sec(R.start) - 0.05, 0.5, 600, 2600, 0.04); // o relatório entra
bell(sec(R.score) + 0.1, 81, { gain: 0.035, d: 1.2 }); // a nota
for (let i = 0; i < 6; i++) tick(sec(R.chips + i * 5), { freq: 2200 + i * 120, gain: 0.018, d: 0.01, pan: -0.3 + i * 0.12 }); // as etiquetas
swipe(sec(R.scroll) + 0.1, { gain: 0.03, dur: 0.6 }); // rola até as mudanças

R.tick.forEach((f, i) => {
  click(sec(f), { gain: 0.16 });
  blip(sec(f) + 0.06, [83, 85][i], { gain: 0.024, d: 0.1 }); // o item marcado
});
click(sec(R.copy), { gain: 0.18 });
blip(sec(R.copy) + 0.07, 81, { gain: 0.03, d: 0.12 }); // "Copied"
blip(sec(R.copy) + 0.15, 88, { gain: 0.028, d: 0.18 });

whoosh(sec(T.end.start) - 0.1, 0.7, 2400, 500, 0.045); // a janela sai
bell(sec(T.end.line), 88, { gain: 0.025, d: 1.6, pan: 0.15 });

render(join(here, "../public/soundtrack-audit.wav"));
