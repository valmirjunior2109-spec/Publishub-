import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { easeIn, easeInOut, easeOut, mix, progress } from "../anim";
import T from "./timeline.json";

/* ==========================================================================
   Founder · "Build in public." Marca pessoal do fundador: 9:16, 19 s, sem rosto.
   1 · o cursor no preto e a frase em tipografia cinética
   2 · código → interface → navegador → quadro, numa janela só
   3 · as quatro telas viram um ciclo (idea → build → ship → learn) que acelera
   4 · o globo em linhas, com pontos acendendo; fecha na assinatura
   Preto, off-white e grafite, com um azul elétrico só. Nenhum número inventado.
   Os quadros estão em timeline.json; a trilha (make-sound-founder.mjs) lê o mesmo.
   ========================================================================== */

export const FOUNDER_FPS = T.fps;
export const FOUNDER_FRAMES = T.durationInFrames;

const W = 1080;
const H = 1920;

const K = {
  black: "#050506",
  panel: "#0D0D0F",
  raised: "#151518",
  line: "rgba(237,236,231,0.09)",
  lineStrong: "rgba(237,236,231,0.18)",
  grid: "rgba(237,236,231,0.045)",
  graphite: "#26262A",
  dim: "#4C4C53",
  muted: "#83838B",
  soft: "#B4B4BA",
  ink: "#EDECE7",
  blue: "#2F6BFF",
  blueText: "#82A6FF",
  blueSoft: "rgba(47,107,255,0.14)",
  blueGlow: "rgba(47,107,255,0.55)",
};
const SANS = "Geist, system-ui, sans-serif";
const MONO = "'Geist Mono', ui-monospace, monospace";

/** Mistura duas cores rgba ([r, g, b, a]) e devolve a string CSS. */
type RGBA = [number, number, number, number];
const INK: RGBA = [237, 236, 231, 1];
const BLUE: RGBA = [47, 107, 255, 1];
const LINE: RGBA = [237, 236, 231, 0.18];
function blend(a: RGBA, b: RGBA, t: number) {
  const c = a.map((v, i) => v + (b[i] - v) * t);
  return `rgba(${c[0].toFixed(0)},${c[1].toFixed(0)},${c[2].toFixed(0)},${c[3].toFixed(3)})`;
}

/* ---------------------------------------------------------------- peças de tipografia */

/** Uma palavra que sobe de trás de uma máscara, saindo do desfoque. */
function Rise({ f, at, dur = 13, gap = "0.24em", children }: { f: number; at: number; dur?: number; gap?: string; children: ReactNode }) {
  const p = progress(f, at, dur);
  return (
    <span style={{ display: "inline-block", overflow: "hidden", padding: "0.06em 0 0.16em", margin: `-0.06em ${gap} -0.16em 0`, verticalAlign: "top" }}>
      <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 108}%)`, opacity: Math.min(1, p * 1.6), filter: p < 1 ? `blur(${(1 - p) * 6}px)` : undefined }}>{children}</span>
    </span>
  );
}

/** Saída: sobe um pouco, desfoca e some. */
function exit(f: number, at: number, dur = 12, dy = -56): CSSProperties {
  const p = progress(f, at, dur, easeIn);
  return { opacity: 1 - p, transform: `translateY(${p * dy}px)`, filter: p > 0 ? `blur(${p * 10}px)` : undefined };
}

/** O cursor de texto azul: pisca a cada meio segundo, fica aceso enquanto digita. */
function Caret({ f, solid = false, w = "0.1em", h = "0.74em", style }: { f: number; solid?: boolean; w?: string | number; h?: string | number; style?: CSSProperties }) {
  const on = solid || Math.floor(f / 15) % 2 === 0;
  return <span style={{ display: "inline-block", width: w, height: h, background: K.blue, opacity: on ? 1 : 0, boxShadow: `0 0 28px ${K.blueGlow}`, ...style }} />;
}

/** Título de cena em linhas; cada palavra entra no seu quadro. */
function Headline({ f, lines, size, style }: { f: number; lines: { words: string[]; at: number; step?: number; color?: string }[]; size: number; style?: CSSProperties }) {
  return (
    <div style={{ position: "absolute", left: 96, right: 48, fontFamily: SANS, fontWeight: 800, fontSize: size, lineHeight: 1.06, letterSpacing: "-0.05em", color: K.ink, ...style }}>
      {lines.map((l, i) => (
        <div key={i} style={{ whiteSpace: "nowrap", height: "1.06em", color: l.color }}>
          {l.words.map((w, j) => (
            <Rise key={j} f={f} at={l.at + j * (l.step ?? 4)}>
              {w}
            </Rise>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- o fundo: grade, luz e marcas */

function Backdrop({ f }: { f: number }) {
  const scan = progress(f, 1, 24, easeInOut);
  const gridOn = mix(0.55, 1, progress(f, 84, 24)) * (1 - progress(f, 356, 28, easeInOut));
  const glow = progress(f, 86, 30) * (1 - progress(f, 456, 30)) + 0.5 * progress(f, 488, 40);
  return (
    <>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${K.grid} 1px, transparent 1px), linear-gradient(90deg, ${K.grid} 1px, transparent 1px)`,
          backgroundSize: "90px 90px",
          backgroundPosition: `0 ${-f * 0.35}px`,
          opacity: gridOn,
          clipPath: `inset(0 0 ${(1 - scan) * 100}% 0)`,
          maskImage: "radial-gradient(70% 55% at 50% 50%, #000 30%, transparent 100%)",
        }}
      />
      {/* a linha que varre a tela no primeiro segundo e acende a grade */}
      {scan > 0 && scan < 1 && <div style={{ position: "absolute", left: 0, right: 0, top: scan * H, height: 2, background: K.ink, opacity: 0.5 * Math.sin(Math.PI * scan), boxShadow: `0 0 18px rgba(237,236,231,0.4)` }} />}
      <AbsoluteFill style={{ background: `radial-gradient(520px 520px at 540px 1090px, rgba(47,107,255,0.11), transparent 100%)`, opacity: glow }} />
      <AbsoluteFill style={{ background: "radial-gradient(120% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.75) 100%)" }} />
    </>
  );
}

