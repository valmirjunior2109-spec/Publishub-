// Os filmes curtos, no estilo do filme de lançamento: as telas reais em 3D e cartões de uma frase, cortados no tempo da música.
// Cada filme é só uma lista de cenas em specs.json, em tempos da música; aqui, as cenas sabem se desenhar em 9:16 e em 16:9.
// Em 9:16, tudo fica dentro da área que o Instagram e o TikTok não cobrem.

import { AbsoluteFill, Audio, Easing, Img, staticFile, useCurrentFrame } from "remotion";
import type { CSSProperties } from "react";
import { Arrow, pathAt, prog, Typed } from "../film/Film";
import { Lockup } from "../film/Logo";
import SPECS from "./specs.json";

const BLACK = "#0B0A09";
const WHITE = "#FFFFFF";
const BROWN = "#C8A27C";
const TAN = "#A9825B";
const HOT = "#E8652B";
const INK = "#111111";
const SANS = "Geist, system-ui, sans-serif";
const MONO = "'Geist Mono', ui-monospace, monospace";

type Line = { text: string; at: number; beats: number; color?: string };
type Scene = {
  type: string; from: number; to?: number; bg?: string; size?: number; lines?: Line[]; label?: string; line?: string;
  plate?: string; keys?: number[][]; example?: boolean; focus?: string; acceptAt?: number; dropAt?: number; stepsFrom?: number;
  cursor?: { size: number; clicks: number[]; path: number[][]; chip?: string; chipUntil?: number };
  title?: string[]; button?: string; note?: string; url?: string; click?: number; end?: number;
};
export type Spec = { id: string; composition: string; output: string; w: number; h: number; bpm: number; beats: number; clicks: number[]; scenes: Scene[] };

const CROPS: Record<string, { x: number; y: number; w: number; h: number }> = {
  upload: { x: 300, y: 20, w: 1100, h: 660 },
  processing: { x: 532, y: 97, w: 892, h: 494 },
  result_pending_top: { x: 532, y: 97, w: 892, h: 410 },
  cuts: { x: 532, y: 490, w: 892, h: 980 },
  done: { x: 770, y: 610, w: 640, h: 180 },
  done_head: { x: 785, y: 630, w: 440, h: 72 },
  second: { x: 552, y: 128, w: 200, h: 84 },
};
const COLORS: Record<string, string> = { brown: BROWN, tan: TAN, hot: HOT };
const BACK: Record<string, { bg: string; ink: string }> = { white: { bg: WHITE, ink: INK }, brown: { bg: BROWN, ink: INK }, black: { bg: BLACK, ink: WHITE } };

type Pose = { x: number; y: number; s: number; rx: number; ry: number; rz: number };

function poseAt(b: number, keys: number[][]): Pose {
  let [, , x, y, s, rx, ry, rz] = keys[0];
  for (const [at, d, kx, ky, ks, krx, kry, krz] of keys.slice(1)) {
    const p = prog(b, at, d);
    x += (kx - x) * p;
    y += (ky - y) * p;
    s += (ks - s) * p;
    rx += (krx - rx) * p;
    ry += (kry - ry) * p;
    rz += (krz - rz) * p;
  }
  return { x, y, s, rx, ry, rz };
}

