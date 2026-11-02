// O filme de lançamento da Publishub, 1920 × 1080, 60 fps, 62 s, cortado no tempo da música (122 BPM).
// A forma vem dos filmes de lançamento de Linear, Framer e Cursor: o produto de verdade, enorme e inclinado em 3D, com
// foco raso, e cartões de uma frase digitada entre um trecho e outro. Tudo aqui é contado em tempos da música.
// Os movimentos arrancam rápido e param de vez: parado, nada se move, e nada treme.

import { AbsoluteFill, Audio, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import type { ReactNode } from "react";
import { Lockup } from "./Logo";
import R from "./rects.json";
import T from "./timeline.json";

const BEAT = 60 / T.bpm;
const BLACK = "#0B0A09";
const WHITE = "#FFFFFF";
const BROWN = "#C8A27C";
const INK = "#111111";
const SANS = "Geist, system-ui, sans-serif";
const MONO = "'Geist Mono', ui-monospace, monospace";

const settle = Easing.bezier(0.12, 0.85, 0.15, 1); // arranca rápido, desacelera longo, sem quicar
const glide = Easing.bezier(0.5, 0, 0.1, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const prog = (b: number, at: number, dur: number, easing = settle) => (dur <= 0 ? (b >= at ? 1 : 0) : interpolate(b, [at, at + dur], [0, 1], { ...clamp, easing }));

/* ---------- os cartões: uma frase, digitada ---------- */

const BG = { white: { bg: WHITE, ink: INK }, brown: { bg: BROWN, ink: INK }, black: { bg: BLACK, ink: WHITE } };

function Typed({ b, at, text, size = 104, color, beats = 0.9 }: { b: number; at: number; text: string; size?: number; color: string; beats?: number }) {
  const n = Math.ceil(interpolate(b, [at, at + beats], [0, text.length], clamp));
  const typing = b >= at && n < text.length;
  // o texto inteiro ocupa o lugar desde o começo: as letras aparecem sem empurrar a frase
  return (
    <div style={{ fontFamily: SANS, fontSize: size, fontWeight: 500, lineHeight: 1.16, letterSpacing: "-0.035em", color, textAlign: "center", whiteSpace: "pre" }}>
      <span>{text.slice(0, n)}</span>
      {typing && <span style={{ display: "inline-block", width: 0, position: "relative" }}><span style={{ position: "absolute", left: 4, top: "-0.82em", width: Math.max(4, size * 0.05), height: "0.98em", background: color }} /></span>}
      <span style={{ visibility: "hidden" }}>{text.slice(n)}</span>
    </div>
  );
}

function Card({ b, from, to, text, bg }: { b: number; from: number; to: number; text: string; bg: keyof typeof BG }) {
  if (b < from || b >= to) return null;
  const c = BG[bg];
  return (
    <AbsoluteFill style={{ background: c.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Typed b={b} at={from + 0.05} text={text} color={c.ink} />
    </AbsoluteFill>
  );
}

/* ---------- o produto em 3D ---------- */

type Key = { b: number; d: number; x: number; y: number; s: number; rx: number; ry: number; rz: number };
type Pose = Omit<Key, "b" | "d">;

function poseAt(b: number, keys: Key[]): Pose {
  let { x, y, s, rx, ry, rz } = keys[0];
  for (const k of keys.slice(1)) {
    const p = prog(b, k.b, k.d);
    x += (k.x - x) * p;
    y += (k.y - y) * p;
    s += (k.s - s) * p;
    rx += (k.rx - rx) * p;
    ry += (k.ry - ry) * p;
    rz += (k.rz - rz) * p;
  }
  return { x, y, s, rx, ry, rz };
}

const camera = (p: Pose) => `translate(960px, 540px) perspective(1700px) rotateX(${p.rx}deg) rotateY(${p.ry}deg) rotateZ(${p.rz}deg) scale(${p.s}) translate(${-p.x}px, ${-p.y}px)`;

type Crop = { x: number; y: number; w: number; h: number };

function Plate({ pose, name, crop, blur }: { pose: Pose; name: string; crop: Crop; blur?: boolean }) {
  return (
    <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: camera(pose) }}>
      <Img src={staticFile(`film/plates/${name}${blur ? "-blur.jpg" : ".png"}`)} style={{ position: "absolute", left: crop.x, top: crop.y, width: crop.w, height: crop.h, maxWidth: "none", borderRadius: 10 }} />
    </div>
  );
}

/** O plano de produto: o quadro nítido no centro, o desfocado nas bordas e a luz marrom atrás. */
function Shot({ b, keys, name, crop, focus = "48% 42%", children, example = true }: { b: number; keys: Key[]; name: string; crop: Crop; focus?: string; children?: (pose: Pose) => ReactNode; example?: boolean }) {
  const pose = poseAt(b, keys);
  const mask = `radial-gradient(ellipse ${focus} at 50% 50%, transparent 58%, black 100%)`;
  return (
    <AbsoluteFill style={{ background: BLACK, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: "radial-gradient(1100px 760px at 50% 50%, rgba(200,162,124,0.16), transparent 72%)" }} />
      <Plate pose={pose} name={name} crop={crop} />
      <AbsoluteFill style={{ maskImage: mask, WebkitMaskImage: mask }}>
        <AbsoluteFill style={{ background: BLACK }} />
        <Plate pose={pose} name={name} crop={crop} blur />
      </AbsoluteFill>
      {children?.(pose)}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 72% 72% at 50% 50%, transparent 55%, rgba(5,4,3,0.6) 100%)" }} />
      {example && <span style={{ position: "absolute", right: 40, bottom: 34, fontFamily: MONO, fontSize: 20, fontWeight: 600, letterSpacing: "0.08em", color: "rgba(255,255,255,0.55)" }}>EXAMPLE ANALYSIS</span>}
    </AbsoluteFill>
  );
}

/* ---------- o cursor tradicional, no plano da tela ---------- */

type Point = { b: number; x: number; y: number };

function pathAt(b: number, path: Point[]) {
  let a = path[0];
  for (let i = 1; i < path.length; i++) {
    const n = path[i];
    if (b >= n.b) { a = n; continue; }
    const k = prog(b, a.b, n.b - a.b, glide);
    return { x: a.x + (n.x - a.x) * k, y: a.y + (n.y - a.y) * k };
  }
  return { x: a.x, y: a.y };
}

function Arrow({ b, x, y, size, clicks = [] }: { b: number; x: number; y: number; size: number; clicks?: number[] }) {
  const pressed = clicks.some((c) => b >= c && b < c + 0.25);
  const click = clicks.find((c) => b >= c && b < c + 1);
  const ring = click === undefined ? 0 : prog(b, click, 1);
  return (
    <>
      {click !== undefined && <div style={{ position: "absolute", left: x - size * 1.6, top: y - size * 1.6, width: size * 3.2, height: size * 3.2, borderRadius: "50%", border: `${size * 0.08}px solid ${BROWN}`, boxSizing: "border-box", transform: `scale(${(0.2 + ring).toFixed(3)})`, opacity: 1 - ring }} />}
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ position: "absolute", left: x - size * 0.125, top: y - size * 0.06, overflow: "visible", transform: pressed ? "scale(0.86)" : undefined, transformOrigin: "12% 6%" }}>
        <path d="M3 1.5 L3 19.2 L7.4 15 L10.4 22 L13.3 20.8 L10.3 13.9 L16.4 13.9 Z" fill="#fff" stroke="#000" strokeWidth={1.3} strokeLinejoin="miter" />
      </svg>
    </>
  );
}

