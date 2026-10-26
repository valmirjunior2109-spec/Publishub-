import type { CSSProperties, ReactNode } from "react";
import { easeIn, easeInOut, progress } from "../anim";

/* A tipografia do site para os vídeos de marca: Fraunces nos títulos (t-display),
   com a segunda parte em itálico caramelo (Emphasis.tsx), e a letra de mão (Caveat)
   das anotações da landing ("the second they left"). */

export const SERIF = "Fraunces, Georgia, serif";
export const HAND = "Caveat, cursive";
export const SANS = "Geist, system-ui, sans-serif";
export const MONO = "'Geist Mono', ui-monospace, monospace";

const ROMAN = "'opsz' 144, 'SOFT' 30, 'WONK' 0";
const ITALIC = "'opsz' 144, 'SOFT' 100, 'WONK' 1";

/** Um trecho do título; `em` é a ênfase em itálico caramelo. */
export type Seg = { t: string; em?: boolean };
export type Line = Seg[];

/** Uma palavra que sobe de trás da linha de base, saindo do desfoque. */
export function Rise({ f, at, dur = 14, children, style }: { f: number; at: number; dur?: number; children: ReactNode; style?: CSSProperties }) {
  const p = progress(f, at, dur);
  return (
    <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", padding: "0.08em 0.06em 0.2em", margin: "-0.08em -0.06em -0.2em", ...style }}>
      <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 105}%)`, opacity: Math.min(1, p * 1.5), filter: p < 1 ? `blur(${(1 - p) * 5}px)` : undefined }}>{children}</span>
    </span>
  );
}

/**
 * Título em Fraunces, palavra por palavra: `at` é o quadro da primeira palavra e `step`
 * o intervalo entre elas. `em` sai em itálico na cor `emColor`.
 */
export function Serif({ f, lines, at, step = 4, size, color, emColor, align = "left", lineHeight = 1.04, style }: { f: number; lines: Line[]; at: number | number[]; step?: number; size: number; color: string; emColor: string; align?: "left" | "center"; lineHeight?: number; style?: CSSProperties }) {
  let k = 0;
  return (
    <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: size, lineHeight, letterSpacing: "-0.03em", color, textAlign: align, fontVariationSettings: ROMAN, ...style }}>
      {lines.map((line, li) => {
        const start = Array.isArray(at) ? at[li] : undefined;
        let j = 0;
        return (
          <div key={li} style={{ whiteSpace: "nowrap" }}>
            {line.map((seg, si) =>
              seg.t.split(" ").map((w, wi, all) => {
                const when = start !== undefined ? start + j++ * step : (at as number) + k++ * step;
                return (
                  <span key={`${si}-${wi}`}>
                    <Rise f={f} at={when}>
                      <span style={seg.em ? { fontStyle: "italic", color: emColor, fontVariationSettings: ITALIC } : undefined}>{w}</span>
                    </Rise>
                    {wi < all.length - 1 || si < line.length - 1 ? " " : ""}
                  </span>
                );
              }),
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Quantas palavras um título tem: para saber quando a última termina de entrar. */
export const words = (lines: Line[]) => lines.reduce((a, l) => a + l.reduce((b, s) => b + s.t.split(" ").length, 0), 0);

/** Saída de uma cena: sobe um pouco, desfoca e some. */
export function leave(f: number, at: number, dur = 12, dy = -50): CSSProperties {
  const p = progress(f, at, dur, easeIn);
  return { opacity: 1 - p, transform: `translateY(${p * dy}px)`, filter: p > 0 ? `blur(${p * 10}px)` : undefined };
}

/** Entrada simples: sobe e aparece. */
export function enter(f: number, at: number, dur = 16, dy = 40): CSSProperties {
  const p = progress(f, at, dur);
  return { opacity: p, transform: `translateY(${(1 - p) * dy}px)` };
}

/** Letra de mão que se escreve da esquerda para a direita. */
export function Hand({ f, at, dur = 18, size, color, children, rotate = -3, style }: { f: number; at: number; dur?: number; size: number; color: string; children: ReactNode; rotate?: number; style?: CSSProperties }) {
  const p = progress(f, at, dur, easeInOut);
  return (
    <div style={{ fontFamily: HAND, fontWeight: 600, fontSize: size, lineHeight: 1, color, whiteSpace: "nowrap", transform: `rotate(${rotate}deg)`, clipPath: `inset(-30% ${(1 - p) * 110 - 10}% -30% -5%)`, ...style }}>
      {children}
    </div>
  );
}

/** A seta de caneta das anotações: um traço curvo que se desenha, com a ponta no fim. */
export function HandArrow({ f, at, dur = 14, d, head, color, width = 5, style }: { f: number; at: number; dur?: number; d: string; head: string; color: string; width?: number; style?: CSSProperties }) {
  const p = progress(f, at, dur, easeInOut);
  const h = progress(f, at + dur - 3, 5);
  return (
    <svg style={{ position: "absolute", overflow: "visible", ...style }} width={1} height={1}>
      <path d={d} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" />
      <path d={head} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" opacity={h} />
    </svg>
  );
}