const CHAPTERS = [
  { at: 0, n: "01", name: "START" },
  { at: 90, n: "02", name: "BUILD" },
  { at: 210, n: "03", name: "ITERATE" },
];

/** As marcas de canto, o capítulo e o timecode. Somem quando a cena fica cinematográfica. */
function Hud({ f }: { f: number }) {
  const on = progress(f, 4, 14) * (1 - progress(f, 356, 14, easeInOut));
  if (on <= 0) return null;
  const s = Math.floor(f / T.fps);
  const fr = f % T.fps;
  const tc = `00:${String(s).padStart(2, "0")}:${String(fr).padStart(2, "0")}`;
  const corner = (pos: CSSProperties, rot: number) => (
    <div style={{ position: "absolute", width: 30, height: 30, borderTop: `2px solid ${K.lineStrong}`, borderLeft: `2px solid ${K.lineStrong}`, transform: `rotate(${rot}deg)`, ...pos }} />
  );
  return (
    <div style={{ position: "absolute", inset: 0, opacity: on, fontFamily: MONO, fontSize: 22, letterSpacing: "0.14em", color: K.muted }}>
      {corner({ left: 44, top: 44 }, 0)}
      {corner({ right: 44, top: 44 }, 90)}
      {corner({ right: 44, bottom: 44 }, 180)}
      {corner({ left: 44, bottom: 44 }, 270)}
      <div style={{ position: "absolute", left: 96, top: 112, height: 30 }}>
        {CHAPTERS.map((c, i) => {
          const next = CHAPTERS[i + 1]?.at;
          const op = progress(f, c.at, 8) * (next === undefined ? 1 : 1 - progress(f, next - 4, 8));
          if (op <= 0) return null;
          return (
            <div key={c.n} style={{ position: "absolute", left: 0, top: 0, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 16, opacity: op, transform: `translateY(${(1 - progress(f, c.at, 10)) * 14}px)` }}>
              <span style={{ width: 10, height: 10, background: K.blue, boxShadow: `0 0 12px ${K.blueGlow}` }} />
              <span style={{ color: K.ink }}>{c.n}</span>
              <span>/ {c.name}</span>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", right: 96, top: 112 }}>{tc}</div>
    </div>
  );
}

/* ---------------------------------------------------------------- 1 · o cursor e a primeira frase */

const S1_LINES = [["I’m", "not", "just"], ["learning"], ["to", "build."]];
const PROMPT = "~/build  git:(main)  $";

function Scene1({ f }: { f: number }) {
  const S = T.s1;
  if (f > S.out + 14) return null;
  const shown = S.words.filter((at) => f >= at).length;
  const typing = S.words.some((at) => f >= at && f < at + 6);
  const pc = Math.max(0, Math.min(PROMPT.length, Math.floor((f - S.prompt) * 3)));
  let k = 0;
  return (
    <div style={{ position: "absolute", left: 96, right: 40, top: 690, ...exit(f, S.out, 12) }}>
      <div style={{ fontFamily: MONO, fontSize: 28, color: K.muted, height: 40, marginBottom: 40, letterSpacing: "0.02em", whiteSpace: "pre" }}>{PROMPT.slice(0, pc)}</div>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 148, lineHeight: 1, letterSpacing: "-0.055em", color: K.ink }}>
        {S1_LINES.map((line, li) => {
          const words = line.map((w) => ({ w, i: k++ }));
          const caretHere = shown === 0 ? li === 0 : words.some(({ i }) => i === shown - 1);
          return (
            <div key={li} style={{ height: "1.04em", whiteSpace: "nowrap" }}>
              {words
                .filter(({ i }) => i < shown)
                .map(({ w, i }) => (
                  <Rise key={i} f={f} at={S.words[i]} dur={12}>
                    {w}
                  </Rise>
                ))}
              {caretHere && <Caret f={f} solid={typing} style={{ marginLeft: shown ? "-0.14em" : 0 }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- 2 · a janela: código, interface, navegador, quadro */

const WIN = { x: 72, y: 640, w: 936, h: 860 };
const BAR = 64;
const BODY_H = WIN.h - BAR;
const TITLES = ["ship.ts", "workspace / releases", "localhost:3000", "roadmap"];

type Tok = [string, string];
const C_KW = K.muted;
const C_ID = K.ink;
const C_FN = K.ink;
const C_STR = K.blueText;
const C_COM = K.dim;
const CODE: Tok[][] = [
  [["// ship.ts · one small step at a time", C_COM]],
  [],
  [["import", C_KW], [" { build, test, deploy } ", C_ID], ["from", C_KW], [" ", C_ID], ['"./core"', C_STR], [";", C_ID]],
  [],
  [["export async function", C_KW], [" ship", C_FN], ["(idea: ", C_ID], ["Idea", K.soft], [") {", C_ID]],
  [["  const", C_KW], [" product = ", C_ID], ["await", C_KW], [" build(idea);", C_ID]],
  [["  await", C_KW], [" test(product);", C_ID]],
  [["  return", C_KW], [" deploy(product);", C_ID]],
  [["}", C_ID]],
];

function CodePanel({ f }: { f: number }) {
  let rem = Math.max(0, Math.floor((f - (T.s2.panels[0] + 2)) * 10));
  let caretPlaced = false;
  const done = rem >= CODE.reduce((a, l) => a + l.reduce((b, [s]) => b + s.length, 0) + 1, 0);
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: MONO, fontSize: 25, padding: "40px 0 0 0" }}>
      {CODE.map((line, li) => {
        const len = line.reduce((b, [s]) => b + s.length, 0);
        const take = Math.min(len, rem);
        rem = Math.max(0, rem - len - 1);
        let budget = take;
        const caret = !caretPlaced && (take < len || rem === 0 || li === CODE.length - 1);
        if (caret) caretPlaced = true;
        return (
          <div key={li} style={{ height: 48, display: "flex", alignItems: "center", whiteSpace: "pre" }}>
            <span style={{ width: 84, textAlign: "right", paddingRight: 30, color: "#3A3A40", flexShrink: 0 }}>{li + 1}</span>
            {line.map(([s, c], j) => {
              const part = s.slice(0, Math.max(0, budget));
              budget -= s.length;
              return (
                <span key={j} style={{ color: c }}>
                  {part}
                </span>
              );
            })}
            {caret && <Caret f={f} solid={!done} w={3} h={30} style={{ marginLeft: 2, boxShadow: "none" }} />}
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 56, borderTop: `1px solid ${K.line}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", fontSize: 19, color: K.muted, letterSpacing: "0.04em" }}>
        <span>main · ship.ts</span>
        <span>{done ? "saved" : "editing"} · TypeScript</span>
      </div>
    </div>
  );
}

const SIDEBAR = 210;
const PUBLISH = { x: 736, y: 44, w: 160, h: 58 };
const RELEASES = [
  { v: "v0.3", title: "Faster onboarding", draft: true },
  { v: "v0.2", title: "Public changelog", draft: false },
  { v: "v0.1", title: "First version", draft: false },
];

function Pill({ live }: { live: number }) {
  return (
    <div style={{ position: "relative", width: 110, height: 40 }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 20, border: `1px solid ${K.lineStrong}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 18, color: K.muted, opacity: 1 - live }}>Draft</div>
      <div style={{ position: "absolute", inset: 0, borderRadius: 20, border: `1px solid rgba(47,107,255,0.5)`, background: K.blueSoft, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: MONO, fontSize: 18, color: K.ink, opacity: live, transform: `scale(${mix(0.9, 1, live)})` }}>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: K.blue, boxShadow: `0 0 10px ${K.blueGlow}` }} />
        Live
      </div>
    </div>
  );
}

function AppPanel({ f }: { f: number }) {
  const S = T.s2;
  const live = progress(f, S.click + 3, 8);
  const flash = progress(f, S.click + 3, 4) * (1 - progress(f, S.click + 8, 20));
  const press = progress(f, S.click - 1, 3) * (1 - progress(f, S.click + 3, 5));
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: SANS }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: SIDEBAR, borderRight: `1px solid ${K.line}`, padding: "40px 0 0 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "0 28px", marginBottom: 52 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, border: `2px solid ${K.ink}` }} />
          <div style={{ fontFamily: MONO, fontSize: 19, color: K.soft }}>workspace</div>
        </div>
        {["Overview", "Releases", "Roadmap", "Feedback", "Settings"].map((n) => {
          const active = n === "Releases";
          return (
            <div key={n} style={{ position: "relative", height: 54, display: "flex", alignItems: "center", padding: "0 28px", fontFamily: MONO, fontSize: 20, color: active ? K.ink : K.muted, background: active ? "rgba(237,236,231,0.04)" : undefined }}>
              {active && <div style={{ position: "absolute", left: 0, top: 12, bottom: 12, width: 3, background: K.blue }} />}
              {n}
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: SIDEBAR + 40, top: 40, fontSize: 40, fontWeight: 700, letterSpacing: "-0.03em", color: K.ink }}>Releases</div>
      <div style={{ position: "absolute", left: SIDEBAR + 40, top: 96, fontSize: 22, color: K.muted }}>Ship small. Ship often.</div>
      <div
        style={{
          position: "absolute",
          left: PUBLISH.x,
          top: PUBLISH.y,
          width: PUBLISH.w,
          height: PUBLISH.h,
          borderRadius: 14,
          background: K.blue,
          color: "#fff",
          fontSize: 22,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${1 - 0.05 * press})`,
          boxShadow: `0 10px 30px rgba(47,107,255,${0.25 + 0.3 * flash})`,
        }}
      >
        Publish
      </div>
      {RELEASES.map((r, i) => (
        <div
          key={r.v}
          style={{
            position: "absolute",
            left: SIDEBAR + 40,
            right: 40,
            top: 170 + i * 118,
            height: 100,
            borderRadius: 18,
            border: `1px solid ${i === 0 ? blend(LINE, [47, 107, 255, 0.6], flash) : K.line}`,
            background: i === 0 ? `rgba(47,107,255,${0.1 * flash})` : "rgba(237,236,231,0.02)",
            display: "flex",
            alignItems: "center",
            padding: "0 24px",
            gap: 26,
          }}
        >
          <span style={{ fontFamily: MONO, fontSize: 21, color: K.muted, width: 62 }}>{r.v}</span>
          <span style={{ fontSize: 27, fontWeight: 500, color: K.ink, flex: 1, letterSpacing: "-0.01em" }}>{r.title}</span>
          <Pill live={r.draft ? live : 1} />
        </div>
      ))}
      <div style={{ position: "absolute", left: SIDEBAR + 40, right: 40, top: 540, height: 196, borderRadius: 18, border: `1px dashed ${K.lineStrong}`, padding: "26px 24px" }}>
        <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: "0.14em", color: K.muted, marginBottom: 22 }}>NEXT UP</div>
        {["Team spaces", "Public API"].map((n) => (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: 16, height: 46, fontSize: 24, color: K.soft }}>
            <span style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${K.dim}` }} />
            {n}
          </div>
        ))}
      </div>
    </div>
  );
}

function BrowserPanel({ f }: { f: number }) {
  const S = T.s2;
  const url = "localhost:3000";
  const typed = url.slice(0, Math.max(0, Math.floor((f - S.url) * 2)));
  const load = progress(f, S.enter, 10, easeInOut);
  const loadOut = progress(f, S.enter + 10, 6);
  const paint = (k: number): CSSProperties => {
    const p = progress(f, S.enter + 2 + k * 2, 8);
    return { opacity: p, transform: `translateY(${(1 - p) * 18}px)` };
  };
  const bar = (w: number, h = 12, c = K.graphite): CSSProperties => ({ width: w, height: h, borderRadius: h / 2, background: c });
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: SANS }}>
      <div style={{ position: "absolute", left: 32, right: 32, top: 28, height: 58, borderRadius: 29, background: K.raised, border: `1px solid ${K.line}`, display: "flex", alignItems: "center", padding: "0 24px", gap: 16, fontFamily: MONO, fontSize: 22, color: K.ink }}>
        <span style={{ width: 14, height: 14, borderRadius: 7, border: `2px solid ${K.muted}` }} />
        <span style={{ whiteSpace: "pre" }}>{typed}</span>
        {f < S.enter + 2 && <Caret f={f} solid={f < S.enter} w={3} h={28} style={{ marginLeft: -12, boxShadow: "none" }} />}
      </div>
      <div style={{ position: "absolute", left: 0, top: 108, height: 3, width: `${load * 100}%`, background: K.blue, opacity: 1 - loadOut, boxShadow: `0 0 12px ${K.blueGlow}` }} />
      <div style={{ position: "absolute", left: 56, right: 56, top: 150, display: "flex", alignItems: "center", justifyContent: "space-between", ...paint(0) }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: K.ink }} />
        <div style={{ display: "flex", gap: 26, alignItems: "center" }}>
          <div style={bar(64)} />
          <div style={bar(64)} />
          <div style={bar(64)} />
          <div style={{ width: 110, height: 40, borderRadius: 20, border: `1px solid ${K.lineStrong}` }} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 56, top: 262, fontSize: 78, fontWeight: 800, letterSpacing: "-0.05em", color: K.ink, ...paint(1) }}>Hello, world.</div>
      <div style={{ position: "absolute", left: 56, top: 380, display: "flex", flexDirection: "column", gap: 16, ...paint(2) }}>
        <div style={bar(580, 14)} />
        <div style={bar(420, 14)} />
      </div>
      <div style={{ position: "absolute", left: 56, top: 460, display: "flex", gap: 16, ...paint(3) }}>
        <div style={{ height: 60, padding: "0 30px", borderRadius: 14, background: K.ink, color: K.black, fontSize: 22, fontWeight: 600, display: "flex", alignItems: "center" }}>Get started</div>
        <div style={{ height: 60, padding: "0 30px", borderRadius: 14, border: `1px solid ${K.lineStrong}`, color: K.ink, fontSize: 22, fontWeight: 500, display: "flex", alignItems: "center" }}>Docs</div>
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ position: "absolute", left: 56 + i * 284, top: 580, width: 260, height: 168, borderRadius: 18, background: "rgba(237,236,231,0.03)", border: `1px solid ${K.line}`, padding: 24, display: "flex", flexDirection: "column", gap: 14, ...paint(4 + i) }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, border: `2px solid ${i === 0 ? K.blue : K.dim}` }} />
          <div style={bar(170, 12, "#2E2E33")} />
          <div style={bar(120, 12, "#232327")} />
        </div>
      ))}
    </div>
  );
}

