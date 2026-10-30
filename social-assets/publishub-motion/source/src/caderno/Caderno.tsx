import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame } from "remotion";
import { easeIn, easeInOut, easeOut, mix, progress } from "../anim";
import { BrandLockup, BrandMark, PARTS } from "../demo/Brand";
import { FONT } from "../theme";
import { along, arrowHead, ellipse, line, measure, pathD, rotAround, shaky, tick, wave, type Pt } from "./ink";
import T from "./timeline.json";

/* ==========================================================================
   Reel "O caderno" (9:16, 26,7 s): o vídeo inteiro acontece no caderno da
   Publishub, num plano-sequência de câmera na mão sobre o papel.
   A caneta do logo conta as revisões (47 risquinhos), o cliente cola um post-it
   ("feels slow somewhere??"), a Publishub marca o segundo da queda, risca as
   frases mortas, você ticka os cortes, a tesoura corta a fita do vídeo e, no
   fim, a página vira e o caderno fechado vira o logo.
   As fotos coladas com fita são capturas reais da interface (public/editors).
   Os quadros de tudo estão em timeline.json (a trilha lê o mesmo arquivo).
   ========================================================================== */

const P = {
  desk: "#1E1B18",
  paper: "#F4EDDF",
  rule: "rgba(96,128,196,0.26)",
  margin: "rgba(206,96,80,0.5)",
  ink: "#2A2520",
  muted: "#7A6F62",
  pen: "#1F47A6",
  caramel: "#C9824A",
  sticky: "#F4D65E",
  tape: "rgba(231,218,182,0.94)",
  marker: "rgba(244,160,70,0.42)",
  red: "#C8452F",
  cream: "#FFFDF8",
};
const HAND = "Caveat, cursive";
const SERIF = "Fraunces, Georgia, serif";
const W = 1080;
const H = 1920;
const WORLD_H = 7800;
const FOCUS: Pt = [540, 900]; // onde o ponto de interesse da câmera cai na tela

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const lin = (f: number, [a, b]: number[]) => clamp((f - a) / (b - a));

/* ---------- o roteiro da caneta: cada traço e cada palavra, com quando ---------- */

type Ink = { from: number; to: number; pts: Pt[]; w?: number; color?: string; pen?: boolean };
type Hand = { from: number; to: number; x: number; y: number; text: string; size: number; weight?: number; color?: string; rot?: number };

const handFont = (h: { size: number; weight?: number }) => `${h.weight ?? 600} ${h.size}px Caveat`;
const handW = (h: Hand) => measure(h.text, handFont(h));
const MONO27 = `400 27px "Geist Mono"`;

// a fita do vídeo (41 s) e os três trechos que saem
const PX = 1000 / 41;
const STRIP = { x: 40, y: 6170, h: 160 };
const SEGS: [number, number, boolean][] = [[0, 4, true], [4, 14, false], [14, 17.5, true], [17.5, 28, false], [28, 29.8, true], [29.8, 41, false]];
const BOUNDS = [4, 14, 17.5, 28, 29.8];
const KEPT = 31.7;

// o post-it do cliente
const NOTE = { cx: 540, cy: 1900, w: 720, h: 660, rot: -3 };
const noteToWorld = ([lx, ly]: Pt): Pt => rotAround([NOTE.cx - NOTE.w / 2 + lx, NOTE.cy - NOTE.h / 2 + ly], [NOTE.cx, NOTE.cy], NOTE.rot);

// o gráfico de retenção impresso (a curva do exemplo da landing)
const CHART = { x: 150, y: 3240, w: 860, h: 300 };
const CURVE: Pt[] = [[0, 100], [2, 92], [4, 74], [6, 66], [10, 61], [15, 57], [20, 54], [25, 51], [30, 48], [35, 46], [41, 44]];
const chartPt = ([s, pct]: Pt): Pt => [CHART.x + (s / 41) * CHART.w, CHART.y + (1 - pct / 100) * CHART.h];

// a transcrição impressa (o exemplo), com a pausa medida
const LINES: [string, string][] = [
  ["0:00", "Hey guys, so today I want to tell you…"],
  ["0:04", "I quit coffee completely, and honestly…"],
  ["0:09", "I had headaches, I was tired all the time."],
  ["0:14", "Like I said, the first week was really hard."],
  ["0:17", "But by week two my sleep started changing."],
  ["0:23", "By week three I stopped waking up at 3am."],
  ["0:28", "[ 1.8s pause ]"],
  ["0:30", "Start on a Friday and drink a lot of water."],
];
const lineY = (i: number) => 4200 + i * 84;
const TEXT_X = 240;

const CHECKS: [string, string][] = [
  ["0:00–0:04  slow intro", "−4.0s"],
  ["0:14–0:18  repeated line", "−3.5s"],
  ["0:28–0:30  long pause", "−1.8s"],
];
const checkY = (i: number) => 5230 + i * 90;

