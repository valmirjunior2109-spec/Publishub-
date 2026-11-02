// O filme de lançamento da Publishub, 1920 × 1080, 60 fps, 74 s. Cinco atos: o problema de quem edita,
// a marca, o produto (telas reais, tema escuro, análise de exemplo), os recursos e o convite.
// Nada se move devagar enquanto há o que ler: o que entra para em posição inteira, e as luzes do fundo
// só mudam nas passagens de ato.

import { AbsoluteFill, Audio, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import type { CSSProperties, ReactNode } from "react";
import { Lockup } from "./Logo";
import R from "./rects.json";
import T from "./timeline.json";

const BG = "#08080A";
const INK = "#F6F0E4";
const MUTED = "rgba(246,240,228,0.62)";
const FAINT = "rgba(246,240,228,0.16)";
const BLUE = "#8FAAF0";
const HOT = "#FF8A4C";
const SANS = "Geist, system-ui, sans-serif";
const MONO = "'Geist Mono', ui-monospace, monospace";
const MARGIN = 96;

const out = Easing.bezier(0.16, 1, 0.3, 1);
const inOut = Easing.bezier(0.65, 0, 0.35, 1);
const prog = (t: number, at: number, dur: number, easing = out) => interpolate(t, [at, at + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Cada palavra entra sozinha e para. Sem recorte: nenhuma letra corre o risco de ficar cortada. */
function Words({ t, at, text, size, color = INK, weight = 700, stagger = 0.05, align = "left", style, hot }: { t: number; at: number; text: string; size: number; color?: string; weight?: number; stagger?: number; align?: CSSProperties["textAlign"]; style?: CSSProperties; hot?: string[] }) {
  return (
    <div style={{ fontFamily: SANS, fontSize: size, fontWeight: weight, lineHeight: 1.14, letterSpacing: "-0.04em", textAlign: align, color, ...style }}>
      {text.split(" ").map((word, i) => {
        const p = prog(t, at + i * stagger, 0.55);
        return (
          <span key={`${word}${i}`} style={{ display: "inline-block", marginRight: "0.24em", color: hot?.includes(word) ? HOT : undefined, opacity: p, transform: p < 1 ? `translateY(${Math.round((1 - p) * size * 0.4)}px)` : undefined, filter: p < 1 ? `blur(${((1 - p) * 10).toFixed(1)}px)` : undefined }}>
            {word}
          </span>
        );
      })}
    </div>
  );
}

function Kicker({ t, at, text, color = BLUE, align }: { t: number; at: number; text: string; color?: string; align?: CSSProperties["textAlign"] }) {
  const p = prog(t, at, 0.5);
  return <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600, letterSpacing: "0.1em", color, opacity: p, textAlign: align }}>{text}</div>;
}

/** Aparece e some em cortes curtos, sempre dentro do seu trecho. */
function Scene({ t, from, to, children, fade = 0.25 }: { t: number; from: number; to: number; children: ReactNode; fade?: number }) {
  if (t < from || t >= to) return null;
  const opacity = interpolate(t, [to - fade, to], [1, 0], clamp);
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
}

/* ---------- as luzes do fundo: paradas dentro de cada ato, mudam nas passagens ---------- */

const LIGHTS = [
  { at: 0, a: [1500, 120, 0.1], b: [300, 1000, 0.05] },
  { at: 9, a: [1600, 80, 0.05], b: [960, 1100, 0.14] },
  { at: 15.8, a: [960, 460, 0.24], b: [960, 900, 0.1] },
  { at: 21, a: [1650, 180, 0.24], b: [80, 1000, 0.12] },
  { at: 52, a: [300, 100, 0.2], b: [1700, 1050, 0.16] },
  { at: 59, a: [960, 1180, 0.32], b: [960, -100, 0.1] },
  { at: 65, a: [960, 420, 0.22], b: [960, 1000, 0.12] },
];

function Lights({ t }: { t: number }) {
  const layer = (key: "a" | "b") => {
    let [x, y, o] = LIGHTS[0][key];
    for (const light of LIGHTS.slice(1)) {
      const p = prog(t, light.at, 1.1, inOut);
      x += (light[key][0] - x) * p;
      y += (light[key][1] - y) * p;
      o += (light[key][2] - o) * p;
    }
    return { x: Math.round(x), y: Math.round(y), o };
  };
  const a = layer("a");
  const b = layer("b");
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: a.x - 900, top: a.y - 700, width: 1800, height: 1400, background: `radial-gradient(closest-side, rgba(77,116,240,${a.o.toFixed(3)}), transparent)` }} />
      <div style={{ position: "absolute", left: b.x - 800, top: b.y - 600, width: 1600, height: 1200, background: `radial-gradient(closest-side, rgba(255,138,76,${(b.o * 0.7).toFixed(3)}), transparent)` }} />
      <AbsoluteFill style={{ backgroundImage: `linear-gradient(rgba(246,240,228,0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(246,240,228,0.028) 1px, transparent 1px)`, backgroundSize: "96px 96px" }} />
    </AbsoluteFill>
  );
}

