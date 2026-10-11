import { ArrowRight } from "lucide-react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { easeIn, easeInOut, easeOut, mix, progress } from "../anim";
import { Lockup } from "../components/Logo";
import { w, Words } from "../components/Words";
import { FONT } from "../theme";
import { SuggestionCard, type CardState } from "./Cards";
import { Phone, SwipeHint, type Segment } from "./Phone";
import { Strip } from "./Strip";
import { COPY, D, UI } from "./theme";
import T from "./timeline.json";

/**
 * Publishub · motion ad v2 (16 s). Em vez de uma tela de produto parada, um
 * Reel de verdade (clipes do Mixkit) é analisado e re-editado na frente de
 * quem assiste:
 *
 *   0–3 s    o Reel em tela cheia, com a abertura lenta; o polegar passa e ele some
 *   3–7 s    ele volta num celular; a marca entra e a análise percorre o vídeo
 *   7–12 s   a queda acende na alface, as sugestões chegam, o corte acontece e
 *            a legenda aparece; o Reel passa a abrir na chama
 *   12–16 s  o Reel editado continua tocando ao lado do CTA
 *
 * Tudo em quadros absolutos de v2/timeline.json, que a trilha (make-sound-v2) também lê.
 */
type Layout = "vertical" | "horizontal";

interface Box {
  f: number;
  x: number;
  y: number;
  w: number;
}

const L = {
  vertical: {
    W: 1080,
    H: 1920,
    full: "footage/a-lettuce.mp4",
    hook: { left: 80, top: 1150, fontSize: 124, lines: [w("You spend"), [...w("hours", D.accent), ...w("editing.")]] },
    copy: { left: 80, top: 236, fontSize: 84 },
    question: [w("But is your video"), w("actually working?", D.accent)],
    meet: [w("Meet your AI"), w("video copilot.")],
    weak: [w("Find the"), w("weak spots.", D.accent)],
    count: [w("Make every"), w("second count.", D.accent)],
    logo: { big: { x: 540, y: 300, size: 72 }, small: { x: 80, y: 168, size: 32 }, anchorSmall: 0 },
    phone: [
      { f: T.hook.return, x: 310, y: 1960, w: 460 },
      { f: T.hook.return + 30, x: 310, y: 470, w: 460 },
      { f: T.demo.layout, x: 310, y: 470, w: 460 },
      { f: T.demo.layout + 22, x: 60, y: 470, w: 420 },
      { f: T.end.start, x: 60, y: 470, w: 420 },
      { f: T.end.start + 26, x: 370, y: 196, w: 340 },
    ] as Box[],
    // a faixa sobe junto quando o celular vai para a esquerda: sem vão embaixo dele
    strip: { x: 70, y: [1322, 1238], width: 940, curveH: 92, thumbH: 96, font: 22 },
    cards: { x: 500, y: 470, width: 510, scale: 1.6, gap: 18, row: false },
    end: {
      align: "center" as const,
      x: 540,
      logo: { y: 878, size: 50 },
      head: { top: 950, fontSize: 86, lines: [w("Stop guessing."), w("Start creating"), w("better videos.")] },
      cta: { top: 1268, h: 116, fontSize: 46 },
      url: { top: 1418, fontSize: 36 },
      note: { top: 1472, fontSize: 27 },
    },
  },
  horizontal: {
    W: 1920,
    H: 1080,
    full: "footage/a-lettuce-wide.mp4",
    hook: { left: 96, top: 760, fontSize: 112, lines: [[...w("You spend"), ...w("hours", D.accent), ...w("editing.")]] },
    copy: { left: 720, top: 150, fontSize: 76 },
    question: [w("But is your video"), w("actually working?", D.accent)],
    meet: [w("Meet your AI video copilot.")],
    weak: [[...w("Find the"), ...w("weak spots.", D.accent)]],
    count: [[...w("Make every"), ...w("second count.", D.accent)]],
    logo: { big: { x: 1272, y: 400, size: 80 }, small: { x: 96, y: 84, size: 30 }, anchorSmall: 0 },
    phone: [
      { f: T.hook.return, x: 196, y: 1140, w: 440 },
      { f: T.hook.return + 30, x: 196, y: 152, w: 440 },
      { f: T.end.start, x: 196, y: 152, w: 440 },
      { f: T.end.start + 26, x: 210, y: 152, w: 440 },
    ] as Box[],
    strip: { x: 720, y: [400, 696], width: 1104, curveH: 116, thumbH: 108, font: 22 },
    // a sugestão principal na largura toda; as outras duas lado a lado embaixo
    cards: { x: 720, y: 282, width: 1104, scale: 1.7, gap: 20, row: true },
    end: {
      align: "left" as const,
      x: 720,
      logo: { y: 262, size: 46 },
      head: { top: 330, fontSize: 92, lines: [w("Stop guessing."), w("Start creating"), w("better videos.")] },
      cta: { top: 672, h: 104, fontSize: 42 },
      url: { top: 812, fontSize: 32 },
      note: { top: 862, fontSize: 25 },
    },
  },
};

