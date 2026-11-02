import { Audio } from "@remotion/media";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import type { Layout } from "./components/ProductWindow";
import { EndCard } from "./scenes/EndCard";
import { Hook } from "./scenes/Hook";
import { Product } from "./scenes/Product";
import { C } from "./theme";
import T from "./timeline.json";

/**
 * O anúncio inteiro, 16 s a 30 fps. As cenas usam os quadros absolutos de
 * timeline.json (os mesmos que o script de som lê), por isso entram e saem
 * por condição, não por <Sequence>, que reiniciaria a contagem.
 */
export function Ad({ layout }: { layout: Layout }) {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.caramel }}>
      {f >= T.reveal.start - 2 && f < T.end.start + 24 && <Product layout={layout} />}
      {f < T.reveal.start && <Hook layout={layout} />}
      {f >= T.end.start && <EndCard layout={layout} />}
      <Audio src={staticFile("soundtrack.wav")} />
    </AbsoluteFill>
  );
}
