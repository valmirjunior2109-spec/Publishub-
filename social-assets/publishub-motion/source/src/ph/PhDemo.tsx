import type { CSSProperties } from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame } from "remotion";
import { easeIn, easeInOut, easeOut, mix, progress } from "../anim";
import { FONT } from "../theme";
import { Lockup } from "./Logo";
import R from "./rects.json";
import T from "./timeline.json";

/* ==========================================================================
   Demo para o Product Hunt (16:9, 37 s), em ritmo de vídeo de lançamento:
   a janela entra em 3D, a câmera segue o cursor e aproxima onde ele clica,
   títulos de cada passo passam sobre a janela desfocada, e os resultados
   saltam para fora da tela (o 0:04, o contador 0:41 → 0:32).
   Cada tela é captura da interface real em desktop (scripts/ph/capture.mjs),
   com a análise de exemplo. O movimento é rápido nas passagens e a câmera fica
   parada enquanto se lê: o texto não treme.
   ========================================================================== */

const C = { paper: "#F6F0E4", raised: "#FFFDF8", ink: "#1E1B18", muted: "#5C544B", line: "#E4D6C1", accent: "#1F47A6", caramel: "#9A5D31" };
const WIN = { x: 240, y: 96, w: 1440, h: 900, bar: 44 };
const PAGE_W = 1440;
const HEIGHTS: Record<string, number> = {
  upload_empty: 900, upload_file: 900,
  processing_received: 900, processing_transcribing: 900, processing_aligning: 900, processing_diagnosing: 900,
  result_pending: 2967, result_accepted: 3002, result_done: 2557, result_plan: 4003,
};
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const center = (r: { x: number; y: number; w: number; h: number }) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
const U = T.upload;
const K = T.cuts;
const IL = T.interludes;
const [, I2, I3, I4, I5] = IL;

const drop = center(R.dropzone);
const analyze = center(R.analyze);
const accept = center(R.acceptAll);
const apply = center(R.applyAccepted);
const COL = PAGE_W; // encostada à direita: só a coluna da análise, sem a do vídeo
const ZC = 1.6;
const TOPY = 112 + 450 / ZC; // o quadro começa logo abaixo do cabeçalho da página

/* ---------- o que a janela mostra, quadro a quadro ---------- */

function pageAt(f: number): string {
  if (f < I2.swap!) return f < U.drop + 2 ? "upload_empty" : "upload_file";
  if (f < I3.swap!) {
    const s = T.processing.steps;
    return f < s[0] ? "processing_received" : f < s[1] ? "processing_transcribing" : f < s[2] ? "processing_aligning" : "processing_diagnosing";
  }
  if (f < I4.swap!) return "result_pending";
  if (f < K.ready) return f < K.acceptAll + 2 ? "result_pending" : "result_accepted";
  if (f < I5.swap!) return "result_done";
  return "result_plan";
}

// [quadro, cx, cy, zoom] em px css da página; entre dois iguais a câmera fica parada
const CAM: [number, number, number, number][] = [
  [0, 720, 450, 1], [U.cursorIn, 720, 450, 1], [U.zoom + 12, drop.x, 300, 1.7], [U.toAnalyze, drop.x, 300, 1.7], [U.click - 8, 930, 420, 1.7], [U.zoomOut, 930, 420, 1.7], [U.zoomOut + 14, 720, 450, 1.15],
  [I2.swap! - 1, 720, 450, 1.15], [I2.swap!, COL, TOPY, ZC],
  [I3.swap! - 1, COL, TOPY, ZC], [I3.swap!, COL, TOPY, ZC],
  [I4.swap! - 1, COL, TOPY, ZC], [I4.swap!, COL, 760, ZC], [K.zoom, COL, 760, ZC], [K.zoom + 22, 1150, 800, 2.1], [K.zoomOut, 1150, 800, 2.1], [K.zoomOut + 14, COL, 760, ZC],
  [K.toApply, COL, 760, ZC], [K.applyZoom, COL, 1250, ZC], [K.applyZoom + 16, 1190, 1395, 2.1], [K.ready - 1, 1190, 1395, 2.1], [K.ready, COL, R.ready.y + 175, 2.2],
  [I5.swap! - 1, COL, R.ready.y + 175, 2.2], [I5.swap!, COL, 1720, ZC], [T.plan.pan, COL, 1720, ZC], [T.plan.pan + 14, COL, 2150, ZC], [T.durationInFrames, COL, 2150, ZC],
];