/* O que o celular toca, em quadros do anúncio. */
const SCHEDULE: Segment[] = [
  { src: "footage/a-lettuce.mp4", from: T.hook.return, to: T.demo.cut, freezeAt: T.demo.drop },
  { src: "footage/b-flame.mp4", from: T.demo.cut, to: T.demo.parm, trim: 20 },
  { src: "footage/c-parm.mp4", from: T.demo.parm, to: T.end.plate },
  { src: "footage/d-plate.mp4", from: T.end.plate, to: T.durationInFrames },
];

/** Segundos do Reel editado (15 s) em cada quadro, depois do corte. */
function editedSec(f: number): number {
  if (f < T.demo.parm) return interpolate(f, [T.demo.cut, T.demo.parm], [0, 6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (f < T.end.plate) return interpolate(f, [T.demo.parm, T.end.plate], [6, 11], { extrapolateRight: "clamp" });
  return interpolate(f, [T.end.plate, T.durationInFrames], [11, 15], { extrapolateRight: "clamp" });
}

function box(f: number, keys: Box[]): Box {
  let a = keys[0];
  let b = keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    if (f >= keys[i].f) {
      a = keys[i];
      b = keys[i + 1];
    }
  }
  const t = f <= a.f ? 0 : f >= b.f ? 1 : easeInOut((f - a.f) / (b.f - a.f));
  return { f, x: mix(a.x, b.x, t), y: mix(a.y, b.y, t), w: mix(a.w, b.w, t) };
}

const copyStyle = (c: { left: number; top: number; fontSize: number }) => ({
  position: "absolute" as const,
  left: c.left,
  top: c.top,
  fontFamily: FONT.sans,
  fontWeight: 600,
  fontSize: c.fontSize,
  lineHeight: 1.02,
  letterSpacing: "-0.045em",
  color: D.ink,
});

export function Ad2({ layout }: { layout: Layout }) {
  const f = useCurrentFrame();
  const l = L[layout];
  const h = T.hook;
  const r = T.reveal;
  const d = T.demo;
  const e = T.end;

  /* ---------- cena 1: o Reel em tela cheia, e o polegar que passa ---------- */
  const swipe = progress(f, h.swipe, 10, easeIn);

  /* ---------- o celular ---------- */
  const ph = box(f, l.phone);
  const played = f < d.cut ? interpolate(f, [h.return, d.drop], [0, 3 / 19], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : editedSec(f) / 15;
  const dropOnPhone = progress(f, d.drop, 8) * (1 - progress(f, d.acceptCut, 6));
  const caption = progress(f, d.caption, 10, easeOut);
  // o corte: um tranco curto no celular, como a emenda de um clipe
  const bump = 1 + 0.025 * Math.sin(progress(f, d.cut, 6) * Math.PI);

  /* ---------- a faixa ---------- */
  const stripIn = progress(f, r.strip, 16);
  const stripOut = progress(f, e.start - 12, 12, easeIn);
  const stripY = mix(l.strip.y[0], l.strip.y[1], progress(f, d.layout, 22, easeInOut));

  /* ---------- as sugestões ---------- */
  const cardState = (i: number): CardState => {
    const at = i === 0 ? d.acceptCut : i === 1 ? d.acceptCaption : null;
    return {
      p: progress(f, d.cards[i], 12) * (1 - progress(f, e.start - 12, 10, easeIn)),
      press: at === null ? 0 : progress(f, at - 6, 5) * (1 - progress(f, at - 1, 3)),
      leave: at === null ? 0 : progress(f, at - 1, 3),
      accepted: at === null ? 0 : progress(f, at + 2, 8),
    };
  };

  /* ---------- a marca ---------- */
  const build = progress(f, r.logo, 22);
  const word = progress(f, r.logo + 10, 14);
  const settle = progress(f, r.logo + 26, 16, easeInOut);
  const logoOut = progress(f, e.start - 10, 8, easeIn);
  const lx = mix(l.logo.big.x, l.logo.small.x, settle);
  const ly = mix(l.logo.big.y, l.logo.small.y, settle);
  const ls = mix(l.logo.big.size, l.logo.small.size, settle);
  const anchorX = mix(-50, 0, settle);

  /* ---------- o fechamento ---------- */
  const E = l.end;
  const endBuild = progress(f, e.logo, 22);
  const endWord = progress(f, e.logo + 8, 14);
  const cta = progress(f, e.cta, 16);
  const nudge = Math.sin(progress(f, e.cta + 28, 14, easeInOut) * Math.PI) * 10;
  const url = progress(f, e.url, 14);
  const note = progress(f, e.url + 6, 14);
  const center = E.align === "center";
  const endBlock = { position: "absolute" as const, left: center ? 0 : E.x, right: center ? 0 : undefined, display: "flex", justifyContent: center ? "center" : "flex-start" };
  const head = { fontFamily: FONT.sans, fontWeight: 600, fontSize: E.head.fontSize, lineHeight: 1.02, letterSpacing: "-0.05em", color: D.ink, textAlign: E.align };

  return (
    <AbsoluteFill style={{ background: D.paper, overflow: "hidden" }}>
      {/* cena 1 */}
      {f < h.swipe + 12 && (
        <AbsoluteFill style={{ transform: `translateY(${-swipe * 105}%)` }}>
          <OffthreadVideo src={staticFile(l.full)} muted style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "62%", background: "linear-gradient(180deg, rgba(12,10,8,0) 0%, rgba(12,10,8,0.82) 70%)" }} />
          <span style={{ position: "absolute", left: layout === "vertical" ? 80 : 96, top: layout === "vertical" ? 220 : 72, borderRadius: 999, background: "rgba(0,0,0,0.5)", padding: "6px 16px", fontFamily: FONT.mono, fontSize: 24, color: "#fff" }}>{UI.example}</span>
          <Words lines={l.hook.lines} start={h.words[0]} stagger={h.words[1] - h.words[0]} dur={9} style={copyStyle(l.hook)} />
          <span style={{ position: "absolute", left: layout === "vertical" ? 80 : 96, right: layout === "vertical" ? 80 : 96, bottom: layout === "vertical" ? 120 : 56, height: 5, borderRadius: 999, background: "rgba(255,255,255,0.3)" }}>
            <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(f / 30 / 19) * 100}%`, borderRadius: 999, background: "#fff" }} />
          </span>
        </AbsoluteFill>
      )}
      <SwipeHint start={h.swipe} x={l.W * (layout === "vertical" ? 0.62 : 0.7)} y0={l.H * 0.78} y1={l.H * 0.3} size={layout === "vertical" ? 120 : 96} />
      <Words lines={l.question} start={h.question + 1} stagger={2} dur={9} exit={h.questionOut} style={copyStyle(l.copy)} />

      {/* a faixa da timeline */}
      {f >= r.strip && (
        <div style={{ position: "absolute", left: l.strip.x, top: stripY + (1 - stripIn) * 40, opacity: stripIn * (1 - stripOut) }}>
          <Strip
            width={l.strip.width}
            curveH={l.strip.curveH}
            thumbH={l.strip.thumbH}
            fontSize={l.strip.font}
            scan={progress(f, r.scan, r.scanEnd - r.scan, easeInOut)}
            drop={progress(f, d.drop, 14)}
            cut={progress(f, d.cut, 16, easeInOut)}
            head={f >= d.cut ? editedSec(f) : null}
          />
        </div>
      )}

      {/* as sugestões */}
      {f >= d.cards[0] && f < e.start + 4 && (
        <div style={{ position: "absolute", left: l.cards.x, top: l.cards.y, width: l.cards.width, display: "grid", gridTemplateColumns: l.cards.row ? "1fr 1fr" : "1fr", gap: l.cards.gap, alignItems: "stretch" }}>
          {UI.items.map((item, i) => (
            <div key={item.kind} style={{ gridColumn: l.cards.row && i === 0 ? "1 / span 2" : undefined, minWidth: 0 }}>
              <SuggestionCard item={item} index={i} st={cardState(i)} scale={l.cards.scale} />
            </div>
          ))}
        </div>
      )}

      {/* o celular */}
      {f >= h.return && (
        <div style={{ position: "absolute", left: ph.x, top: ph.y, transform: `scale(${bump})`, transformOrigin: "50% 50%" }}>
          <Phone width={ph.w} schedule={SCHEDULE} played={played} caption={caption} drop={dropOnPhone} />
        </div>
      )}

      {/* a copy das cenas 2 e 3, uma frase de cada vez */}
      <Words lines={l.meet} start={r.headline} stagger={3} exit={d.copy1 - 13} style={copyStyle(l.copy)} />
      <Words lines={l.weak} start={d.copy1 + 1} stagger={3} exit={d.copy2 - 13} style={copyStyle(l.copy)} />
      <Words lines={l.count} start={d.copy2 + 1} stagger={3} exit={e.start - 13} style={copyStyle(l.copy)} />

      {/* a marca: monta grande e vai para o canto */}
      {f >= r.logo && (
        <div style={{ position: "absolute", left: lx, top: ly, transform: `translate(${anchorX}%, -50%)`, opacity: 1 - logoOut }}>
          <Lockup size={ls} build={build} word={word} variant="color" pen={D.accent} color={D.ink} />
        </div>
      )}

      {/* o fechamento */}
      {f >= e.start && (
        <>
          <div style={{ ...endBlock, top: E.logo.y, transform: "translateY(-50%)" }}>
            <Lockup size={E.logo.size} build={endBuild} word={endWord} variant="color" pen={D.accent} color={D.ink} />
          </div>
          <div style={{ position: "absolute", top: E.head.top, left: center ? 0 : E.x, right: center ? 0 : undefined }}>
            <Words lines={[E.head.lines[0]]} start={e.headline[0]} stagger={3} style={head} />
            <Words lines={E.head.lines.slice(1)} start={e.headline[1]} stagger={3} style={head} />
          </div>
          <div style={{ ...endBlock, top: E.cta.top }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: E.cta.fontSize * 0.42,
                height: E.cta.h,
                padding: `0 ${E.cta.h * 0.5}px`,
                borderRadius: E.cta.h * 0.24,
                background: D.accent,
                color: D.onAccent,
                fontFamily: FONT.sans,
                fontWeight: 600,
                fontSize: E.cta.fontSize,
                letterSpacing: "-0.025em",
                opacity: cta,
                transform: `translateY(${(1 - cta) * 24}px) scale(${0.92 + 0.08 * easeOut(cta)})`,
                transformOrigin: center ? "50% 50%" : "0% 50%",
              }}
            >
              {COPY.cta}
              <ArrowRight size={E.cta.fontSize * 0.95} strokeWidth={2.4} style={{ transform: `translateX(${nudge}px)` }} />
            </div>
          </div>
          <div style={{ ...endBlock, top: E.url.top, fontFamily: FONT.mono, fontWeight: 500, fontSize: E.url.fontSize, color: D.ink, opacity: url }}>{COPY.url}</div>
          <div style={{ ...endBlock, top: E.note.top, fontFamily: FONT.mono, fontWeight: 500, fontSize: E.note.fontSize, color: D.muted, opacity: note }}>{COPY.ctaNote}</div>
        </>
      )}

      <Sequence from={0}>
        <Audio src={staticFile("soundtrack-v2.wav")} />
      </Sequence>
    </AbsoluteFill>
  );
}
