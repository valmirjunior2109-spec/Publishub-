// O filme de lançamento da Publishub, 1920 × 1080, 60 fps, 74 s, no estilo dos vídeos de produto de SaaS:
// a janela flutuando sobre um fundo colorido, a câmera que acompanha o cursor e aproxima no clique, e cada
// clique abrindo a cena seguinte. Dois cursores com nome: "Publishub AI" encontra, "You" decide.
// Telas reais em tema claro, com a análise de exemplo. Quando a câmera para, nada se move: nada treme.

import { AbsoluteFill, Audio, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import type { CSSProperties, ReactNode } from "react";
import { Lockup } from "./Logo";
import R from "./rects.json";
import T from "./timeline.json";

const PAPER = "#F6F0E4";
const INK = "#1E1B18";
const CREAM = "#FBF3E6";
const MUTED = "rgba(30,27,24,0.62)";
const BLUE = "#1F47A6";
const AI = "#C9642F";
const HOT = "#E8652B";
const WALL = "linear-gradient(135deg, #16347E 0%, #1F47A6 45%, #4D74F0 100%)";
const SANS = "Geist, system-ui, sans-serif";
const MONO = "'Geist Mono', ui-monospace, monospace";

const out = Easing.bezier(0.16, 1, 0.3, 1);
const inOut = Easing.bezier(0.5, 0, 0.1, 1);
const pop = Easing.bezier(0.34, 1.56, 0.64, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const prog = (t: number, at: number, dur: number, easing = out) => interpolate(t, [at, at + dur], [0, 1], { ...clamp, easing });

function Words({ t, at, text, size, color = INK, weight = 700, stagger = 0.05, align = "center", style, hot, hotColor = HOT }: { t: number; at: number; text: string; size: number; color?: string; weight?: number; stagger?: number; align?: CSSProperties["textAlign"]; style?: CSSProperties; hot?: string[]; hotColor?: string }) {
  return (
    <div style={{ fontFamily: SANS, fontSize: size, fontWeight: weight, lineHeight: 1.14, letterSpacing: "-0.04em", textAlign: align, color, ...style }}>
      {text.split(" ").map((word, i) => {
        const p = prog(t, at + i * stagger, 0.5, pop);
        const shown = prog(t, at + i * stagger, 0.2, Easing.linear);
        return (
          <span key={`${word}${i}`} style={{ display: "inline-block", marginRight: "0.24em", color: hot?.includes(word) ? hotColor : undefined, opacity: shown, transform: p < 1 ? `translateY(${((1 - p) * size * 0.5).toFixed(2)}px)` : undefined }}>
            {word}
          </span>
        );
      })}
    </div>
  );
}

/* ---------- o cursor com nome ---------- */

type Point = { t: number; x: number; y: number };

function pathAt(t: number, path: Point[]) {
  let a = path[0];
  for (let i = 1; i < path.length; i++) {
    const b = path[i];
    if (t >= b.t) { a = b; continue; }
    const k = prog(t, a.t, b.t - a.t, inOut);
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  }
  return { x: a.x, y: a.y };
}

function Cursor({ t, x, y, name, color, clicks = [], light = false }: { t: number; x: number; y: number; name: string; color: string; clicks?: number[]; light?: boolean }) {
  const fill = light ? "#fff" : color;
  const edge = light ? color : "#fff";
  const text = light ? color : "#fff";
  const click = clicks.find((c) => t >= c && t < c + 0.55);
  const pressed = clicks.some((c) => t >= c && t < c + 0.13);
  const ring = click === undefined ? 0 : prog(t, click, 0.55);
  return (
    <>
      {click !== undefined && <div style={{ position: "absolute", left: x - 70, top: y - 70, width: 140, height: 140, borderRadius: "50%", border: `5px solid ${fill}`, background: `${fill}22`, transform: `scale(${(0.15 + ring).toFixed(3)})`, opacity: 1 - ring }} />}
      <div style={{ position: "absolute", left: x - 7, top: y - 5, transform: pressed ? "scale(0.82)" : undefined, transformOrigin: "7px 5px" }}>
        <svg width={50} height={50} viewBox="0 0 24 24" style={{ display: "block", overflow: "visible", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))" }}>
          <path d="M4.5 2.5 L4.5 20 L9.5 15.6 L12.8 22.4 L16 21 L12.7 14.4 L19.4 14.4 Z" fill={fill} stroke={edge} strokeWidth={1.5} strokeLinejoin="round" />
        </svg>
        <span style={{ position: "absolute", left: 40, top: 40, padding: "6px 14px", borderRadius: 12, background: fill, color: text, fontFamily: SANS, fontSize: 21, fontWeight: 600, letterSpacing: "-0.01em", whiteSpace: "nowrap", boxShadow: "0 4px 14px rgba(0,0,0,0.22)" }}>{name}</span>
      </div>
    </>
  );
}

/** A cena seguinte abre num círculo a partir do clique. */
function Burst({ t, at, until, x, y, bg, children }: { t: number; at: number; until: number; x: number; y: number; bg: string; children: ReactNode }) {
  if (t < at || t >= until) return null;
  const p = prog(t, at, 0.75, Easing.bezier(0.5, 0, 0.15, 1));
  return <AbsoluteFill style={{ background: bg, clipPath: p < 1 ? `circle(${(p * 2300).toFixed(1)}px at ${x}px ${y}px)` : undefined }}>{children}</AbsoluteFill>;
}

/* ---------- ato 1: o problema ---------- */

const TX = 360;
const TW = 1200;
const TY = 500;
const CLIPS = [
  { row: 0, a: 0, len: 0.17, color: "#1F47A6" },
  { row: 0, a: 0.18, len: 0.22, color: "#4D74F0" },
  { row: 0, a: 0.41, len: 0.22, color: "#2F58C0" },
  { row: 0, a: 0.64, len: 0.36, color: "#1F47A6" },
  { row: 1, a: 0.06, len: 0.26, color: "#C9824A" },
  { row: 1, a: 0.56, len: 0.3, color: "#A96B39" },
  { row: 2, a: 0, len: 1, color: "#CFC6B5" },
];

function clipLeft(t: number, i: number) {
  const p = T.problem;
  let at = CLIPS[i].a;
  if (i === 4) at += 0.17 * prog(t, p.drag[0] + 0.1, p.drag[1] - p.drag[0] - 0.1, inOut);
  if (i === 1) at += 0.23 * prog(t, p.drag2[0] + 0.1, p.drag2[1] - p.drag2[0] - 0.1, inOut);
  if (i === 2) at -= 0.23 * prog(t, p.drag2[0] + 0.1, p.drag2[1] - p.drag2[0] - 0.1, inOut);
  return TX + at * TW;
}

const rowY = (row: number) => TY + row * 84;

function Problem({ t }: { t: number }) {
  const p = T.problem;
  const center: CSSProperties = { position: "absolute", left: 0, right: 0, top: 230, display: "flex", justifyContent: "center" };
  const played = p.plays.filter((c) => t >= c).length;
  const count = played === 0 ? 1 : played >= p.plays.length ? 47 : Math.round(1 + (played / p.plays.length) * 46);
  const post = prog(t, p.posted, 0.5, pop);
  const posted = t >= p.post;
  const postPop = prog(t, p.post, 0.4, pop);
  const clip4 = { x: clipLeft(t, 4) + 0.13 * TW, y: rowY(1) + 36 };
  const clip1 = { x: clipLeft(t, 1) + 0.11 * TW, y: rowY(0) + 36 };
  const play = { x: 960, y: 800 };
  const postBtn = { x: 960, y: 760 };
  const playAim = { x: play.x + 24, y: play.y + 24 };
  const postAim = { x: postBtn.x + 128, y: postBtn.y + 28 };
  const you = t < p.drag[0] ? pathAt(t, [{ t: 0.3, x: 2000, y: 1140 }, { t: p.drag[0], x: clipLeft(p.drag[0], 4) + 0.13 * TW, y: rowY(1) + 36 }])
    : t < p.drag[1] ? clip4
    : t < p.drag2[0] ? pathAt(t, [{ t: p.drag[1], ...clip4 }, { t: p.drag2[0], x: clipLeft(p.drag2[0], 1) + 0.11 * TW, y: rowY(0) + 36 }])
    : t < p.drag2[1] ? clip1
    : t < p.watched + 0.25 ? pathAt(t, [{ t: p.drag2[1], ...clip1 }, { t: p.watched + 0.2, ...playAim }])
    : t < p.posted ? playAim
    : t < p.post ? pathAt(t, [{ t: p.posted, ...playAim }, { t: p.post - 0.25, ...postAim }])
    : t < p.line ? postAim
    : pathAt(t, [{ t: p.line, ...postAim }, { t: p.line + 0.8, x: 2000, y: 1140 }]);
  const clicks = [p.drag[0], p.drag2[0], ...p.plays, p.post];
  const head = t < p.drop ? interpolate(t, [p.line, p.drop], [130, 960], clamp) : t < p.drop + 0.16 ? interpolate(t, [p.drop, p.drop + 0.16], [960, 1070], clamp) : interpolate(t, [p.drop + 0.16, p.drop + 1.3], [1070, 1790], { ...clamp, easing: Easing.out(Easing.quad) });
  const lineY = (x: number) => (x <= 960 ? 500 + (x - 130) * 0.03 : x <= 1070 ? 525 + 330 * (0.5 - Math.cos((Math.PI * (x - 960)) / 110) / 2) : 855 + (x - 1070) * 0.05);
  const pts = (a: number, b: number) => {
    const list: string[] = [];
    for (let x = a; x < b; x += 6) list.push(`${x},${lineY(x).toFixed(1)}`);
    list.push(`${b},${lineY(b).toFixed(1)}`);
    return list.join(" ");
  };
  const aiPos = pathAt(t, [{ t: p.aiIn, x: 2000, y: 1140 }, { t: p.out, x: 960, y: 525 }]);
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      {t < p.posted && (
        <>
          {[0, 1, 2].map((row) => <div key={row} style={{ position: "absolute", left: TX, top: rowY(row), width: TW, height: 72, borderRadius: 14, background: "rgba(30,27,24,0.05)" }} />)}
          {CLIPS.map((c, i) => {
            const reveal = prog(t, 0.2 + i * 0.07, 0.45);
            return <div key={i} style={{ position: "absolute", left: clipLeft(t, i), top: rowY(c.row), width: c.len * TW * reveal, height: 72, borderRadius: 14, background: c.color, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.22)" }} />;
          })}
        </>
      )}
      {t >= p.watched && t < p.posted && (
        <>
          <div style={{ position: "absolute", left: TX, top: 438, width: TW, textAlign: "right", fontFamily: MONO, fontSize: 32, fontWeight: 700, color: count === 47 ? HOT : MUTED }}>{`REWATCH #${String(count).padStart(2, "0")}`}</div>
          <div style={{ position: "absolute", left: play.x - 44, top: play.y - 44, width: 88, height: 88, borderRadius: "50%", background: INK, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width={38} height={38} viewBox="0 0 24 24"><path d="M8 5 L19 12 L8 19 Z" fill={CREAM} /></svg>
          </div>
        </>
      )}
      {t < p.recut && <div style={center}><Words t={t} at={p.cut} text="You cut it." size={116} /></div>}
      {t >= p.recut && t < p.watched && <div style={center}><Words t={t} at={p.recut} text="You recut it." size={116} /></div>}
      {t >= p.watched && t < p.posted && <div style={center}><Words t={t} at={p.watched} text="You watched it 47 times." size={116} /></div>}
      {t >= p.posted && t < p.line && (
        <>
          <div style={{ ...center, top: 300 }}><Words t={t} at={p.posted + 0.05} text="You posted it." size={132} /></div>
          <div style={{ position: "absolute", left: postBtn.x - 180, top: postBtn.y - 54, width: 360, height: 108, borderRadius: 54, background: posted ? "#E0EBDC" : BLUE, color: posted ? "#2F6B3C" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, fontSize: 44, fontWeight: 700, letterSpacing: "-0.03em", opacity: Math.min(1, post * 2), transform: `scale(${posted ? (0.9 + 0.1 * postPop).toFixed(3) : (0.8 + 0.2 * post).toFixed(3)})` }}>{posted ? "Posted ✓" : "Post"}</div>
        </>
      )}
      {t >= p.line && (
        <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
          <polyline points={pts(130, Math.min(head, 960))} fill="none" stroke={BLUE} strokeWidth={9} strokeLinecap="round" />
          {t >= p.drop && <polyline points={pts(960, head)} fill="none" stroke={HOT} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />}
          {t >= p.drop && <circle cx={960} cy={lineY(960)} r={16} fill={HOT} />}
          {head < 1790 && <circle cx={head} cy={lineY(head)} r={10} fill={INK} />}
        </svg>
      )}
      {t >= p.line && t < p.left && <div style={{ ...center, top: 200 }}><Words t={t} at={p.line + 0.1} text="Then you checked the numbers." size={96} /></div>}
      {t >= p.left && t < p.where && <div style={{ ...center, top: 200 }}><Words t={t} at={p.left} text="Somewhere in there, people left." size={96} hot={["left."]} /></div>}
      {t >= p.where && <div style={{ ...center, top: 200 }}><Words t={t} at={p.where} text="Nobody tells you where." size={116} /></div>}
      {t < p.line + 0.8 && <Cursor t={t} x={you.x} y={you.y} name="You" color={BLUE} clicks={clicks} />}
      {t >= p.aiIn && <Cursor t={t} x={aiPos.x} y={aiPos.y} name="Publishub AI" color={AI} clicks={[p.out]} />}
    </AbsoluteFill>
  );
}

/* ---------- ato 2: a marca ---------- */

function Reveal({ t }: { t: number }) {
  const r = T.reveal;
  const logo = prog(t, r.at + 0.35, 0.7, pop);
  const leave = prog(t, r.out - 0.45, 0.45, Easing.in(Easing.cubic));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 340, display: "flex", flexDirection: "column", alignItems: "center", opacity: 1 - leave, transform: leave > 0 ? `translateY(${(-leave * 160).toFixed(1)}px)` : undefined }}>
      <div style={{ opacity: Math.min(1, logo * 2), transform: logo < 1 ? `scale(${(0.8 + logo * 0.2).toFixed(4)})` : undefined }}>
        <Lockup size={160} id="film-reveal" />
      </div>
      <div style={{ marginTop: 52 }}><Words t={t} at={r.tagline} text="Your AI editing copilot." size={70} weight={600} color={CREAM} /></div>
      <div style={{ marginTop: 18 }}><Words t={t} at={r.who} text="For people who edit Reels, TikToks and Shorts." size={40} weight={500} color="rgba(251,243,230,0.74)" stagger={0.03} /></div>
    </div>
  );
}

/* ---------- ato 3: o produto, com a câmera atrás do cursor ---------- */

const S = 1.05;
const WIN = { x: 204, y: 47, w: 1512, h: 985, bar: 40 };
const VIEW_Y = 431; // a distância do topo da página até o meio da janela, em px da página

type Key = { t: number; d: number; x: number; y: number; z: number };

const U = T.upload;
const A = T.analyze;
const F = T.find;
const C = T.cuts;
const P = T.plan;
const all = R.acceptAll;
const apply = R.applyAccepted;
const zone = R.dropzone;
const analyze = R.analyze;
const TAB = { x: R.tabPlan.x + R.tabPlan.w - 8, y: R.tabs.y + 30 };
const AIM = { analyze: { x: analyze.x + analyze.w - 14, y: analyze.y + analyze.h - 8 }, all: { x: all.x + all.w - 10, y: all.y + all.h - 6 }, apply: { x: apply.x + apply.w - 24, y: apply.y + apply.h - 6 } };

/** Para onde a câmera olha. Parada, os valores não mudam: nenhum pixel treme. */
const CAM: Key[] = [
  { t: 0, d: 0.01, x: 720, y: VIEW_Y, z: 1 },
  { t: U.zoom, d: 0.9, x: 845, y: zone.y + zone.h / 2, z: 1.8 },
  { t: U.pan, d: 0.9, x: 845, y: analyze.y + 30, z: 1.8 },
  { t: U.out - 0.5, d: 0.5, x: 720, y: VIEW_Y, z: 1 },
  { t: A.zoom, d: 0.9, x: 978, y: 410, z: 1.7 },
  { t: A.out - 0.45, d: 0.45, x: 720, y: VIEW_Y, z: 1 },
  { t: F.zoom, d: 0.9, x: 978, y: 395, z: 1.8 },
  { t: C.zoom, d: 0.9, x: 978, y: 720, z: 1.8 },
  { t: C.pan, d: 1, x: 978, y: apply.y - 40, z: 1.8 },
  { t: P.in, d: 0.01, x: 978, y: 1640, z: 1.7 },
  { t: P.scroll[0], d: 0.8, x: 978, y: 1900, z: 1.7 },
  { t: P.scroll[1], d: 0.8, x: 978, y: 2130, z: 1.7 },
];

function camAt(t: number) {
  let { x, y, z } = CAM[0];
  for (const key of CAM.slice(1)) {
    const k = prog(t, key.t, key.d, inOut);
    x += (key.x - x) * k;
    y += (key.y - y) * k;
    z += (key.z - z) * k;
  }
  return { x, y, z, scroll: Math.max(0, y - VIEW_Y) };
}

function screenOf(px: number, py: number, cam: ReturnType<typeof camAt>) {
  const fx = WIN.x + cam.x * S;
  const fy = WIN.y + WIN.bar + (cam.y - cam.scroll) * S;
  return { x: 960 + (WIN.x + px * S - fx) * cam.z, y: 540 + (WIN.y + WIN.bar + (py - cam.scroll) * S - fy) * cam.z };
}

function pageAt(t: number) {
  if (t >= C.acceptAll + 0.1) return "result_accepted";
  if (t >= F.in) return "result_pending";
  if (t >= A.steps[3]) return "processing_diagnosing";
  if (t >= A.steps[2]) return "processing_aligning";
  if (t >= A.steps[1]) return "processing_transcribing";
  if (t >= U.out) return "processing_received";
  if (t >= U.drop) return "upload_file";
  return "upload_empty";
}

const rowOf = (i: number) => 293 + i * 47;

const YOU_PATH: Point[] = [
  { t: U.in + 0.8, x: 1900, y: 300 },
  { t: U.drop, x: zone.x + zone.w / 2, y: zone.y + zone.h / 2 },
  { t: U.pan + 0.1, x: zone.x + zone.w / 2, y: zone.y + zone.h / 2 },
  { t: U.click, ...AIM.analyze },
  { t: U.click + 0.2, ...AIM.analyze },
  { t: U.out, x: 1900, y: 1000 },
  { t: C.marks[2], x: 1900, y: 1100 },
  { t: C.acceptAll, ...AIM.all },
  { t: C.pan + 0.2, ...AIM.all },
  { t: C.apply, ...AIM.apply },
];

const AI_PATH: Point[] = [
  { t: A.zoom + 0.2, x: 1900, y: 700 },
  { t: A.steps[0], x: 1130, y: rowOf(1) },
  { t: A.steps[1], x: 1130, y: rowOf(1) },
  { t: A.steps[1] + 0.35, x: 1130, y: rowOf(2) },
  { t: A.steps[2], x: 1130, y: rowOf(2) },
  { t: A.steps[2] + 0.35, x: 1130, y: rowOf(3) },
  { t: A.steps[3], x: 1130, y: rowOf(3) },
  { t: A.steps[3] + 0.35, x: 1130, y: rowOf(4) },
  { t: F.in, x: 1300, y: 500 },
  { t: F.clicks[0], x: 610, y: 182 },
  { t: F.clicks[0] + 0.4, x: 1295, y: 448 },
  { t: F.clicks[1] - 0.5, x: 1295, y: 448 },
  { t: F.clicks[1], x: 1240, y: 262 },
  { t: F.clicks[1] + 0.4, x: 1295, y: 448 },
  { t: F.clicks[2] - 0.5, x: 1295, y: 448 },
  { t: F.clicks[2], x: 1240, y: 400 },
  { t: F.clicks[2] + 0.4, x: 1295, y: 448 },
  { t: C.zoom + 0.4, x: 1000, y: 610 },
  { t: C.marks[0], x: 612, y: 656 },
  { t: C.marks[1], x: 885, y: 656 },
  { t: C.marks[2], x: 1145, y: 656 },
  { t: C.marks[2] + 0.8, x: 1900, y: 1000 },
];

function Caption({ t, at, until, text, hot }: { t: number; at: number; until: number; text: string; hot?: string[] }) {
  if (t < at || t >= until) return null;
  const p = prog(t, at, 0.45, pop);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 930, display: "flex", justifyContent: "center", opacity: Math.min(1, p * 2) }}>
      <div style={{ padding: "16px 34px 18px", borderRadius: 24, background: INK, boxShadow: "0 18px 50px rgba(0,0,0,0.35)", fontFamily: SANS, fontSize: 46, fontWeight: 700, letterSpacing: "-0.03em", color: CREAM, whiteSpace: "pre", transform: p < 1 ? `translateY(${((1 - p) * 30).toFixed(1)}px) scale(${(0.92 + 0.08 * p).toFixed(3)})` : undefined }}>
        {text.split(" ").map((word, i) => <span key={i} style={{ color: hot?.includes(word) ? "#FF9D66" : undefined }}>{word}{" "}</span>)}
      </div>
    </div>
  );
}

