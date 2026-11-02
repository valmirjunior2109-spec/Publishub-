// Reel "Stop blaming the algorithm" / "Para de culpar o algoritmo": 25 s, feito para circular.
// O primeiro quadro já é a frase, a curva cai exatamente no segundo 0:04 do próprio Reel, e as telas
// são a análise de exemplo da landing, em cada idioma. Tudo fica parado enquanto há o que ler:
// só o cursor, a linha e as passagens se movem, em movimentos curtos.

import { AbsoluteFill, Audio, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import type { ReactNode } from "react";
import { Lockup } from "./Logo";
import RECT_EN from "./rects.en.json";
import RECT_PT from "./rects.pt.json";
import T from "./timeline.json";

export type Lang = "en" | "pt";

const BG = "#0C0B0A";
const INK = "#F6F0E4";
const MUTED = "rgba(246,240,228,0.62)";
const BLUE = "#8FAAF0";
const WIPE = "#4D74F0";
const HOT = "#FF8A4C";
const CARD = "rgb(32,28,23)";
const LINE = "rgba(246,240,228,0.16)";
const SANS = "Geist, system-ui, sans-serif";
const MONO = "'Geist Mono', ui-monospace, monospace";
const MARGIN = 72;

const COPY = {
  en: {
    hook: ["Stop blaming", "the ", "algorithm."], hookSub: "It's probably one line.",
    first: ["People don't leave", "your video."], firstSize: 92,
    second: ["They leave", "one second", "of it."], secondSize: 150,
    ui1: ["Publishub shows you", "which second."], ui2: ["And the line that", "likely lost them."], example: "EXAMPLE",
    brand: "your AI editing copilot",
    upload: "Send your edit.", zone: "Drop your video", file: "your_edit.mp4",
    steps: "About 3 minutes later:", checks: ["speech transcribed", "frames analyzed", "drop found"],
    plan: ["You pick", "what to fix."], accepted: "Accepted",
    counter: "FINAL EDIT", safe1: "Nothing is cut until", safe2: "you approve it.", safe3: "Your original stays untouched.",
    cta: ["See where your edit", "loses people."], button: "Analyze your video free", note: "No account · No card · ~3 min", bio: "link in bio",
    share: ["Send this to the friend who", "still blames the algorithm."],
  },
  pt: {
    hook: ["Para de culpar", "o ", "algoritmo."], hookSub: "Provavelmente foi uma frase.",
    first: ["As pessoas não saem", "do seu vídeo."], firstSize: 88,
    second: ["Elas saem de", "um segundo", "dele."], secondSize: 134,
    ui1: ["A Publishub mostra", "qual segundo."], ui2: ["E a frase que", "provavelmente as espantou."], example: "EXEMPLO",
    brand: "seu copiloto de edição com IA",
    upload: "Envie sua edição.", zone: "Solte seu vídeo", file: "sua_edicao.mp4",
    steps: "Cerca de 3 minutos depois:", checks: ["fala transcrita", "frames analisados", "queda encontrada"],
    plan: ["Você escolhe", "o que corrigir."], accepted: "Aceito",
    counter: "EDIÇÃO FINAL", safe1: "Nada é cortado sem", safe2: "você aprovar.", safe3: "Seu original fica intacto.",
    cta: ["Veja onde sua edição", "perde gente."], button: "Analisar meu vídeo grátis", note: "Sem conta · Sem cartão · ~3 min", bio: "link na bio",
    share: ["Manda pro amigo que ainda", "culpa o algoritmo."],
  },
};

const out = Easing.bezier(0.16, 1, 0.3, 1);
const inOut = Easing.bezier(0.65, 0, 0.35, 1);
const prog = (f: number, at: number, dur: number, easing = out) => interpolate(f, [at, at + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });

/** A linha sobe de dentro de um recorte e para. Terminada, sem recorte: nenhuma letra fica cortada. */
function Rise({ f, at, size, color = INK, weight = 800, children, dur = 9, mono }: { f: number; at: number; size: number; color?: string; weight?: number; children: ReactNode; dur?: number; mono?: boolean }) {
  const p = prog(f, at, dur);
  if (f < at) return <div style={{ height: size * 1.1 }} />;
  return (
    <div style={{ overflow: p < 1 ? "hidden" : "visible", paddingBottom: size * 0.2, marginBottom: -size * 0.2, height: size * 1.1 + size * 0.2, boxSizing: "border-box" }}>
      <div style={{ transform: `translateY(${Math.round((1 - p) * size * 1.4)}px)`, fontFamily: mono ? MONO : SANS, fontSize: size, fontWeight: weight, lineHeight: 1.1, letterSpacing: mono ? "-0.02em" : "-0.04em", color, whiteSpace: "nowrap" }}>{children}</div>
    </div>
  );
}

function Chip({ text, style }: { text: string; style?: React.CSSProperties }) {
  return <span style={{ position: "absolute", padding: "8px 18px", borderRadius: 999, background: "rgba(0,0,0,0.55)", border: `2px solid ${LINE}`, color: INK, fontFamily: MONO, fontSize: 26, fontWeight: 600, letterSpacing: "0.04em", ...style }}>{text}</span>;
}

type Point = { f: number; x: number; y: number };

function cursorAt(f: number, path: Point[]) {
  let a = path[0];
  for (let i = 1; i < path.length; i++) {
    const b = path[i];
    if (f >= b.f) { a = b; continue; }
    const t = prog(f, a.f, b.f - a.f, inOut);
    return { x: Math.round(a.x + (b.x - a.x) * t), y: Math.round(a.y + (b.y - a.y) * t) };
  }
  return { x: a.x, y: a.y };
}

function Cursor({ f, path, clicks = [] }: { f: number; path: Point[]; clicks?: number[] }) {
  if (f < path[0].f) return null;
  const { x, y } = cursorAt(f, path);
  const click = clicks.find((c) => f >= c && f < c + 14);
  const pressed = clicks.some((c) => f >= c && f < c + 4);
  const ring = click === undefined ? 0 : prog(f, click, 14);
  return (
    <>
      {click !== undefined && <div style={{ position: "absolute", left: x - 60, top: y - 60, width: 120, height: 120, borderRadius: "50%", border: `5px solid ${BLUE}`, transform: `scale(${0.2 + ring * 0.9})`, opacity: 1 - ring }} />}
      <svg width={64} height={64} viewBox="0 0 24 24" style={{ position: "absolute", left: x - 8, top: y - 6, transform: pressed ? "scale(0.86)" : undefined, transformOrigin: "8px 6px", overflow: "visible" }}>
        <path d="M5 3 L5 19.5 L9.6 15.4 L12.6 22 L15.6 20.7 L12.6 14.2 L18.8 14.2 Z" fill="#fff" stroke="#111" strokeWidth={1.4} strokeLinejoin="round" />
      </svg>
    </>
  );
}

/* ---------- 0:00 a frase ---------- */

function Hook({ f, c }: { f: number; c: typeof COPY.en }) {
  const strike = prog(f, T.hook.strike, 8);
  const size = 128;
  return (
    <div style={{ position: "absolute", left: MARGIN, top: 620 }}>
      {/* sem entrada: o primeiro quadro é a capa do Reel */}
      <div style={{ fontFamily: SANS, fontSize: size, fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.045em", color: INK, whiteSpace: "nowrap" }}>
        {c.hook[0]}
        <br />
        {c.hook[1]}
        <span style={{ position: "relative", display: "inline-block" }}>
          {c.hook[2]}
          <span style={{ position: "absolute", left: -6, right: -6, top: "54%", height: 14, borderRadius: 7, background: HOT, transform: `scaleX(${strike})`, transformOrigin: "left center" }} />
        </span>
      </div>
      <div style={{ marginTop: 44 }}>
        <Rise f={f} at={T.hook.sub} size={58} color={BLUE} weight={600}>{c.hookSub}</Rise>
      </div>
    </div>
  );
}

/* ---------- 0:02 a linha que cai no 0:04 deste Reel ---------- */

const X0 = MARGIN;
const X1 = 1008;
const XD = 465; // onde a queda começa: é onde a linha está no quadro T.line.drop
const XE = 545;
const curveY = (x: number) => {
  if (x <= XD) return 46 + (x - X0) * 0.06;
  if (x <= XE) {
    const k = (x - XD) / (XE - XD);
    return 70 + 230 * (0.5 - Math.cos(Math.PI * k) / 2);
  }
  return 300 + (x - XE) * 0.1;
};
const headX = (f: number) => {
  if (f < T.line.drop) return interpolate(f, [T.line.first, T.line.drop], [X0, XD], { extrapolateLeft: "clamp" });
  if (f < T.line.drop + 6) return interpolate(f, [T.line.drop, T.line.drop + 6], [XD, XE]);
  return interpolate(f, [T.line.drop + 6, T.line.out], [XE, X1], { extrapolateRight: "clamp", easing: Easing.out(Easing.quad) });
};
const points = (a: number, b: number) => {
  const pts: string[] = [];
  for (let x = a; x < b; x += 4) pts.push(`${x},${curveY(x).toFixed(1)}`);
  pts.push(`${b},${curveY(b).toFixed(1)}`);
  return pts.join(" ");
};

function Chart({ f }: { f: number }) {
  const head = headX(f);
  const dropped = f >= T.line.drop;
  const seconds = Math.min(4, Math.floor(f / T.fps));
  return (
    <svg width={1080} height={480} style={{ position: "absolute", left: 0, top: 1000, overflow: "visible" }}>
      <line x1={X0} x2={X1} y1={440} y2={440} stroke={LINE} strokeWidth={3} />
      {dropped && <line x1={XD} x2={XD} y1={curveY(XD)} y2={440} stroke={HOT} strokeWidth={4} strokeDasharray="4 12" strokeLinecap="round" />}
      <polyline points={points(X0, Math.min(head, XD))} fill="none" stroke={BLUE} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
      {dropped && <polyline points={points(XD, head)} fill="none" stroke={HOT} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />}
      {dropped && <circle cx={XD} cy={curveY(XD)} r={20} fill={HOT} />}
      <circle cx={head} cy={curveY(head)} r={dropped && f >= T.line.out - 4 ? 0 : 12} fill={INK} />
      <text x={dropped ? XD + 40 : X0} y={dropped ? 62 : 412} fill={dropped ? HOT : MUTED} fontFamily={MONO} fontWeight={700} fontSize={dropped ? 76 : 44}>{`0:0${seconds}`}</text>
    </svg>
  );
}

function LineScene({ f, c }: { f: number; c: typeof COPY.en }) {
  const second = f >= T.line.second;
  return (
    <>
      {!second ? (
        <div style={{ position: "absolute", left: MARGIN, top: 400 }}>
          <Rise f={f} at={T.line.first + 3} size={c.firstSize}>{c.first[0]}</Rise>
          <Rise f={f} at={T.line.first + 9} size={c.firstSize}>{c.first[1]}</Rise>
        </div>
      ) : (
        <div style={{ position: "absolute", left: MARGIN, top: 330 }}>
          <Rise f={f} at={T.line.second} size={c.secondSize}>{c.second[0]}</Rise>
          <Rise f={f} at={T.line.drop} size={c.secondSize} color={HOT}>{c.second[1]}</Rise>
          <Rise f={f} at={T.line.drop + 6} size={c.secondSize}>{c.second[2]}</Rise>
        </div>
      )}
      <Chart f={f} />
    </>
  );
}

/* ---------- 0:05 a tela da análise ---------- */

const DROP_S = (1080 - MARGIN * 2) / 490;
const DROP_Y = 610;

function DropScene({ f, c, lang, r }: { f: number; c: typeof COPY.en; lang: Lang; r: typeof RECT_EN }) {
  const swapped = f >= T.ui.swap;
  const enter = prog(f, T.ui.in, 12);
  const height = Math.round((r.quote.y - r.drop.y + r.quote.height + 22) * DROP_S);
  const hi = prog(f, T.ui.swap, 8);
  const qx = (r.quote.x - r.drop.x) * DROP_S;
  const qy = (r.quote.y - r.drop.y) * DROP_S;
  const dotX = MARGIN + (r.dot.x + r.dot.width / 2 - r.drop.x) * DROP_S;
  const dotY = DROP_Y + (r.dot.y + r.dot.height / 2 - r.drop.y) * DROP_S;
  const ring = prog(f, T.ui.dot, 16);
  const title = swapped ? c.ui2 : c.ui1;
  const at = swapped ? T.ui.swap : T.ui.in + 3;
  return (
    <>
      <div key={swapped ? "b" : "a"} style={{ position: "absolute", left: MARGIN, top: 320 }}>
        <Rise f={f} at={at} size={lang === "pt" && swapped ? 74 : 84}>{title[0]}</Rise>
        <Rise f={f} at={at + 5} size={lang === "pt" && swapped ? 74 : 84} color={swapped ? HOT : INK}>{title[1]}</Rise>
      </div>
      <div style={{ position: "absolute", left: MARGIN, top: DROP_Y + Math.round((1 - enter) * 140), width: 1080 - MARGIN * 2, height, borderRadius: 28, overflow: "hidden", border: `2px solid ${LINE}`, background: CARD, opacity: enter }}>
        <Img src={staticFile(`swipe/${lang}/drop.png`)} style={{ position: "absolute", left: 0, top: 0, width: 1080 - MARGIN * 2 }} />
        <Chip text={c.example} style={{ right: 28, top: 26 }} />
        {hi > 0 && <div style={{ position: "absolute", left: qx - 16, top: qy - 14, width: r.quote.width * DROP_S + 28, height: r.quote.height * DROP_S + 28, borderRadius: 18, border: `5px solid ${HOT}`, boxShadow: `0 0 0 2000px rgba(12,11,10,${0.62 * hi})`, opacity: hi }} />}
      </div>
      {f >= T.ui.dot && f < T.ui.dot + 16 && <div style={{ position: "absolute", left: dotX - 70, top: dotY - 70, width: 140, height: 140, borderRadius: "50%", border: `6px solid ${HOT}`, transform: `scale(${0.2 + ring * 0.9})`, opacity: 1 - ring }} />}
      <Cursor f={f} path={[{ f: T.ui.cursor, x: 1120, y: 1420 }, { f: T.ui.dot, x: Math.round(dotX), y: Math.round(dotY) }, { f: T.ui.swap + 4, x: Math.round(dotX), y: Math.round(dotY) }, { f: T.ui.swap + 20, x: 820, y: DROP_Y + Math.round(qy + r.quote.height * DROP_S) - 8 }]} clicks={[T.ui.dot]} />
    </>
  );
}

/* ---------- 0:09 a marca, o envio, os 3 minutos ---------- */

function Brand({ f, c }: { f: number; c: typeof COPY.en }) {
  const p = prog(f, T.brand.in + 2, 10);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 660, display: "flex", flexDirection: "column", alignItems: "center", gap: 46 }}>
      <div style={{ transform: `scale(${(0.86 + p * 0.14).toFixed(3)})`, opacity: p }}>
        <Lockup size={124} id="swipe-brand" />
      </div>
      <Rise f={f} at={T.brand.sub} size={56} color={BLUE} weight={500}>{c.brand}</Rise>
    </div>
  );
}

