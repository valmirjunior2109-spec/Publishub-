import type { CSSProperties } from "react";
import { useCurrentFrame } from "remotion";
import { easeIn, easeOut, progress, tween } from "../anim";
import { FONT } from "../theme";
import { at, until, WORDS, type Emphasis, type Page } from "./timeline";
import { TH } from "./theme";

const ENTER = 5; // quadros da página entrando
const EXIT = 4; // e saindo
const LEAD = 2; // a página aparece um pouco antes da primeira palavra
const HOLD = 18; // quanto a página fica depois da última palavra, se não vier outra

/** Os quadros em que cada página fica na tela: da primeira palavra até a próxima página. */
function pageSpans(pages: Page[]) {
  return pages.map((p, k) => {
    const start = Math.max(0, at(p.from) - LEAD);
    const next = pages[k + 1];
    const natural = until(p.to) + HOLD;
    const end = next ? Math.min(natural, Math.max(0, at(next.from) - LEAD)) : natural;
    return { start, end };
  });
}

/**
 * Legendas da fala, uma página por vez. As palavras de uma página já estão
 * diagramadas desde o começo (nada pula de lugar): as que ainda não foram
 * ditas ficam apagadas e acendem no instante em que são faladas. Só as palavras
 * com ênfase ganham tratamento próprio.
 */
export function Captions({ pages, top }: { pages: Page[]; top: number }) {
  const frame = useCurrentFrame();
  const spans = pageSpans(pages);
  const k = spans.findIndex((s) => frame >= s.start && frame < s.end);
  if (k < 0) return null;
  const page = pages[k];
  const { start, end } = spans[k];

  const enter = progress(frame, start, ENTER);
  const exit = progress(frame, end - EXIT, EXIT, easeIn);
  const size = page.hero ? 98 : 74;

  const words = [];
  for (let i = page.from; i <= page.to; i++) words.push(i);

  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        top,
        display: "flex",
        justifyContent: "center",
        opacity: enter * (1 - exit),
        transform: `translateY(${(1 - enter) * 22 - exit * 12}px)`,
      }}
    >
      <div
        style={{
          fontFamily: FONT.sans,
          fontWeight: 720,
          fontSize: size,
          lineHeight: 1.14,
          letterSpacing: "-0.025em",
          color: TH.text,
          textAlign: "center",
          textWrap: "balance",
          maxWidth: 940,
          textShadow: "0 2px 22px rgba(0,0,0,0.55), 0 1px 3px rgba(0,0,0,0.7)",
        }}
      >
        {words.map((i, n) => (
          <CaptionWord key={i} i={i} em={page.em?.[i]} last={n === words.length - 1} />
        ))}
      </div>
    </div>
  );
}

function CaptionWord({ i, em, last }: { i: number; em?: Emphasis; last: boolean }) {
  const frame = useCurrentFrame();
  const w = WORDS[i];
  const s0 = at(i);
  const spoken = progress(frame, s0 - 1, 4);
  const pop = em ? tween(frame, [s0, s0 + 4], [0, 1]) - tween(frame, [s0 + 4, s0 + 12], [0, 1]) : 0;

  const base: CSSProperties = {
    position: "relative",
    display: "inline-block",
    marginRight: last ? 0 : "0.24em",
    opacity: 0.34 + 0.66 * spoken,
    transform: `translateY(${(1 - spoken) * 6}px) scale(${1 + pop * 0.07})`,
    transformOrigin: "50% 70%",
    whiteSpace: "nowrap",
  };

  if (em === "mark") {
    const sweep = progress(frame, s0 - 1, 7);
    return (
      <span style={{ ...base, marginLeft: "0.1em", marginRight: last ? "0.1em" : "0.34em" }}>
        <span
          style={{
            position: "absolute",
            left: "-0.14em",
            right: "-0.14em",
            top: "0.06em",
            bottom: "0.02em",
            borderRadius: "0.14em",
            background: TH.mark,
            transform: `scaleX(${sweep})`,
            transformOrigin: "0 50%",
            boxShadow: "0 6px 24px rgba(0,0,0,0.35)",
          }}
        />
        <span style={{ position: "relative", color: sweep > 0.45 ? TH.onMark : TH.text, textShadow: sweep > 0.45 ? "none" : undefined }}>{w.text}</span>
      </span>
    );
  }

  if (em === "pen") {
    const draw = progress(frame, s0 + 1, 9);
    return (
      <span style={{ ...base, color: spoken > 0.5 ? TH.pen : TH.text }}>
        {w.text}
        <svg viewBox="0 0 100 12" preserveAspectRatio="none" style={{ position: "absolute", left: "2%", width: "96%", bottom: "-0.12em", height: "0.2em", overflow: "visible" }}>
          <path d="M2 8 C 22 3, 48 4, 70 6 S 92 7, 98 4" fill="none" stroke={TH.pen} strokeWidth={4.2} strokeLinecap="round" vectorEffect="non-scaling-stroke" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
        </svg>
      </span>
    );
  }

  if (em === "stretch") {
    const open = tween(frame, [s0, until(i)], [0, 1], easeOut);
    return <span style={{ ...base, letterSpacing: `${-0.025 + open * 0.09}em` }}>{w.text}</span>;
  }

  return <span style={base}>{w.text}</span>;
}