/* ---------- o cursor ---------- */

type Point = { t: number; x: number; y: number };

function cursorAt(t: number, path: Point[]) {
  let a = path[0];
  for (let i = 1; i < path.length; i++) {
    const b = path[i];
    if (t >= b.t) { a = b; continue; }
    const k = prog(t, a.t, b.t - a.t, inOut);
    return { x: Math.round(a.x + (b.x - a.x) * k), y: Math.round(a.y + (b.y - a.y) * k) };
  }
  return { x: a.x, y: a.y };
}

function Cursor({ t, path, clicks = [] }: { t: number; path: Point[]; clicks?: number[] }) {
  if (t < path[0].t) return null;
  const { x, y } = cursorAt(t, path);
  const click = clicks.find((c) => t >= c && t < c + 0.5);
  const pressed = clicks.some((c) => t >= c && t < c + 0.12);
  const ring = click === undefined ? 0 : prog(t, click, 0.5);
  return (
    <>
      {click !== undefined && <div style={{ position: "absolute", left: x - 56, top: y - 56, width: 112, height: 112, borderRadius: "50%", border: `3px solid ${BLUE}`, transform: `scale(${(0.2 + ring).toFixed(3)})`, opacity: 1 - ring }} />}
      <svg width={46} height={46} viewBox="0 0 24 24" style={{ position: "absolute", left: x - 6, top: y - 4, transform: pressed ? "scale(0.86)" : undefined, transformOrigin: "6px 4px", overflow: "visible" }}>
        <path d="M5 3 L5 19.5 L9.6 15.4 L12.6 22 L15.6 20.7 L12.6 14.2 L18.8 14.2 Z" fill="#fff" stroke="#111" strokeWidth={1.3} strokeLinejoin="round" />
      </svg>
    </>
  );
}

/* ---------- ato 1: o problema ---------- */

const TRACK_X = 360;
const TRACK_W = 1200;
const CLIPS: { row: number; a: number; b: number; len: number; color: string }[] = [
  { row: 0, a: 0, b: 0, len: 0.17, color: "#3A5CC7" },
  { row: 0, a: 0.18, b: 0.41, len: 0.22, color: "#4D74F0" },
  { row: 0, a: 0.41, b: 0.18, len: 0.22, color: "#2F4BA3" },
  { row: 0, a: 0.64, b: 0.64, len: 0.36, color: "#3A5CC7" },
  { row: 1, a: 0.06, b: 0.32, len: 0.26, color: "#C9824A" },
  { row: 1, a: 0.56, b: 0.68, len: 0.3, color: "#A96B39" },
  { row: 2, a: 0, b: 0, len: 1, color: "#3B3833" },
];

function playhead(t: number) {
  const p = T.problem;
  if (t < p.recut) return 0.7 * prog(t, 0.6, 2.2, inOut);
  if (t < p.watched) return 0.7 + (0.15 - 0.7) * prog(t, p.recut + 0.4, 0.5, inOut) + (0.8 - 0.15) * prog(t, p.recut + 1, 0.8, inOut);
  const loops = 7;
  return (((t - p.watched) / (p.posted - p.watched)) * loops) % 1;
}