/** O cursor anda no mesmo plano da tela: inclina e cresce junto com ela. */
function OnPlate({ pose, children }: { pose: Pose; children: ReactNode }) {
  return <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: camera(pose) }}>{children}</div>;
}

/* ---------- as cenas ---------- */

const UPLOAD: Crop = { x: 300, y: 20, w: 1100, h: 660 };
const PROC: Crop = { x: 532, y: 97, w: 892, h: 494 };
const TOP: Crop = { x: 532, y: 97, w: 892, h: 410 };
const CUTS: Crop = { x: 532, y: 490, w: 892, h: 980 };
const DONE: Crop = { x: 770, y: 610, w: 640, h: 180 };
const PLAN: Crop = { x: 532, y: 1510, w: 892, h: 1000 };
const REWRITES: Crop = { x: 532, y: 1470, w: 892, h: 420 };

const [DROP, ANALYZE, ACCEPT, APPLY, GO] = T.clicks;
const zone = R.dropzone;
const analyze = { x: R.analyze.x + R.analyze.w - 14, y: R.analyze.y + R.analyze.h - 8 };
const accept = { x: R.acceptAll.x + R.acceptAll.w - 10, y: R.acceptAll.y + R.acceptAll.h - 6 };
const apply = { x: R.applyAccepted.x + R.applyAccepted.w - 24, y: R.applyAccepted.y + R.applyAccepted.h - 6 };

