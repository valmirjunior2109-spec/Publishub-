// Publishub · talking head: a trilha de efeitos. Só efeitos, sem música: a voz
// é o centro. Cada som cai no quadro do gráfico que ele acompanha, lido das
// mesmas fontes que a animação (src/talking/edit.json e words.json).
// Saída: public/talking/sfx.wav (tocada com volume 0.4 em TalkingHead.tsx).
//
//   node scripts/make-sound-talking.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createMixer } from "./synth.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const E = JSON.parse(readFileSync(join(here, "../src/talking/edit.json"), "utf8"));
const W = JSON.parse(readFileSync(join(here, "../src/talking/words.json"), "utf8"));
const T = { fps: E.fps, durationInFrames: E.cut };
const { sec, tick, whoosh, bell, blip, kick, snip, click, swipe, key, render } = createMixer(T);

// quadros como em src/talking/timeline.ts
const at = (i) => Math.round(W[i].start * E.fps);
const until = (i) => Math.round(W[i].end * E.fps);
const s = (f) => sec(f);

/* ---------- as ferramentas na parede (à esquerda) ---------- */
[18, 19, 20].forEach((w, i) => blip(s(at(w) - 2), [77, 81, 84][i], { gain: 0.28, pan: -0.45 }));
whoosh(s(at(26)), 0.35, 1800, 700, 0.12, -0.4); // saem
kick(s(at(27) - 2), { gain: 0.28, f0: 95, f1: 45, d: 0.1 }); // o punch-in em "manualmente"

/* ---------- o marca-texto nas palavras fortes ---------- */
[6, 27, 38, 50, 67, 96, 99, 132].forEach((w) => swipe(s(at(w) - 1), { gain: 0.09 }));

/* ---------- a virada e a marca ---------- */
whoosh(s(at(39) - 3), 0.35, 2200, 500, 0.2); // o respiro de foco
const brand = at(50) - 3;
whoosh(s(brand - 2), 0.4, 600, 2400, 0.16);
[79, 84, 88].forEach((n, i) => bell(s(brand + 20) + i * 0.03, n, { gain: 0.1, d: 0.9, pan: -0.2 + i * 0.2 }));
for (let f = at(54); f < until(57); f += 2) key(s(f), { gain: 0.07, pan: 0.1 }); // a frase sendo digitada

/* ---------- o produto, nos três passos ---------- */
whoosh(s(at(76) - 5), 0.4, 600, 2400, 0.18);
kick(s(at(78) + 3), { gain: 0.3, f0: 120, f1: 60, d: 0.06 }); // o arquivo caindo na janela
blip(s(until(83)), 84, { gain: 0.25, d: 0.08 }); // envio completo
blip(s(until(83)) + 0.06, 91, { gain: 0.22, d: 0.16 });
for (let f = at(84); f < at(92); f += 3) {
  const k = (f - at(84)) / (at(92) - at(84));
  tick(s(f), { freq: 1800 + 1400 * k, gain: 0.04 + 0.03 * k, d: 0.005, pan: -0.2 + 0.4 * k }); // o copiloto passando pelo vídeo
}
blip(s(at(94) - 2), 81, { gain: 0.22 });
snip(s(at(96) + 2), 0, 0.36); // "cortes": a lâmina
blip(s(at(97) - 2), 84, { gain: 0.22 });
whoosh(s(at(100)), 0.3, 900, 2000, 0.1);
blip(s(at(100) + 2), 77, { gain: 0.18, d: 0.14 });
for (let f = at(106); f < until(110); f += 2) key(s(f), { gain: 0.06, pan: 0.1 });
whoosh(s(until(116) + 2), 0.3, 1800, 600, 0.1);

/* ---------- o convite: o botão, o cursor e o clique ---------- */
blip(s(at(124) - 3), 79, { gain: 0.22 });
whoosh(s(at(129) - 4), 0.4, 900, 1600, 0.08, 0.4); // o cursor chegando
click(s(until(130) - 2), { gain: 0.55, pan: 0.15 });
blip(s(at(132) - 2), 88, { gain: 0.22, d: 0.1 }); // vira "Link na bio"

render(join(here, "../public/talking/sfx.wav"));