function ExampleChip() {
  return <span style={{ position: "absolute", right: 40, top: 34, padding: "9px 18px", borderRadius: 999, background: INK, color: CREAM, fontFamily: MONO, fontSize: 21, fontWeight: 600, letterSpacing: "0.05em" }}>EXAMPLE ANALYSIS</span>;
}

function Lift({ t, at, until, crop }: { t: number; at: number; until: number; crop: { x: number; y: number; w: number; h: number } }) {
  if (t < at || t >= until) return null;
  const p = prog(t, at, 0.5, pop);
  const w = 1520;
  const s = w / crop.w;
  const h = crop.h * s;
  return (
    <div style={{ position: "absolute", left: 200, top: 440 - h / 2, width: w, height: h, borderRadius: 26, overflow: "hidden", opacity: Math.min(1, p * 2), transform: p < 1 ? `scale(${(0.86 + 0.14 * p).toFixed(4)})` : undefined, boxShadow: `0 34px 90px rgba(10,20,60,0.42), 0 0 0 4px ${AI}` }}>
      <Img src={staticFile("film/result_pending.png")} style={{ position: "absolute", left: -crop.x * s, top: -crop.y * s, width: 1440 * s, maxWidth: "none" }} />
    </div>
  );
}

/** A janela com a câmera aplicada, nas telas reais. */
function Stage({ t, page, url, enter = 1 }: { t: number; page: string; url: string; enter?: number }) {
  const cam = camAt(t);
  const fx = WIN.x + cam.x * S;
  const fy = WIN.y + WIN.bar + (cam.y - cam.scroll) * S;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: `translate(${960 - fx * cam.z}px, ${540 - fy * cam.z}px) scale(${cam.z})` }}>
      <div style={{ position: "absolute", left: WIN.x, top: WIN.y, width: WIN.w, height: WIN.h, borderRadius: 20, overflow: "hidden", background: PAPER, boxShadow: "0 50px 130px rgba(5,15,50,0.5)", transform: enter < 1 ? `perspective(2400px) translateY(${((1 - enter) * 900).toFixed(1)}px) rotateX(${(-22 * (1 - enter)).toFixed(3)}deg)` : undefined }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: WIN.bar, background: "#fff", borderBottom: "1px solid rgba(30,27,24,0.1)", display: "flex", alignItems: "center", gap: 8, padding: "0 16px", zIndex: 1 }}>
          {["#E8695F", "#EAB54A", "#62C554"].map((c) => <span key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />)}
          <span style={{ marginLeft: 14, fontFamily: MONO, fontSize: 15, color: MUTED }}>{url}</span>
        </div>
        <div style={{ position: "absolute", left: 0, top: WIN.bar, width: 1440 * S, height: 900 * S, overflow: "hidden" }}>
          <Img src={staticFile(`film/${page}.png`)} style={{ position: "absolute", left: 0, top: -cam.scroll * S, width: 1440 * S, maxWidth: "none" }} />
          {/* a captura não tem o vídeo: o aviso de prévia indisponível dá lugar ao "play" */}
          {(page.startsWith("result") || page.startsWith("processing")) && (
            <div style={{ position: "absolute", left: 300 * S, top: (326 - cam.scroll) * S, width: 200 * S, height: 44 * S, background: INK, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width={46} height={46} viewBox="0 0 24 24"><path d="M8 5 L19 12 L8 19 Z" fill={CREAM} /></svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Product({ t }: { t: number }) {
  const cam = camAt(t);
  const page = pageAt(t);
  const result = page.startsWith("result");
  const you = pathAt(t, YOU_PATH);
  const youS = screenOf(you.x, you.y, cam);
  const youIn = (t >= U.in + 0.8 && t < U.out) || (t >= C.marks[2] && t < C.out + 0.8);
  const ai = pathAt(t, AI_PATH);
  const aiS = screenOf(ai.x, ai.y, cam);
  const aiIn = t >= A.zoom + 0.2 && t < C.marks[2] + 0.8;
  const dim = t >= F.clicks[0] && t < F.out - 0.4 ? prog(t, F.clicks[0], 0.3) * (1 - prog(t, F.out - 0.7, 0.3)) : 0;
  const seconds = Math.round(interpolate(t, [A.zoom, A.out - 0.5], [0, 174], clamp));
  const chip = screenOf(zone.x + zone.w / 2, zone.y + zone.h / 2, cam);
  return (
    <AbsoluteFill>
      <Stage t={t} page={page} url={t >= U.out ? "getpublishub.com/results" : "getpublishub.com/new-analysis"} enter={prog(t, U.in, 0.9, out)} />
      {dim > 0 && <AbsoluteFill style={{ background: `rgba(8,18,55,${(0.6 * dim).toFixed(3)})` }} />}
      {result && <ExampleChip />}
      <Lift t={t} at={F.clicks[0]} until={F.clicks[1]} crop={{ x: 552, y: 120, w: 852, h: 106 }} />
      <Lift t={t} at={F.clicks[1]} until={F.clicks[2]} crop={{ x: 552, y: 238, w: 852, h: 122 }} />
      <Lift t={t} at={F.clicks[2]} until={F.out - 0.5} crop={{ x: 566, y: 360, w: 824, h: 112 }} />

      {t >= A.zoom && t < A.out - 0.4 && <div style={{ position: "absolute", right: 60, top: 40, padding: "12px 24px", borderRadius: 20, background: INK, color: CREAM, fontFamily: MONO, fontSize: 40, fontWeight: 700 }}>{`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}</div>}

      {t >= U.in + 0.8 && t < U.drop && <div style={{ position: "absolute", left: youS.x - 160, top: youS.y + 80, width: 320, height: 66, borderRadius: 16, background: "#fff", border: `3px solid ${BLUE}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 24, fontWeight: 600, color: INK, boxShadow: "0 16px 40px rgba(0,0,0,0.3)" }}>client_cut_v7.mp4</div>}
      {t >= U.drop && t < U.drop + 0.5 && <div style={{ position: "absolute", left: chip.x - 170, top: chip.y - 60, width: 340, height: 120, borderRadius: 20, border: `5px solid ${BLUE}`, opacity: 1 - prog(t, U.drop, 0.5), transform: `scale(${(0.9 + 0.2 * prog(t, U.drop, 0.5)).toFixed(3)})` }} />}

      {C.marks.map((m, i) => {
        if (t < m || t >= C.pan) return null;
        const block = [{ x: 573, w: 86 }, { x: 850, w: 70 }, { x: 1127, w: 36 }][i];
        const a = screenOf(block.x - 4, 635, cam);
        const b = screenOf(block.x + block.w + 4, 680, cam);
        const k = prog(t, m, 0.35, pop);
        return <div key={m} style={{ position: "absolute", left: a.x, top: a.y, width: b.x - a.x, height: b.y - a.y, borderRadius: 16, border: `4px solid ${AI}`, opacity: Math.min(1, k * 2), transform: `scale(${(1.14 - 0.14 * k).toFixed(3)})` }} />;
      })}

      {aiIn && <Cursor t={t} x={aiS.x} y={aiS.y} name="Publishub AI" color={AI} clicks={[...F.clicks, ...C.marks]} />}
      {youIn && <Cursor t={t} x={youS.x} y={youS.y} name="You" color={BLUE} clicks={[U.drop, U.click, C.acceptAll, C.apply]} />}

      <Caption t={t} at={U.in + 0.5} until={U.pan} text="Drop your cut." />
      <Caption t={t} at={U.pan} until={U.out} text="One click to analyze." />
      <Caption t={t} at={A.in + 0.3} until={A.steps[2]} text="It listens to every line." />
      <Caption t={t} at={A.steps[2]} until={A.out} text="In about 3 minutes." />
      <Caption t={t} at={F.zoom + 0.2} until={F.clicks[1]} text="The second. The line." hot={["second.", "line."]} />
      <Caption t={t} at={F.clicks[1]} until={F.clicks[2]} text="The reason." hot={["reason."]} />
      <Caption t={t} at={F.clicks[2]} until={F.out} text="And what to test instead." />
      <Caption t={t} at={C.zoom + 0.2} until={C.acceptAll} text="AI finds the dead moments." />
      <Caption t={t} at={C.acceptAll} until={C.out + 0.8} text="You decide what goes." hot={["You"]} />
    </AbsoluteFill>
  );
}

/** O ponto da tela em que o clique abre a cena seguinte. */
const NEXT = { x: 1500, y: 760 };

function PlanStep({ t }: { t: number }) {
  const cam = camAt(t);
  const tab = screenOf(TAB.x, TAB.y, cam);
  const pos = t < P.tab ? pathAt(t, [{ t: P.in + 0.1, x: NEXT.x, y: NEXT.y }, { t: P.tab, x: tab.x, y: tab.y }]) : pathAt(t, [{ t: P.tab + 0.2, x: tab.x, y: tab.y }, { t: P.scroll[0], x: 1560, y: 640 }, { t: P.out - 0.5, x: 1560, y: 640 }, { t: P.out, x: NEXT.x, y: NEXT.y }]);
  return (
    <AbsoluteFill>
      <Stage t={t} page={t >= P.tab + 0.05 ? "result_plan" : "result_accepted"} url="getpublishub.com/results" />
      <ExampleChip />
      <Cursor t={t} x={pos.x} y={pos.y} name="You" color={BLUE} clicks={[P.tab, P.out]} />
      <Caption t={t} at={P.in + 0.5} until={P.scroll[1]} text="A fix plan, in order of impact." />
      <Caption t={t} at={P.scroll[1]} until={P.out + 0.8} text="Notes for CapCut, Premiere or DaVinci." />
    </AbsoluteFill>
  );
}

function Result({ t }: { t: number }) {
  const r = T.result;
  const n = Math.round(interpolate(t, [r.in + 0.5, r.in + 1.4], [41, 32], clamp));
  const done = t >= r.in + 1.4;
  const bounce = prog(t, r.in + 1.4, 0.45, pop);
  const you = pathAt(t, [{ t: r.in + 1.7, x: 2000, y: 1140 }, { t: r.out, x: NEXT.x, y: NEXT.y }]);
  return (
    <>
    {t >= r.in + 1.7 && <Cursor t={t} x={you.x} y={you.y} name="You" color={BLUE} clicks={[r.out]} />}
    <div style={{ position: "absolute", left: 0, right: 0, top: 200, textAlign: "center" }}>
      <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, letterSpacing: "0.08em", color: MUTED }}>EDITED VIDEO READY · EXAMPLE</div>
      <div style={{ marginTop: 18, fontFamily: MONO, fontSize: 300, fontWeight: 700, letterSpacing: "-0.06em", lineHeight: 1.1, color: done ? BLUE : INK, transform: done && bounce < 1 ? `scale(${(1 + 0.06 * (1 - bounce)).toFixed(3)})` : undefined }}>{`0:${n}`}</div>
      <div style={{ marginTop: 28 }}><Words t={t} at={r.in + 1.45} text="9.3 s of dead moments, gone." size={72} /></div>
      <div style={{ marginTop: 16 }}><Words t={t} at={r.in + 1.75} text="Your original is still in your account, exactly as you sent it." size={36} weight={500} color={MUTED} stagger={0.015} style={{ letterSpacing: "-0.015em" }} /></div>
    </div>
    </>
  );
}

/* ---------- em volta da edição ---------- */

const GAP = 24;
const CW = Math.round((1920 - 192 - GAP * 2) / 3);
const CH = 372;
const CELLS: { title: string; text: string; color: string; pills?: string[]; big?: string }[] = [
  { title: "It remembers you", text: "What you accept, reject and ask for shapes your next analysis.", pills: ["cuts you accept", "cuts you reject", "what you ask for"], color: "#DCE6FB" },
  { title: "Keeps your editor", text: "No new editor to learn. Take the notes back to the app you already use.", pills: ["CapCut", "Premiere Pro", "DaVinci Resolve"], color: "#F6E3D2" },
  { title: "11 languages", text: "The site and your analysis, in the language you work in.", big: "11", color: "#FFFFFF" },
  { title: "Share the result", text: "A public link and a card for your Stories. The video and the full plan stay private.", pills: ["0:04 · drop", "Stories card", "public link"], color: "#FFFFFF" },
  { title: "Send it to Notion", text: "Take the analysis out of Publishub and into the place where you plan your work.", pills: ["Publishub → Notion"], color: "#DCE6FB" },
  { title: "Private by default", text: "Private storage. Never sold, and never used to train models of our own.", pills: ["your videos", "your account"], color: "#F6E3D2" },
];
const cellX = (i: number) => 96 + (i % 3) * (CW + GAP);
const cellY = (i: number) => 212 + Math.floor(i / 3) * (CH + GAP);

function Bento({ t }: { t: number }) {
  const b = T.bento;
  const targets: Point[] = [{ t: b.in + 0.1, x: NEXT.x, y: NEXT.y }, ...b.clicks.map((c, i) => ({ t: c, x: cellX(i) + CW - 90, y: cellY(i) + 60 }))];
  const you = pathAt(t, targets);
  return (
    <>
      <div style={{ position: "absolute", left: 96, top: 84 }}><Words t={t} at={b.in + 0.2} text="Everything around the edit." size={88} align="left" /></div>
      {CELLS.map((cell, i) => {
        const at = b.clicks[i];
        if (t < at) return null;
        const p = prog(t, at, 0.5, pop);
        return (
          <div key={cell.title} style={{ position: "absolute", left: cellX(i), top: cellY(i), width: CW, height: CH, borderRadius: 28, background: cell.color, border: "1px solid rgba(30,27,24,0.1)", boxShadow: "0 18px 50px rgba(30,27,24,0.1)", boxSizing: "border-box", padding: 36, opacity: Math.min(1, p * 2), transform: p < 1 ? `scale(${(0.82 + 0.18 * p).toFixed(4)})` : undefined }}>
            <div style={{ height: 126 }}>
              {cell.big && <div style={{ fontFamily: MONO, fontSize: 104, fontWeight: 700, letterSpacing: "-0.05em", lineHeight: 1.1, color: BLUE }}>{cell.big}</div>}
              {cell.pills?.map((text) => <span key={text} style={{ display: "inline-block", marginRight: 10, marginBottom: 10, padding: "8px 18px", borderRadius: 999, background: "#fff", border: "1px solid rgba(30,27,24,0.14)", fontFamily: SANS, fontSize: 25, fontWeight: 600, letterSpacing: "-0.01em", color: INK }}>{text}</span>)}
            </div>
            <div style={{ marginTop: 26, fontFamily: SANS, fontSize: 38, fontWeight: 700, letterSpacing: "-0.03em", color: INK }}>{cell.title}</div>
            <div style={{ marginTop: 10, fontFamily: SANS, fontSize: 26, lineHeight: 1.3, letterSpacing: "-0.012em", color: MUTED }}>{cell.text}</div>
          </div>
        );
      })}
      <Cursor t={t} x={you.x} y={you.y} name="You" color={BLUE} clicks={[...b.clicks, T.manifesto.finds]} />
    </>
  );
}

/* ---------- o convite ---------- */

function Cta({ t }: { t: number }) {
  const c = T.cta;
  const logo = prog(t, c.in + 0.3, 0.6, pop);
  const button = prog(t, c.button, 0.6, pop);
  const pressed = t >= c.click && t < c.click + 0.13;
  const buttonY = 590;
  const you = pathAt(t, [{ t: c.in, x: 1500, y: 800 }, { t: c.url, x: 1500, y: 800 }, { t: c.click, x: 1284, y: buttonY + 86 }]);
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: 120, display: "flex", justifyContent: "center", opacity: Math.min(1, logo * 2), transform: logo < 1 ? `scale(${(0.8 + 0.2 * logo).toFixed(3)})` : undefined }}><Lockup size={76} id="film-cta" /></div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 262 }}>
        <Words t={t} at={c.title} text="See where your edit" size={122} color={CREAM} />
        <Words t={t} at={c.title + 0.25} text="loses viewers." size={122} color="#FFB98C" />
      </div>
      <div style={{ position: "absolute", left: 600, top: buttonY, width: 720, height: 116, borderRadius: 58, background: CREAM, color: BLUE, display: "flex", alignItems: "center", justifyContent: "center", gap: 18, fontFamily: SANS, fontSize: 44, fontWeight: 700, letterSpacing: "-0.025em", opacity: Math.min(1, button * 2), transform: button < 1 ? `scale(${(0.86 + 0.14 * button).toFixed(3)})` : pressed ? "scale(0.97)" : undefined, boxShadow: "0 24px 70px rgba(5,15,50,0.4)" }}>
        Analyze your video for free <span>→</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 742 }}><Words t={t} at={c.note} text="No account · No card · Results in ~3 min" size={36} weight={500} color="rgba(251,243,230,0.8)" stagger={0.02} style={{ letterSpacing: "-0.01em" }} /></div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 828, textAlign: "center", fontFamily: MONO, fontSize: 68, fontWeight: 700, letterSpacing: "-0.03em", color: CREAM, opacity: prog(t, c.url, 0.5) }}>getpublishub.com</div>
      <Cursor t={t} x={you.x} y={you.y} name="You" color={BLUE} light clicks={[c.in, c.click]} />
    </>
  );
}

