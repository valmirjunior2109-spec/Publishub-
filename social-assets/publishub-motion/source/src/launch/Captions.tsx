// A faixa de legendas: os trechos de captions.json com burn !== false, na zona segura de cada formato.
// No 9:16 ficam acima da faixa de baixo que o Reels e o TikTok cobrem (nome, legenda do post, botões).

import CAP from "./captions.json";
import { C, SANS, p, useStage } from "./theme";

type Chunk = { from: number; to: number; text: string; burn?: boolean };
const CHUNKS = (CAP.chunks as Chunk[]).filter((c) => c.burn !== false);

export function Captions() {
  const { t, v } = useStage();
  const c = CHUNKS.find((k) => t >= k.from - 0.05 && t < k.to + 0.12);
  if (!c) return null;
  const k = p(t, c.from - 0.05, 0.18);
  const out = 1 - p(t, c.to, 0.12);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: v ? 1352 : undefined,
        bottom: v ? undefined : 58,
        display: "flex",
        justifyContent: "center",
        padding: v ? "0 90px" : "0 200px",
        zIndex: 100,
        opacity: Math.min(k, out),
        transform: `translateY(${(1 - k) * 10}px)`,
      }}
    >
      <div
        style={{
          fontFamily: SANS,
          fontWeight: 600,
          fontSize: v ? 46 : 40,
          lineHeight: 1.22,
          letterSpacing: "-0.015em",
          color: C.white,
          textAlign: "center",
          background: "rgba(13,11,18,0.72)",
          border: "1px solid rgba(242,215,160,0.10)",
          backdropFilter: "blur(10px)",
          padding: v ? "12px 26px 14px" : "10px 24px 12px",
          borderRadius: 14,
          maxWidth: v ? 900 : 1300,
          textWrap: "balance",
        }}
      >
        {c.text}
      </div>
    </div>
  );
}