const COLS = [
  { name: "IDEA", cards: [["Team spaces", "spec"], ["Public API", "draft"]] },
  { name: "BUILDING", cards: [["Billing", "in review"], ["Dark mode", "in progress"]] },
  { name: "SHIPPED", cards: [["Sign up", "live"], ["Landing page", "live"]] },
];
const COL_W = (WIN.w - 64 - 40) / 3;
const colX = (i: number) => 32 + i * (COL_W + 20);
const cardY = (j: number) => 164 + j * 108;
const CARD_H = 94;

function Card({ title, tag, live = 0, style }: { title: string; tag: string; live?: number; style?: CSSProperties }) {
  return (
    <div style={{ position: "absolute", width: COL_W, height: CARD_H, borderRadius: 16, background: K.raised, border: `1px solid ${K.line}`, padding: "16px 20px", display: "flex", flexDirection: "column", justifyContent: "space-between", ...style }}>
      <div style={{ fontSize: 24, fontWeight: 600, color: K.ink, letterSpacing: "-0.01em" }}>{title}</div>
      <div style={{ position: "relative", height: 20, fontFamily: MONO, fontSize: 17, color: K.muted }}>
        <span style={{ position: "absolute", left: 0, top: 0, opacity: 1 - live }}>{tag}</span>
        <span style={{ position: "absolute", left: 0, top: 0, opacity: live, display: "flex", alignItems: "center", gap: 8, color: K.ink }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: K.blue, boxShadow: `0 0 10px ${K.blueGlow}` }} />
          live
        </span>
      </div>
    </div>
  );
}

