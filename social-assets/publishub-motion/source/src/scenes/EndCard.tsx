import { ArrowRight } from "lucide-react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { easeInOut, easeOut, progress } from "../anim";
import { Lockup } from "../components/Logo";
import type { Layout } from "../components/ProductWindow";
import { w, Words } from "../components/Words";
import { C, COPY, FONT } from "../theme";
import T from "../timeline.json";

/**
 * Cena 4 (12–16 s): o fechamento. O caderno se monta de novo, a promessa entra
 * em duas batidas e o CTA chega com a oferta como ela está no site hoje.
 */
const L = {
  vertical: {
    logo: { top: 470, size: 64 },
    head: { top: 640, fontSize: 112 },
    lines1: [w("Stop guessing.")],
    lines2: [w("Start creating"), w("better videos.")],
    cta: { top: 1150, h: 132, fontSize: 50 },
    url: { top: 1330, fontSize: 40 },
    note: { top: 1400, fontSize: 31 },
  },
  horizontal: {
    logo: { top: 190, size: 54 },
    head: { top: 310, fontSize: 104 },
    lines1: [w("Stop guessing.")],
    lines2: [w("Start creating better videos.")],
    cta: { top: 630, h: 112, fontSize: 44 },
    url: { top: 792, fontSize: 36 },
    note: { top: 852, fontSize: 28 },
  },
};

export function EndCard({ layout }: { layout: Layout }) {
  const f = useCurrentFrame();
  const l = L[layout];
  const e = T.end;

  const build = progress(f, e.logo, 22);
  const word = progress(f, e.logo + 8, 14);
  const cta = progress(f, e.cta, 16);
  const ctaScale = cta < 1 ? 0.92 + 0.08 * easeOut(cta) : 1;
  const nudge = Math.sin(progress(f, e.cta + 26, 14, easeInOut) * Math.PI) * 10; // a seta anda uma vez
  const url = progress(f, e.url, 14);
  const note = progress(f, e.url + 6, 14);
  const push = 1 + 0.018 * progress(f, e.cta, T.durationInFrames - e.cta, easeInOut);

  const head = {
    fontFamily: FONT.sans,
    fontWeight: 600,
    fontSize: l.head.fontSize,
    lineHeight: 1.02,
    letterSpacing: "-0.05em",
    color: C.ink,
    textAlign: "center" as const,
  };

  return (
    <AbsoluteFill style={{ transform: `scale(${push})` }}>
      <div style={{ position: "absolute", top: l.logo.top, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Lockup size={l.logo.size} build={build} word={word} />
      </div>

      <div style={{ position: "absolute", top: l.head.top, left: 0, right: 0 }}>
        <Words lines={l.lines1} start={e.headline[0]} stagger={3} style={head} />
        <Words lines={l.lines2} start={e.headline[1]} stagger={3} style={head} />
      </div>

      <div style={{ position: "absolute", top: l.cta.top, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: l.cta.fontSize * 0.42,
            height: l.cta.h,
            padding: `0 ${l.cta.h * 0.5}px`,
            borderRadius: l.cta.h * 0.24,
            background: C.ink,
            color: C.cream,
            fontFamily: FONT.sans,
            fontWeight: 600,
            fontSize: l.cta.fontSize,
            letterSpacing: "-0.025em",
            opacity: cta,
            transform: `translateY(${(1 - cta) * 24}px) scale(${ctaScale})`,
            boxShadow: "0 24px 48px -24px rgba(30,27,24,0.55)",
          }}
        >
          {COPY.cta}
          <ArrowRight size={l.cta.fontSize * 0.95} strokeWidth={2.4} style={{ transform: `translateX(${nudge}px)` }} />
        </div>
      </div>

      <div style={{ position: "absolute", top: l.url.top, left: 0, right: 0, textAlign: "center", fontFamily: FONT.mono, fontWeight: 500, fontSize: l.url.fontSize, color: C.ink, opacity: url, transform: `translateY(${(1 - url) * 10}px)` }}>{COPY.url}</div>
      <div style={{ position: "absolute", top: l.note.top, left: 0, right: 0, textAlign: "center", fontFamily: FONT.mono, fontWeight: 500, fontSize: l.note.fontSize, letterSpacing: "0.02em", color: "rgba(30,27,24,0.82)", opacity: note }}>{COPY.ctaNote}</div>
    </AbsoluteFill>
  );
}