function buildScript() {
  const inks: Ink[] = [];
  const hands: Hand[] = [];

  // 1 · os 47 risquinhos, cada vez mais rápidos
  const { from, to, count, pow } = T.tally;
  const times = Array.from({ length: count }, (_, k) => from + (to - from) * Math.pow(k / (count - 1), pow));
  times.forEach((t, k) => {
    const g = Math.floor(k / 5);
    const i = k % 5;
    const gx = 175 + (g % 4) * 225;
    const gy = 450 + Math.floor(g / 4) * 210;
    const a: Pt = i < 4 ? [gx + i * 36, gy] : [gx - 18, gy + 118];
    const b: Pt = i < 4 ? [gx + i * 36 + 6, gy + 150] : [gx + 4 * 36 + 22, gy + 28];
    const gap = k < count - 1 ? times[k + 1] - t : 3;
    inks.push({ from: t, to: t + Math.min(4, Math.max(1.1, gap * 0.85)), pts: shaky(line(a, b, 8), 3, 100 + k), w: 7 });
  });
  hands.push({ from: -2, to: -1, x: 150, y: 370, text: "rewatches:", size: 96 });
  const n47: Hand = { from: T.tally.num[0], to: T.tally.num[1], x: 0, y: 1250, text: "#47", size: 250, weight: 700 };
  n47.x = 540 - handW(n47) / 2;
  hands.push(n47);
  inks.push({ from: T.tally.circle[0], to: T.tally.circle[1], pts: shaky(ellipse([540, 1165], handW(n47) / 2 + 80, 130), 4, 7), w: 8 });

  // 2 · o post-it: circula "somewhere", seta, WHERE?, e a frase embaixo
  const sw = measure("somewhere", "700 92px Caveat");
  const ring = ellipse([70 + sw / 2, 330], sw / 2 + 36, 66).map(noteToWorld);
  inks.push({ from: T.sticky.circle[0], to: T.sticky.circle[1], pts: shaky(ring, 4, 11), w: 7 });
  const aFrom = noteToWorld([70 + sw + 26, 268]);
  const aTo: Pt = [690, 1530];
  inks.push({ from: T.sticky.arrow[0], to: T.sticky.arrow[1] - 2, pts: shaky(line(aFrom, aTo, 10), 3, 12), w: 7 });
  inks.push({ from: T.sticky.arrow[1] - 2, to: T.sticky.arrow[1], pts: arrowHead(aFrom, aTo, 30), w: 7 });
  hands.push({ from: T.sticky.where[0], to: T.sticky.where[1], x: 640, y: 1500, text: "WHERE?", size: 104, weight: 700 });
  const s1: Hand = { from: T.sticky.line1[0], to: T.sticky.line1[1], x: 150, y: 2400, text: "“somewhere”", size: 120, weight: 700 };
  const s2: Hand = { from: T.sticky.line2[0], to: T.sticky.line2[1], x: 150, y: 2530, text: "isn't a timestamp.", size: 120, weight: 700 };
  hands.push(s1, s2);
  const u = handW(s2);
  const half = (T.sticky.under[1] - T.sticky.under[0]) / 2;
  inks.push({ from: T.sticky.under[0], to: T.sticky.under[0] + half, pts: shaky(line([150, 2556], [150 + u, 2552], 14), 3, 13), w: 6 });
  inks.push({ from: T.sticky.under[0] + half, to: T.sticky.under[1], pts: shaky(line([175, 2576], [130 + u, 2574], 14), 3, 14), w: 6 });

  // 3 · a virada
  hands.push({ from: T.turn.later[0], to: T.turn.later[1], x: 300, y: 3130, text: "~3 minutes later:", size: 84 });

  // 4 · o gráfico: a curva se imprime, a caneta acha o 0:04
  inks.push({ from: T.chart.curve[0], to: T.chart.curve[1], pts: CURVE.map(chartPt), w: 5, color: P.ink, pen: false });
  const dot = chartPt([4, 74]);
  inks.push({ from: T.chart.circle[0], to: T.chart.circle[1], pts: shaky(ellipse(dot, 40, 34), 3, 21), w: 6 });
  hands.push({ from: T.chart.note[0], to: T.chart.note[1], x: 290, y: 3690, text: "0:04: 26% left right here.", size: 64 });
  const nA: Pt = [300, 3636];
  const nB: Pt = [dot[0] + 6, dot[1] + 42];
  inks.push({ from: T.chart.arrow[0], to: T.chart.arrow[1] - 2, pts: shaky(line(nA, nB, 8), 2, 22), w: 6 });
  inks.push({ from: T.chart.arrow[1] - 2, to: T.chart.arrow[1], pts: arrowHead(nA, nB, 22), w: 6 });
  hands.push({ from: T.chart.photoNote[0], to: T.chart.photoNote[1], x: 150, y: 3860, text: "real app →", size: 58 });

  // 4b · a transcrição: risca as frases mortas, anota na margem
  const marks: [number, string][] = [[0, "cut"], [3, "repeat"], [6, "pause"]];
  marks.forEach(([li, word], j) => {
    const y = lineY(li);
    const w = measure(LINES[li][1], MONO27);
    inks.push({ from: T.transcript.strike[j][0], to: T.transcript.strike[j][1], pts: shaky(line([TEXT_X - 8, y - 10], [TEXT_X + w + 8, y - 13], 14), 3, 30 + j), w: 6 });
    hands.push({ from: T.transcript.notes[j][0], to: T.transcript.notes[j][1], x: 26, y: y + 2, text: word, size: 52, rot: -8 });
  });
  const w4 = measure(LINES[4][1], MONO27);
  inks.push({ from: T.transcript.tick[0], to: T.transcript.tick[1], pts: tick(TEXT_X + w4 + 22, lineY(4) - 16, 0.8), w: 7 });
  hands.push({ from: T.transcript.keep[0], to: T.transcript.keep[1], x: 26, y: lineY(4) + 2, text: "keep", size: 52, rot: -8 });

  // 5 · você decide: três ticks
  hands.push({ from: T.decide.head[0], to: T.decide.head[1], x: 150, y: 5100, text: "you decide what goes:", size: 86, weight: 700 });
  T.decide.ticks.forEach((t, i) => inks.push({ from: t, to: t + 5, pts: tick(166, checkY(i) - 16, 1.05), w: 8 }));
  hands.push({ from: T.decide.note[0], to: T.decide.note[1], x: 150, y: 5700, text: "in the app →", size: 58 });

  // 6 · a fita: a caneta marca onde cortar
  const step = (T.strip.lines[1] - T.strip.lines[0]) / BOUNDS.length;
  BOUNDS.forEach((b, i) => {
    const x = STRIP.x + b * PX;
    inks.push({ from: T.strip.lines[0] + i * step, to: T.strip.lines[0] + (i + 1) * step - 0.4, pts: shaky(line([x, STRIP.y - 34], [x + 3, STRIP.y + STRIP.h + 34], 8), 2, 40 + i), w: 5 });
  });
  const big: Hand = { from: T.strip.big[0], to: T.strip.big[1], x: 0, y: 6600, text: "0:41 → 0:32", size: 150, weight: 700 };
  big.x = 540 - handW(big) / 2;
  hands.push(big);

  // 7 · o fecho
  const p1: Hand = { from: T.payoff.l1[0], to: T.payoff.l1[1], x: 110, y: 7180, text: "you're still", size: 170, weight: 700 };
  const p2: Hand = { from: T.payoff.l2[0], to: T.payoff.l2[1], x: 110, y: 7360, text: "the editor.", size: 170, weight: 700 };
  hands.push(p1, p2);
  const wx = 110 + measure("the ", handFont(p2));
  inks.push({ from: T.payoff.wave[0], to: T.payoff.wave[1], pts: wave(wx, 110 + handW(p2) - 10, 7392, 9, 44), w: 8 });

  return { inks, hands };
}

