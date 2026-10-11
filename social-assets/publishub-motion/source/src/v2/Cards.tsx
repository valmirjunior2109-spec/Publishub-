import { Check } from "lucide-react";
import { FONT } from "../theme";
import { D, UI } from "./theme";

/**
 * As sugestões do plano de edição, como o produto as mostra no tema escuro
 * (frontend/src/components/landing/HeroProduct.tsx): o tempo, a frente (Badge),
 * o texto e o botão de aceitar. Tamanhos em px do site × `scale`.
 */
export interface CardState {
  p: number; // entrada
  press: number; // o botão afundando
  leave: number; // o botão saindo
  accepted: number; // a confirmação entrando
}

export function SuggestionCard({ item, index, st, scale }: { item: (typeof UI.items)[number]; index: number; st: CardState; scale: number }) {
  const s = scale;
  const tint = index === 0;
  const border = st.accepted > 0 ? `rgba(143,170,240,${0.15 + 0.4 * st.accepted})` : D.line;
  return (
    <div
      style={{
        borderRadius: 14 * s,
        border: `${1 * s}px solid ${border}`,
        background: D.raised,
        padding: 16 * s,
        opacity: st.p,
        transform: `translateX(${(1 - st.p) * 40 * s}px)`,
        boxShadow: st.accepted > 0 ? `0 0 0 ${3 * s * st.accepted}px rgba(143,170,240,0.1)` : `0 ${10 * s}px ${24 * s}px -${12 * s}px rgba(0,0,0,0.6)`,
        fontFamily: FONT.sans,
        color: D.ink,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 * s, height: 30 * s }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 * s }}>
          <span style={{ fontFamily: FONT.mono, fontSize: 12 * s, color: D.muted }}>{item.time}</span>
          <span
            style={{
              borderRadius: 999,
              border: `${1 * s}px solid ${tint ? "rgba(143,170,240,0.3)" : D.line}`,
              background: tint ? "rgba(143,170,240,0.12)" : "transparent",
              color: tint ? D.accent : D.muted,
              fontSize: 11.5 * s,
              fontWeight: 500,
              padding: `${1 * s}px ${9 * s}px`,
            }}
          >
            {item.kind}
          </span>
        </span>
        <span style={{ position: "relative", display: "inline-flex", justifyContent: "flex-end", minWidth: 96 * s }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 30 * s,
              padding: `0 ${11 * s}px`,
              borderRadius: 9 * s,
              border: `${1 * s}px solid ${D.line}`,
              background: D.surface,
              fontSize: 12.5 * s,
              fontWeight: 600,
              opacity: 1 - st.leave,
              transform: `scale(${1 - st.press * 0.1 - st.leave * 0.15})`,
            }}
          >
            {UI.accept}
          </span>
          <span style={{ position: "absolute", right: 0, top: "50%", transform: `translateY(-50%) scale(${0.85 + 0.15 * st.accepted})`, display: "inline-flex", alignItems: "center", gap: 4 * s, fontSize: 12.5 * s, fontWeight: 600, color: D.accent, opacity: st.accepted }}>
            <Check size={14 * s} strokeWidth={2.75} />
            {UI.accepted}
          </span>
        </span>
      </div>
      <p style={{ margin: `${9 * s}px 0 0`, fontSize: 15 * s, lineHeight: 1.38 }}>{item.text}</p>
    </div>
  );
}
