// Publishub · motion ad v1: a partitura. Lê os mesmos quadros de src/timeline.json
// que a animação usa, para cada som cair no quadro do gesto.
// Saída: public/soundtrack.wav (48 kHz, estéreo, 16 bits).
//
//   node scripts/make-sound.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createMixer } from "./synth.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const T = JSON.parse(readFileSync(join(here, "../src/timeline.json"), "utf8"));
const { sec, kick, boom, snip, tick, whoosh, riser, bell, blip, pad, hat, render } = createMixer(T);

/* ---------- a partitura (quadros de timeline.json) ---------- */

const H = T.hook;
// abertura: impacto no primeiro quadro, sem introdução
kick(0, { gain: 1, f0: 160, len: 0.6, d: 0.22 });
whoosh(0, 0.18, 6000, 1500, 0.18);
// o relógio de edição: tique a cada 5 quadros até a pergunta
for (let f = 0; f < H.question; f += 5) tick(sec(f), { freq: 1900, gain: 0.07, d: 0.008, pan: f % 10 ? 0.25 : -0.25 });
// as palavras e as lâminas
H.words.forEach((f) => tick(sec(f), { freq: 3200, gain: 0.1 }));
H.cuts.forEach((f, i) => snip(sec(f), i % 2 ? 0.35 : -0.35, 0.3 + i * 0.012));
// pulso grave por baixo da pressa
for (let f = 0; f < H.question; f += 15) kick(sec(f), { gain: 0.45, f0: 90, f1: 40, d: 0.12 });
// a pergunta: tudo para, um boom
boom(sec(H.question), 0.95);
riser(sec(H.riser), sec(T.reveal.start - H.riser) - 0.02, 0.32);
whoosh(sec(H.wipe), sec(10), 800, 5000, 0.22);

const Rv = T.reveal;
// a virada: impacto, acorde e brilho
kick(sec(Rv.logo), { gain: 1, f0: 140, f1: 36, len: 0.9, d: 0.32 });
bell(sec(Rv.logo), 86, { gain: 0.09, d: 1.4, pan: -0.2 });
bell(sec(Rv.logo) + 0.03, 93, { gain: 0.06, d: 1.2, pan: 0.25 });
whoosh(sec(Rv.logo + 8), 0.3, 3200, 900, 0.14, 0.3); // a caneta deslizando
tick(sec(Rv.logoSettle), { freq: 2400, gain: 0.08 });
whoosh(sec(Rv.window), 0.75, 300, 1600, 0.2);

// o pad: Dadd9 → Bm(add11) → Gmaj7 → (fim) Dmaj9
pad(sec(Rv.logo), sec(T.demo.copy1 - Rv.logo), [50, 57, 62, 64, 66], { gain: 0.034 });
pad(sec(T.demo.copy1), sec(T.demo.copy2 - T.demo.copy1), [47, 54, 59, 62, 64], { gain: 0.034 });
pad(sec(T.demo.copy2), sec(T.end.start - T.demo.copy2), [43, 50, 55, 59, 66], { gain: 0.034 });

// pulso do produto: bumbo nas batidas, chimbal no contratempo
for (let f = Rv.window + 12; f < T.end.start; f += 15) {
  kick(sec(f), { gain: 0.42, f0: 100, f1: 44, d: 0.11 });
  hat(sec(f + 7.5), 0.045, (f / 15) % 2 ? 0.3 : -0.3);
}

const D = T.demo;
[D.copy1, D.copy2].forEach((f) => tick(sec(f + 2), { freq: 2800, gain: 0.09 }));
// a queda acende: o "ping" e um peso embaixo
blip(sec(D.drop), 88, { gain: 0.16, d: 0.22 });
blip(sec(D.drop) + 0.06, 95, { gain: 0.08, d: 0.25, pan: 0.3 });
kick(sec(D.drop), { gain: 0.5, f0: 110, f1: 50, d: 0.14 });
tick(sec(D.quote), { freq: 2200, gain: 0.07 });
whoosh(sec(D.pan), 0.7, 500, 2600, 0.18, -0.2);
// as sugestões chegam, subindo
D.cards.forEach((f, i) => blip(sec(f), [76, 78, 81][i], { gain: 0.11, pan: -0.3 + i * 0.3 }));
// aceitar: o clique do botão e a confirmação
D.accept.forEach((f) => {
  tick(sec(f - 6), { freq: 1700, gain: 0.1, d: 0.01 });
  blip(sec(f), 83, { gain: 0.1, d: 0.07 });
  blip(sec(f) + 0.055, 88, { gain: 0.1, d: 0.12 });
});
tick(sec(D.finalEdit), { freq: 2600, gain: 0.07 });

const E = T.end;
whoosh(sec(E.start - 13), 0.5, 2400, 400, 0.18);
bell(sec(E.logo + 6), 81, { gain: 0.06, d: 1.0 });
E.headline.forEach((f) => kick(sec(f), { gain: 0.5, f0: 110, f1: 46, d: 0.13 }));
// o CTA: o acento final, longo, que fecha a peça
kick(sec(E.cta), { gain: 0.9, f0: 130, f1: 38, len: 1.2, d: 0.36 });
pad(sec(E.cta), sec(T.durationInFrames - E.cta) - 0.6, [50, 57, 61, 64, 66, 69], { gain: 0.04, attack: 0.06, release: 0.55 });
[74, 78, 81, 85].forEach((n, i) => bell(sec(E.cta) + i * 0.045, n, { gain: 0.075, d: 1.6, pan: -0.3 + i * 0.2 }));
tick(sec(E.url), { freq: 2400, gain: 0.06 });


render(join(here, "../public/soundtrack.wav"));