function camAt(f: number) {
  let i = 0;
  while (i < CAM.length - 1 && f >= CAM[i + 1][0]) i++;
  const a = CAM[i];
  const b = CAM[Math.min(i + 1, CAM.length - 1)];
  const t = b[0] > a[0] ? easeInOut(clamp01((f - a[0]) / (b[0] - a[0]))) : 0;
  const z = mix(a[3], b[3], t);
  const page = pageAt(f);
  const halfW = WIN.w / 2 / z;
  const halfH = WIN.h / 2 / z;
  const h = HEIGHTS[page];
  return { z, cx: clamp(mix(a[1], b[1], t), halfW, PAGE_W - halfW), cy: h <= halfH * 2 ? h / 2 : clamp(mix(a[2], b[2], t), halfH, h - halfH), page };
}

// o cursor, em px css da página; fora destes trechos ele não aparece
const CURSOR: [number, number, number][][] = [
  [[U.cursorIn, 1180, 780], [U.zoom + 12, drop.x, drop.y], [U.toAnalyze, drop.x, drop.y], [U.click - 6, analyze.x, analyze.y], [I2.from, analyze.x, analyze.y]],
  [[I4.to, 1330, 1010], [K.acceptAll - 6, accept.x, accept.y], [K.toApply, accept.x, accept.y], [K.apply - 6, apply.x, apply.y], [K.ready, apply.x, apply.y]],
  [[T.plan.cursorIn, 1300, 1900], [T.plan.pan - 4, 760, 1640], [T.plan.pan + 18, 760, 2060], [T.window.out, 760, 2060]],
];
const CLICKS = [U.drop, U.click, K.acceptAll, K.apply];

function cursorAt(f: number): { x: number; y: number } | null {
  for (const path of CURSOR) {
    if (f < path[0][0] || f > path[path.length - 1][0]) continue;
    let i = 0;
    while (i < path.length - 1 && f >= path[i + 1][0]) i++;
    const a = path[i];
    const b = path[Math.min(i + 1, path.length - 1)];
    const t = b[0] > a[0] ? easeInOut(clamp01((f - a[0]) / (b[0] - a[0]))) : 0;
    return { x: mix(a[1], b[1], t), y: mix(a[2], b[2], t) };
  }
  return null;
}

/* ---------- peças ---------- */

function Cursor({ x, y, f, clicks }: { x: number; y: number; f: number; clicks: number[] }) {
  const last = clicks.filter((c) => f >= c).pop();
  const since = last === undefined ? 99 : f - last;
  return (
    <div style={{ position: "absolute", left: x, top: y, pointerEvents: "none" }}>
      {since < 16 && <div style={{ position: "absolute", left: -32, top: -32, width: 64, height: 64, borderRadius: 99, background: "rgba(31,71,166,0.18)", border: `3px solid ${C.accent}`, opacity: 1 - since / 16, transform: `scale(${0.4 + since / 12})` }} />}
      <svg width={34} height={40} viewBox="0 0 30 36" style={{ position: "absolute", left: -4, top: -3, transform: `scale(${since < 5 ? 0.85 : 1})`, transformOrigin: "4px 3px", filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.3))" }}>
        <path d="M3 2 L3 28 L10 21.5 L14.5 32 L19 30 L14.6 19.8 L24 19.8 Z" fill="#111" stroke="#fff" strokeWidth={2.2} strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/** Palavras que sobem de dentro de uma máscara, uma depois da outra; saem subindo. */
function Kinetic({ text, f, from, to, size, color = C.ink, weight = 800, accent }: { text: string; f: number; from: number; to: number; size: number; color?: string; weight?: number; accent?: string }) {
  if (f < from || f > to) return null;
  const words = text.split(" ");
  const out = progress(f, to - 8, 8, easeIn);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `0 ${size * 0.26}px`, fontFamily: FONT.sans, fontSize: size, fontWeight: weight, letterSpacing: "-0.045em", lineHeight: 1.05 }}>
      {words.map((w, i) => {
        const p = progress(f, from + i * 3, 10, easeOut);
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", paddingBottom: size * 0.12 }}>
            <span style={{ display: "inline-block", color: accent && w === accent ? C.accent : color, transform: `translateY(${(1 - p) * 110 - out * 110}%)` }}>{w}</span>
          </span>
        );
      })}
    </div>
  );
}