function EditorTimeline({ t }: { t: number }) {
  const moved = prog(t, T.problem.recut + 0.05, 0.4, inOut);
  const x = Math.round(TRACK_X + playhead(t) * TRACK_W);
  const count = Math.max(1, Math.round(interpolate(t, [T.problem.watched, T.problem.posted - 0.25], [1, 47], clamp)));
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080 }}>
      {t >= T.problem.watched && <div style={{ position: "absolute", left: TRACK_X, top: 540, width: TRACK_W, textAlign: "right", fontFamily: MONO, fontSize: 28, fontWeight: 600, color: count === 47 ? HOT : MUTED }}>{`REWATCH #${String(count).padStart(2, "0")}`}</div>}
      {[0, 1, 2].map((row) => <div key={row} style={{ position: "absolute", left: TRACK_X, top: 590 + row * 84, width: TRACK_W, height: 72, borderRadius: 12, background: "rgba(246,240,228,0.04)" }} />)}
      {CLIPS.map((c, i) => {
        const reveal = prog(t, 0.25 + i * 0.09, 0.5);
        const left = Math.round(TRACK_X + (c.a + (c.b - c.a) * moved) * TRACK_W);
        return <div key={i} style={{ position: "absolute", left, top: 590 + c.row * 84, width: Math.round(c.len * TRACK_W * reveal), height: 72, borderRadius: 12, background: c.color, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)" }} />;
      })}
      <div style={{ position: "absolute", left: x - 2, top: 568, width: 4, height: 280, borderRadius: 2, background: INK, opacity: prog(t, 0.5, 0.3) }} />
    </div>
  );
}

const LINE_X0 = 130;
const LINE_X1 = 1790;
const LINE_XD = 960;
const lineY = (x: number) => {
  if (x <= LINE_XD) return 480 + (x - LINE_X0) * 0.03;
  if (x <= LINE_XD + 110) return 505 + 340 * (0.5 - Math.cos((Math.PI * (x - LINE_XD)) / 110) / 2);
  return 845 + (x - LINE_XD - 110) * 0.05;
};
const pts = (a: number, b: number) => {
  const list: string[] = [];
  for (let x = a; x < b; x += 6) list.push(`${x},${lineY(x).toFixed(1)}`);
  list.push(`${b},${lineY(b).toFixed(1)}`);
  return list.join(" ");
};

function RetentionLine({ t }: { t: number }) {
  const p = T.problem;
  const head = t < p.drop
    ? interpolate(t, [p.line, p.drop], [LINE_X0, LINE_XD], clamp)
    : t < p.drop + 0.16
      ? interpolate(t, [p.drop, p.drop + 0.16], [LINE_XD, LINE_XD + 110], clamp)
      : interpolate(t, [p.drop + 0.16, p.drop + 1.4], [LINE_XD + 110, LINE_X1], { ...clamp, easing: Easing.out(Easing.quad) });
  const dropped = t >= p.drop;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
      <polyline points={pts(LINE_X0, Math.min(head, LINE_XD))} fill="none" stroke={BLUE} strokeWidth={6} strokeLinecap="round" />
      {dropped && <polyline points={pts(LINE_XD, head)} fill="none" stroke={HOT} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />}
      {dropped && <circle cx={LINE_XD} cy={lineY(LINE_XD)} r={11} fill={HOT} />}
      {head < LINE_X1 && <circle cx={head} cy={lineY(head)} r={7} fill={INK} />}
    </svg>
  );
}

function Problem({ t }: { t: number }) {
  const p = T.problem;
  const center: CSSProperties = { position: "absolute", left: 0, right: 0, top: 300, display: "flex", justifyContent: "center" };
  const phone = prog(t, p.posted, 0.6);
  return (
    <>
      {t < p.posted && <EditorTimeline t={t} />}
      {t < p.recut && <div style={center}><Words t={t} at={p.cut} text="You cut it." size={108} align="center" /></div>}
      {t >= p.recut && t < p.watched && <div style={center}><Words t={t} at={p.recut} text="You recut it." size={108} align="center" /></div>}
      {t >= p.watched && t < p.posted && <div style={center}><Words t={t} at={p.watched} text="You watched it 47 times." size={108} align="center" /></div>}
      {t >= p.posted && t < p.line && (
        <>
          <div style={{ ...center, top: 170 }}><Words t={t} at={p.posted + 0.1} text="You posted it." size={108} align="center" /></div>
          <div style={{ position: "absolute", left: 830, top: 360 + Math.round((1 - phone) * 90), width: 260, height: 462, borderRadius: 34, border: `3px solid ${FAINT}`, background: "linear-gradient(170deg, #1B2A58, #14110E)", opacity: phone, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width={72} height={72} viewBox="0 0 24 24"><path d="M8 5 L19 12 L8 19 Z" fill={INK} /></svg>
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 848, textAlign: "center", fontFamily: MONO, fontSize: 28, fontWeight: 600, color: BLUE, opacity: prog(t, p.posted + 0.6, 0.4) }}>POSTED ✓</div>
        </>
      )}
      {t >= p.line && <RetentionLine t={t} />}
      {t >= p.left && t < p.where && <div style={{ ...center, top: 170 }}><Words t={t} at={p.left} text="Somewhere in there, people left." size={92} align="center" hot={["left."]} /></div>}
      {t >= p.where && <div style={{ ...center, top: 170 }}><Words t={t} at={p.where} text="Nobody tells you where." size={108} align="center" /></div>}
    </>
  );
}

