import type { CSSProperties, ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { easeIn, progress } from "../anim";

export interface Word {
  text: string;
  color?: string;
}

/**
 * Tipografia cinética: cada palavra sobe de dentro de uma máscara, uma depois
 * da outra; na saída, sobem e somem do mesmo jeito (ou somem de uma vez, num corte
 * seco: exitDur 1, exitStagger 0). `lines` separa as linhas
 * (quebra controlada, nada de quebra automática no meio da frase).
 */
export function Words({
  lines,
  start,
  stagger = 3,
  dur = 14,
  exit,
  exitStagger = 1,
  exitDur = 8,
  style,
  lineStyle,
}: {
  lines: Word[][];
  start: number;
  stagger?: number;
  dur?: number;
  exit?: number;
  exitStagger?: number;
  exitDur?: number;
  style?: CSSProperties;
  lineStyle?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  let index = 0;
  return (
    <div style={style}>
      {lines.map((line, li) => (
        <div key={li} style={{ display: "block", whiteSpace: "nowrap", ...lineStyle }}>
          {line.map((word, wi) => {
            const i = index++;
            const p = progress(frame, start + i * stagger, dur);
            const out = exit === undefined ? 0 : progress(frame, exit + i * exitStagger, exitDur, easeIn);
            const y = (1 - p) * 110 - out * 110;
            return (
              <Mask key={wi} last={wi === line.length - 1}>
                <span style={{ display: "inline-block", transform: `translateY(${y}%)`, color: word.color, opacity: p > 0 ? 1 : 0 }}>{word.text}</span>
              </Mask>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Mask({ children, last }: { children: ReactNode; last: boolean }) {
  return (
    <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingBottom: "0.14em", marginBottom: "-0.14em", paddingTop: "0.04em", marginTop: "-0.04em", marginRight: last ? 0 : "0.24em" }}>
      {children}
    </span>
  );
}

/** "Frase com destaque" → linhas de palavras: `w("Stop guessing.")`. */
export function w(text: string, color?: string): Word[] {
  return text.split(" ").map((t) => ({ text: t, color }));
}