function Shot({ b, scene, vertical }: { b: number; scene: Scene; vertical: boolean }) {
  const pose = poseAt(b, scene.keys!);
  const crop = CROPS[scene.plate!];
  const cx = vertical ? 540 : 960;
  const cy = vertical ? 860 : 540;
  const camera = `translate(${cx}px, ${cy}px) perspective(1700px) rotateX(${pose.rx}deg) rotateY(${pose.ry}deg) rotateZ(${pose.rz}deg) scale(${pose.s}) translate(${-pose.x}px, ${-pose.y}px)`;
  let name = scene.plate!;
  if (name === "cuts") name = b >= scene.acceptAt! ? "cuts_accepted" : "cuts_pending";
  if (name === "upload") name = b >= scene.dropAt! ? "upload_file" : "upload_empty";
  if (name === "processing") {
    const k = Math.floor((b - scene.stepsFrom!) / 2);
    name = ["processing_received", "processing_transcribing", "processing_aligning", "processing_diagnosing"][Math.min(3, k)];
  }
  const plate = (blur: boolean) => (
    <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: camera }}>
      <Img src={staticFile(`film/plates/${name}${blur ? "-blur.jpg" : ".png"}`)} style={{ position: "absolute", left: crop.x, top: crop.y, width: crop.w, height: crop.h, maxWidth: "none", borderRadius: 10 }} />
    </div>
  );
  const focus = scene.focus ?? (vertical ? "70% 34%" : "48% 42%");
  const mask = `radial-gradient(ellipse ${focus} at 50% ${(cy / (vertical ? 1920 : 1080)) * 100}%, transparent 58%, black 100%)`;
  const c = scene.cursor;
  const you = c && pathAt(b, c.path.map(([at, x, y]) => ({ b: at, x, y })));
  return (
    <AbsoluteFill style={{ background: BLACK, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(${vertical ? "900px 1000px" : "1100px 760px"} at ${cx}px ${cy}px, rgba(200,162,124,0.16), transparent 72%)` }} />
      {plate(false)}
      <AbsoluteFill style={{ maskImage: mask, WebkitMaskImage: mask }}>
        <AbsoluteFill style={{ background: BLACK }} />
        {plate(true)}
      </AbsoluteFill>
      {c && you && (
        <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: camera }}>
          {c.chip && b >= c.path[0][0] && b < c.chipUntil! && <div style={{ position: "absolute", left: you.x - 90, top: you.y + 20, width: 180, height: 36, borderRadius: 8, background: "#23201C", border: `1px solid ${BROWN}`, color: WHITE, fontFamily: MONO, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{c.chip}</div>}
          <Arrow b={b} x={you.x} y={you.y} size={c.size} clicks={c.clicks} />
        </div>
      )}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 72% 72% at 50% 50%, transparent 55%, rgba(5,4,3,0.6) 100%)" }} />
      {scene.example && <span style={vertical ? { position: "absolute", left: 72, top: 1400, padding: "10px 18px", borderRadius: 12, background: "rgba(11,10,9,0.82)", fontFamily: MONO, fontSize: 26, fontWeight: 600, letterSpacing: "0.08em", color: "rgba(255,255,255,0.78)" } : { position: "absolute", right: 40, bottom: 34, fontFamily: MONO, fontSize: 20, fontWeight: 600, letterSpacing: "0.08em", color: "rgba(255,255,255,0.55)" }}>EXAMPLE ANALYSIS</span>}
    </AbsoluteFill>
  );
}

function Card({ b, scene, vertical }: { b: number; scene: Scene; vertical: boolean }) {
  const c = BACK[scene.bg!];
  return (
    <AbsoluteFill style={{ background: c.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingBottom: vertical ? 200 : 0 }}>
      {scene.label && <div style={{ marginBottom: 34, fontFamily: MONO, fontSize: vertical ? 30 : 24, fontWeight: 600, letterSpacing: "0.1em", color: TAN }}>{scene.label}</div>}
      {scene.lines!.map((l) => <Typed key={l.text} b={b} at={l.at} text={l.text} size={scene.size} beats={l.beats} color={l.color ? COLORS[l.color] : c.ink} />)}
    </AbsoluteFill>
  );
}

function Logo({ scene, vertical }: { scene: Scene; vertical: boolean }) {
  return (
    <AbsoluteFill style={{ background: BLACK, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingBottom: vertical ? 200 : 0 }}>
      <Lockup size={scene.size!} id={`short-logo-${scene.from}`} />
      <div style={{ marginTop: 40, fontFamily: SANS, fontSize: vertical ? 64 : 60, fontWeight: 500, letterSpacing: "-0.03em", color: BROWN }}>{scene.line}</div>
    </AbsoluteFill>
  );
}

function Cta({ b, scene, vertical }: { b: number; scene: Scene; vertical: boolean }) {
  const f = scene.from;
  const line = prog(b, f + 1, 1.5);
  const btn = prog(b, f + 2.2, 1.5);
  const url = prog(b, f + 3.2, 1.5);
  const fade = prog(b, scene.end!, 0.6, Easing.linear);
  const leave = prog(b, scene.end! + 0.5, 1.5, Easing.bezier(0.5, 0, 0.1, 1));
  const pressed = b >= scene.click! && b < scene.click! + 0.25;
  const W = vertical ? 1080 : 1920;
  const titleSize = vertical ? 112 : 96;
  const titleH = titleSize * 1.16 * scene.title!.length;
  const top = vertical ? 300 : 150;
  const logoY = top;
  const titleY = logoY + (vertical ? 150 : 170);
  const buttonY = titleY + titleH + (vertical ? 66 : 90);
  const bw = vertical ? 800 : 680;
  const bh = vertical ? 126 : 104;
  const bx = (W - bw) / 2;
  const noteY = buttonY + bh + 28;
  const urlY = noteY + (vertical ? 92 : 108);
  const you = pathAt(b, [{ b: f + 3.2, x: W + 80, y: (vertical ? 1920 : 1080) + 60 }, { b: scene.click!, x: bx + bw - 52, y: buttonY + bh - 30 }]);
  const row: CSSProperties = { position: "absolute", left: 0, right: 0, textAlign: "center" };
  const finalLogoY = vertical ? 680 : 340;
  const finalUrlY = vertical ? 900 : 620;
  return (
    <AbsoluteFill style={{ background: BLACK }}>
      <AbsoluteFill style={{ background: `radial-gradient(1000px 760px at 50% 44%, rgba(200,162,124,0.2), transparent 72%)` }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: logoY + (finalLogoY - logoY) * leave, display: "flex", justifyContent: "center", opacity: prog(b, f, 2), transform: `scale(${(1 + 0.3 * leave).toFixed(4)})` }}><Lockup size={vertical ? 96 : 84} id={`short-end-${f}`} /></div>
      <div style={{ ...row, top: titleY, fontFamily: SANS, fontSize: titleSize, fontWeight: 500, lineHeight: 1.16, letterSpacing: "-0.035em", color: WHITE, opacity: line * (1 - fade) }}>
        {scene.title!.map((t) => <div key={t}>{t}</div>)}
      </div>
      <div style={{ position: "absolute", left: bx, top: buttonY, width: bw, height: bh, borderRadius: bh / 2, background: BROWN, color: INK, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, fontSize: vertical ? 52 : 40, fontWeight: 600, letterSpacing: "-0.025em", opacity: btn * (1 - fade), transform: pressed ? "scale(0.97)" : undefined }}>{scene.button} →</div>
      <div style={{ ...row, top: noteY, fontFamily: SANS, fontSize: vertical ? 38 : 32, color: "rgba(255,255,255,0.68)", opacity: btn * (1 - fade) }}>{scene.note}</div>
      <div style={{ ...row, top: urlY + (finalUrlY - urlY) * leave, fontFamily: MONO, fontSize: vertical ? 54 : 56, fontWeight: 600, letterSpacing: "-0.02em", color: vertical ? BROWN : WHITE, opacity: url }}>{vertical && leave > 0 ? "getpublishub.com" : scene.url}</div>
      {b >= f + 3.2 && b < scene.end! && <Arrow b={b} x={you.x} y={you.y} size={vertical ? 56 : 44} clicks={[scene.click!]} />}
    </AbsoluteFill>
  );
}

export function Short({ id }: { id: string }) {
  const spec = (SPECS as Spec[]).find((s) => s.id === id)!;
  const b = (useCurrentFrame() / 60) * (spec.bpm / 60);
  const vertical = spec.h > spec.w;
  const scene = spec.scenes.find((s) => b >= s.from && (s.to === undefined || b < s.to));
  return (
    <AbsoluteFill style={{ background: BLACK, overflow: "hidden" }}>
      <Audio src={staticFile(`shorts/${id}.wav`)} />
      {scene?.type === "card" && <Card b={b} scene={scene} vertical={vertical} />}
      {scene?.type === "shot" && <Shot b={b} scene={scene} vertical={vertical} />}
      {scene?.type === "logo" && <Logo scene={scene} vertical={vertical} />}
      {scene?.type === "cta" && <Cta b={b} scene={scene} vertical={vertical} />}
    </AbsoluteFill>
  );
}