/* ---------- ato 2: a marca ---------- */

function Reveal({ t }: { t: number }) {
  const r = T.reveal;
  const p = prog(t, r.logo, 0.9);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 360, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ opacity: Math.min(1, p * 1.6), transform: p < 1 ? `scale(${(0.9 + p * 0.1).toFixed(4)})` : undefined }}>
        <Lockup size={150} id="film-reveal" />
      </div>
      <div style={{ marginTop: 56 }}><Words t={t} at={r.tagline} text="Your AI editing copilot." size={64} weight={600} color={BLUE} align="center" /></div>
      <div style={{ marginTop: 20 }}><Words t={t} at={r.who} text="For people who edit Reels, TikToks and Shorts." size={38} weight={500} color={MUTED} align="center" stagger={0.03} /></div>
    </div>
  );
}

/* ---------- ato 3: o produto ---------- */

const STEPS = ["Upload", "Analyze", "Find", "Cut", "Fix"];
const STEP_AT = [T.upload.in, T.analyze.in, T.find.in, T.cuts.in, T.plan.in];

function Nav({ t }: { t: number }) {
  const active = STEP_AT.reduce((acc, at, i) => (t >= at ? i : acc), 0);
  return (
    <div style={{ position: "absolute", left: MARGIN, top: 1012, display: "flex", gap: 34, fontFamily: MONO, fontSize: 20, fontWeight: 600, letterSpacing: "0.04em" }}>
      {STEPS.map((step, i) => <span key={step} style={{ color: i === active ? INK : "rgba(246,240,228,0.32)" }}>{`${i + 1} ${step}`}</span>)}
    </div>
  );
}

const WIN_X = 700;
const WIN_W = 1124;
const BAR = 44;

type Crop = { x: number; w: number };

function Window({ t, at, src, crop, y, h, pan = 0, url, example, children }: { t: number; at: number; src: string; crop: Crop; y: number; h: number; pan?: number; url: string; example?: boolean; children?: ReactNode }) {
  const p = prog(t, at, 0.8);
  const s = WIN_W / crop.w;
  return (
    <div style={{ position: "absolute", left: WIN_X, top: y, width: WIN_W, height: h + BAR, opacity: Math.min(1, p * 1.8), transform: p < 1 ? `perspective(2400px) translateX(${Math.round((1 - p) * 110)}px) rotateY(${(-16 * (1 - p)).toFixed(3)}deg)` : undefined, transformOrigin: "left center" }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 20, overflow: "hidden", border: `1px solid ${FAINT}`, background: "#14110E", boxShadow: "0 40px 120px rgba(0,0,0,0.6), 0 0 90px rgba(77,116,240,0.14)" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: BAR, display: "flex", alignItems: "center", gap: 9, padding: "0 18px", background: "#1A1714", borderBottom: `1px solid ${FAINT}` }}>
          {[0, 1, 2].map((i) => <span key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(246,240,228,0.2)" }} />)}
          <span style={{ marginLeft: 16, fontFamily: MONO, fontSize: 17, color: MUTED }}>{url}</span>
          {example && <span style={{ marginLeft: "auto", padding: "3px 12px", borderRadius: 999, border: `1px solid ${FAINT}`, fontFamily: MONO, fontSize: 15, fontWeight: 600, letterSpacing: "0.06em", color: INK }}>EXAMPLE</span>}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: BAR, bottom: 0, overflow: "hidden" }}>
          <Img src={staticFile(`film/${src}.png`)} style={{ position: "absolute", left: Math.round(-crop.x * s), top: Math.round(-pan * s), width: Math.round(1440 * s), maxWidth: "none" }} />
          {children}
        </div>
      </div>
    </div>
  );
}

function Ring({ t, at, until, x, y, w, h }: { t: number; at: number; until: number; x: number; y: number; w: number; h: number }) {
  if (t < at || t >= until) return null;
  const p = prog(t, at, 0.35);
  return <div style={{ position: "absolute", left: Math.round(x), top: Math.round(y), width: Math.round(w), height: Math.round(h), borderRadius: 14, border: `3px solid ${HOT}`, opacity: p, transform: p < 1 ? `scale(${(1.05 - 0.05 * p).toFixed(3)})` : undefined, boxShadow: "0 0 34px rgba(255,138,76,0.28)" }} />;
}