/* ---------- a caneta: segue o traço ativo, levanta entre um e outro ---------- */

type PenEvent = { from: number; to: number; pos: (p: number) => Pt };

function penEvents(inks: Ink[], hands: Hand[]): PenEvent[] {
  const ev: PenEvent[] = [];
  for (const k of inks) if (k.pen !== false) ev.push({ from: k.from, to: k.to, pos: (p) => along(k.pts, p) });
  for (const h of hands) {
    if (h.to <= 0) continue;
    const w = handW(h);
    ev.push({ from: h.from, to: h.to, pos: (p) => [h.x + p * w, h.y - h.size * 0.3 + Math.sin((p * w) / 16) * h.size * 0.07] });
  }
  return ev.sort((a, b) => a.from - b.from);
}

function penAt(f: number, ev: PenEvent[]): { at: Pt; lift: number; op: number } | null {
  const active = ev.find((e) => f >= e.from && f <= e.to);
  if (active) return { at: active.pos(clamp((f - active.from) / (active.to - active.from))), lift: 0, op: 1 };
  const prev = [...ev].reverse().find((e) => e.to < f);
  const next = ev.find((e) => e.from > f);
  if (prev && next && next.from - prev.to <= 24) {
    const t = easeInOut(clamp((f - prev.to) / (next.from - prev.to)));
    const a = prev.pos(1);
    const b = next.pos(0);
    return { at: [mix(a[0], b[0], t), mix(a[1], b[1], t)], lift: 10 + Math.sin(t * Math.PI) * 40, op: 1 };
  }
  if (prev && f - prev.to < 10) return { at: prev.pos(1), lift: 10 + (f - prev.to) * 7, op: 1 - (f - prev.to) / 10 };
  if (next && next.from - f < 10) return { at: next.pos(0), lift: 10 + (next.from - f) * 7, op: 1 - (next.from - f) / 10 };
  return null;
}

function Pen({ at, lift, op }: { at: Pt; lift: number; op: number }) {
  return (
    <svg width={1} height={1} style={{ position: "absolute", left: at[0], top: at[1], overflow: "visible", opacity: op, filter: `drop-shadow(${12 + lift * 0.9}px ${10 + lift * 0.7}px ${5 + lift * 0.3}px rgba(50,30,10,0.3))` }}>
      <g transform={`translate(${lift * 0.35} ${-lift}) rotate(24.4) scale(0.46)`}>
        {PARTS.map((d, i) => (
          <path key={d} d={d} fill={i === 0 ? "#163A8C" : P.pen} />
        ))}
        <rect x={-2.2} y={-309} width={4.4} height={115} rx={2.2} fill="#FBF3E6" />
      </g>
    </svg>
  );
}

/* ---------- a câmera: plano-sequência, na mão ---------- */

