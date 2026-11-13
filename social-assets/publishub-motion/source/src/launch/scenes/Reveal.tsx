// 20–24 s · A revelação. Do preto, a logo pixel-art se monta bloco a bloco no impacto; o nome se escreve; a promessa.

import { AbsoluteFill } from "remotion";
import { C, VO, p, useStage } from "../theme";
import { Rise, Wordmark } from "../ui";

export function Reveal() {
  const { t, v } = useStage();
  const r0 = 20;
  const build = p(t, r0 + 0.05, 0.85, (n) => n);
  const chars = Math.floor(p(t, r0 + 0.65, 0.4, (n) => n) * 8 + 0.0001);
  const lift = p(t, VO.rev1 - 0.2, 0.7);
  const size = v ? 150 : 170;
  // um brilho atravessa o nome quando ele termina
  const sweep = p(t, r0 + 1.05, 0.9, (n) => n);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", top: v ? 620 - lift * 120 : 300 - lift * 90, display: "flex", flexDirection: "column", alignItems: "center", transform: `scale(${1.08 - 0.08 * p(t, r0, 3.5, (n) => n)})` }}>
        <div style={{ position: "relative" }}>
          <Wordmark size={size} build={build} chars={chars} />
          <div
            style={{
              position: "absolute",
              inset: "-20px -40px",
              background: `linear-gradient(100deg, transparent ${sweep * 140 - 40}%, rgba(255,240,210,0.35) ${sweep * 140 - 25}%, transparent ${sweep * 140 - 10}%)`,
              mixBlendMode: "overlay",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>
      <div style={{ position: "absolute", top: v ? 830 : 560, width: v ? 960 : 1700, display: "flex", flexDirection: "column", alignItems: "center", gap: v ? 18 : 14 }}>
        <Rise t={t} at={VO.rev1 - 0.05} text="AI builds faster." size={v ? 74 : 72} color={C.muted} stagger={0.1} />
        <Rise t={t} at={VO.rev2 - 0.05} text="Publishub makes sure it works." size={v ? 96 : 92} color={C.ink} stagger={0.1} style={{ maxWidth: v ? 900 : undefined }} />
      </div>
    </AbsoluteFill>
  );
}