function Upload({ b }: { b: number }) {
  const center = { x: zone.x + zone.w / 2, y: zone.y + zone.h / 2 };
  const keys: Key[] = [
    { b: 16, d: 0, x: 850, y: 420, s: 0.72, rx: 42, ry: -18, rz: 16 },
    { b: 16, d: 2.6, x: 850, y: 350, s: 1.28, rx: 24, ry: -12, rz: 7 },
    { b: 18.5, d: 2.5, x: center.x + 40, y: center.y + 40, s: 2.05, rx: 16, ry: -9, rz: 4 },
    { b: 22.5, d: 2.8, x: analyze.x - 30, y: analyze.y - 20, s: 2.9, rx: 14, ry: -10, rz: 3 },
  ];
  const you = pathAt(b, [{ b: 17, x: 1500, y: 720 }, { b: DROP, ...center }, { b: DROP + 1.5, ...center }, { b: ANALYZE, ...analyze }]);
  return (
    <Shot b={b} keys={keys} name={b >= DROP ? "upload_file" : "upload_empty"} crop={UPLOAD} example={false}>
      {(pose) => (
        <OnPlate pose={pose}>
          {b >= 17 && b < DROP && <div style={{ position: "absolute", left: you.x - 90, top: you.y + 20, width: 180, height: 36, borderRadius: 8, background: "#23201C", border: `1px solid ${BROWN}`, color: WHITE, fontFamily: MONO, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>client_cut_v7.mp4</div>}
          <Arrow b={b} x={you.x} y={you.y} size={24} clicks={[DROP, ANALYZE]} />
        </OnPlate>
      )}
    </Shot>
  );
}

function Listening({ b }: { b: number }) {
  const state = b >= 36 ? "processing_diagnosing" : b >= 34 ? "processing_aligning" : b >= 32 ? "processing_transcribing" : "processing_received";
  const keys: Key[] = [
    { b: 30, d: 0, x: 900, y: 300, s: 1.1, rx: 34, ry: 14, rz: -9 },
    { b: 30, d: 3, x: 780, y: 340, s: 2.0, rx: 20, ry: 11, rz: -5 },
    { b: 33, d: 4.5, x: 780, y: 450, s: 2.25, rx: 18, ry: 10, rz: -4 },
  ];
  return <Shot b={b} keys={keys} name={state} crop={PROC} example={false} />;
}

function TheSecond({ b }: { b: number }) {
  const keys: Key[] = [
    { b: 41, d: 0, x: 612, y: 180, s: 3.2, rx: 38, ry: -22, rz: 12 },
    { b: 41, d: 3, x: 612, y: 180, s: 6.4, rx: 18, ry: -14, rz: 5 },
    { b: 45, d: 2.8, x: 1010, y: 172, s: 2.5, rx: 12, ry: 8, rz: -2.5 },
  ];
  return <Shot b={b} keys={keys} name="result_pending_top" crop={TOP} focus="60% 46%" />;
}

function TheReason({ b }: { b: number }) {
  const keys: Key[] = [
    { b: 52, d: 0, x: 975, y: 290, s: 1.5, rx: 26, ry: 12, rz: -6 },
    { b: 52, d: 2.5, x: 975, y: 300, s: 2.1, rx: 12, ry: 7, rz: -2 },
    { b: 55, d: 2.5, x: 975, y: 415, s: 2.1, rx: 12, ry: -6, rz: 2 },
  ];
  return <Shot b={b} keys={keys} name="result_pending_top" crop={TOP} focus="62% 50%" />;
}

function Cuts({ b }: { b: number }) {
  const keys: Key[] = [
    { b: 61, d: 0, x: 900, y: 660, s: 1.3, rx: 34, ry: -14, rz: 8 },
    { b: 61, d: 2.6, x: 880, y: 660, s: 2.0, rx: 18, ry: -9, rz: 3 },
    { b: 64, d: 2.2, x: accept.x - 110, y: accept.y - 40, s: 2.4, rx: 16, ry: -8, rz: 3 },
    { b: 67.5, d: 2.6, x: apply.x - 170, y: apply.y - 40, s: 2.2, rx: 15, ry: 9, rz: -3 },
  ];
  const you = pathAt(b, [{ b: 62.5, x: 1500, y: 960 }, { b: ACCEPT, ...accept }, { b: ACCEPT + 1.5, ...accept }, { b: APPLY, ...apply }]);
  return (
    <Shot b={b} keys={keys} name={b >= ACCEPT ? "cuts_accepted" : "cuts_pending"} crop={CUTS} focus="60% 48%">
      {(pose) => <OnPlate pose={pose}><Arrow b={b} x={you.x} y={you.y} size={22} clicks={[ACCEPT, APPLY]} /></OnPlate>}
    </Shot>
  );
}

function Done({ b }: { b: number }) {
  const keys: Key[] = [
    { b: 72, d: 0, x: 1090, y: 680, s: 1.7, rx: 30, ry: 16, rz: -7 },
    { b: 72, d: 3, x: 1090, y: 688, s: 2.65, rx: 10, ry: 7, rz: -2 },
  ];
  return <Shot b={b} keys={keys} name="done" crop={DONE} focus="70% 52%" />;
}

function Plan({ b }: { b: number }) {
  const keys: Key[] = [
    { b: 82, d: 0, x: 850, y: 1600, s: 1.2, rx: 38, ry: -12, rz: 10 },
    { b: 82, d: 2.8, x: 830, y: 1680, s: 2.45, rx: 20, ry: -9, rz: 4 },
    { b: 85.5, d: 2.5, x: 830, y: 1900, s: 2.45, rx: 20, ry: -9, rz: 4 },
    { b: 88.5, d: 2.5, x: 830, y: 2120, s: 2.45, rx: 20, ry: -9, rz: 4 },
  ];
  return <Shot b={b} keys={keys} name="plan" crop={PLAN} focus="62% 48%" />;
}

function Rewrites({ b }: { b: number }) {
  const keys: Key[] = [
    { b: 92, d: 0, x: 980, y: 1660, s: 1.3, rx: 30, ry: 14, rz: -7 },
    { b: 92, d: 3, x: 980, y: 1650, s: 1.9, rx: 14, ry: 8, rz: -3 },
  ];
  return <Shot b={b} keys={keys} name="rewrites" crop={REWRITES} focus="66% 52%" />;
}

function Keep({ b }: { b: number }) {
  const word = b >= 102.66 ? "DaVinci." : b >= 101.33 ? "Premiere." : "CapCut.";
  return (
    <AbsoluteFill style={{ background: WHITE, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: SANS, fontSize: 132, fontWeight: 500, letterSpacing: "-0.04em", color: INK }}>
        Keep <span style={{ color: "#A9825B" }}>{word}</span>
      </div>
    </AbsoluteFill>
  );
}

function Cta({ b }: { b: number }) {
  const logo = prog(b, 112, 2);
  const line = prog(b, 113, 1.5);
  const btn = prog(b, 114.5, 1.5);
  const url = prog(b, 116, 1.5);
  const fade = prog(b, 122, 0.6, Easing.linear);
  const leave = prog(b, 122.5, 1.5, glide);
  const pressed = b >= GO && b < GO + 0.25;
  const buttonY = 580;
  const you = pathAt(b, [{ b: 116, x: 2000, y: 1140 }, { b: GO, x: 1248, y: buttonY + 74 }]);
  return (
    <AbsoluteFill style={{ background: BLACK }}>
      <AbsoluteFill style={{ background: "radial-gradient(1000px 640px at 50% 44%, rgba(200,162,124,0.2), transparent 72%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 150 + 190 * leave, display: "flex", justifyContent: "center", opacity: logo, transform: `scale(${(1 + 0.32 * leave).toFixed(4)})` }}><Lockup size={84} id="film-end" /></div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 322, textAlign: "center", fontFamily: SANS, fontSize: 96, fontWeight: 500, letterSpacing: "-0.035em", color: WHITE, opacity: line * (1 - fade) }}>See where your edit loses viewers.</div>
      <div style={{ position: "absolute", left: 620, top: buttonY, width: 680, height: 104, borderRadius: 52, background: BROWN, color: INK, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, fontSize: 40, fontWeight: 600, letterSpacing: "-0.025em", opacity: btn * (1 - fade), transform: pressed ? "scale(0.97)" : undefined }}>Analyze your video for free →</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 712, textAlign: "center", fontFamily: SANS, fontSize: 32, fontWeight: 400, color: "rgba(255,255,255,0.68)", opacity: btn * (1 - fade) }}>No account · No card · Results in ~3 min</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 820 - 200 * leave, textAlign: "center", fontFamily: MONO, fontSize: 56, fontWeight: 600, letterSpacing: "-0.02em", color: WHITE, opacity: url }}>getpublishub.com</div>
      {b >= 116 && b < 122 && <Arrow b={b} x={you.x} y={you.y} size={44} clicks={[GO]} />}
    </AbsoluteFill>
  );
}

