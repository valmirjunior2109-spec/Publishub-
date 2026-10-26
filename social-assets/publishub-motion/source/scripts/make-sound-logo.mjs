// Publishub · o logo em movimento (6 s): a trilha. Lê os quadros de
// src/logo/timeline.json, os mesmos que a animação usa. Saída:
// public/soundtrack-logo.wav.
//
// Tudo sintetizado aqui (nenhuma amostra): os sons do caderno (logo-sfx.mjs)
// e, quando o nome entra, um acorde curto com sino.
//
//   node scripts/make-sound-logo.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createMixer } from "./synth.mjs";
import { logoSfx } from "./logo-sfx.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const T = JSON.parse(readFileSync(join(here, "../src/logo/timeline.json"), "utf8"));
const mixer = createMixer(T);
const { sec, midi, voice, bell, pad, render } = mixer;
const END = sec(T.durationInFrames);

logoSfx(mixer, T);

// o nome: um acorde curto em Fá, com sino
const hit = sec(T.word);
pad(hit, END - hit - 0.5, [53, 57, 60, 64, 69], { gain: 0.012, attack: 0.05, release: 0.9 });
voice(hit, END - hit, (t) => Math.sin(2 * Math.PI * midi(41) * t) * Math.min(1, t / 0.03) * Math.exp(-t / 1.2), { gain: 0.12 });
[77, 81, 84, 89].forEach((n, i) => bell(hit + i * 0.06, n, { gain: 0.028 - i * 0.004, d: 1.4, pan: -0.3 + i * 0.2 }));

render(join(here, "../public/soundtrack-logo.wav"));
