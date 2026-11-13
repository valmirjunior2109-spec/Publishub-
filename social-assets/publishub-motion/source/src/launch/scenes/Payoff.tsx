// 41,5–45 s · A recompensa emocional. "Build fast. Ship with confidence." sobre colunas de verificações subindo.

import { AbsoluteFill, random } from "remotion";
import { C, VO, p, useStage } from "../theme";
import { Rise, Status } from "../ui";

export function Payoff() {
  const { t, v, width, height } = useStage();
  const y0 = 41.5;
  const cols = v ? 9 : 16;
  const rows = v ? 18 : 10;
  const cell = v ? 120 : 120;
  const zoom = p(t, 44.55, 0.45, (n) => n * n);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `scale(${1 + zoom * 0.5})`, opacity: 1 - zoom, filter: zoom ? `blur(${zoom * 16}px)` : undefined }}>
      {/* a grade de verificações: acendem uma a uma, de baixo para cima, sem prometer números */}
      <div style={{ position: "absolute", left: (width - cols * cell) / 2, top: (height - rows * cell) / 2, display: "grid", gridTemplateColumns: `repeat(${cols}, ${cell}px)`, opacity: 0.32, transform: `translateY(${-(t - y0) * 30}px)` }}>
        {Array.from({ length: cols * rows }, (_, i) => {
          const r = Math.floor(i / cols);
          const at = y0 + 0.1 + (rows - r) * 0.12 + random(`pc${i}`) * 0.6;
          const k = p(t, at, 0.3);
          return (
            <div key={i} style={{ width: cell, height: cell, display: "flex", alignItems: "center", justifyContent: "center", opacity: k }}>
              <Status kind="pass" size={40} />
            </div>
          );
        })}
      </div>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(13,11,18,0.95) 30%, rgba(13,11,18,0.2) 90%)" }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <Rise t={t} at={VO.pay1 - 0.05} text="Build fast." size={v ? 130 : 150} color={C.white} />
        <Rise t={t} at={42.85} text="Ship with confidence." size={v ? 130 : 150} color={C.success} stagger={0.1} style={{ maxWidth: v ? 960 : undefined }} />
      </div>
    </AbsoluteFill>
  );
}
