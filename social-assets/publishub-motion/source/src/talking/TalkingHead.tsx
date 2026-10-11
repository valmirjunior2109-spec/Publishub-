import { Audio } from "@remotion/media";
import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";
import { progress, tween } from "../anim";
import { BrandCard, CtaButton, ProductCard, ToolChips } from "./Callouts";
import { Camera } from "./Camera";
import { Captions } from "./Captions";
import { at, CAMERA, CUT_FRAMES, JUMP_CUTS, PAGES } from "./timeline";

/** Onde a legenda fica: abaixo dos cartões, acima da interface do Reels. */
const CAPTION_TOP = 1368;

/**
 * Publishub · talking head. O vídeo dele, cortado nas pausas longas
 * (public/talking/face-cut.mp4), com a voz isolada e normalizada
 * (voice-cut.wav), câmera virtual, legendas da fala, os gráficos que a fala
 * pede e a trilha de efeitos (sfx.wav). Começa direto na fala e termina no "valeu?".
 */
export function TalkingHead() {
  const frame = useCurrentFrame();

  // a virada "Foi para isso que eu criei": um respiro de foco, curto
  const turn = at(39);
  const settle = 1 - progress(frame, turn, 7);
  const blur = frame >= turn ? settle * 7 : 0;
  const lift = frame >= turn ? settle * 0.12 : 0;

  // depois de cada corte seco, um empurrão de 1 quadro de nitidez (o olho lê como corte de câmera)
  const cutFlash = JUMP_CUTS.reduce((v, c) => Math.max(v, 1 - tween(frame, [c, c + 3], [0, 1])), 0) * (frame >= JUMP_CUTS[0] ? 0.05 : 0);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0C0A08" }}>
      <AbsoluteFill style={{ filter: `contrast(1.05) saturate(1.06) brightness(${1 + lift + cutFlash}) blur(${blur}px)` }}>
        <Camera keys={CAMERA}>
          <OffthreadVideo src={staticFile("talking/face-cut.mp4")} muted style={{ width: 1080, height: 1920, objectFit: "cover" }} />
        </Camera>
      </AbsoluteFill>

      {/* leitura: escurece só a metade de baixo (a camiseta), nunca o rosto */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(8,7,5,0) 52%, rgba(8,7,5,0.32) 70%, rgba(8,7,5,0.62) 100%)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(120% 80% at 54% 36%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.28) 100%)" }} />

      <ToolChips />
      <BrandCard />
      <ProductCard />
      <CtaButton end={CUT_FRAMES + 4} />
      <Captions pages={PAGES} top={CAPTION_TOP} />

      <Audio src={staticFile("talking/voice-cut.wav")} />
      <Audio src={staticFile("talking/sfx.wav")} volume={0.4} />
    </AbsoluteFill>
  );
}
