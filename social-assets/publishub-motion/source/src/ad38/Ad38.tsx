import { AbsoluteFill, Audio, staticFile } from "remotion";
import { Backdrop } from "./parts";
import { Cta, Demo, Intro, Meet, Payoff } from "./Scenes";

/**
 * Publishub · Reels de 38 s, para conversão. As cenas leem os quadros de
 * timeline.json; a trilha (música + efeitos, sem narração, normalizada) é
 * public/ad38/mix.wav, gerada por scripts/ad38/mix.py com "sem-voz". A mensagem
 * toda está nos textos da tela.
 */
export function Ad38() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#17140F" }}>
      <Backdrop />
      <Intro />
      <Meet />
      <Demo />
      <Payoff />
      <Cta />
      <Audio src={staticFile("ad38/mix.wav")} />
    </AbsoluteFill>
  );
}