function Copy({ t, at, kicker, title, lead, hot }: { t: number; at: number; kicker: string; title: string; lead: string; hot?: string[] }) {
  return (
    <div style={{ position: "absolute", left: MARGIN, top: 300, width: 560 }}>
      <Kicker t={t} at={at} text={kicker} />
      <div style={{ marginTop: 26 }}><Words t={t} at={at + 0.1} text={title} size={70} hot={hot} /></div>
      <div style={{ marginTop: 28 }}><Words t={t} at={at + 0.4} text={lead} size={30} weight={400} color={MUTED} stagger={0.015} style={{ letterSpacing: "-0.015em", lineHeight: 1.34 }} /></div>
    </div>
  );
}

function UploadScene({ t }: { t: number }) {
  const u = T.upload;
  const crop = { x: 318, w: 1060 };
  const s = WIN_W / crop.w;
  const y = 130;
  const gx = (x: number) => Math.round(WIN_X + (x - crop.x) * s);
  const gy = (v: number) => Math.round(y + BAR + (v - 16) * s);
  const dropped = t >= u.drop;
  const zone = R.dropzone;
  const analyze = R.analyze;
  const path: Point[] = [
    { t: u.in + 0.7, x: 1900, y: 1040 },
    { t: u.drop, x: gx(zone.x + zone.w / 2), y: gy(zone.y + zone.h / 2) },
    { t: u.drop + 0.5, x: gx(zone.x + zone.w / 2), y: gy(zone.y + zone.h / 2) },
    { t: u.click, x: gx(analyze.x + analyze.w / 2), y: gy(analyze.y + analyze.h / 2) },
  ];
  // o arquivo chega junto com o cursor, e some na zona de envio
  const c = cursorAt(t, path);
  return (
    <>
      <Copy t={t} at={u.in} kicker="01 UPLOAD" title="Drop your cut." lead="MP4, MOV or WEBM, up to 500 MB. Straight from the editor you already use." />
      <Window t={t} at={u.in} src={dropped ? "upload_file" : "upload_empty"} crop={crop} y={y} h={Math.round(556 * s)} pan={16} url="getpublishub.com/new-analysis" />
      {t >= u.in + 0.7 && !dropped && <div style={{ position: "absolute", left: c.x - 150, top: c.y + 30, width: 300, height: 56, borderRadius: 12, background: "#23201C", border: `1px solid ${BLUE}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 20, color: INK }}>client_cut_v7.mp4</div>}
      <Cursor t={t} path={path} clicks={[u.drop, u.click]} />
    </>
  );
}

function AnalyzeScene({ t }: { t: number }) {
  const a = T.analyze;
  const state = ["processing_received", "processing_transcribing", "processing_aligning", "processing_diagnosing"][a.steps.reduce((acc, at, i) => (t >= at ? i : acc), 0)];
  const crop = { x: 532, w: 892 };
  const s = WIN_W / crop.w;
  const seconds = Math.round(interpolate(t, [a.in + 0.3, a.out - 0.5], [0, 174], clamp));
  return (
    <>
      <Copy t={t} at={a.in} kicker="02 ANALYZE" title="It listens to every line." lead="Transcribes your speech with the timing of each sentence, and measures pauses and scene cuts in the file itself." />
      <div style={{ position: "absolute", left: MARGIN, top: 760, fontFamily: MONO, fontWeight: 700, fontSize: 84, letterSpacing: "-0.04em", color: BLUE }}>{`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}</div>
      <div style={{ position: "absolute", left: MARGIN + 4, top: 862, fontFamily: MONO, fontSize: 22, color: MUTED }}>ABOUT 3 MINUTES</div>
      <Window t={t} at={a.in} src={state} crop={crop} y={170} h={Math.round(494 * s)} pan={97} url="getpublishub.com/results" />
    </>
  );
}

function FindScene({ t }: { t: number }) {
  const f = T.find;
  const crop = { x: 532, w: 892 };
  const s = WIN_W / crop.w;
  const pan = 97;
  const box = (x: number, y: number, w: number, h: number) => ({ x: (x - crop.x) * s, y: (y - pan) * s, w: w * s, h: h * s });
  const row = (label: string, at: number, color: string) => {
    const p = prog(t, at, 0.5);
    return <div style={{ fontFamily: SANS, fontSize: 66, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1.16, color: t >= at ? color : "rgba(246,240,228,0.2)", transform: p < 1 && t >= at ? `translateX(${Math.round((1 - p) * 26)}px)` : undefined }}>{label}</div>;
  };
  return (
    <>
      <div style={{ position: "absolute", left: MARGIN, top: 300, width: 560 }}>
        <Kicker t={t} at={f.in} text="03 FIND" />
        <div style={{ marginTop: 26 }}>
          {row("The second.", f.second, t >= f.line ? INK : HOT)}
          {row("The line.", f.line, t >= f.reason ? INK : HOT)}
          {row("The reason.", f.reason, HOT)}
        </div>
        <div style={{ marginTop: 32 }}><Words t={t} at={f.reason + 0.3} text="Where viewers are likely to leave, what you were saying, and what to test instead." size={30} weight={400} color={MUTED} stagger={0.015} style={{ letterSpacing: "-0.015em", lineHeight: 1.34 }} /></div>
      </div>
      <Window t={t} at={f.in} src="result_pending" crop={crop} y={260} h={Math.round(410 * s)} pan={pan} url="getpublishub.com/results" example>
        <Ring t={t} at={f.second} until={f.line} {...box(565, 158, 92, 46)} />
        <Ring t={t} at={f.line} until={f.reason} {...box(755, 134, 625, 82)} />
        <Ring t={t} at={f.reason} until={f.out} {...box(562, 252, 826, 104)} />
      </Window>
    </>
  );
}

function CutsScene({ t }: { t: number }) {
  const c = T.cuts;
  const crop = { x: 532, w: 892 };
  const s = WIN_W / crop.w;
  const y = 92;
  const pan = 490 + (843 - 490) * prog(t, c.pan, 0.7, inOut);
  const accepted = t >= c.acceptAll + 0.1;
  const gx = (x: number) => Math.round(WIN_X + (x - crop.x) * s);
  const gy = (v: number, p: number) => Math.round(y + BAR + (v - p) * s);
  const all = R.acceptAll;
  const apply = R.applyAccepted;
  const path: Point[] = [
    { t: c.in + 0.8, x: 1900, y: 1040 },
    { t: c.acceptAll, x: gx(all.x + all.w / 2), y: gy(all.y + all.h / 2, 490) },
    { t: c.pan + 0.1, x: gx(all.x + all.w / 2), y: gy(all.y + all.h / 2, 490) },
    { t: c.apply, x: gx(apply.x + apply.w / 2), y: gy(apply.y + apply.h / 2, 843) },
  ];
  return (
    <>
      <Copy t={t} at={c.in} kicker="04 CUT" title="Dead moments out. You approve." lead="Accept, reject or adjust each cut. Nothing is cut until you apply, and your original stays untouched." />
      <Window t={t} at={c.in} src={accepted ? "result_accepted" : "result_pending"} crop={crop} y={y} h={Math.round(644 * s)} pan={pan} url="getpublishub.com/results" example />
      <Cursor t={t} path={path} clicks={[c.acceptAll, c.apply]} />
    </>
  );
}

function ResultScene({ t }: { t: number }) {
  const r = T.result;
  const n = Math.round(interpolate(t, [r.in + 0.2, r.in + 1.1], [41, 32], clamp));
  const done = t >= r.in + 1.1;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 290, textAlign: "center" }}>
      <Kicker t={t} at={r.in} text="EDITED VIDEO READY · EXAMPLE" align="center" />
      <div style={{ marginTop: 22, fontFamily: MONO, fontSize: 250, fontWeight: 700, letterSpacing: "-0.06em", lineHeight: 1.1, color: done ? BLUE : INK }}>{`0:${n}`}</div>
      <div style={{ marginTop: 28 }}><Words t={t} at={r.in + 1.2} text="9.3 s of dead moments, gone." size={62} align="center" /></div>
      <div style={{ marginTop: 14 }}><Words t={t} at={r.in + 1.5} text="Your original is still in your account, exactly as you sent it." size={32} weight={400} color={MUTED} align="center" stagger={0.015} style={{ letterSpacing: "-0.015em" }} /></div>
    </div>
  );
}

