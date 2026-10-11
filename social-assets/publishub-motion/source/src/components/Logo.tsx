import type { CSSProperties } from "react";
import { C, FONT } from "../theme";

/**
 * O caderno da Publishub, com os números de frontend/src/components/Logo.tsx.
 * `mono` é a versão em uma cor (tinta) recortada no fundo, a da campanha;
 * `color` é a do site (`pen`: a caneta, #1F47A6 no claro e #8FAAF0 no escuro,
 * como --logo-pen). `build` (0 → 1) monta o símbolo: o caderno sobe, a
 * borda das páginas se desenha e a caneta desliza até o lugar, no ângulo dela.
 */
export function Mark({ height, variant = "mono", ground = C.caramel, build = 1, pen = "#1F47A6", style }: { height: number; variant?: "mono" | "color"; ground?: string; build?: number; pen?: string; style?: CSSProperties }) {
  const body = clamp01(build / 0.55);
  const strip = clamp01((build - 0.25) / 0.45);
  const penIn = clamp01((build - 0.35) / 0.65);
  const penShift = (1 - easeOutCubic(penIn)) * -70; // ao longo do eixo da caneta
  const width = (height * 104) / 120;

  if (variant === "color") {
    return (
      <svg viewBox="0 0 104 120" width={width} height={height} style={style} aria-hidden="true">
        <g opacity={body} transform={`translate(0 ${(1 - easeOutCubic(body)) * 10})`}>
          <rect x="8" y="8" width="66" height="104" rx="11" fill="#C9824A" />
          <rect x="14" y="93" width={54 * strip} height="9" rx="4.5" fill="#FBF3E6" />
          <rect x="54" y="8" width="8" height="104" fill="#1E1B18" />
        </g>
        <g transform={`rotate(20 75 58) translate(0 ${penShift})`} fill={pen} opacity={penIn > 0 ? 1 : 0}>
          <rect x="70" y="8" width="10" height="80" rx="5" />
          <rect x="78" y="12" width="5" height="4" rx="1" />
          <rect x="81" y="12" width="3.4" height="26" rx="1.7" />
          <path d="M70.5 86 L79.5 86 L75 99 Z" />
          <rect x="74.2" y="40" width="1.6" height="40" rx="0.8" fill="#FBF3E6" />
          <circle cx="75" cy="99.5" r="1.3" fill="#1E1B18" />
        </g>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 104 120" width={width} height={height} style={{ overflow: "visible", ...style }} aria-hidden="true">
      <g opacity={body} transform={`translate(0 ${(1 - easeOutCubic(body)) * 10})`}>
        <rect x="8" y="8" width="66" height="104" rx="11" fill={C.ink} />
        <rect x="14" y="93" width={Math.max(9, 54 * strip)} height="9" rx="4.5" fill={ground} opacity={strip > 0 ? 1 : 0} />
        <rect x="16.4" y="95.4" width={Math.max(4.2, 49.2 * strip)} height="4.2" rx="2.1" fill={C.ink} opacity={strip > 0 ? 1 : 0} />
        <rect x="54" y="8" width="8" height="104" fill={ground} />
      </g>
      <g transform={`rotate(20 75 58) translate(0 ${penShift})`} opacity={penIn > 0 ? 1 : 0}>
        <g fill={C.ink} stroke={ground} strokeWidth="3.4" strokeLinejoin="round" paintOrder="stroke">
          <rect x="70" y="8" width="10" height="80" rx="5" />
          <rect x="81" y="12" width="3.4" height="26" rx="1.7" />
          <path d="M70.5 86 L79.5 86 L75 99 Z" />
        </g>
        <g fill={C.ink}>
          <rect x="78" y="12" width="5" height="4" rx="1" />
          <rect x="70" y="8" width="10" height="79" rx="5" />
          <rect x="70" y="84.4" width="10" height="2.2" fill={ground} />
          <rect x="74.2" y="40" width="1.6" height="40" rx="0.8" fill={ground} />
        </g>
      </g>
    </svg>
  );
}

/**
 * O logo inteiro: o caderno e "Publishub" lado a lado, como no site (o símbolo
 * com 1,3 vez a altura do texto, 0,4 em de espaço, Geist semibold fechada).
 * `word` (0 → 1) revela o nome da esquerda para a direita.
 */
export function Lockup({ size, build = 1, word = 1, color = C.ink, variant = "mono", ground = C.caramel, pen }: { size: number; build?: number; word?: number; color?: string; variant?: "mono" | "color"; ground?: string; pen?: string }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: size * 0.4, fontSize: size, lineHeight: 1, color, whiteSpace: "nowrap" }}>
      <Mark height={size * 1.3} variant={variant} ground={ground} build={build} pen={pen} />
      <span
        style={{
          fontFamily: FONT.sans,
          fontWeight: 600,
          letterSpacing: "-0.035em",
          clipPath: `inset(-10% ${(1 - word) * 100}% -10% 0)`,
          transform: `translateX(${(1 - word) * -0.25}em)`,
          display: "inline-block",
        }}
      >
        Publishub
      </span>
    </div>
  );
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}