export function Film({ sound = true, track = "soundtrack" }: { sound?: boolean; track?: string }) {
  const b = useCurrentFrame() / T.fps / BEAT;
  return (
    <AbsoluteFill style={{ background: BLACK, overflow: "hidden" }}>
      {sound && <Audio src={staticFile(`film/${track}.wav`)} />}

      {b < 12 && (
        <AbsoluteFill style={{ background: WHITE, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <Typed b={b} at={0} text="See where your edit loses viewers." size={92} color={INK} beats={3} />
          <div style={{ marginTop: 10 }}><Typed b={b} at={8} text="Before you post or deliver it." size={92} color="#A9825B" beats={2} /></div>
        </AbsoluteFill>
      )}
      {b >= 12 && b < 16 && (
        <AbsoluteFill style={{ background: BLACK, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <Lockup size={148} id="film-open" />
          <div style={{ marginTop: 40, fontFamily: SANS, fontSize: 60, fontWeight: 500, letterSpacing: "-0.03em", color: BROWN }}>Your AI copilot for video editing.</div>
        </AbsoluteFill>
      )}

      {b >= 16 && b < 27 && <Upload b={b} />}
      {b >= 30 && b < 38 && <Listening b={b} />}
      {b >= 41 && b < 49 && <TheSecond b={b} />}
      {b >= 52 && b < 58 && <TheReason b={b} />}
      {b >= 61 && b < 72 && <Cuts b={b} />}
      {b >= 72 && b < 76 && <Done b={b} />}
      {b >= 82 && b < 92 && <Plan b={b} />}
      {b >= 92 && b < 96 && <Rewrites b={b} />}
      {T.cards.map((c) => <Card key={c.from} b={b} from={c.from} to={c.to} text={c.text} bg={c.bg as keyof typeof BG} />)}
      {b >= 100 && b < 104 && <Keep b={b} />}
      {b >= 104 && b < 106 && <AbsoluteFill style={{ background: BLACK, display: "flex", alignItems: "center", justifyContent: "center" }}><Typed b={b} at={104} text="AI finds." size={170} color={WHITE} beats={0.6} /></AbsoluteFill>}
      {b >= 106 && b < 108 && <AbsoluteFill style={{ background: BROWN, display: "flex", alignItems: "center", justifyContent: "center" }}><Typed b={b} at={106} text="You decide." size={170} color={INK} beats={0.6} /></AbsoluteFill>}
      {b >= 108 && b < 112 && <AbsoluteFill style={{ background: WHITE, display: "flex", alignItems: "center", justifyContent: "center" }}><Typed b={b} at={108} text="You stay the editor." size={150} color={INK} beats={1.2} /></AbsoluteFill>}
      {b >= 112 && <Cta b={b} />}
    </AbsoluteFill>
  );
}
