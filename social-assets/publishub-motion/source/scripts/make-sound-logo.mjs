// Publishub · o logo em movimento (6 s): a trilha. Lê os quadros de
// src/logo/timeline.json, os mesmos que a animação usa. Saída:
// public/soundtrack-logo.wav.
//
// Tudo sintetizado aqui (nenhuma amostra), no timbre tech (tech.mjs): os sons do
// caderno (logo-sfx.mjs), um pad digital por baixo e, quando o nome entra, um
// impacto com o acorde de lá menor e um arpejo curto.
//
//   node scripts/make-sound-logo.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createMixer } from "./synth.mjs";
import { createTech } from "./tech.mjs";
import { logoSfx } from "./logo-sfx.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const T = JSON.parse(readFileSync(join(here, "../src/logo/timeline.json"), "utf8"));
const mixer = createMixer(T);
const { sec, render } = mixer;
const tech = createTech(mixer);
const END = sec(T.durationInFrames);

const hit = sec(T.word);
tech.pad(0.1, hit - 0.1, [45, 57, 60, 64], { gain: 0.016, cutoff: 700 });
logoSfx(mixer, T, 0, tech);
tech.riser(hit - 1, 1, 0.05);

// o nome: impacto, o acorde (Am9) e um arpejo que sobe
tech.impact(hit, 0.38);
tech.stack(hit, END - hit - 0.9, [45, 57, 60, 64, 67, 71], { gain: 0.03, cutoff: (t) => 900 + 2200 * Math.exp(-(t - hit) / 0.8), attack: 0.005, release: 0.8, side: false });
[69, 72, 76, 79, 81, 84].forEach((n, i) => tech.arp(hit + 0.1 + i * 0.083, n, { gain: 0.026, pan: -0.4 + i * 0.16 }));

render(join(here, "../public/soundtrack-logo.wav"));
