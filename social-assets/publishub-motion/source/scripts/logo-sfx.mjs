// Os sons do caderno do logo (NotebookLogo.tsx), no timbre tech das trilhas:
// liga (chirp e um impacto leve), o elástico sai (estalo e chirp descendo), a
// capa abre (swoosh), a caneta escreve (um fluxo de bipes de dados), sublinha
// (chirp subindo), fecha (swoosh e impacto), o elástico volta (chirp subindo e
// estalo) e a caneta pousa (um clique e o "pronto" de dois tons). Usado pela trilha do logo
// sozinho e pela do anúncio. `L` é a linha do tempo do logo (quadros relativos)
// e `at` o quadro em que ele começa.

import { createTech } from "./tech.mjs";

export function logoSfx(mix, L, at = 0, tech = createTech(mix)) {
  const { sec } = mix;
  const { chirp, impact, swoosh, blipTick, ping, dataStream, success, uiClick } = tech;
  const t = (f) => sec(at + f);

  chirp(t(L.appear + 2), 180, 900, { dur: 0.25, gain: 0.04 }); // liga
  impact(t(L.appear + 6), 0.16);
  uiClick(t(L.bandOff[0]), { gain: 0.09 }); // o elástico sai
  chirp(t(L.bandOff[0]), 1400, 380, { dur: sec(L.bandOff[1] - L.bandOff[0]), gain: 0.035, pan: 0.3 });
  blipTick(t(L.bandOff[1]), 1800, { gain: 0.03, pan: 0.4 });
  swoosh(t(L.open[0]), sec(L.open[1] - L.open[0]), { gain: 0.06, up: true });
  blipTick(t(L.open[1] - 1), 2400, { gain: 0.03 });
  ping(t(L.open[1] - 1), 659, { gain: 0.035, d: 0.1 });
  chirp(t(L.pen[0] + 4), 2600, 900, { dur: 0.2, gain: 0.025, pan: 0.4 }); // a caneta entra
  dataStream(t(L.write[0]), sec(L.write[1] - L.write[0]), { rate: 15, gain: 0.02 });
  chirp(t(L.underline[0]), 800, 2600, { dur: sec(L.underline[1] - L.underline[0]), gain: 0.035 });
  swoosh(t(L.close[0]), sec(L.close[1] - L.close[0]), { gain: 0.055, up: false });
  impact(t(L.close[1] - 1), 0.22); // fecha
  chirp(t(L.bandOn[0]), 380, 1400, { dur: sec(L.bandOn[1] - L.bandOn[0]), gain: 0.035, pan: 0.3 }); // o elástico volta
  uiClick(t(L.bandOn[1]), { gain: 0.1 });
  uiClick(t(L.land[1]) - 0.02, { gain: 0.08 }); // a caneta pousa
  success(t(L.halo), { gain: 0.045, base: 1318.5 });
}
