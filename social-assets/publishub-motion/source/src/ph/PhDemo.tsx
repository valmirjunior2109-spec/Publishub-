import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame } from "remotion";
import { easeInOut, easeOut, mix, progress } from "../anim";
import { FONT } from "../theme";
import { Lockup } from "./Logo";
import R from "./rects.json";
import T from "./timeline.json";

/* ==========================================================================
   Demo para o Product Hunt (16:9, 40 s): o produto de verdade, numa janela.
   Cada tela é captura da interface real (desktop 1440×900, DSF 2, tema claro;
   scripts/ph/capture.mjs), com a análise de exemplo da landing. A janela mostra
   a página em 1:1 (1 px css = 1 px do vídeo); a câmera só aproxima e anda entre
   os pontos e fica parada enquanto se lê, para o texto não tremer.
   ========================================================================== */

const C = { paper: "#F6F0E4", raised: "#FFFDF8", ink: "#1E1B18", muted: "#5C544B", line: "#E4D6C1", accent: "#1F47A6", caramel: "#9A5D31" };
const WIN = { x: 240, y: 112, w: 1440, h: 900, bar: 44 };
const PAGE_W = 1440;
const HEIGHTS: Record<string, number> = {
  upload_empty: 900, upload_file: 900,
  processing_received: 900, processing_transcribing: 900, processing_aligning: 900, processing_diagnosing: 900,
  result_pending: 2967, result_accepted: 3002, result_done: 2557, result_plan: 4003,
};

const center = (r: { x: number; y: number; w: number; h: number }) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
// a coluna da análise, sem a coluna do vídeo à esquerda: zoom 1,6 com a câmera encostada à direita
const ZC = 1.6;
const COL = PAGE_W;
// o topo do quadro logo abaixo do cabeçalho da página (nome do arquivo e status), que a coluna cortaria pela metade
const TOP = (y: number) => Math.max(y, 112 + 450 / ZC);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

type Cam = { f: number; cx: number; cy: number; z: number };
type Point = { f: number; x: number; y: number };
interface Shot {
  from: number;
  to: number;
  url: string;
  image: (f: number) => string;
  cam: Cam[];
  cursor?: Point[];
  clicks?: number[];
  captions?: [number, number, string][];
  example?: boolean;
  /** O passo do "como funciona", em cima da janela. */
  step: (f: number) => [string, string];
}

const drop = center(R.dropzone);
const analyze = center(R.analyze);
const accept = center(R.acceptAll);
const apply = center(R.applyAccepted);

