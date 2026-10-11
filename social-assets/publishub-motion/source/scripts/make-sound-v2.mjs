// Publishub · motion ad v2: a partitura. Lê os quadros de src/v2/timeline.json,
// os mesmos que a animação usa. Saída: public/soundtrack-v2.wav.
//
// Diferente da v1: começa com o som do próprio Reel (a torneira aberta), o
// swipe corta o som, a análise é um "scanner" de tiques, o corte tem lâmina e o
// clipe da chama chia na frigideira. Pulso a 100 BPM, em fá.
//
//   node scripts/make-sound-v2.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createMixer } from "./synth.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const T = JSON.parse(readFileSync(join(here, "../src/v2/timeline.json"), "utf8"));
const { sec, kick, boom, snip, tick, whoosh, riser, bell, blip, pad, hat, sizzle, render } = createMixer(T);
const H = T.hook;
const R = T.reveal;
const D = T.demo;
const E = T.end;

/* ---------- cena 1: o Reel tocando, e o swipe ---------- */
// a torneira da alface: ruído grave e macio, que o swipe corta seco
whoosh(0, sec(H.swipe + 2), 900, 1300, 0.16);
whoosh(0.05, sec(H.swipe), 1800, 1500, 0.08, 0.3);
kick(0, { gain: 0.8, f0: 130, f1: 44, len: 0.5, d: 0.18 });
H.words.forEach((f) => tick(sec(f), { freq: 3000, gain: 0.1 }));
// o polegar: um whoosh rápido para cima
whoosh(sec(H.swipe - 2), 0.32, 700, 7000, 0.3, 0.2);
// a pergunta: um peso no silêncio
boom(sec(H.question), 0.8);
// o celular volta subindo
riser(sec(H.return - 4), sec(R.logo - H.return + 4) - 0.02, 0.24);
whoosh(sec(H.return), 0.8, 300, 2200, 0.16);

/* ---------- cena 2: a marca e a análise ---------- */
kick(sec(R.logo), { gain: 1, f0: 140, f1: 36, len: 0.9, d: 0.3 });
// fá maior com nona, aberto
[77, 81, 84, 91].forEach((n, i) => bell(sec(R.logo) + i * 0.035, n, { gain: 0.07, d: 1.3, pan: -0.3 + i * 0.2 }));
whoosh(sec(R.logo + 8), 0.3, 3200, 900, 0.12, 0.3); // a caneta
tick(sec(R.headline), { freq: 2600, gain: 0.08 });
whoosh(sec(R.strip), 0.5, 600, 2400, 0.12, -0.2);
// o scanner: tiques curtos e rápidos, subindo de tom enquanto a curva aparece
for (let f = R.scan; f < R.scanEnd; f += 2) {
  const k = (f - R.scan) / (R.scanEnd - R.scan);
  tick(sec(f), { freq: 1800 + 1600 * k, gain: 0.035 + 0.02 * k, d: 0.006, pan: Math.sin(f) * 0.4 });
}
// pads: Dm9 → B♭maj7 → F/A → (fim) Fmaj9
pad(sec(R.logo), sec(D.copy1 - R.logo), [50, 57, 60, 64, 65], { gain: 0.03 });
pad(sec(D.copy1), sec(D.copy2 - D.copy1), [46, 53, 57, 62, 64], { gain: 0.03 });
pad(sec(D.copy2), sec(E.start - D.copy2), [45, 53, 57, 60, 65], { gain: 0.03 });

// pulso a 100 BPM (18 quadros): bumbo na batida, chimbal no contratempo
for (let f = R.logo + 18; f < E.start; f += 18) {
  const after = f >= D.cut;
  kick(sec(f), { gain: after ? 0.5 : 0.38, f0: 100, f1: 44, d: 0.11 });
  hat(sec(f + 9), after ? 0.06 : 0.04, (f / 18) % 2 ? 0.3 : -0.3);
}

/* ---------- cena 3: a queda, as sugestões e o corte ---------- */
[D.copy1, D.copy2].forEach((f) => tick(sec(f + 2), { freq: 2800, gain: 0.08 }));
blip(sec(D.drop), 89, { gain: 0.15, d: 0.22 });
blip(sec(D.drop) + 0.06, 96, { gain: 0.07, d: 0.25, pan: 0.3 });
kick(sec(D.drop), { gain: 0.5, f0: 110, f1: 50, d: 0.14 });
whoosh(sec(D.layout), 0.6, 500, 2200, 0.12, -0.2);
D.cards.forEach((f, i) => blip(sec(f), [77, 81, 84][i], { gain: 0.1, pan: -0.3 + i * 0.3 }));
[D.acceptCut, D.acceptCaption].forEach((f) => {
  tick(sec(f - 6), { freq: 1700, gain: 0.1, d: 0.01 });
  blip(sec(f), 84, { gain: 0.1, d: 0.07 });
  blip(sec(f) + 0.055, 89, { gain: 0.1, d: 0.12 });
});
// o corte: a lâmina, um peso, e a frigideira chiando no clipe da chama
snip(sec(D.cut), 0, 0.42);
kick(sec(D.cut), { gain: 0.8, f0: 150, f1: 42, len: 0.6, d: 0.2 });
sizzle(sec(D.cut), sec(D.parm - D.cut) + 0.2, 0.2);
sizzle(sec(D.parm), sec(E.start - D.parm), 0.06);
// a legenda entra
blip(sec(D.caption), 93, { gain: 0.09, d: 0.08 });
whoosh(sec(D.caption) - 0.05, 0.22, 2000, 5000, 0.08);
whoosh(sec(D.parm), 0.25, 3000, 1200, 0.08);

/* ---------- cena 4: o fechamento ---------- */
whoosh(sec(E.start - 13), 0.5, 2400, 400, 0.16);
bell(sec(E.logo + 6), 84, { gain: 0.06, d: 1.0 });
E.headline.forEach((f) => kick(sec(f), { gain: 0.5, f0: 110, f1: 46, d: 0.13 }));
tick(sec(E.plate), { freq: 2200, gain: 0.05 });
// o CTA: fá com sétima e nona, longo
kick(sec(E.cta), { gain: 0.9, f0: 130, f1: 38, len: 1.2, d: 0.36 });
pad(sec(E.cta), sec(T.durationInFrames - E.cta) - 0.6, [41, 53, 57, 60, 64, 67], { gain: 0.04, attack: 0.06, release: 0.55 });
[72, 76, 79, 84].forEach((n, i) => bell(sec(E.cta) + i * 0.045, n, { gain: 0.075, d: 1.6, pan: -0.3 + i * 0.2 }));
tick(sec(E.url), { freq: 2400, gain: 0.06 });

render(join(here, "../public/soundtrack-v2.wav"));
