import type { CSSProperties, ReactNode } from "react";
import { C, FONT } from "../theme";

/* As peças pequenas da interface, com as medidas de frontend/src/components/ui/Badge.tsx
   e landing/Section.tsx (MockButton). Tamanhos em px do site; quem usa aplica o zoom. */

type Tone = "neutral" | "accent" | "confirmed";
const TONE: Record<Tone, string> = { neutral: C.inkMuted, accent: C.accent, confirmed: C.confirmed };

export function Badge({ tone = "neutral", dot = false, children, style }: { tone?: Tone; dot?: boolean; children: ReactNode; style?: CSSProperties }) {
  const color = TONE[tone];
  const tinted = tone !== "neutral";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        borderRadius: 999,
        border: `1px solid ${tinted ? `color-mix(in srgb, ${color} 25%, transparent)` : C.line}`,
        background: tinted ? `color-mix(in srgb, ${color} 10%, transparent)` : "transparent",
        color,
        padding: "3px 10px",
        fontFamily: FONT.sans,
        fontSize: 12,
        fontWeight: 500,
        lineHeight: 1.4,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: "currentColor" }} />}
      {children}
    </span>
  );
}

export function MockButton({ children, variant = "primary", style }: { children: ReactNode; variant?: "primary" | "secondary"; style?: CSSProperties }) {
  const primary = variant === "primary";
  return (
    <span
      style={{
        display: "inline-flex",
        height: 36,
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        whiteSpace: "nowrap",
        borderRadius: 10,
        border: `1px solid ${primary ? "transparent" : C.line}`,
        background: primary ? C.accent : C.paperRaised,
        color: primary ? C.paperRaised : C.ink,
        padding: "0 14px",
        fontFamily: FONT.sans,
        fontSize: 13,
        fontWeight: 600,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export const label: CSSProperties = {
  fontFamily: FONT.mono,
  fontSize: 11.5,
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: C.inkMuted,
};