const SHOTS: Shot[] = [
  {
    from: T.upload.start, to: T.upload.out, url: "getpublishub.com/new-analysis",
    image: (f) => (f < T.upload.drop + 2 ? "upload_empty" : "upload_file"),
    cam: [{ f: 0, cx: 820, cy: 386, z: 1.38 }],
    step: () => ["Step 1 of 5", "Upload your cut"],
    cursor: [{ f: T.upload.start, x: 960, y: 640 }, { f: T.upload.drop - 4, x: drop.x, y: drop.y }, { f: T.upload.drop + 6, x: drop.x, y: drop.y }, { f: T.upload.click - 6, x: analyze.x, y: analyze.y }],
    clicks: [T.upload.drop, T.upload.click],
    captions: [[T.upload.start + 6, T.upload.out, "Drop the video: MP4, MOV or WEBM, up to 500 MB."]],
  },
  {
    from: T.processing.start, to: T.processing.out, url: "getpublishub.com/results",
    image: (f) => (f < T.processing.steps[0] ? "processing_received" : f < T.processing.steps[1] ? "processing_transcribing" : f < T.processing.steps[2] ? "processing_aligning" : "processing_diagnosing"),
    cam: [{ f: 0, cx: COL, cy: TOP(center(R.steps).y), z: ZC }],
    step: () => ["Step 2 of 5", "Publishub analyzes it, in about 3 minutes"],
    captions: [[T.processing.start + 6, T.processing.out, "It transcribes the speech, reads the retention curve and lines them up."]],
  },
  {
    from: T.result.start, to: T.result.out, url: "getpublishub.com/results",
    image: () => "result_pending",
    cam: [{ f: 0, cx: COL, cy: TOP(center(R.drop).y), z: ZC }],
    step: () => ["Step 3 of 5", "See the second viewers leave"],
    captions: [
      [T.result.start + 8, T.result.caption2, "The exact second viewers leave, and the line you were saying."],
      [T.result.caption2, T.result.out, "Why it happens, and what to say instead."],
    ],
    example: true,
  },
  {
    from: T.cuts.start, to: T.cuts.out, url: "getpublishub.com/results",
    image: (f) => (f < T.cuts.acceptAll + 2 ? "result_pending" : f < T.cuts.ready ? "result_accepted" : "result_done"),
    cam: [
      { f: T.cuts.start, cx: COL, cy: TOP(center(R.drop).y), z: ZC },
      { f: T.cuts.start + 14, cx: COL, cy: 760, z: ZC },
      { f: T.cuts.toApply, cx: COL, cy: 760, z: ZC },
      { f: T.cuts.toApply + 14, cx: COL, cy: 1250, z: ZC },
      { f: T.cuts.ready - 1, cx: COL, cy: 1250, z: ZC },
      // o vídeo pronto: só o texto do resultado (a prévia, nesta simulação local, é uma caixa sem vídeo)
      { f: T.cuts.ready, cx: 1440, cy: R.ready.y + 175, z: 2.2 },
    ],
    cursor: [{ f: T.cuts.start + 14, x: 1320, y: 1010 }, { f: T.cuts.acceptAll - 6, x: accept.x, y: accept.y }, { f: T.cuts.toApply + 14, x: accept.x, y: accept.y + 120 }, { f: T.cuts.apply - 6, x: apply.x, y: apply.y }],
    clicks: [T.cuts.acceptAll, T.cuts.apply],
    step: (f) => (f < T.cuts.ready ? ["Step 4 of 5", "Review the suggested cuts"] : ["Step 5 of 5", "Download the edited video"]),
    captions: [
      [T.cuts.start + 14, T.cuts.toApply, "It finds the dead moments. You decide what goes."],
      [T.cuts.toApply, T.cuts.ready, "Apply the cuts you accepted."],
      [T.cuts.ready, T.cuts.out, "The edited video is ready: 0:41 → 0:32. Your original stays untouched."],
    ],
    example: true,
  },
  {
    from: T.plan.start, to: T.plan.out, url: "getpublishub.com/results",
    image: () => "result_plan",
    cam: [{ f: 0, cx: COL, cy: 1720, z: ZC }],
    cursor: [{ f: T.plan.start, x: 980, y: 1720 }, { f: T.plan.click - 6, x: R.tabs.x + 133, y: R.tabs.y + R.tabs.h / 2 }],
    clicks: [T.plan.click],
    step: () => ["Plus", "A fix plan for everything else"],
    captions: [[T.plan.start + 6, T.plan.out, "Plus a fix plan ordered by impact: hook, cuts, pacing, captions."]],
    example: true,
  },
];

/** A câmera do quadro f: entre dois pontos anda com easing; fora deles fica parada. Presa dentro da página. */
function camAt(shot: Shot, f: number, page: string) {
  const keys = shot.cam;
  let a = keys[0];
  let b = keys[0];
  for (let i = 0; i < keys.length; i++) {
    if (f >= keys[i].f) {
      a = keys[i];
      b = keys[i + 1] ?? keys[i];
    }
  }
  const t = b.f > a.f ? easeInOut(clamp((f - a.f) / (b.f - a.f), 0, 1)) : 0;
  const z = mix(a.z, b.z, t);
  const halfW = WIN.w / 2 / z;
  const halfH = WIN.h / 2 / z;
  const height = HEIGHTS[page];
  return {
    z,
    cx: clamp(mix(a.cx, b.cx, t), halfW, PAGE_W - halfW),
    cy: height <= halfH * 2 ? height / 2 : clamp(mix(a.cy, b.cy, t), halfH, height - halfH),
  };
}

function cursorAt(shot: Shot, f: number): { x: number; y: number } | null {
  const path = shot.cursor;
  if (!path || f < path[0].f) return null;
  let a = path[0];
  let b = path[0];
  for (let i = 0; i < path.length; i++) {
    if (f >= path[i].f) {
      a = path[i];
      b = path[i + 1] ?? path[i];
    }
  }
  const t = b.f > a.f ? easeInOut(clamp((f - a.f) / (b.f - a.f), 0, 1)) : 0;
  return { x: mix(a.x, b.x, t), y: mix(a.y, b.y, t) };
}