// [quadro, x, y, zoom] no papel. Entre dois pontos iguais a câmera fica parada de verdade:
// qualquer deslize lento (1 px ou 0,1% de zoom por quadro) faz o texto tremular.
const KEYS: [number, number, number, number][] = [
  [0, 330, 610, 2.3], [6, 330, 610, 2.3], [42, 540, 880, 1.0], [66, 540, 880, 1.0],
  [72, 540, 1900, 1.0], [92, 540, 1900, 1.0], [100, 445, 1880, 1.45], [112, 445, 1880, 1.45], [119, 620, 1760, 1.2], [123, 620, 1760, 1.2],
  [130, 560, 2300, 1.1], [160, 560, 2300, 1.1], [167, 540, 2890, 1.15], [202, 540, 2890, 1.15],
  [209, 545, 3560, 1.03], [280, 545, 3560, 1.03],
  [288, 540, 4440, 1.02], [356, 540, 4440, 1.02], [364, 525, 5260, 1.03], [404, 525, 5260, 1.03], [416, 620, 5570, 1.0], [434, 620, 5570, 1.0],
  [442, 540, 6300, 1.0], [556, 540, 6300, 1.0],
  [564, 540, 7340, 1.0], [800, 540, 7340, 1.0],
];

function camAt(f: number) {
  let i = KEYS.findIndex((k, j) => f >= k[0] && f < (KEYS[j + 1]?.[0] ?? Infinity));
  if (i < 0) i = f < 0 ? 0 : KEYS.length - 1;
  const a = KEYS[i];
  const b = KEYS[Math.min(i + 1, KEYS.length - 1)];
  const t = b[0] === a[0] ? 0 : easeInOut(clamp((f - a[0]) / (b[0] - a[0])));
  return {
    x: mix(a[1], b[1], t),
    y: mix(a[2], b[2], t),
    z: mix(a[3], b[3], t),
    r: 0,
  };
}

/* ---------- peças do papel ---------- */