/** Um recorte da página real, solto em cima da janela. */
function Crop({ page, x, y, w, h, scale }: { page: string; x: number; y: number; w: number; h: number; scale: number }) {
  return (
    <div style={{ width: w * scale, height: h * scale, overflow: "hidden", position: "relative", borderRadius: 22, background: C.raised }}>
      <Img src={staticFile(`ph/${page}.png`)} style={{ position: "absolute", left: -x * scale, top: -y * scale, width: PAGE_W * scale, height: HEIGHTS[page] * scale }} />
    </div>
  );
}

const pop = (f: number, at: number) => {
  const p = progress(f, at, 12, easeOut);
  return { p, s: 0.86 + 0.14 * p + Math.sin(clamp01((f - at) / 12) * Math.PI) * 0.04 };
};

/* ---------- a janela ---------- */

function Window({ f }: { f: number }) {
  if (f < T.window.in || f > T.window.out + 16) return null;
  const cam = camAt(f);
  const prev = camAt(f - 1);
  const speed = Math.hypot((cam.cx - prev.cx) * cam.z, (cam.cy - prev.cy) * cam.z) + Math.abs(cam.z - prev.z) * 700;
  const moving = speed > 0.5;
  const motionBlur = Math.min(5, speed / 22);
  const tx = WIN.w / 2 - cam.cx * cam.z;
  const ty = WIN.h / 2 - cam.cy * cam.z;

  // a entrada e a saída em 3D
  const enter = progress(f, T.window.in, 22, easeOut);
  const exit = progress(f, T.window.out, 16, easeIn);
  // os títulos dos passos: a janela desfoca e recua
  const il = IL.find((s) => f >= s.from && f <= s.to);
  const inter = il ? Math.min(progress(f, il.from, 8, easeOut), 1 - progress(f, il.to - 8, 8, easeIn)) : 0;
  // os destaques que saltam: a janela escurece um pouco
  const callout = Math.max(
    Math.min(progress(f, T.result.callout, 10), 1 - progress(f, T.result.calloutOut, 10)),
    f >= K.counter ? Math.min(progress(f, K.counter, 10), 1 - progress(f, I5.from, 8)) : 0,
  );
  const flash = f >= K.flash && f < K.flash + 10 ? 1 - (f - K.flash) / 10 : 0;
  const cursor = cursorAt(f);
  const example = f >= I3.swap! && !il;

  const style: CSSProperties = {
    position: "absolute", left: WIN.x, top: WIN.y, width: WIN.w, height: WIN.h + WIN.bar, borderRadius: 20, overflow: "hidden",
    background: C.raised, border: `1.5px solid ${C.line}`,
    boxShadow: `0 ${50 - inter * 20}px 110px rgba(60,40,20,0.22), 0 8px 22px rgba(60,40,20,0.10)`,
    opacity: enter * (1 - exit),
    transform: `translateY(${(1 - enter) * 140 - exit * 60}px) rotateX(${(1 - enter) * 26 - exit * 16}deg) scale(${(0.88 + 0.12 * enter) * (1 - 0.07 * inter) * (1 - 0.08 * exit)})`,
    transformOrigin: "50% 100%",
    filter: inter > 0.01 ? `blur(${inter * 14}px)` : undefined,
  };

  return (
    <>
      <div style={{ position: "absolute", inset: 0, perspective: 2200 }}>
        <div style={style}>
          <div style={{ height: WIN.bar, display: "flex", alignItems: "center", gap: 9, padding: "0 18px", borderBottom: `1.5px solid ${C.line}` }}>
            {[0, 1, 2].map((i) => <span key={i} style={{ width: 12, height: 12, borderRadius: 99, background: C.line }} />)}
            <div style={{ margin: "0 auto", padding: "5px 22px", borderRadius: 999, background: C.paper, fontFamily: FONT.mono, fontSize: 16, color: C.muted }}>
              {f < I2.swap! ? "getpublishub.com/new-analysis" : "getpublishub.com/results"}
            </div>
            <div style={{ width: 54 }} />
          </div>
          <div style={{ position: "relative", width: WIN.w, height: WIN.h, overflow: "hidden", background: C.paper }}>
            <div style={{ position: "absolute", left: 0, top: 0, width: PAGE_W, height: HEIGHTS[cam.page], transformOrigin: "0 0", transform: `translate(${moving ? tx : Math.round(tx)}px, ${moving ? ty : Math.round(ty)}px) scale(${cam.z})`, filter: motionBlur > 0.4 ? `blur(${motionBlur}px)` : undefined }}>
              <Img src={staticFile(`ph/${cam.page}.png`)} style={{ width: PAGE_W, height: HEIGHTS[cam.page], display: "block" }} />
            </div>
            {cursor && !il && <Cursor x={WIN.w / 2 + (cursor.x - cam.cx) * cam.z} y={WIN.h / 2 + (cursor.y - cam.cy) * cam.z} f={f} clicks={CLICKS} />}
            {example && <div style={{ position: "absolute", right: 18, top: 16, fontFamily: FONT.mono, fontSize: 15, letterSpacing: "0.08em", color: C.muted, background: "rgba(255,253,248,0.92)", border: `1.5px solid ${C.line}`, borderRadius: 999, padding: "5px 14px" }}>EXAMPLE ANALYSIS</div>}
            <AbsoluteFill style={{ background: C.ink, opacity: callout * 0.28 }} />
            <AbsoluteFill style={{ background: "#fff", opacity: flash * 0.9 }} />
          </div>
        </div>
      </div>
      <Captions f={f} />
      <Callouts f={f} />
      {il && (
        <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26 }}>
          <div style={{ opacity: inter, fontFamily: FONT.mono, fontSize: 28, letterSpacing: "0.18em", textTransform: "uppercase", color: C.caramel }}>{il.kicker}</div>
          <Kinetic text={il.title} f={f} from={il.from + 4} to={il.to} size={112} />
        </AbsoluteFill>
      )}
    </>
  );
}

