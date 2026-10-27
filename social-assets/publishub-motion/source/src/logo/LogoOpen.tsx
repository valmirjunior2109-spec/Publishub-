import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { lockupWidth, NotebookLogo, type LogoTimeline } from "./NotebookLogo";
import T from "./timeline.json";

/* ==========================================================================
   Publishub · o logo em movimento, sozinho (6 s): o caderno abre, a caneta
   escreve o nome, o caderno fecha e vira o logo, e o nome entra ao lado.
   A animação é a de NotebookLogo.tsx (a mesma do convite do anúncio).
   `background`: o creme do site atrás, ou transparente (para sobrepor a vídeos).
   Os quadros estão em timeline.json; a trilha (make-sound-logo.mjs) lê o mesmo.
   ========================================================================== */

export const LOGO_FPS = T.fps;
export const LOGO_FRAMES = T.durationInFrames;

export function LogoOpen({ background = true, sound = true }: { background?: boolean; sound?: boolean }) {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const k = Math.min((width * 0.86) / 704, (height * 0.62) / 640); // o caderno aberto (704 de largura) cabe com folga
  const markH = Math.min(width * 0.18, 200);
  return (
    <AbsoluteFill style={{ background: background ? "radial-gradient(80% 70% at 50% 45%, #F6EBD8, #F0E2CA)" : "transparent" }}>
      {sound && <Audio src={staticFile("soundtrack-logo.wav")} />}
      <NotebookLogo f={f} L={T as unknown as LogoTimeline} start={{ cx: width / 2, cy: height / 2 + Math.min(80, height * 0.07), k }} end={{ left: (width - lockupWidth(markH)) / 2, cy: height / 2, markH }} halo={background ? "#F3E6D1" : "#FBF3E6"} id={background ? "logo" : "logo-alpha"} />
    </AbsoluteFill>
  );
}