function Page({ shot, f }: { shot: Shot; f: number }) {
  const page = shot.image(f);
  const cam = camAt(shot, f, page);
  // inteiro enquanto parada: nada de meio pixel no texto
  const tx = WIN.w / 2 - cam.cx * cam.z;
  const ty = WIN.h / 2 - cam.cy * cam.z;
  const still = cam.z === Math.round(cam.z * 100) / 100;
  const cursor = cursorAt(shot, f);
  const lastClick = (shot.clicks ?? []).filter((c) => f >= c).pop();
  const pressed = lastClick !== undefined && f - lastClick < 5;
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: C.paper }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: PAGE_W, height: HEIGHTS[page], transformOrigin: "0 0", transform: `translate(${still ? Math.round(tx) : tx}px, ${still ? Math.round(ty) : ty}px) scale(${cam.z})` }}>
        <Img src={staticFile(`ph/${page}.png`)} style={{ width: PAGE_W, height: HEIGHTS[page], display: "block" }} />
      </div>
      {cursor && (
        <div style={{ position: "absolute", left: WIN.w / 2 + (cursor.x - cam.cx) * cam.z, top: WIN.h / 2 + (cursor.y - cam.cy) * cam.z }}>
          {lastClick !== undefined && f - lastClick < 14 && (
            <div style={{ position: "absolute", left: -26, top: -26, width: 52, height: 52, borderRadius: 99, border: `3px solid ${C.accent}`, opacity: 1 - (f - lastClick) / 14, transform: `scale(${0.5 + (f - lastClick) / 14})` }} />
          )}
          <svg width={30} height={36} viewBox="0 0 30 36" style={{ position: "absolute", left: -3, top: -2, transform: `scale(${pressed ? 0.88 : 1})`, transformOrigin: "3px 2px", filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.3))" }}>
            <path d="M3 2 L3 28 L10 21.5 L14.5 32 L19 30 L14.6 19.8 L24 19.8 Z" fill="#111" stroke="#fff" strokeWidth={2.2} strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </AbsoluteFill>
  );
}

function Caption({ f, shot }: { f: number; shot: Shot }) {
  const cap = (shot.captions ?? []).find(([a, b]) => f >= a && f < b);
  if (!cap) return null;
  const p = progress(f, cap[0], 6, easeOut);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 34, display: "flex", justifyContent: "center", opacity: p }}>
      <div style={{ background: "rgba(30,27,24,0.9)", color: "#FBF3E6", fontFamily: FONT.sans, fontSize: 30, fontWeight: 500, letterSpacing: "-0.01em", padding: "15px 28px", borderRadius: 999, boxShadow: "0 10px 30px rgba(0,0,0,0.18)" }}>{cap[2]}</div>
    </div>
  );
}

function Step({ f }: { f: number }) {
  const shot = SHOTS.find((s) => f >= s.from && f < s.to);
  if (!shot) return null;
  const [label, title] = shot.step(f);
  // aparece de novo a cada passo novo
  const since = Math.min(f - shot.from, f - (shot.from === T.cuts.start && f >= T.cuts.ready ? T.cuts.ready : shot.from));
  const p = progress(since, 0, 8, easeOut);
  const leave = progress(f, T.plan.out - 10, 10);
  return (
    <div style={{ position: "absolute", left: WIN.x + 4, top: 40, display: "flex", alignItems: "baseline", gap: 18, opacity: p * (1 - leave) }}>
      <span style={{ fontFamily: FONT.mono, fontSize: 20, letterSpacing: "0.12em", textTransform: "uppercase", color: C.caramel }}>{label}</span>
      <span style={{ fontFamily: FONT.sans, fontSize: 38, fontWeight: 650, letterSpacing: "-0.03em", color: C.ink }}>{title}</span>
    </div>
  );
}

function Window({ f }: { f: number }) {
  const idx = SHOTS.findIndex((s) => f >= s.from && f < s.to);
  if (idx < 0) return null;
  const shot = SHOTS[idx];
  const prev = SHOTS[idx - 1];
  // a troca de tela passa pelo papel: a antiga some em 3 quadros e a nova aparece em 3, sem as duas sobrepostas
  const k = f - shot.from;
  const swapping = Boolean(prev) && k < 6;
  const outgoing = swapping && k < 3 ? 1 - k / 3 : 0;
  const incoming = swapping ? (k < 3 ? 0 : (k - 3) / 3) : 1;
  const enter = progress(f, T.upload.start, 16, easeOut);
  const leave = progress(f, T.plan.out - 10, 10);
  return (
    <div style={{ position: "absolute", left: WIN.x, top: WIN.y, width: WIN.w, height: WIN.h + WIN.bar, borderRadius: 18, overflow: "hidden", background: C.raised, border: `1.5px solid ${C.line}`, boxShadow: "0 40px 90px rgba(60,40,20,0.18), 0 6px 18px rgba(60,40,20,0.08)", opacity: enter * (1 - leave), transform: `translateY(${(1 - enter) * 40}px)` }}>
      <div style={{ height: WIN.bar, display: "flex", alignItems: "center", gap: 9, padding: "0 18px", borderBottom: `1.5px solid ${C.line}`, background: C.raised }}>
        {["#E4D6C1", "#E4D6C1", "#E4D6C1"].map((c, i) => <span key={i} style={{ width: 12, height: 12, borderRadius: 99, background: c }} />)}
        <div style={{ margin: "0 auto", padding: "5px 22px", borderRadius: 999, background: C.paper, fontFamily: FONT.mono, fontSize: 16, color: C.muted }}>{shot.url}</div>
        <div style={{ width: 54 }} />
      </div>
      <div style={{ position: "relative", width: WIN.w, height: WIN.h }}>
        {prev && outgoing > 0 && (
          <AbsoluteFill style={{ opacity: outgoing }}>
            <Page shot={prev} f={prev.to - 1} />
          </AbsoluteFill>
        )}
        <AbsoluteFill style={{ opacity: incoming }}>
          <Page shot={shot} f={f} />
        </AbsoluteFill>
        {shot.example && (
          <div style={{ position: "absolute", right: 18, top: 16, fontFamily: FONT.mono, fontSize: 15, letterSpacing: "0.08em", color: C.muted, background: "rgba(255,253,248,0.92)", border: `1.5px solid ${C.line}`, borderRadius: 999, padding: "5px 14px" }}>EXAMPLE ANALYSIS</div>
        )}
        <Caption f={f} shot={shot} />
      </div>
    </div>
  );
}