/** O cartão arrastado: de BUILDING para o topo de SHIPPED. */
function dragState(f: number) {
  const [a, b] = T.s2.drag;
  const d = progress(f, a + 1, b - a - 1, easeInOut);
  const lift = progress(f, a, 4) * (1 - progress(f, b, 5));
  return { d, lift, x: mix(colX(1), colX(2), d), y: cardY(0) - 10 * lift };
}

function BoardPanel({ f }: { f: number }) {
  const [a, b] = T.s2.drag;
  const shift = progress(f, a + 3, b - a, easeInOut); // os outros cartões abrem espaço
  const { d, lift, x, y } = dragState(f);
  const live = progress(f, b + 2, 8);
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: SANS }}>
      <div style={{ position: "absolute", left: 32, top: 34, fontSize: 36, fontWeight: 700, letterSpacing: "-0.03em", color: K.ink }}>Roadmap</div>
      <div style={{ position: "absolute", right: 32, top: 46, fontFamily: MONO, fontSize: 19, color: K.muted }}>this week</div>
      {COLS.map((c, i) => (
        <div key={c.name} style={{ position: "absolute", left: colX(i), top: 118, display: "flex", alignItems: "center", gap: 12, fontFamily: MONO, fontSize: 18, letterSpacing: "0.14em", color: K.muted }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: i === 2 ? K.blue : K.dim }} />
          {c.name}
        </div>
      ))}
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ position: "absolute", left: colX(i), top: cardY(0) - 6, width: COL_W, bottom: 40, borderRadius: 20, background: "rgba(237,236,231,0.015)" }} />
      ))}
      <Card title="Team spaces" tag="spec" style={{ left: colX(0), top: cardY(0) }} />
      <Card title="Public API" tag="draft" style={{ left: colX(0), top: cardY(1) }} />
      <Card title="Dark mode" tag="in progress" style={{ left: colX(1), top: mix(cardY(1), cardY(0), shift) }} />
      <Card title="Sign up" tag="live" live={1} style={{ left: colX(2), top: mix(cardY(0), cardY(1), shift) }} />
      <Card title="Landing page" tag="live" live={1} style={{ left: colX(2), top: mix(cardY(1), cardY(2), shift) }} />
      <Card
        title="Billing"
        tag="in review"
        live={live}
        style={{
          left: x,
          top: y,
          transform: `rotate(${2.5 * Math.sin(Math.PI * d)}deg) scale(${1 + 0.04 * lift})`,
          boxShadow: `0 ${10 + 24 * lift}px ${20 + 40 * lift}px rgba(0,0,0,${0.3 + 0.35 * lift})`,
          border: `1px solid ${blend(LINE, [47, 107, 255, 0.7], Math.max(lift, live * (1 - progress(f, b + 12, 14))))}`,
          zIndex: 2,
        }}
      />
    </div>
  );
}