const CAPTIONS: [number, number, string][] = [
  [U.cursorIn + 6, I2.from, "Drop the video: MP4, MOV or WEBM, up to 500 MB."],
  [I2.to, I3.from, "It transcribes the speech, reads the retention curve and lines them up."],
  [I3.to, T.result.callout, "The second viewers leave, and the line you were saying."],
  [T.result.calloutOut + 6, I4.from, "Why it happens, and what to say instead."],
  [I4.to, K.toApply, "It finds the dead moments. You decide what goes."],
  [K.toApply, K.ready, "Apply the cuts you accepted."],
  [I5.to, T.window.out, "Ordered by what moves retention most."],
];

function Captions({ f }: { f: number }) {
  const cap = CAPTIONS.find(([a, b]) => f >= a && f < b);
  if (!cap) return null;
  const p = progress(f, cap[0], 8, easeOut);
  const q = 1 - progress(f, cap[1] - 6, 6);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: WIN.y + WIN.bar + WIN.h - 96, display: "flex", justifyContent: "center", opacity: Math.min(p, q), transform: `translateY(${(1 - p) * 16}px)` }}>
      <div style={{ background: "rgba(30,27,24,0.92)", color: "#FBF3E6", fontFamily: FONT.sans, fontSize: 30, fontWeight: 500, letterSpacing: "-0.01em", padding: "15px 30px", borderRadius: 999, boxShadow: "0 12px 30px rgba(0,0,0,0.2)" }}>{cap[2]}</div>
    </div>
  );
}