/* ---------- cartões ---------- */

function Card({ f, from, to, children }: { f: number; from: number; to: number; children: ReactNode }) {
  if (f < from || f >= to + 8) return null;
  const inn = progress(f, from, 14, easeOut);
  const out = to >= T.durationInFrames ? 0 : progress(f, to - 8, 8);
  return <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: inn * (1 - out), transform: `translateY(${(1 - inn) * 24}px)` }}>{children}</AbsoluteFill>;
}

const line = (size: number, weight: number, color: string, extra?: CSSProperties): CSSProperties => ({ fontFamily: FONT.sans, fontSize: size, fontWeight: weight, color, letterSpacing: "-0.03em", lineHeight: 1.15, textAlign: "center", ...extra });

export function PhDemo({ sound = true }: { sound?: boolean }) {
  const f = useCurrentFrame();
  const sub = progress(f, T.end.cta, 10);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(70% 60% at 50% 45%, #FBF6EC 0%, ${C.paper} 70%)` }}>
      {sound && <Audio src={staticFile("ph/soundtrack.wav")} />}

      <Card f={f} from={T.intro.start} to={T.intro.out}>
        <Lockup size={84} id="ph-intro" />
        <div style={line(76, 700, C.ink, { marginTop: 56 })}>How Publishub works</div>
        <div style={line(32, 500, C.muted, { marginTop: 22, letterSpacing: "-0.01em" })}>From your cut to an edited video, in five steps.</div>
      </Card>

      <Step f={f} />
      <Window f={f} />

      <Card f={f} from={T.recap.start} to={T.recap.out}>
        <div style={line(64, 700, C.ink)}>You stay the editor.</div>
        <div style={{ marginTop: 44, display: "flex", flexDirection: "column", gap: 22 }}>
          {["Works with CapCut, Premiere Pro, DaVinci Resolve or any editor", "Nothing is cut until you approve it", "Available in 11 languages"].map((t) => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 18, fontFamily: FONT.sans, fontSize: 34, fontWeight: 500, color: C.ink, letterSpacing: "-0.015em" }}>
              <span style={{ width: 34, height: 34, borderRadius: 99, background: C.accent, color: "#fff", display: "grid", placeItems: "center", fontSize: 20, fontWeight: 700 }}>✓</span>
              {t}
            </div>
          ))}
        </div>
      </Card>

      <Card f={f} from={T.end.start} to={T.durationInFrames}>
        <Lockup size={96} id="ph-end" />
        <div style={{ marginTop: 64, opacity: sub, background: C.accent, color: "#fff", fontFamily: FONT.sans, fontSize: 44, fontWeight: 600, letterSpacing: "-0.02em", padding: "26px 54px", borderRadius: 999 }}>Analyze your video free</div>
        <div style={{ marginTop: 36, opacity: progress(f, T.end.url, 10), fontFamily: FONT.mono, fontSize: 44, color: C.ink }}>getpublishub.com</div>
        <div style={line(28, 500, C.muted, { marginTop: 18, opacity: progress(f, T.end.url, 10), letterSpacing: "0" })}>No account · No card · Results in ~3 min</div>
      </Card>
    </AbsoluteFill>
  );
}

export const PH_FPS = T.fps;
export const PH_FRAMES = T.durationInFrames;