export function Film({ sound = true }: { sound?: boolean }) {
  const t = useCurrentFrame() / T.fps;
  const m = T.manifesto;
  const center: CSSProperties = { position: "absolute", left: 0, right: 0, top: 420, display: "flex", justifyContent: "center" };
  const applyAt = screenOf(apply.x + apply.w / 2, apply.y + apply.h / 2, camAt(C.out));
  return (
    <AbsoluteFill style={{ background: PAPER, overflow: "hidden" }}>
      {sound && <Audio src={staticFile("film/soundtrack.wav")} />}
      {t < T.reveal.at + 0.8 && <Problem t={t} />}
      <Burst t={t} at={T.reveal.at} until={T.result.in + 0.8} x={960} y={525} bg={WALL}>
        {t < T.reveal.out && <Reveal t={t} />}
        {t >= U.in && <Product t={t} />}
      </Burst>
      <Burst t={t} at={T.result.in} until={P.in + 0.8} x={applyAt.x} y={applyAt.y} bg={PAPER}><Result t={t} /></Burst>
      <Burst t={t} at={P.in} until={T.bento.in + 0.8} x={NEXT.x} y={NEXT.y} bg={WALL}><PlanStep t={t} /></Burst>
      <Burst t={t} at={T.bento.in} until={m.finds + 0.8} x={NEXT.x} y={NEXT.y} bg={PAPER}><Bento t={t} /></Burst>
      <Burst t={t} at={m.finds} until={m.decide + 0.8} x={cellX(5) + CW - 90} y={cellY(5) + 60} bg={INK}>
        <div style={center}><Words t={t} at={m.finds + 0.25} text="AI finds." size={200} stagger={0.12} color={CREAM} /></div>
        {(() => { const a = pathAt(t, [{ t: m.finds + 0.5, x: -80, y: 1140 }, { t: m.finds + 1.3, x: 620, y: 700 }]); return <Cursor t={t} x={a.x} y={a.y} name="Publishub AI" color={AI} />; })()}
        {(() => { const a = pathAt(t, [{ t: m.finds, x: cellX(5) + CW - 90, y: cellY(5) + 60 }, { t: m.finds + 0.9, x: cellX(5) + CW - 90, y: cellY(5) + 60 }, { t: m.decide, x: 1500, y: 760 }]); return <Cursor t={t} x={a.x} y={a.y} name="You" color={BLUE} clicks={[m.decide]} />; })()}
      </Burst>
      <Burst t={t} at={m.decide} until={m.editor + 0.8} x={1500} y={760} bg={WALL}>
        <div style={center}><Words t={t} at={m.decide + 0.25} text="You decide." size={200} stagger={0.12} color={CREAM} /></div>
        {(() => { const a = pathAt(t, [{ t: m.decide + 0.2, x: 1500, y: 760 }, { t: m.editor, x: 420, y: 800 }]); return <Cursor t={t} x={a.x} y={a.y} name="You" color={BLUE} light clicks={[m.decide, m.editor]} />; })()}
      </Burst>
      <Burst t={t} at={m.editor} until={m.out + 0.8} x={420} y={800} bg={PAPER}>
        <div style={center}><Words t={t} at={m.editor + 0.25} text="You stay the editor." size={160} stagger={0.12} /></div>
        {(() => { const a = pathAt(t, [{ t: m.editor + 0.2, x: 420, y: 800 }, { t: T.cta.in, x: 1500, y: 800 }]); return <Cursor t={t} x={a.x} y={a.y} name="You" color={BLUE} clicks={[m.editor, T.cta.in]} />; })()}
      </Burst>
      <Burst t={t} at={T.cta.in} until={T.durationInFrames / T.fps + 1} x={1500} y={800} bg={WALL}><Cta t={t} /></Burst>
    </AbsoluteFill>
  );
}