function Upload({ f, c }: { f: number; c: typeof COPY.en }) {
  const zone = { x: 110, y: 640, w: 860, h: 500 };
  const center = { x: zone.x + zone.w / 2, y: zone.y + zone.h / 2 + 120 };
  const rest = { x: 640, y: 1290 };
  const path = [{ f: T.upload.in + 2, x: 1120, y: 1460 }, { f: T.upload.grab, x: rest.x, y: rest.y }, { f: T.upload.drop, x: center.x, y: center.y }];
  const pos = f <= T.upload.grab ? rest : cursorAt(f, path);
  const dropped = prog(f, T.upload.drop, 6);
  return (
    <>
      <div style={{ position: "absolute", left: MARGIN, top: 380 }}>
        <Rise f={f} at={T.upload.in + 2} size={100}>{c.upload}</Rise>
      </div>
      <div style={{ position: "absolute", left: zone.x, top: zone.y, width: zone.w, height: zone.h, borderRadius: 40, border: `5px dashed ${dropped > 0 ? BLUE : "rgba(246,240,228,0.4)"}`, background: `rgba(143,170,240,${0.14 * dropped})`, boxSizing: "border-box" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 104, textAlign: "center", fontFamily: SANS, fontSize: 58, fontWeight: 600, letterSpacing: "-0.03em", color: INK }}>{c.zone}</div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 186, textAlign: "center", fontFamily: MONO, fontSize: 34, color: MUTED }}>MP4 · MOV · WEBM</div>
      </div>
      <div style={{ position: "absolute", left: pos.x - 250, top: pos.y - 60, width: 500, height: 112, borderRadius: 24, background: "#23201C", border: `3px solid ${dropped > 0 ? BLUE : LINE}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 18, fontFamily: MONO, fontSize: 36, fontWeight: 600, color: INK, boxSizing: "border-box" }}>
        {c.file}
        {dropped > 0 && <span style={{ color: BLUE }}>✓</span>}
      </div>
      <Cursor f={f} path={path} clicks={[T.upload.drop]} />
    </>
  );
}

function Steps({ f, c, lang }: { f: number; c: typeof COPY.en; lang: Lang }) {
  const bar = interpolate(f, [T.steps.in, T.steps.checks[2] + 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad) });
  return (
    <div style={{ position: "absolute", left: MARGIN, top: 500 }}>
      <Rise f={f} at={T.steps.in + 2} size={lang === "pt" ? 72 : 84}>{c.steps}</Rise>
      <div style={{ marginTop: 66, display: "flex", flexDirection: "column", gap: 40 }}>
        {c.checks.map((text, i) => (
          <Rise key={text} f={f} at={T.steps.checks[i]} size={68} weight={600} color={i === 2 ? HOT : INK}>
            <span style={{ color: i === 2 ? HOT : BLUE, marginRight: 26 }}>✓</span>
            {text}
          </Rise>
        ))}
      </div>
      <div style={{ marginTop: 78, width: 1080 - MARGIN * 2, height: 16, borderRadius: 8, background: LINE }}>
        <div style={{ width: `${(bar * 100).toFixed(1)}%`, height: 16, borderRadius: 8, background: BLUE }} />
      </div>
    </div>
  );
}

/* ---------- 0:14 o plano e a edição final ---------- */

const PLAN_W = 820;
const PLAN_X = 130;
const PLAN_Y = 430;
const PLAN_S = PLAN_W / 340;

function PlanScene({ f, c, lang, r }: { f: number; c: typeof COPY.en; lang: Lang; r: typeof RECT_EN }) {
  const enter = prog(f, T.plan.in + 2, 12);
  const clicked = f >= T.plan.click + 2;
  const card = r.items[2];
  const box = {
    x: Math.round((r.accept.x - r.plan.x) * PLAN_S),
    y: Math.round((r.accept.y - r.plan.y) * PLAN_S),
    w: Math.round(r.accept.width * PLAN_S),
    h: Math.round(r.accept.height * PLAN_S),
  };
  const fin = prog(f, T.plan.final, 8);
  const finY = Math.round((r.final.y - r.plan.y + 6) * PLAN_S);
  const finH = Math.round(38 * PLAN_S);
  const target = { x: PLAN_X + box.x + Math.round(box.w / 2), y: PLAN_Y + box.y + Math.round(box.h / 2) };
  return (
    <>
      <div style={{ position: "absolute", left: MARGIN, top: 226 }}>
        <Rise f={f} at={T.plan.in + 2} size={82}>{c.plan[0]}</Rise>
        <Rise f={f} at={T.plan.in + 7} size={82} color={BLUE}>{c.plan[1]}</Rise>
      </div>
      <div style={{ position: "absolute", left: PLAN_X, top: PLAN_Y + Math.round((1 - enter) * 160), width: PLAN_W, height: Math.round((r.plan.height) * PLAN_S), borderRadius: 28, overflow: "hidden", border: `2px solid ${LINE}`, opacity: enter }}>
        <Img src={staticFile(`swipe/${lang}/plan.png`)} style={{ position: "absolute", left: 0, top: 0, width: PLAN_W }} />
        {clicked && (
          <>
            <div style={{ position: "absolute", left: Math.round((card.x - r.plan.x) * PLAN_S), top: Math.round((card.y - r.plan.y) * PLAN_S), width: Math.round(card.width * PLAN_S), height: Math.round(card.height * PLAN_S), borderRadius: 28, border: `3px solid rgba(143,170,240,0.55)`, boxSizing: "border-box" }} />
            <div style={{ position: "absolute", left: box.x - 26, top: box.y, width: box.w + 26, height: box.h, background: CARD, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, color: BLUE, fontFamily: SANS, fontSize: 29, fontWeight: 600 }}>
              <span style={{ fontWeight: 700 }}>✓</span>
              {c.accepted}
            </div>
          </>
        )}
        {fin > 0 && <div style={{ position: "absolute", left: 14, right: 14, top: finY, height: finH, borderRadius: 16, border: `4px solid ${HOT}`, opacity: fin, boxSizing: "border-box" }} />}
      </div>
      <Cursor f={f} path={[{ f: T.plan.cursor, x: 1120, y: 1440 }, { f: T.plan.click, x: target.x, y: target.y }, { f: T.plan.final, x: target.x, y: target.y }, { f: T.plan.final + 14, x: 700, y: PLAN_Y + finY + finH - 4 }]} clicks={[T.plan.click]} />
    </>
  );
}

function Counter({ f, c }: { f: number; c: typeof COPY.en }) {
  const n = Math.round(interpolate(f, [T.counter.in + 4, T.counter.done], [34, 24], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const done = f >= T.counter.done;
  return (
    <div style={{ position: "absolute", left: MARGIN, top: 500 }}>
      <Rise f={f} at={T.counter.in + 1} size={44} mono color={MUTED} weight={600}>{`${c.counter} · ${c.example}`}</Rise>
      <div style={{ marginTop: 14, fontFamily: MONO, fontWeight: 700, fontSize: 260, lineHeight: 1.05, letterSpacing: "-0.05em", color: done ? BLUE : INK, whiteSpace: "nowrap" }}>{`0:${n}`}</div>
      <div style={{ marginTop: 60 }}>
        <Rise f={f} at={T.counter.first} size={74}>{c.safe1}</Rise>
        <Rise f={f} at={T.counter.first + 4} size={74}>{c.safe2}</Rise>
        <div style={{ marginTop: 28 }}>
          <Rise f={f} at={T.counter.second} size={50} weight={500} color={MUTED}>{c.safe3}</Rise>
        </div>
      </div>
    </div>
  );
}

/* ---------- 0:19 o convite ---------- */

function Cta({ f, c }: { f: number; c: typeof COPY.en }) {
  const brand = prog(f, T.cta.in + 2, 10);
  const btn = prog(f, T.cta.button, 10);
  const pressed = f >= T.cta.click && f < T.cta.click + 4;
  const share = prog(f, T.cta.share, 10);
  const buttonY = 650;
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: 236, display: "flex", justifyContent: "center", opacity: brand }}>
        <Lockup size={68} id="swipe-cta" />
      </div>
      <div style={{ position: "absolute", left: MARGIN, top: 370 }}>
        <Rise f={f} at={T.cta.title} size={92}>{c.cta[0]}</Rise>
        <Rise f={f} at={T.cta.title + 5} size={92} color={HOT}>{c.cta[1]}</Rise>
      </div>
      <div style={{ position: "absolute", left: MARGIN, top: buttonY, width: 1080 - MARGIN * 2, height: 136, borderRadius: 68, background: BLUE, color: "#101014", display: "flex", alignItems: "center", justifyContent: "center", gap: 20, fontFamily: SANS, fontSize: 54, fontWeight: 700, letterSpacing: "-0.03em", opacity: btn, transform: `translateY(${Math.round((1 - btn) * 50)}px) scale(${pressed ? 0.97 : 1})` }}>
        {c.button} <span>→</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 816, display: "flex", justifyContent: "center" }}>
        <Rise f={f} at={T.cta.note} size={42} weight={500} color={MUTED}>{c.note}</Rise>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 910, display: "flex", justifyContent: "center" }}>
        <Rise f={f} at={T.cta.url} size={78} mono weight={700}>getpublishub.com</Rise>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1014, display: "flex", justifyContent: "center" }}>
        <Rise f={f} at={T.cta.url + 6} size={40} weight={500} color={BLUE}>{c.bio}</Rise>
      </div>
      <div style={{ position: "absolute", left: MARGIN, top: 1160, width: 1080 - MARGIN * 2, boxSizing: "border-box", padding: "32px 40px", borderRadius: 32, border: `3px solid ${LINE}`, background: "rgba(246,240,228,0.05)", opacity: share, transform: `translateY(${Math.round((1 - share) * 40)}px)`, fontFamily: SANS, fontSize: 46, fontWeight: 600, lineHeight: 1.22, letterSpacing: "-0.025em", color: INK, whiteSpace: "nowrap" }}>
        {c.share[0]}
        <br />
        {c.share[1]}
      </div>
      <Cursor f={f} path={[{ f: T.cta.cursor, x: 1120, y: 1400 }, { f: T.cta.click, x: 952, y: buttonY + 92 }]} clicks={[T.cta.click]} />
    </>
  );
}

/* ---------- a passagem: uma faixa cobre a tela e o corte acontece atrás dela ---------- */

function Wipes({ f }: { f: number }) {
  const at = T.wipes.find((w) => f >= w - 5 && f < w + 5);
  if (at === undefined) return null;
  const x = f < at ? interpolate(f, [at - 5, at], [-100, 0], { easing: Easing.in(Easing.quad) }) : interpolate(f, [at, at + 5], [0, 100], { easing: Easing.out(Easing.quad) });
  return <div style={{ position: "absolute", inset: 0, background: WIPE, transform: `translateX(${x.toFixed(2)}%)` }} />;
}

export function Swipe({ lang, sound = true }: { lang: Lang; sound?: boolean }) {
  const f = useCurrentFrame();
  const c = COPY[lang];
  const r = lang === "en" ? RECT_EN : RECT_PT;
  return (
    <AbsoluteFill style={{ background: BG, overflow: "hidden" }}>
      {/* o fundo não se mexe: nada aqui pode tremer no celular */}
      <AbsoluteFill style={{ backgroundImage: "radial-gradient(rgba(246,240,228,0.09) 2px, transparent 2px)", backgroundSize: "54px 54px" }} />
      <AbsoluteFill style={{ background: "radial-gradient(900px 700px at 80% 12%, rgba(77,116,240,0.2), transparent 70%)" }} />
      {sound && <Audio src={staticFile("swipe/soundtrack.wav")} />}
      {f < T.hook.out && <Hook f={f} c={c} />}
      {f >= T.line.first && f < T.line.out && <LineScene f={f} c={c} />}
      {f >= T.ui.in && f < T.ui.out && <DropScene f={f} c={c} lang={lang} r={r} />}
      {f >= T.brand.in && f < T.brand.out && <Brand f={f} c={c} />}
      {f >= T.upload.in && f < T.upload.out && <Upload f={f} c={c} />}
      {f >= T.steps.in && f < T.steps.out && <Steps f={f} c={c} lang={lang} />}
      {f >= T.plan.in && f < T.plan.out && <PlanScene f={f} c={c} lang={lang} r={r} />}
      {f >= T.counter.in && f < T.counter.out && <Counter f={f} c={c} />}
      {f >= T.cta.in && <Cta f={f} c={c} />}
      <Wipes f={f} />
    </AbsoluteFill>
  );
}