function Tape({ cx, cy, w, h, rot, children, style }: { cx: number; cy: number; w: number; h: number; rot: number; children?: ReactNode; style?: CSSProperties }) {
  const zig = (side: "l" | "r") => Array.from({ length: 9 }, (_, i) => `${side === "l" ? (i % 2 ? 0 : 1.6) : i % 2 ? 100 : 98.4}% ${(i / 8) * 100}%`);
  return (
    <div
      style={{
        position: "absolute",
        left: cx - w / 2,
        top: cy - h / 2,
        width: w,
        height: h,
        background: `repeating-linear-gradient(90deg, ${P.tape} 0 5px, rgba(222,207,168,0.94) 5px 7px)`,
        clipPath: `polygon(${[...zig("l"), ...zig("r").reverse()].join(",")})`,
        transform: `rotate(${rot}deg)`,
        boxShadow: "0 2px 6px rgba(60,40,20,0.15)",
        display: "grid",
        placeItems: "center",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

const IMG = { insight: [1170, 1627], cuts_head_acc: [1170, 931] } as const;

function Photo({ f, src, crop, cx, cy, w, rot, at }: { f: number; src: keyof typeof IMG; crop: [number, number]; cx: number; cy: number; w: number; rot: number; at: number }) {
  if (f < at) return null;
  const p = progress(f, at, 9, easeOut);
  const [iw] = IMG[src];
  const h = ((crop[1] - crop[0]) * w) / iw;
  return (
    <div
      style={{
        position: "absolute",
        left: cx - w / 2 - 14,
        top: cy - h / 2 - 14,
        padding: 14,
        background: P.cream,
        boxShadow: `0 ${6 + (1 - p) * 30}px ${14 + (1 - p) * 40}px rgba(50,30,10,${0.22 + (1 - p) * 0.1})`,
        transform: `rotate(${rot + (1 - p) * 7}deg) scale(${1 + (1 - p) * 0.22})`,
        opacity: clamp(p * 3),
      }}
    >
      <div style={{ width: w, height: h, overflow: "hidden", position: "relative" }}>
        <Img src={staticFile(`editors/${src}.png`)} style={{ position: "absolute", left: 0, top: (-crop[0] * w) / iw, width: w }} />
      </div>
      <Tape cx={30} cy={8} w={130} h={44} rot={-38} />
      <Tape cx={w - 2} cy={8} w={130} h={44} rot={38} />
    </div>
  );
}

function Sticky({ f }: { f: number }) {
  if (f < T.sticky.slap) return null;
  const p = progress(f, T.sticky.slap, 6, easeIn);
  const settle = Math.sin(clamp((f - T.sticky.slap - 6) / 8) * Math.PI) * 0.015;
  const text = (y: number, s: string, size = 92, weight = 700, color = "#2A2520") => (
    <div style={{ position: "absolute", left: 70, top: y - size * 0.82, fontFamily: HAND, fontSize: size, fontWeight: weight, color, lineHeight: 1, whiteSpace: "nowrap" }}>{s}</div>
  );
  return (
    <div
      style={{
        position: "absolute",
        left: NOTE.cx - NOTE.w / 2,
        top: NOTE.cy - NOTE.h / 2,
        width: NOTE.w,
        height: NOTE.h,
        background: `linear-gradient(180deg, #EAC94E 0 70px, ${P.sticky} 70px, #F1D35A 100%)`,
        boxShadow: `0 ${10 + (1 - p) * 40}px ${24 + (1 - p) * 50}px rgba(60,40,10,${0.22 + (1 - p) * 0.15})`,
        transform: `rotate(${NOTE.rot}deg) scale(${1 + (1 - p) * 0.35 - settle})`,
        opacity: clamp(p * 4),
      }}
    >
      {text(150, "love it!!")}
      {text(255, "just feels slow")}
      {text(360, "somewhere??")}
      {text(540, "— client, 11:48 pm", 52, 500, "#5A4F3F")}
    </div>
  );
}

function Chart() {
  const grid = [75, 50, 25];
  return (
    <>
      <div style={{ position: "absolute", left: CHART.x, top: CHART.y - 52, fontFamily: FONT.mono, fontSize: 24, letterSpacing: "0.14em", color: P.muted }}>RETENTION · no-coffee-30-days.mp4</div>
      <div style={{ position: "absolute", left: CHART.x, top: CHART.y, width: CHART.w, height: CHART.h, borderLeft: `3px solid ${P.ink}`, borderBottom: `3px solid ${P.ink}` }} />
      {grid.map((g) => (
        <div key={g}>
          <div style={{ position: "absolute", left: CHART.x, top: CHART.y + (1 - g / 100) * CHART.h, width: CHART.w, borderTop: `2px dashed rgba(42,37,32,0.18)` }} />
          <div style={{ position: "absolute", left: CHART.x - 84, top: CHART.y + (1 - g / 100) * CHART.h - 16, fontFamily: FONT.mono, fontSize: 24, color: P.muted }}>{g}%</div>
        </div>
      ))}
      {[["0:00", 0], ["0:21", 21], ["0:41", 41]].map(([l, s]) => (
        <div key={l} style={{ position: "absolute", left: CHART.x + ((s as number) / 41) * CHART.w - 30, top: CHART.y + CHART.h + 12, fontFamily: FONT.mono, fontSize: 24, color: P.muted }}>{l}</div>
      ))}
    </>
  );
}

function Transcript() {
  return (
    <>
      <div style={{ position: "absolute", left: 150, top: lineY(0) - 130, fontFamily: FONT.mono, fontSize: 24, letterSpacing: "0.14em", color: P.muted }}>TRANSCRIPT</div>
      {LINES.map(([ts, text], i) => (
        <div key={i} style={{ position: "absolute", left: 150, top: lineY(i) - 24, display: "flex", fontFamily: FONT.mono, fontSize: 27, lineHeight: 1, whiteSpace: "nowrap" }}>
          <span style={{ width: TEXT_X - 150, color: P.muted }}>{ts}</span>
          <span style={{ color: i === 6 ? P.red : P.ink }}>{text}</span>
        </div>
      ))}
    </>
  );
}

function Checklist() {
  return (
    <>
      {CHECKS.map(([label, secs], i) => (
        <div key={i}>
          <div style={{ position: "absolute", left: 160, top: checkY(i) - 40, width: 46, height: 46, border: `3px solid ${P.ink}`, borderRadius: 6 }} />
          <div style={{ position: "absolute", left: 236, top: checkY(i) - 30, fontFamily: FONT.mono, fontSize: 30, color: P.ink, whiteSpace: "pre" }}>{label}</div>
          <div style={{ position: "absolute", right: 1080 - 1010, top: checkY(i) - 30, fontFamily: FONT.mono, fontSize: 30, color: P.red }}>{secs}</div>
        </div>
      ))}
    </>
  );
}

const FILM = ["#6E5B47", "#4F6177", "#5E6B4E", "#7A5A52", "#4E6A69", "#665878"];

function Film() {
  return (
    <div style={{ position: "absolute", inset: 0, background: "#2B241D" }}>
      {Array.from({ length: 21 }, (_, i) => (
        <div key={i} style={{ position: "absolute", left: i * 2 * PX + 3, top: 32, width: 2 * PX - 6, height: STRIP.h - 64, borderRadius: 4, background: `linear-gradient(160deg, ${FILM[i % FILM.length]}, ${FILM[(i + 2) % FILM.length]})` }} />
      ))}
      {[8, STRIP.h - 22].map((y) => (
        <div key={y} style={{ position: "absolute", left: 0, right: 0, top: y, height: 14, background: `repeating-linear-gradient(90deg, ${P.paper} 0 10px, transparent 10px 24px)`, opacity: 0.85 }} />
      ))}
    </div>
  );
}

function Strip({ f }: { f: number }) {
  const S = T.strip;
  const slide = progress(f, S.slide[0], S.slide[1] - S.slide[0], easeInOut);
  const marked = lin(f, S.marker);
  let keptX = 540 - (KEPT * PX) / 2;
  const labels = 1 - progress(f, S.fall, 8);
  return (
    <>
      {SEGS.map(([a, b, removed], i) => {
        const w = (b - a) * PX;
        let x = STRIP.x + a * PX;
        S.snips.forEach((sf, j) => {
          if (f >= sf && BOUNDS[j] <= a + 1e-6) x += 4;
        });
        let y = STRIP.y;
        let rot = 0;
        let op = 1;
        if (removed) {
          const t = clamp((f - S.fall - i * 2) / 20);
          y += t * t * 1000;
          rot = (i === 2 ? 1 : -1) * t * 30;
          x += t * (i === 0 ? -80 : 60);
          op = 1 - clamp((t - 0.7) / 0.3);
        } else {
          x = mix(x, keptX, slide);
          keptX += w;
        }
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, width: w, height: STRIP.h, overflow: "hidden", transform: `rotate(${rot}deg)`, opacity: op, boxShadow: "0 6px 14px rgba(50,30,10,0.25)" }}>
            <div style={{ position: "absolute", left: -a * PX, top: 0, width: 41 * PX, height: STRIP.h }}>
              <Film />
            </div>
            {removed && <div style={{ position: "absolute", inset: 0, background: P.marker, clipPath: `inset(0 ${(1 - marked) * 100}% 0 0)` }} />}
          </div>
        );
      })}
      <div style={{ position: "absolute", left: STRIP.x, top: STRIP.y + STRIP.h + 44, fontFamily: FONT.mono, fontSize: 26, color: P.muted, opacity: labels }}>0:00</div>
      <div style={{ position: "absolute", left: STRIP.x + 41 * PX - 64, top: STRIP.y + STRIP.h + 44, fontFamily: FONT.mono, fontSize: 26, color: P.muted, opacity: labels }}>0:41</div>
    </>
  );
}

/** A tesoura: entra pela direita, corta cada limite de cima para baixo e sai. */
function Scissors({ f }: { f: number }) {
  const s = T.strip.snips;
  if (f < s[0] - 14 || f > s[s.length - 1] + 14) return null;
  const bx = BOUNDS.map((b) => STRIP.x + b * PX);
  const top = STRIP.y - 40;
  const bottom = STRIP.y + STRIP.h + 30;
  let x = bx[0];
  let y = top;
  let open = 1;
  if (f < s[0] - 5) {
    x = mix(1250, bx[0], easeOut(clamp((f - (s[0] - 14)) / 9)));
  } else if (f > s[s.length - 1] + 1) {
    x = mix(bx[bx.length - 1], 1300, easeIn(clamp((f - s[s.length - 1] - 1) / 12)));
    y = mix(bottom, top, clamp((f - s[s.length - 1] - 1) / 5));
  } else {
    const j = s.findIndex((sf, k) => f >= sf - 5 && f <= sf + 1 && k >= 0);
    if (j >= 0) {
      const t = clamp((f - (s[j] - 5)) / 6);
      x = bx[j];
      y = mix(top, bottom, easeIn(t));
      open = 1 - t;
    } else {
      const k = s.findIndex((sf) => sf - 5 > f) - 1;
      const t = easeInOut(clamp((f - (s[k] + 1)) / (s[k + 1] - 5 - (s[k] + 1))));
      x = mix(bx[k], bx[k + 1], t);
      y = mix(bottom, top, clamp(t * 2));
    }
  }
  const ang = 4 + open * 22;
  const blade = "M0 0 C -9 30, -10 90, -2 160 C 4 100, 10 40, 6 0 Z";
  return (
    <svg width={1} height={1} style={{ position: "absolute", left: x, top: y - 150, overflow: "visible", filter: "drop-shadow(14px 16px 8px rgba(50,30,10,0.3))" }}>
      {[-1, 1].map((side) => (
        <g key={side} transform={`rotate(${side * ang})`}>
          <path d={blade} fill="#B7BEC6" stroke="#7D858E" strokeWidth={2} transform={side > 0 ? "scale(-1 1)" : undefined} />
          <line x1={0} y1={0} x2={side * 26} y2={-70} stroke={P.caramel} strokeWidth={12} strokeLinecap="round" />
          <ellipse cx={side * 40} cy={-112} rx={30} ry={42} fill="none" stroke={P.caramel} strokeWidth={13} />
        </g>
      ))}
      <circle r={7} fill="#5B636C" />
    </svg>
  );
}

function HandText({ h, f }: { h: Hand; f: number }) {
  const p = h.to <= 0 ? 1 : lin(f, [h.from, h.to]);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: h.x,
        top: h.y - h.size * 0.82,
        fontFamily: HAND,
        fontSize: h.size,
        fontWeight: h.weight ?? 600,
        color: h.color ?? P.pen,
        lineHeight: 1,
        whiteSpace: "nowrap",
        padding: "0 0.3em 0 0",
        clipPath: p >= 1 ? undefined : `inset(-40% ${(1 - p) * 100}% -40% -10%)`,
        transform: h.rot ? `rotate(${h.rot}deg)` : undefined,
        transformOrigin: "0% 80%",
      }}
    >
      {h.text}
    </div>
  );
}