function PlanScene({ t }: { t: number }) {
  const p = T.plan;
  const crop = { x: 532, w: 892 };
  const s = WIN_W / crop.w;
  const pan = 1510 + 270 * prog(t, p.pan[0], 0.6, inOut) + 270 * prog(t, p.pan[1], 0.6, inOut);
  return (
    <>
      <Copy t={t} at={p.in} kicker="05 FIX" title="A fix plan, in order of impact." lead="What to change, at which second and why, with notes for CapCut, Premiere or DaVinci." />
      <Window t={t} at={p.in} src="result_plan" crop={crop} y={92} h={Math.round(644 * s)} pan={pan} url="getpublishub.com/results" example />
    </>
  );
}

/* ---------- ato 3b: em volta da edição ---------- */

function Cell({ t, at, x, y, w, h, title, text, children }: { t: number; at: number; x: number; y: number; w: number; h: number; title: string; text: string; children?: ReactNode }) {
  const p = prog(t, at, 0.7);
  return (
    <div style={{ position: "absolute", left: x, top: y + Math.round((1 - p) * 50), width: w, height: h, borderRadius: 26, border: `1px solid ${FAINT}`, background: "rgba(246,240,228,0.035)", opacity: p, overflow: "hidden", boxSizing: "border-box", padding: 36 }}>
      <div style={{ height: 130 }}>{children}</div>
      <div style={{ marginTop: 26, fontFamily: SANS, fontSize: 36, fontWeight: 700, letterSpacing: "-0.03em", color: INK }}>{title}</div>
      <div style={{ marginTop: 10, fontFamily: SANS, fontSize: 25, lineHeight: 1.32, letterSpacing: "-0.012em", color: MUTED }}>{text}</div>
    </div>
  );
}

