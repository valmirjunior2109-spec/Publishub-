// "AI builds faster. Publishub makes sure it works." — o filme de lançamento, 58 s, 9:16 e 16:9 da mesma fonte.
// As cenas em scenes/, nos tempos de timeline.json; a mixagem (voz, trilha e efeitos) vem de scripts/launch/score.py.

import { loadFont } from "@remotion/fonts";
import type { ReactNode } from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { Captions } from "./Captions";
import { Hook } from "./scenes/Hook";
import { Era } from "./scenes/Era";
import { Problem } from "./scenes/Problem";
import { Reveal } from "./scenes/Reveal";
import { Product } from "./scenes/Product";
import { Payoff } from "./scenes/Payoff";
import { End } from "./scenes/End";
import { Backdrop, Grain, Vignette } from "./ui";
import { SCENES, p, useStage } from "./theme";

loadFont({ family: "Pixelify Sans", url: staticFile("fonts/pixelify-sans-latin-400-normal.woff2"), weight: "400" });
loadFont({ family: "Pixelify Sans", url: staticFile("fonts/pixelify-sans-latin-600-normal.woff2"), weight: "600" });
loadFont({ family: "Pixelify Sans", url: staticFile("fonts/pixelify-sans-latin-700-normal.woff2"), weight: "700" });

type Cut = "cut" | "blur";

/**
 * Uma cena entre [from, to). A passagem: "blur" = a cena que sai cresce e desfoca por cima da que entra (0,35 s);
 * "cut" = corte seco, no impacto da música.
 */
function Scene({ t, from, to, out = "blur", inn = "blur", children }: { t: number; from: number; to: number; out?: Cut; inn?: Cut; children: ReactNode }) {
  const tail = out === "blur" ? 0.35 : 0;
  if (t < from || t >= to + tail) return null;
  let style = {};
  if (inn === "blur" && t < from + 0.4) {
    const k = p(t, from, 0.4);
    style = { opacity: k, transform: `scale(${0.965 + 0.035 * k})`, filter: k < 1 ? `blur(${(1 - k) * 14}px)` : undefined };
  }
  if (t >= to) {
    const k = p(t, to, tail);
    style = { opacity: 1 - k, transform: `scale(${1 + 0.06 * k})`, filter: `blur(${k * 18}px)` };
  }
  return <AbsoluteFill style={{ ...style, zIndex: t >= to ? 2 : 1 }}>{children}</AbsoluteFill>;
}

export function Launch({ captions = true, sound = true }: { captions?: boolean; sound?: boolean }) {
  const { t, frame } = useStage();
  const S = SCENES;
  // o feixe de luz some no corte para o preto antes da revelação e volta com o impacto
  const dark = t >= 19.75 && t < 20 ? 0 : 1;
  return (
    <AbsoluteFill style={{ background: "#0D0B12", overflow: "hidden" }}>
      <AbsoluteFill style={{ opacity: dark }}>
        <Backdrop t={t} beam={t >= S.reveal[0] && t < S.reveal[1] ? p(t, S.reveal[0], 1.2) * 1.5 : t >= S.problem[0] && t < S.problem[1] ? 0.45 : 1} grid={t >= S.reveal[0] && t < S.reveal[1] ? 0.3 : 1} />
      </AbsoluteFill>
      {dark ? (
        <>
          <Scene t={t} from={S.hook[0]} to={S.hook[1]} inn="cut" out="cut">
            <Hook />
          </Scene>
          <Scene t={t} from={S.era[0]} to={S.era[1]} inn="cut">
            <Era />
          </Scene>
          <Scene t={t} from={S.problem[0]} to={19.75} out="cut">
            <Problem />
          </Scene>
          <Scene t={t} from={S.reveal[0]} to={S.reveal[1]} inn="cut">
            <Reveal />
          </Scene>
          <Scene t={t} from={S.product[0]} to={S.product[1]}>
            <Product />
          </Scene>
          <Scene t={t} from={S.payoff[0]} to={S.payoff[1]} out="cut">
            <Payoff />
          </Scene>
          <Scene t={t} from={S.end[0]} to={S.end[1] + 1} inn="cut" out="cut">
            <End />
          </Scene>
        </>
      ) : null}
      <Vignette />
      <Grain frame={frame} opacity={0.07} />
      {captions && <Captions />}
      {sound && <Audio src={staticFile("launch/mix.wav")} />}
    </AbsoluteFill>
  );
}