/* o cursor de seta, em coordenadas do corpo da janela */
const ARROW_PATH: { f: number; x: number; y: number }[] = [
  { f: T.s2.panels[1] + 4, x: 640, y: 520 },
  { f: T.s2.click - 2, x: PUBLISH.x + 84, y: PUBLISH.y + 34 },
  { f: T.s2.click + 8, x: PUBLISH.x + 84, y: PUBLISH.y + 34 },
  { f: T.s2.enter + 2, x: 560, y: 420 },
  { f: T.s2.drag[0] - 2, x: colX(1) + 92, y: cardY(0) + 44 },
];

function arrowAt(f: number) {
  const [a, b] = T.s2.drag;
  if (f >= a) {
    const s = dragState(Math.min(f, b + 6));
    return { x: s.x + 92, y: s.y + 44 + (f > b ? -6 * progress(f, b, 8) : 0) };
  }
  for (let i = 0; i < ARROW_PATH.length - 1; i++) {
    const p = ARROW_PATH[i];
    const q = ARROW_PATH[i + 1];
    if (f <= q.f) {
      const k = progress(f, p.f, q.f - p.f, easeInOut);
      return { x: mix(p.x, q.x, k), y: mix(p.y, q.y, k) };
    }
  }
  return ARROW_PATH[ARROW_PATH.length - 1];
}

function Arrow({ f }: { f: number }) {
  const S = T.s2;
  const op = progress(f, S.panels[1] + 2, 6) * (1 - progress(f, S.out, 6));
  if (op <= 0) return null;
  const { x, y } = arrowAt(f);
  const press = Math.max(progress(f, S.click - 1, 2) * (1 - progress(f, S.click + 3, 4)), progress(f, S.drag[0] - 1, 2) * (1 - progress(f, S.drag[1], 3)));
  return (
    <svg width={40} height={50} viewBox="0 0 40 50" style={{ position: "absolute", left: x - 6, top: y - 4, opacity: op, transform: `scale(${1 - 0.14 * press})`, transformOrigin: "6px 4px", filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.6))", zIndex: 5 }}>
      <path d="M6 4 L6 39 L15 31 L21 45 L27.5 42 L21.5 28.5 L33 28.5 Z" fill={K.ink} stroke={K.black} strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
}

function Window({ f }: { f: number }) {
  const S = T.s2;
  if (f < S.window - 1 || f > S.out + 16) return null;
  const inP = progress(f, S.window, 20);
  const outP = progress(f, S.out, 14, easeInOut);
  const scale = mix(0.94, 1, inP) * mix(1, 0.22, outP);
  const P = S.panels;
  const panels = [CodePanel, AppPanel, BrowserPanel, BoardPanel];
  const SLIDE = WIN.w * 0.32;
  return (
    <div
      style={{
        position: "absolute",
        left: WIN.x,
        top: WIN.y,
        width: WIN.w,
        height: WIN.h,
        borderRadius: 30,
        background: K.panel,
        border: `1px solid ${K.lineStrong}`,
        overflow: "hidden",
        opacity: inP * (1 - progress(f, S.out + 4, 10)),
        transform: `translateY(${(1 - inP) * 140 - (f - S.window) * 0.3}px) scale(${scale})`,
        boxShadow: "0 50px 140px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,0,0,0.6)",
      }}
    >
      <div style={{ position: "relative", height: BAR, borderBottom: `1px solid ${K.line}`, display: "flex", alignItems: "center", padding: "0 26px", gap: 12 }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ width: 14, height: 14, borderRadius: 7, background: "#2A2A2F" }} />
        ))}
        {TITLES.map((t, i) => {
          const op = (i === 0 ? 1 : progress(f, P[i] - 3, 6)) * (i === TITLES.length - 1 ? 1 : 1 - progress(f, P[i + 1] - 3, 6));
          return (
            <div key={t} style={{ position: "absolute", left: 0, right: 0, textAlign: "center", fontFamily: MONO, fontSize: 20, color: K.muted, letterSpacing: "0.04em", opacity: op }}>
              {t}
            </div>
          );
        })}
      </div>
      <div style={{ position: "relative", height: BODY_H, overflow: "hidden" }}>
        {panels.map((Panel, i) => {
          const tin = i === 0 ? 1 : progress(f, P[i] - 6, 12, easeInOut);
          const tout = i === panels.length - 1 ? 0 : progress(f, P[i + 1] - 6, 12, easeInOut);
          if (tin <= 0 || tout >= 1) return null;
          const x = (1 - tin) * SLIDE - tout * SLIDE;
          return (
            <div key={i} style={{ position: "absolute", inset: 0, transform: `translateX(${x}px) scale(${1 - 0.03 * (1 - tin) - 0.03 * tout})`, opacity: Math.min(tin, 1 - tout), filter: tin < 1 || tout > 0 ? `blur(${(1 - tin + tout) * 6}px)` : undefined }}>
              <Panel f={f} />
            </div>
          );
        })}
        <Arrow f={f} />
      </div>
    </div>
  );
}