function Pill({ text, tone = "line" }: { text: string; tone?: "line" | "blue" | "hot" }) {
  const color = tone === "blue" ? BLUE : tone === "hot" ? HOT : INK;
  return <span style={{ display: "inline-block", marginRight: 10, marginBottom: 10, padding: "8px 18px", borderRadius: 999, border: `1px solid ${tone === "line" ? FAINT : color}`, fontFamily: SANS, fontSize: 25, fontWeight: 600, letterSpacing: "-0.01em", color }}>{text}</span>;
}

function Bento({ t }: { t: number }) {
  const b = T.bento;
  const gap = 24;
  const w = Math.round((1920 - MARGIN * 2 - gap * 2) / 3);
  const h = 372;
  const top = 212;
  const col = (i: number) => MARGIN + i * (w + gap);
  const row = (i: number) => top + i * (h + gap);
  return (
    <>
      <div style={{ position: "absolute", left: MARGIN, top: 92 }}><Words t={t} at={b.in} text="Everything around the edit." size={82} /></div>
      <Cell t={t} at={b.in + 0.5} x={col(0)} y={row(0)} w={w} h={h} title="It remembers you" text="What you accept, reject and ask for shapes your next analysis.">
        <Pill text="cuts you accept" tone="blue" /><Pill text="cuts you reject" /><Pill text="what you ask for" />
      </Cell>
      <Cell t={t} at={b.in + 0.65} x={col(1)} y={row(0)} w={w} h={h} title="Keeps your editor" text="No new editor to learn. Take the notes back to the app you already use.">
        <Pill text="CapCut" /><Pill text="Premiere Pro" /><Pill text="DaVinci Resolve" />
      </Cell>
      <Cell t={t} at={b.in + 0.8} x={col(2)} y={row(0)} w={w} h={h} title="11 languages" text="The site and your analysis, in the language you work in.">
        <div style={{ fontFamily: MONO, fontSize: 104, fontWeight: 700, letterSpacing: "-0.05em", lineHeight: 1.1, color: BLUE }}>11</div>
      </Cell>
      <Cell t={t} at={b.in + 0.95} x={col(0)} y={row(1)} w={w} h={h} title="Share the result" text="A public link and a card for your Stories. The video and the full plan stay private.">
        <Pill text="0:04 · drop" tone="hot" /><Pill text="Stories card" /><Pill text="public link" />
      </Cell>
      <Cell t={t} at={b.in + 1.1} x={col(1)} y={row(1)} w={w} h={h} title="Send it to Notion" text="Take the analysis out of Publishub and into the place where you plan your work.">
        <Pill text="Publishub  →  Notion" />
      </Cell>
      <Cell t={t} at={b.in + 1.25} x={col(2)} y={row(1)} w={w} h={h} title="Private by default" text="Private storage. Never sold, and never used to train models of our own.">
        <svg width={92} height={110} viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2.5" /><path d="M8 11 V7.5 a4 4 0 0 1 8 0 V11" /></svg>
      </Cell>
    </>
  );
}

