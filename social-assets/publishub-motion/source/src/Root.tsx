import { loadFont } from "@remotion/fonts";
import { Composition, staticFile } from "remotion";
import { Ad } from "./Ad";
import { Ad2 } from "./v2/Ad2";
import T2 from "./v2/timeline.json";
import T from "./timeline.json";
import { TalkingHead } from "./talking/TalkingHead";
import { DURATION as TH_DURATION, FPS as TH_FPS } from "./talking/timeline";
import { Ad38 } from "./ad38/Ad38";
import T38 from "./ad38/timeline.json";
import { Demo } from "./demo/Demo";
import TD from "./demo/timeline.json";
import { AUDIT_FPS, AUDIT_FRAMES, AuditX } from "./audit/AuditX";

// as fontes do site, embutidas: o render não depende de rede
loadFont({ family: "Geist", url: staticFile("fonts/Geist-Variable.woff2"), weight: "100 900" });
loadFont({ family: "Geist Mono", url: staticFile("fonts/GeistMono-Variable.woff2"), weight: "100 900" });

export function Root() {
  return (
    <>
      <Composition id="Reels" component={Ad} defaultProps={{ layout: "vertical" as const }} width={1080} height={1920} fps={T.fps} durationInFrames={T.durationInFrames} />
      <Composition id="X" component={Ad} defaultProps={{ layout: "horizontal" as const }} width={1920} height={1080} fps={T.fps} durationInFrames={T.durationInFrames} />
      {/* v2: o Reel real analisado e re-editado na tela */}
      <Composition id="ReelsV2" component={Ad2} defaultProps={{ layout: "vertical" as const }} width={1080} height={1920} fps={T2.fps} durationInFrames={T2.durationInFrames} />
      <Composition id="XV2" component={Ad2} defaultProps={{ layout: "horizontal" as const }} width={1920} height={1080} fps={T2.fps} durationInFrames={T2.durationInFrames} />
      {/* talking head: o vídeo do fundador editado, com legendas da fala real */}
      {/* Reels de 38 s para conversão: o teste grátis real com o Reel de demonstração */}
      <Composition id="Ad38" component={Ad38} width={1080} height={1920} fps={T38.fps} durationInFrames={T38.durationInFrames} />
      {/* demo do produto, 16:9: a janela do site passando pelo fluxo inteiro, em inglês e em português */}
      <Composition id="DemoEN" component={Demo} defaultProps={{ lang: "en" as const, sound: true }} width={1920} height={1080} fps={TD.fps} durationInFrames={TD.durationInFrames} />
      <Composition id="DemoPT" component={Demo} defaultProps={{ lang: "pt" as const, sound: true }} width={1920} height={1080} fps={TD.fps} durationInFrames={TD.durationInFrames} />
      <Composition id="AuditX" component={AuditX} defaultProps={{ sound: true }} width={1920} height={1080} fps={AUDIT_FPS} durationInFrames={AUDIT_FRAMES} />
      <Composition id="TalkingHead" component={TalkingHead} width={1080} height={1920} fps={TH_FPS} durationInFrames={TH_DURATION} />
    </>
  );
}