function Scene2({ f }: { f: number }) {
  const S = T.s2;
  if (f < S.line1 - 1 || f > S.out + 14) return null;
  return (
    <div style={{ position: "absolute", inset: 0, transform: `translateY(${-(f - S.line1) * 0.15}px)`, ...exit(f, S.out, 12) }}>
      <Headline
        f={f}
        size={104}
        style={{ top: 300 }}
        lines={[
          { words: ["I’m", "building"], at: S.line1 },
          { words: ["something", "real."], at: S.line2, step: 5 },
        ]}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- 3 · o ciclo: idea → build → ship → learn */

const RING = { cx: 540, cy: 1090, r: 290 };
const NODES = [
  { a: -90, n: "01", label: "idea" },
  { a: 0, n: "02", label: "build" },
  { a: 90, n: "03", label: "ship" },
  { a: 180, n: "04", label: "learn" },
];
const NODE = 168;

/** Os quadros em que o pulso passa por cada nó (a trilha usa a mesma conta). */
function passes(i: number) {
  const L = T.s3.laps;
  const out: number[] = [];
  for (let k = 0; k < L.length - 1; k++) out.push(L[k] + ((L[k + 1] - L[k]) * i) / 4);
  if (i === 0) out.push(L[L.length - 1]);
  return out;
}

function Glyph({ kind, color }: { kind: string; color: string }) {
  const s = { fill: "none", stroke: color, strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width={56} height={56} viewBox="0 0 56 56">
      {kind === "idea" && (
        <>
          <circle cx={28} cy={28} r={16} {...s} />
          <circle cx={28} cy={28} r={4} fill={color} />
        </>
      )}
      {kind === "build" && <path d="M20 16 L8 28 L20 40 M36 16 L48 28 L36 40 M31 12 L25 44" {...s} />}
      {kind === "ship" && <path d="M14 42 L42 14 M20 14 H42 V36" {...s} />}
      {kind === "learn" && <path d="M44 28 A16 16 0 1 1 38 15.5 M38 6 V16 H28" {...s} />}
    </svg>
  );
}

function Scene3({ f }: { f: number }) {
  const S = T.s3;
  if (f < S.nodes - 1 || f > S.out + 20) return null;
  const q = progress(f, S.out, 16, easeIn);
  const draw = progress(f, S.ring, 28, easeInOut);
  const r = RING.r * (1 - q);
  const L = S.laps;
  let lap = -1;
  for (let k = 0; k < L.length - 1; k++) if (f >= L[k] && f < L[k + 1]) lap = k + (f - L[k]) / (L[k + 1] - L[k]);
  if (f >= L[L.length - 1]) lap = L.length - 1;
  const pulseOn = lap >= 0 ? (1 - progress(f, L[L.length - 1], 10)) * (1 - q) : 0;
  const ang = ((-90 + 360 * (lap - Math.floor(lap))) * Math.PI) / 180;
  const pt = (a: number, rr = r) => ({ x: RING.cx + rr * Math.cos(a), y: RING.cy + rr * Math.sin(a) });
  const head = pt(ang);
  const trail = Array.from({ length: 12 }, (_, i) => {
    const a0 = ang - ((i + 1) * 5 * Math.PI) / 180;
    const a1 = ang - (i * 5 * Math.PI) / 180;
    const p0 = pt(a0);
    const p1 = pt(a1);
    return { d: `M${p0.x} ${p0.y} A${r} ${r} 0 0 1 ${p1.x} ${p1.y}`, o: 1 - i / 12 };
  });
  return (
    <div style={{ position: "absolute", inset: 0, transform: `translateY(${-(f - S.nodes) * 0.12}px)` }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <circle cx={RING.cx} cy={RING.cy} r={Math.max(0.1, r)} fill="none" stroke={K.lineStrong} strokeWidth={2} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} transform={`rotate(-90 ${RING.cx} ${RING.cy})`} opacity={1 - q} />
        <circle cx={RING.cx} cy={RING.cy} r={Math.max(0.1, r * 0.62)} fill="none" stroke={K.line} strokeWidth={1.5} strokeDasharray="4 10" opacity={draw * (1 - q)} />
        {pulseOn > 0 && (
          <g opacity={pulseOn}>
            {trail.map((t, i) => (
              <path key={i} d={t.d} fill="none" stroke={K.blue} strokeWidth={4} strokeLinecap="round" opacity={t.o * 0.85} />
            ))}
            <circle cx={head.x} cy={head.y} r={18} fill={K.blue} opacity={0.25} />
            <circle cx={head.x} cy={head.y} r={8} fill={K.blue} />
          </g>
        )}
      </svg>
      {NODES.map((n, i) => {
        const p = progress(f, S.nodes + i * 4, 20);
        const a = (n.a * Math.PI) / 180;
        const pos = pt(a, RING.r * mix(0.2, 1, p) * (1 - q));
        const flash = passes(i).reduce((m, at) => Math.max(m, f >= at ? 1 - progress(f, at, 16) : 0), 0);
        const s = mix(0.4, 1, p) * mix(1, 0.2, q) * (1 + 0.06 * flash);
        return (
          <div
            key={n.n}
            style={{
              position: "absolute",
              left: pos.x - NODE / 2,
              top: pos.y - NODE / 2,
              width: NODE,
              height: NODE,
              borderRadius: 32,
              background: K.panel,
              border: `2px solid ${blend(LINE, BLUE, flash)}`,
              boxShadow: `0 0 ${50 * flash}px rgba(47,107,255,${0.5 * flash}), 0 20px 50px rgba(0,0,0,0.6)`,
              transform: `scale(${s})`,
              opacity: p * (1 - q),
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <span style={{ position: "absolute", left: 18, top: 14, fontFamily: MONO, fontSize: 15, color: K.dim }}>{n.n}</span>
            <Glyph kind={n.label} color={blend(INK, BLUE, flash)} />
            <span style={{ fontFamily: MONO, fontSize: 21, color: blend([180, 180, 186, 1], INK, flash), letterSpacing: "0.06em" }}>{n.label}</span>
          </div>
        );
      })}
      <Version f={f} q={q} />
      <div style={{ ...exit(f, S.out - 2, 12) }}>
        <Headline
          f={f}
          size={84}
          style={{ top: 290 }}
          lines={S.lines.map((at, i) => ({
            words: [["One", "idea."], ["One", "product."], ["One", "step", "at", "a", "time."]][i],
            at,
            step: 3,
            color: i < S.lines.length - 1 ? blend(INK, [110, 110, 118, 1], progress(f, S.lines[i + 1], 12)) : undefined,
          }))}
        />
      </div>
    </div>
  );
}

/** O centro do ciclo: a versão sobe a cada volta. */
function Version({ f, q }: { f: number; q: number }) {
  const S = T.s3;
  const at = [S.version, ...S.laps.slice(1)];
  const labels = ["v0.1", "v0.2", "v0.3", "v0.4"];
  const on = progress(f, S.version - 4, 10) * (1 - q);
  if (on <= 0) return null;
  return (
    <div style={{ position: "absolute", left: RING.cx - 150, top: RING.cy - 62, width: 300, height: 124, textAlign: "center", opacity: on, transform: `scale(${1 - q * 0.6})` }}>
      <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: "0.2em", color: K.muted, marginBottom: 6 }}>RELEASE</div>
      <div style={{ position: "relative", height: 76, overflow: "hidden" }}>
        {labels.map((l, i) => {
          const pin = i === 0 ? progress(f, at[0], 10) : progress(f, at[i], 8);
          const pout = i === labels.length - 1 ? 0 : progress(f, at[i + 1], 8);
          if (pin <= 0 || pout >= 1) return null;
          return (
            <div key={l} style={{ position: "absolute", left: 0, right: 0, top: 0, fontFamily: MONO, fontSize: 64, fontWeight: 500, color: K.ink, letterSpacing: "-0.02em", transform: `translateY(${(1 - pin) * 70 - pout * 70}px)`, opacity: pin * (1 - pout) }}>
              {l}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- 4 · o globo */

const DEG = Math.PI / 180;
const TILT = 0.35; // vemos o globo um pouco de cima
const ORIGIN: [number, number] = [-12.97, -38.51]; // Salvador, Bahia: de onde a empresa é construída
const PLACES: [number, number][] = [
  [37.8, -122.4],
  [40.7, -74.0],
  [19.4, -99.1],
  [51.5, -0.1],
  [38.7, -9.1],
  [6.5, 3.4],
  [52.5, 13.4],
  [-33.9, 18.4],
];

type V3 = [number, number, number];
const unit = (lat: number, lon: number): V3 => [Math.cos(lat * DEG) * Math.sin(lon * DEG), Math.sin(lat * DEG), Math.cos(lat * DEG) * Math.cos(lon * DEG)];

/** Gira o vetor para a longitude de vista e inclina; devolve x, y na tela (−1…1) e a profundidade. */
function view([x, y, z]: V3, lon0: number) {
  const c = Math.cos(lon0 * DEG);
  const s = Math.sin(lon0 * DEG);
  const x1 = x * c - z * s;
  const z1 = x * s + z * c;
  const y2 = y * Math.cos(TILT) - z1 * Math.sin(TILT);
  const z2 = y * Math.sin(TILT) + z1 * Math.cos(TILT);
  return { x: x1, y: y2, z: z2, hidden: z2 < 0 && x1 * x1 + y2 * y2 < 1 };
}

function slerp(a: V3, b: V3, t: number): V3 {
  const dot = Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]);
  const w = Math.acos(dot);
  const s = Math.sin(w);
  const k0 = Math.sin((1 - t) * w) / s;
  const k1 = Math.sin(t * w) / s;
  return [a[0] * k0 + b[0] * k1, a[1] * k0 + b[1] * k1, a[2] * k0 + b[2] * k1];
}

function Globe({ f }: { f: number }) {
  const S = T.s4;
  const E = T.end;
  if (f < S.globe - 1 || f > E.collapse + 22) return null;
  const g = progress(f, S.globe, 30, easeOut);
  const c = progress(f, E.collapse, 18, easeIn);
  const R = 360 * mix(0.03, 1, g) * (1 - c);
  const cx = RING.cx;
  const cy = RING.cy;
  const lon0 = -78 + (f - S.globe) * 0.42;
  const scr = (v: { x: number; y: number }) => [cx + R * v.x, cy - R * v.y] as const;

  // meridianos e paralelos, separados entre frente e verso
  let front = "";
  let back = "";
  const seg = (a: V3, b: V3) => {
    const p = view(a, lon0);
    const q = view(b, lon0);
    const [x0, y0] = scr(p);
    const [x1, y1] = scr(q);
    const d = `M${x0.toFixed(1)} ${y0.toFixed(1)}L${x1.toFixed(1)} ${y1.toFixed(1)}`;
    if (p.z + q.z >= 0) front += d;
    else back += d;
  };
  for (let lon = -180; lon < 180; lon += 30) for (let lat = -90; lat < 90; lat += 6) seg(unit(lat, lon), unit(lat + 6, lon));
  for (const lat of [-60, -30, 0, 30, 60]) for (let lon = -180; lon < 180; lon += 6) seg(unit(lat, lon), unit(lat, lon + 6));

  const o = unit(...ORIGIN);
  const ov = view(o, lon0);
  const [ox, oy] = scr(ov);
  const lineOp = g * (1 - c);

  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, transform: `scale(${1 + 0.05 * progress(f, S.globe, 90, easeInOut)})`, transformOrigin: `${cx}px ${cy}px` }}>
      <defs>
        <radialGradient id="globe-fill" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#16161A" />
          <stop offset="100%" stopColor="#060607" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={R} fill="url(#globe-fill)" opacity={lineOp} />
      <path d={back} stroke={K.ink} strokeOpacity={0.06 * lineOp} strokeWidth={1.4} fill="none" />
      <path d={front} stroke={K.ink} strokeOpacity={0.26 * lineOp} strokeWidth={1.6} fill="none" />
      <circle cx={cx} cy={cy} r={R} fill="none" stroke={K.ink} strokeOpacity={0.38 * lineOp} strokeWidth={2} />
      {PLACES.map((pl, i) => {
        const at = S.pings[i];
        const draw = progress(f, at - 14, 14, easeInOut);
        if (draw <= 0) return null;
        const b = unit(...pl);
        const n = 36;
        let d = "";
        for (let k = 0; k <= Math.round(n * draw); k++) {
          const t = k / n;
          const v = slerp(o, b, t);
          const lift = 1 + 0.2 * Math.sin(Math.PI * t);
          const p = view([v[0] * lift, v[1] * lift, v[2] * lift], lon0);
          const [x, y] = scr(p);
          d += `${d && !p.hidden ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
        }
        const tv = view(b, lon0);
        const [tx, ty] = scr(tv);
        const landed = progress(f, at, 6);
        const ring = ((f - at) % 45) / 45;
        const settle = 1 - 0.6 * progress(f, at + 6, 20);
        return (
          <g key={i} opacity={1 - c}>
            <path d={d} fill="none" stroke={K.blue} strokeWidth={2.6} strokeLinecap="round" opacity={0.95 * settle} />
            {landed > 0 && !tv.hidden && (
              <>
                <circle cx={tx} cy={ty} r={6 + 30 * ring} fill="none" stroke={K.blue} strokeWidth={2} opacity={(1 - ring) * 0.7} />
                <circle cx={tx} cy={ty} r={6 * landed} fill={K.blue} />
                <circle cx={tx} cy={ty} r={16 * landed} fill={K.blue} opacity={0.2} />
              </>
            )}
          </g>
        );
      })}
      {!ov.hidden && (
        <g opacity={progress(f, S.globe + 16, 10) * (1 - c)}>
          <circle cx={ox} cy={oy} r={14} fill="none" stroke={K.ink} strokeWidth={2} opacity={0.6} />
          <circle cx={ox} cy={oy} r={6} fill={K.ink} />
        </g>
      )}
    </svg>
  );
}

function Scene4Text({ f }: { f: number }) {
  const S = T.s4;
  if (f < S.lines[0] - 1 || f > S.out + 14) return null;
  return (
    <div style={{ ...exit(f, S.out, 12) }}>
      <Headline
        f={f}
        size={100}
        style={{ top: 300 }}
        lines={[
          { words: ["Building", "for", "a"], at: S.lines[0], step: 3 },
          { words: ["global", "audience."], at: S.lines[1], step: 5 },
        ]}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- o ponto azul que liga as cenas, e a assinatura */

/** O ponto: nasce do ciclo que fecha, vira o globo, volta a ser ponto e se abre na linha da assinatura. */
function Core({ f }: { f: number }) {
  const E = T.end;
  const a = progress(f, T.s3.out + 10, 6) * (1 - progress(f, T.s4.globe + 4, 10));
  const b = progress(f, E.collapse + 10, 6);
  const on = Math.max(a, b);
  if (on <= 0) return null;
  const open = progress(f, E.rule, 22, easeInOut);
  const w = mix(18, 640, open);
  const h = mix(18, 2, progress(f, E.rule, 10, easeOut));
  const cool = progress(f, E.rule + 18, 24);
  return (
    <div
      style={{
        position: "absolute",
        left: RING.cx - w / 2,
        top: RING.cy - h / 2,
        width: w,
        height: h,
        borderRadius: h / 2,
        background: blend(BLUE, [237, 236, 231, 0.22], cool),
        boxShadow: `0 0 ${36 * (1 - cool)}px ${K.blueGlow}`,
        opacity: on,
      }}
    />
  );
}

const SUB = "Building in public. Building for the world.";

function Signature({ f, handle }: { f: number; handle: string }) {
  const E = T.end;
  if (f < E.title[0] - 1) return null;
  const typed = Math.max(0, Math.min(SUB.length, Math.floor((f - E.sub) * 1.5)));
  const done = typed >= SUB.length;
  const line = (text: ReactNode, at: number) => {
    const p = progress(f, at, 18);
    const track = mix(0.08, -0.035, progress(f, at, 34, easeOut));
    return (
      <div style={{ overflow: "hidden", padding: "0.04em 0 0.02em" }}>
        <div style={{ transform: `translateY(${(1 - p) * 100}%)`, letterSpacing: `${track}em`, filter: p < 1 ? `blur(${(1 - p) * 8}px)` : undefined }}>{text}</div>
      </div>
    );
  };
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: H - RING.cy + 54, textAlign: "center", fontFamily: SANS, fontWeight: 800, fontSize: 156, lineHeight: 0.94, color: K.ink }}>
        {line("BUILD IN", E.title[0])}
        {line(
          <>
            PUBLIC<span style={{ color: K.blue, textShadow: `0 0 30px ${K.blueGlow}` }}>.</span>
          </>,
          E.title[1],
        )}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: RING.cy + 46, textAlign: "center", fontFamily: MONO, fontSize: 29, color: K.soft, letterSpacing: "0.01em", whiteSpace: "pre" }}>
        {SUB.slice(0, typed)}
        {f >= E.sub - 4 && <Caret f={f} solid={!done} w={14} h={30} style={{ marginLeft: 6, marginRight: -20, verticalAlign: "-4px" }} />}
        <span style={{ color: "transparent" }}>{SUB.slice(typed)}</span>
      </div>
      {handle && (
        <div style={{ position: "absolute", left: 0, right: 0, top: RING.cy + 150, textAlign: "center", fontFamily: MONO, fontSize: 26, color: K.muted, letterSpacing: "0.08em", opacity: progress(f, E.sub + 30, 12) }}>{handle}</div>
      )}
    </>
  );
}

/* ---------------------------------------------------------------- a composição */

export function Founder({ sound = true, handle = "" }: { sound?: boolean; handle?: string }) {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: K.black, fontFamily: SANS, color: K.ink, overflow: "hidden" }}>
      {sound && <Audio src={staticFile("soundtrack-founder.wav")} />}
      <Backdrop f={f} />
      <Hud f={f} />
      <Scene1 f={f} />
      <Window f={f} />
      <Scene2 f={f} />
      <Scene3 f={f} />
      <Globe f={f} />
      <Scene4Text f={f} />
      <Core f={f} />
      <Signature f={f} handle={handle} />
    </AbsoluteFill>
  );
}