/* ---------- ato 4: a ideia ---------- */

function Manifesto({ t }: { t: number }) {
  const m = T.manifesto;
  const box: CSSProperties = { position: "absolute", left: 0, right: 0, top: 420, display: "flex", justifyContent: "center" };
  return (
    <>
      {t < m.decide && <div style={box}><Words t={t} at={m.finds} text="AI finds." size={190} align="center" stagger={0.12} /></div>}
      {t >= m.decide && t < m.editor && <div style={box}><Words t={t} at={m.decide} text="You decide." size={190} align="center" stagger={0.12} color={BLUE} /></div>}
      {t >= m.editor && <div style={box}><Words t={t} at={m.editor} text="You stay the editor." size={150} align="center" stagger={0.12} /></div>}
    </>
  );
}

/* ---------- ato 5: o convite ---------- */

function Cta({ t }: { t: number }) {
  const c = T.cta;
  const logo = prog(t, c.in, 0.8);
  const button = prog(t, c.button, 0.7);
  const pressed = t >= c.click && t < c.click + 0.12;
  const buttonY = 590;
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: 130, display: "flex", justifyContent: "center", opacity: logo }}><Lockup size={72} id="film-cta" /></div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 262 }}>
        <Words t={t} at={c.title} text="See where your edit" size={118} align="center" />
        <Words t={t} at={c.title + 0.25} text="loses viewers." size={118} align="center" color={HOT} />
      </div>
      <div style={{ position: "absolute", left: 610, top: buttonY + Math.round((1 - button) * 40), width: 700, height: 112, borderRadius: 56, background: BLUE, color: "#0E0E12", display: "flex", alignItems: "center", justifyContent: "center", gap: 18, fontFamily: SANS, fontSize: 42, fontWeight: 700, letterSpacing: "-0.025em", opacity: button, transform: pressed ? "scale(0.975)" : undefined, boxShadow: "0 0 90px rgba(143,170,240,0.32)" }}>
        Analyze your video for free <span>→</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 734 }}><Words t={t} at={c.note} text="No account · No card · Results in ~3 min" size={34} weight={500} color={MUTED} align="center" stagger={0.02} style={{ letterSpacing: "-0.01em" }} /></div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 826, textAlign: "center", fontFamily: MONO, fontSize: 64, fontWeight: 700, letterSpacing: "-0.03em", color: INK, opacity: prog(t, c.url, 0.7) }}>getpublishub.com</div>
      <Cursor t={t} path={[{ t: c.url + 0.1, x: 1900, y: 1060 }, { t: c.click, x: 1284, y: buttonY + 86 }]} clicks={[c.click]} />
    </>
  );
}

export function Film({ sound = true }: { sound?: boolean }) {
  const frame = useCurrentFrame();
  const t = frame / T.fps;
  const tour = t >= T.upload.in && t < T.bento.in && !(t >= T.result.in && t < T.result.out);
  return (
    <AbsoluteFill style={{ background: BG, overflow: "hidden" }}>
      <Lights t={t} />
      {sound && <Audio src={staticFile("film/soundtrack.wav")} />}
      <Scene t={t} from={0} to={T.problem.out} fade={0.5}><Problem t={t} /></Scene>
      <Scene t={t} from={T.reveal.logo} to={T.reveal.out}><Reveal t={t} /></Scene>
      <Scene t={t} from={T.upload.in} to={T.upload.out}><UploadScene t={t} /></Scene>
      <Scene t={t} from={T.analyze.in} to={T.analyze.out}><AnalyzeScene t={t} /></Scene>
      <Scene t={t} from={T.find.in} to={T.find.out}><FindScene t={t} /></Scene>
      <Scene t={t} from={T.cuts.in} to={T.cuts.out}><CutsScene t={t} /></Scene>
      <Scene t={t} from={T.result.in} to={T.result.out}><ResultScene t={t} /></Scene>
      <Scene t={t} from={T.plan.in} to={T.plan.out}><PlanScene t={t} /></Scene>
      {tour && <Nav t={t} />}
      <Scene t={t} from={T.bento.in} to={T.bento.out}><Bento t={t} /></Scene>
      <Scene t={t} from={T.manifesto.finds} to={T.manifesto.out}><Manifesto t={t} /></Scene>
      <Scene t={t} from={T.cta.in} to={T.durationInFrames / T.fps + 1}><Cta t={t} /></Scene>
    </AbsoluteFill>
  );
}
