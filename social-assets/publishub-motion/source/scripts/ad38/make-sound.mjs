// Publishub · anúncio de 38 s: a música de fundo e os efeitos, em dois arquivos
// (public/ad38/music.wav e public/ad38/sfx.wav), sintetizados do zero pelo motor
// do projeto (scripts/synth.mjs): nenhuma amostra, nenhuma música de terceiros.
// Os quadros vêm de src/ad38/timeline.json, os mesmos da animação.
// A narração entra depois, em scripts/ad38/mix.py, que abaixa a música sob a voz.
//
//   node scripts/ad38/make-sound.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createMixer } from "../synth.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const T = JSON.parse(readFileSync(join(here, "../../src/ad38/timeline.json"), "utf8"));
const out = (name) => join(here, "../../public/ad38", name);
const BEAT = 16; // 112,5 BPM a 30 fps

/* ================= música ================= */
{
  const m = createMixer(T);
  const { sec, kick, hat, pad, blip, bell, riser } = m;
  const [, problemStart] = [0, T.scenes.problem[0]];
  const meet = T.meet.logo;
  const end = T.durationInFrames;

  // gancho: só um grave longo e tenso, sem batida (a voz precisa de espaço)
  pad(0, sec(problemStart), [33, 45, 52], { gain: 0.035, attack: 0.05, release: 0.4 });
  // problema: lá menor com nona, chimbal leve marcando o tempo
  pad(sec(problemStart), sec(meet - problemStart), [45, 52, 55, 59, 60], { gain: 0.03, attack: 0.3 });
  for (let f = problemStart; f < meet - 4; f += BEAT / 2) hat(sec(f), (f / (BEAT / 2)) % 2 ? 0.035 : 0.02, (f / BEAT) % 2 ? 0.25 : -0.25);
  for (let f = problemStart; f < meet - 4; f += BEAT * 2) kick(sec(f), { gain: 0.32, f0: 95, f1: 42, d: 0.12 });

  // da marca em diante: o groove abre, com uma progressão maior (F → C → G → Am)
  const chords = [
    [41, 48, 52, 57, 60], // Fmaj7
    [36, 48, 52, 55, 59], // Cmaj7
    [43, 50, 55, 59, 62], // G
    [45, 52, 57, 60, 64], // Am
  ];
  const bass = [29, 36, 31, 33];
  const BAR = BEAT * 4;
  for (let f = meet, k = 0; f < end - 30; f += BAR * 2, k++) {
    const c = k % 4;
    const len = Math.min(BAR * 2, end - 30 - f);
    pad(sec(f), sec(len), chords[c], { gain: 0.028, attack: 0.25, release: 0.4 });
    for (let b = 0; b < len; b += BEAT) blip(sec(f + b), bass[c] + 12, { gain: 0.09, d: 0.16 });
  }
  for (let f = meet; f < end - 22; f += BEAT) {
    kick(sec(f), { gain: 0.42, f0: 100, f1: 42, d: 0.12 });
    hat(sec(f + BEAT / 2), 0.045, (f / BEAT) % 2 ? 0.3 : -0.3);
  }
  // chegada no endereço: subida e um acorde aberto que fecha o anúncio
  riser(sec(T.cta.url - 28), sec(28), 0.12);
  [57, 60, 64, 67, 72].forEach((n, i) => bell(sec(T.cta.url) + i * 0.03, n, { gain: 0.05, d: 1.4, pan: -0.3 + i * 0.15 }));
  pad(sec(end - 22), sec(22) - 0.1, [41, 48, 57, 60, 64], { gain: 0.03, attack: 0.02, release: 0.1 });
  m.render(out("music.wav"));
}

/* ================= efeitos ================= */
{
  const m = createMixer(T);
  const { sec, boom, tick, whoosh, swipe, click, blip, bell, snip, kick, key } = m;
  const H = T.hook, P = T.problem, M = T.meet, D = T.demo, PO = T.payoff, C = T.cta;

  // o corte seco do começo e as palavras do gancho
  boom(0, 0.55);
  H.words.forEach((f) => tick(sec(f), { freq: 2800, gain: 0.07 }));
  // o editor vira timeline; cada problema acende com um tique e um blip grave
  whoosh(sec(P.slowIntro - 10), 0.45, 500, 2600, 0.12);
  [P.slowIntro, P.pause, P.weakPacing].forEach((f, i) => {
    tick(sec(f), { freq: 2200, gain: 0.08 });
    blip(sec(f), 57 - i * 2, { gain: 0.07, d: 0.12 });
  });
  bell(sec(P.missed), 76, { gain: 0.06, d: 0.9 }); // o gancho escondido em 0:11
  // a marca
  whoosh(sec(P.out), 0.5, 2600, 600, 0.14, 0.2);
  kick(sec(M.logo), { gain: 0.7, f0: 140, f1: 38, len: 0.7, d: 0.25 });
  [72, 76, 79, 84].forEach((n, i) => bell(sec(M.logo) + i * 0.03, n, { gain: 0.045, d: 1.1, pan: -0.3 + i * 0.2 }));
  whoosh(sec(M.phoneIn), 0.5, 400, 2000, 0.1);
  // o envio real: o clique no botão e o progresso
  click(sec(M.tap), { gain: 0.42 });
  for (let f = M.uploadStart; f < M.uploadEnd; f += 4) key(sec(f), { gain: 0.03, pan: 0.2 });
  blip(sec(M.processing), 76, { gain: 0.07 });
  // o resultado: cada destaque da caneta passa como um marca-texto
  whoosh(sec(M.out), 0.45, 2000, 500, 0.12, -0.2);
  [D.spot, D.spot + 30, D.find + 14, D.confident, 712].forEach((f) => {
    swipe(sec(f), { gain: 0.07, dur: 0.22 });
    blip(sec(f + 2), 81, { gain: 0.045, d: 0.08 });
  });
  [D.spot + 16, D.pan1, D.find - 6, D.pan2, 700, D.out].forEach((f) => whoosh(sec(f), 0.5, 900, 1600, 0.05));
  // a virada: marcar como feito, o corte e o pronto para postar
  click(sec(PO.tapDone), { gain: 0.42 });
  bell(sec(PO.done), 83, { gain: 0.06, d: 0.7 });
  whoosh(sec(PO.toEdit), 0.5, 500, 2400, 0.12);
  snip(sec(PO.cut), 0, 0.3);
  whoosh(sec(PO.collapse[0]), sec(PO.collapse[1] - PO.collapse[0]), 3000, 700, 0.1);
  blip(sec(PO.edited), 79, { gain: 0.06 });
  click(sec(PO.ready), { gain: 0.42 });
  [76, 83, 88].forEach((n, i) => bell(sec(PO.ready + 2) + i * 0.05, n, { gain: 0.04, d: 0.8 }));
  // a chamada
  whoosh(sec(PO.out), 0.5, 2400, 600, 0.12);
  [C.line, C.line + 3, C.line + 6, C.line + 9, C.line + 12].forEach((f) => tick(sec(f), { freq: 2600, gain: 0.05 }));
  whoosh(sec(C.phone), 0.5, 400, 1800, 0.08);
  swipe(sec(C.url + 10), { gain: 0.05, dur: 0.4 });
  m.render(out("sfx.wav"));
}