function Callouts({ f }: { f: number }) {
  const out = [];
  // o 0:04 e a frase saltam da tela
  if (f >= T.result.callout && f < T.result.calloutOut + 10) {
    const { p, s } = pop(f, T.result.callout);
    const leave = progress(f, T.result.calloutOut, 10, easeIn);
    out.push(
      <div key="drop" style={{ position: "absolute", left: 960 - (852 * 1.5) / 2, top: 360, opacity: p * (1 - leave), transform: `translateY(${(1 - p) * 60 - leave * 40}px) rotate(-1.2deg) scale(${s * (1 - leave * 0.06)})`, filter: "drop-shadow(0 40px 60px rgba(30,20,10,0.35))" }}>
        <Crop page="result_pending" x={552} y={117} w={852} h={176} scale={1.5} />
      </div>,
    );
  }
  // o contador do vídeo editado: 0:41 → 0:32
  if (f >= K.counter && f < I5.from + 8) {
    const { p, s } = pop(f, K.counter);
    const leave = progress(f, I5.from, 8, easeIn);
    const secs = Math.round(mix(41, 32, easeOut(clamp01((f - K.counter - 8) / 24))));
    out.push(
      <div key="counter" style={{ position: "absolute", left: 1060, top: 520, width: 640, padding: "34px 40px", borderRadius: 26, background: C.raised, border: `1.5px solid ${C.line}`, boxShadow: "0 40px 80px rgba(30,20,10,0.28)", opacity: p * (1 - leave), transform: `translateY(${(1 - p) * 60}px) rotate(1.5deg) scale(${s})` }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 20, letterSpacing: "0.14em", color: C.caramel }}>EDITED VIDEO READY</div>
        <div style={{ marginTop: 14, display: "flex", alignItems: "baseline", gap: 22, fontFamily: FONT.sans, fontWeight: 800, letterSpacing: "-0.05em", fontVariantNumeric: "tabular-nums" }}>
          <span style={{ fontSize: 92, color: C.muted, textDecoration: "line-through", textDecorationThickness: 5 }}>0:41</span>
          <span style={{ fontSize: 64, color: C.muted }}>→</span>
          <span style={{ fontSize: 120, color: C.accent }}>0:{String(secs).padStart(2, "0")}</span>
        </div>
        <div style={{ marginTop: 8, fontFamily: FONT.sans, fontSize: 28, color: C.muted, fontWeight: 500 }}>9.3 s of dead moments out · original untouched</div>
      </div>,
    );
  }
  return <>{out}</>;
}

/* ---------- fundo, abertura, resumo e CTA ---------- */

function Background({ f }: { f: number }) {
  const blob = (x: number, y: number, r: number, color: string): CSSProperties => ({ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: "50%", background: `radial-gradient(circle, ${color} 0%, transparent 68%)` });
  return (
    <AbsoluteFill style={{ background: C.paper, overflow: "hidden" }}>
      <div style={blob(260 + Math.sin(f / 70) * 120, 180 + Math.cos(f / 90) * 60, 620, "rgba(201,130,74,0.22)")} />
      <div style={blob(1660 + Math.cos(f / 80) * 120, 900 + Math.sin(f / 60) * 70, 680, "rgba(31,71,166,0.13)")} />
      <div style={blob(1500 + Math.sin(f / 100) * 90, 140, 420, "rgba(201,130,74,0.12)")} />
    </AbsoluteFill>
  );
}