function Inks({ inks, f }: { inks: Ink[]; f: number }) {
  return (
    <svg width={W} height={WORLD_H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {inks.map((k, i) => {
        const p = lin(f, [k.from, k.to]);
        if (p <= 0) return null;
        return <path key={i} d={pathD(k.pts)} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} fill="none" stroke={k.color ?? P.pen} strokeWidth={k.w ?? 6} strokeLinecap="round" strokeLinejoin="round" opacity={0.94} />;
      })}
    </svg>
  );
}

function World({ f, inks, hands, pen }: { f: number; inks: Ink[]; hands: Hand[]; pen: ReturnType<typeof penAt> }) {
  const dot = chartPt([4, 74]);
  const dotIn = progress(f, T.chart.dot, 6, easeOut);
  const untouched = progress(f, T.strip.untouched, 10);
  const printed = progress(f, T.payoff.print, 12);
  return (
    <>
      {/* o papel: pautado, com a margem vermelha, bem maior que a tela */}
      <div style={{ position: "absolute", left: -900, top: -840, width: W + 1800, height: WORLD_H + 1680, background: `repeating-linear-gradient(180deg, transparent 0 81px, ${P.rule} 81px 83px, transparent 83px 84px), ${P.paper}` }} />
      <div style={{ position: "absolute", left: 128, top: -840, width: 3, height: WORLD_H + 1680, background: P.margin }} />

      {/* 1 · as revisões */}
      <div style={{ position: "absolute", left: 150, top: 196, fontFamily: FONT.mono, fontSize: 26, color: P.muted }}>client_cut_v7_FINAL.mp4</div>
      {f >= T.tally.tape && (
        <Tape cx={540} cy={1430} w={760} h={96} rot={-1.5} style={{ opacity: progress(f, T.tally.tape, 5), transform: `rotate(-1.5deg) scale(${1 + (1 - progress(f, T.tally.tape, 6)) * 0.2})` }}>
          <span style={{ fontFamily: FONT.sans, fontSize: 40, fontWeight: 500, color: P.ink, letterSpacing: "-0.01em" }}>of the same 40-second cut.</span>
        </Tape>
      )}

      {/* 2 · o cliente */}
      <Sticky f={f} />

      {/* 3 · a virada: a etiqueta com o logo */}
      {f >= T.turn.tape && (
        <Tape cx={540} cy={2790} w={860} h={200} rot={2} style={{ opacity: progress(f, T.turn.tape, 4), transform: `rotate(2deg) scale(${1 + (1 - progress(f, T.turn.tape, 6)) * 0.25})` }}>
          <BrandLockup size={100} color={P.ink} id="tape" />
        </Tape>
      )}

      {/* 4 · a análise */}
      <Chart />
      {f >= T.chart.dot && <div style={{ position: "absolute", left: dot[0] - 13, top: dot[1] - 13, width: 26, height: 26, borderRadius: 99, background: P.red, transform: `scale(${dotIn * (1 + 0.6 * (1 - dotIn))})` }} />}
      <Photo f={f} src="insight" crop={[0, 640]} cx={690} cy={3905} w={600} rot={2.5} at={T.chart.photo} />
      <Transcript />

      {/* 5 · você decide */}
      <Checklist />
      <Photo f={f} src="cuts_head_acc" crop={[0, 931]} cx={720} cy={5700} w={540} rot={-2.5} at={T.decide.photo} />

      {/* 6 · a fita */}
      <Strip f={f} />
      <div style={{ position: "absolute", left: 0, width: W, top: 6648, textAlign: "center", fontFamily: SERIF, fontSize: 46, fontWeight: 500, color: P.ink, opacity: untouched, transform: `translateY(${(1 - untouched) * 16}px)` }}>
        your original stays untouched.
      </div>

      {/* 7 · o fecho */}
      <div style={{ position: "absolute", left: 0, width: W, top: 7470, textAlign: "center", fontFamily: SERIF, fontSize: 58, fontWeight: 600, lineHeight: 1.2, letterSpacing: "-0.02em", color: P.ink, opacity: printed, transform: `translateY(${(1 - printed) * 20}px)` }}>
        publishub just finds
        <br />
        the <span style={{ color: P.caramel }}>dead moments.</span>
      </div>

      <Inks inks={inks} f={f} />
      {hands.map((h, i) => (
        <HandText key={i} h={h} f={f} />
      ))}
      <Scissors f={f} />
      {pen && <Pen {...pen} />}
    </>
  );
}