function Intro({ f }: { f: number }) {
  if (f > T.intro.out + 2) return null;
  const { p, s } = pop(f, T.intro.logo);
  const leave = progress(f, T.intro.out - 8, 10, easeIn);
  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 46, opacity: 1 - leave, transform: `scale(${1 + leave * 0.15})` }}>
      <div style={{ opacity: p, transform: `scale(${s * 1.15})` }}>
        <Lockup size={92} id="ph-intro" />
      </div>
      <Kinetic text="Your AI editing copilot." f={f} from={T.intro.tagline} to={T.intro.out + 4} size={84} accent="copilot." />
    </AbsoluteFill>
  );
}

function Recap({ f }: { f: number }) {
  const R0 = T.recap;
  if (f < R0.start || f > R0.out) return null;
  const leave = progress(f, R0.out - 8, 8, easeIn);
  const facts = ["Works with CapCut, Premiere Pro and DaVinci Resolve", "Nothing is cut until you approve it", "Available in 11 languages"];
  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 48, opacity: 1 - leave }}>
      <Kinetic text="You stay the editor." f={f} from={R0.start} to={R0.out + 8} size={96} accent="editor." />
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {facts.map((t, i) => {
          const p = progress(f, R0.start + 14 + i * 8, 12, easeOut);
          return (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 20, opacity: p, transform: `translateX(${(1 - p) * -60}px)`, fontFamily: FONT.sans, fontSize: 36, fontWeight: 500, color: C.ink, letterSpacing: "-0.015em" }}>
              <span style={{ width: 40, height: 40, borderRadius: 99, background: C.accent, color: "#fff", display: "grid", placeItems: "center", fontSize: 22, fontWeight: 700, transform: `scale(${0.6 + 0.4 * p})` }}>✓</span>
              {t}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

function End({ f }: { f: number }) {
  const E = T.end;
  if (f < E.start) return null;
  const logo = pop(f, E.start);
  const cta = pop(f, E.cta);
  const pressed = f >= E.click && f < E.click + 6;
  const cursorP = easeInOut(clamp01((f - E.cursor) / (E.click - 6 - E.cursor)));
  const btn = { x: 960, y: 640 };
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: 300, display: "flex", justifyContent: "center", opacity: logo.p, transform: `scale(${logo.s})` }}>
        <Lockup size={100} id="ph-end" />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 450 }}>
        <Kinetic text="See where your edit loses viewers." f={f} from={E.start + 6} to={T.durationInFrames + 20} size={58} weight={700} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: btn.y - 52, display: "flex", justifyContent: "center", opacity: cta.p, transform: `scale(${cta.s * (pressed ? 0.95 : 1)})` }}>
        <div style={{ background: C.accent, color: "#fff", fontFamily: FONT.sans, fontSize: 46, fontWeight: 600, letterSpacing: "-0.02em", padding: "28px 58px", borderRadius: 999, boxShadow: "0 18px 40px rgba(31,71,166,0.3)" }}>Analyze your video free →</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 790, textAlign: "center", opacity: progress(f, E.url, 10), fontFamily: FONT.mono, fontSize: 46, color: C.ink }}>getpublishub.com</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 860, textAlign: "center", opacity: progress(f, E.url, 10), fontFamily: FONT.sans, fontSize: 28, color: C.muted }}>No account · No card · Results in ~3 min</div>
      {f >= E.cursor && <Cursor x={mix(1500, btn.x + 120, cursorP)} y={mix(980, btn.y, cursorP)} f={f} clicks={[E.click]} />}
    </AbsoluteFill>
  );
}

export function PhDemo({ sound = true }: { sound?: boolean }) {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      {sound && <Audio src={staticFile("ph/soundtrack.wav")} />}
      <Background f={f} />
      <Intro f={f} />
      <Window f={f} />
      <Recap f={f} />
      <End f={f} />
    </AbsoluteFill>
  );
}

export const PH_FPS = T.fps;
export const PH_FRAMES = T.durationInFrames;