/* ---------- o fim: a página vira, o caderno fechado vira o logo ---------- */

function End({ f }: { f: number }) {
  const E = T.end;
  const z = progress(f, E.zoom[0], E.zoom[1] - E.zoom[0], easeInOut);
  const MH = 210;
  const MW = (MH * 500) / 524;
  const ww = measure("Publishub", "600 150px Geist") - 0.035 * 150 * 9;
  const total = MW + 60 + ww;
  const left = 540 - total / 2;
  const final: Pt = [left + MW / 2, 700];
  const S0 = 11;
  const bodyDx = ((585 - 655) / 500) * MW; // o centro da capa, em relação ao centro do símbolo
  const start: Pt = [540 - bodyDx * S0, 960];
  const s = mix(S0, 1, z);
  const c: Pt = [mix(start[0], final[0], z), mix(start[1], final[1], z)];
  const penIn = progress(f, E.build[0], E.build[1] - E.build[0], easeInOut);
  const word = progress(f, E.word, 14);
  const tag: Hand = { from: E.tag[0], to: E.tag[1], x: 0, y: 930, text: "see where your edit loses viewers.", size: 76 };
  tag.x = 540 - handW(tag) / 2;
  const cta = progress(f, E.cta, 10, easeOut);
  const pulse = 1;
  const arrowPts: Pt[] = Array.from({ length: 16 }, (_, i) => {
    const t = i / 15;
    const a: Pt = [tag.x + handW(tag) - 30, 960];
    const ctl: Pt = [980, 990];
    const b: Pt = [880, 1060];
    return [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * ctl[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * ctl[1] + t * t * b[1]];
  });
  const arrowP = lin(f, E.arrow);
  return (
    <AbsoluteFill style={{ background: `repeating-linear-gradient(180deg, transparent 0 81px, ${P.rule} 81px 83px, transparent 83px 84px), ${P.paper}`, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: c[0] - MW / 2, top: c[1] - MH / 2, width: MW, height: MH, transform: `scale(${s})` }}>
        <BrandMark height={MH} build={penIn} penOnly id="end" />
      </div>
      <div style={{ position: "absolute", left: left + MW + 60, top: 700 - 75, fontFamily: FONT.sans, fontWeight: 600, fontSize: 150, letterSpacing: "-0.035em", lineHeight: 1, color: P.ink, clipPath: `inset(-20% ${(1 - word) * 100}% -20% 0)` }}>Publishub</div>
      <HandText h={tag} f={f} />
      {arrowP > 0 && (
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          <path d={pathD(arrowPts)} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - arrowP} fill="none" stroke={P.pen} strokeWidth={6} strokeLinecap="round" />
          {arrowP >= 1 && <path d={pathD(arrowHead(arrowPts[13], arrowPts[15], 26))} fill="none" stroke={P.pen} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />}
        </svg>
      )}
      <div style={{ position: "absolute", top: 1030, width: W, display: "flex", justifyContent: "center", opacity: cta, transform: `translateY(${(1 - cta) * 30}px) scale(${pulse})` }}>
        <div style={{ background: P.pen, color: P.cream, borderRadius: 999, padding: "32px 62px", fontFamily: FONT.sans, fontSize: 54, fontWeight: 600, letterSpacing: "-0.02em", boxShadow: "0 14px 30px rgba(31,71,166,0.3)" }}>Analyze your video free</div>
      </div>
      <div style={{ position: "absolute", top: 1200, width: W, textAlign: "center", opacity: progress(f, E.url, 10) }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 50, color: P.ink }}>getpublishub.com</div>
      </div>
      <div style={{ position: "absolute", top: 1290, width: W, textAlign: "center", fontFamily: FONT.sans, fontSize: 34, color: P.muted, opacity: progress(f, E.note, 10) }}>No account · No card · Results in ~3 min</div>
    </AbsoluteFill>
  );
}

/* ---------- a composição ---------- */

function Grain({ f }: { f: number }) {
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: 0.16, mixBlendMode: "multiply", pointerEvents: "none" }}>
      <filter id="paper-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves={2} seed={7} stitchTiles="stitch" />
        <feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 0 0.3  0 0 0 0.9 0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#paper-grain)" />
    </svg>
  );
}

export function Caderno({ sound = true }: { sound?: boolean }) {
  const f = useCurrentFrame();
  const { inks, hands } = buildScript();
  const pen = penAt(f, penEvents(inks, hands));
  const cam = camAt(f);
  const prev = camAt(f - 1);
  const speed = Math.hypot(cam.x - prev.x, cam.y - prev.y) * cam.z + Math.abs(cam.z - prev.z) * 900;
  const blur = Math.min(8, Math.max(0, (speed - 40) / 10));
  const turn = progress(f, T.end.turn[0], T.end.turn[1] - T.end.turn[0], easeIn);
  // o tranco de cada corte da tesoura
  const snip = 0;
  return (
    <AbsoluteFill style={{ background: P.desk, overflow: "hidden" }}>
      {sound && <Audio src={staticFile("caderno/soundtrack.wav")} />}
      {f >= T.end.turn[0] && <End f={f} />}
      {f >= T.end.turn[0] && turn < 1 && <AbsoluteFill style={{ background: `linear-gradient(90deg, rgba(30,20,10,${0.45 * (1 - turn)}), transparent 70%)` }} />}
      {turn < 1 && (
        <AbsoluteFill style={{ perspective: 2400 }}>
          <AbsoluteFill style={{ transformOrigin: "0% 50%", transform: `rotateY(${-turn * 115}deg)`, backfaceVisibility: "hidden", overflow: "hidden" }}>
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: W,
                height: WORLD_H,
                transformOrigin: "0 0",
                transform: `translate(${FOCUS[0] + snip}px, ${FOCUS[1]}px) rotate(${cam.r}deg) scale(${cam.z}) translate(${-cam.x}px, ${-cam.y}px)`,
                filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
              }}
            >
              <World f={f} inks={inks} hands={hands} pen={pen} />
            </div>
            {/* luz de mesa e a sombra da página virando */}
            <AbsoluteFill style={{ background: "radial-gradient(110% 75% at 35% 30%, rgba(255,250,235,0.18) 0%, transparent 55%, rgba(60,40,20,0.22) 100%)" }} />
            {turn > 0 && <AbsoluteFill style={{ background: `linear-gradient(90deg, transparent 20%, rgba(40,25,10,${turn * 0.5}))` }} />}
          </AbsoluteFill>
        </AbsoluteFill>
      )}
      <Grain f={f} />
    </AbsoluteFill>
  );
}

export const CADERNO_FPS = T.fps;
export const CADERNO_FRAMES = T.durationInFrames;
