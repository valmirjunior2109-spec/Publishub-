import type { CSSProperties } from "react";
import { ArrowRight, Check, Download } from "lucide-react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { easeInOut, easeOut, mix, progress } from "../anim";
import { DeskReel } from "./DeskReel";
import { RetentionCurve } from "../components/RetentionCurve";
import { Hand, HandArrow, enter, leave, MONO, SANS, Serif } from "../components/Type";
import { BrandLockup } from "../demo/Brand";
import { LOST, SAMPLE, UI } from "../theme";
import T from "./timeline.json";

/* ==========================================================================
   Publishub · anúncio de aquisição (Reels, TikTok, Shorts): 9:16, 21 s, sem rosto.
   Dor → o segundo exato → o porquê → o plano → o vídeo novo → o convite.
   A interface, os textos e o exemplo são os da landing (Landing.hero, .app,
   .copilot em frontend/messages/en.json), com o selo "example" como no site.
   O Reel do exemplo é uma mesa de edição (DeskReel), sem ninguém em cena.
   Os quadros estão em timeline.json; a trilha (make-sound-acquire.mjs) lê o mesmo.
   ========================================================================== */

export const ACQUIRE_FPS = T.fps;
export const ACQUIRE_FRAMES = T.durationInFrames;

/* o tema claro do site (globals.css) */
const D = { paper: "#F6F0E4", stage: "#F0E2CA", raised: "#FFFDF8", surface: "#EFE6D6", ink: "#1E1B18", muted: "#5C544B", line: "#E4D6C1", caramel: "#C9824A", caramelInk: "#8A4F22", accent: "#1F47A6", accentSoft: "#E3E9F7" };
const X = 80;
const FILE = "edit-in-10-minutes.mp4"; // o exemplo do anúncio: um Reel sobre editar rápido
const W_IN = 1080 - 2 * X;

const card: CSSProperties = { borderRadius: 36, background: D.raised, border: `2px solid ${D.line}`, boxShadow: "0 30px 80px rgba(80,50,20,0.13)" };
const labelStyle: CSSProperties = { fontFamily: MONO, fontSize: 25, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: D.muted };

/* ---------------------------------------------------------------- o fundo */

function Backdrop({ f }: { f: number }) {
  const paper = progress(f, T.hook.out, 14) * (1 - progress(f, T.cta.logo - 8, 16));
  return (
    <>
      <AbsoluteFill style={{ background: D.stage }} />
      <AbsoluteFill style={{ background: D.paper, opacity: paper }} />
    </>
  );
}

/* ---------------------------------------------------------------- 1 · o gancho: horas de edição, 4 segundos */

const PHONE = { x: 304, y: 690, w: 472, h: 840 };

function Hook({ f }: { f: number }) {
  const S = T.hook;
  if (f > S.out + 14) return null;
  const played = mix(0, SAMPLE.dropAtSec / SAMPLE.durationSec, progress(f, 0, S.drop, (t) => t));
  const drop = progress(f, S.drop, 8, easeOut);
  const shake = f >= S.drop && f < S.drop + 10 ? Math.sin((f - S.drop) * 2.4) * 6 * (1 - (f - S.drop) / 10) : 0;
  const sec = Math.min(4, Math.floor((f / S.drop) * 4));
  return (
    <div style={{ position: "absolute", inset: 0, ...leave(f, S.out, 12) }}>
      <Serif f={f} lines={[[{ t: "You spent hours" }], [{ t: "on this edit." }]]} at={S.title} step={3} size={124} color={D.ink} emColor={D.caramelInk} style={{ position: "absolute", left: X, top: 230 }} />
      <Serif f={f} lines={[[{ t: "They left at 0:04.", em: true }]]} at={S.title2} step={3} size={124} color={D.ink} emColor={D.caramelInk} style={{ position: "absolute", left: X, top: 490 }} />
      <div style={{ position: "absolute", left: PHONE.x, top: PHONE.y, width: PHONE.w, height: PHONE.h, borderRadius: 64, border: `14px solid ${D.ink}`, background: D.ink, overflow: "hidden", boxShadow: "0 40px 90px rgba(60,35,10,0.25)", transform: `translateX(${shake}px) rotate(${-2.5 * drop}deg) translateY(${(1 - progress(f, 0, 14)) * 80}px)`, opacity: progress(f, 0, 8) }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 50, overflow: "hidden" }}>
          <DeskReel played={played} scale={1.75} caption={1 - drop} id="reel-hook" />
          <div style={{ position: "absolute", inset: 0, background: `rgba(30,27,24,${0.55 * drop})` }} />
          {/* o contador do Reel e a queda */}
          <div style={{ position: "absolute", right: 22, top: 24, borderRadius: 999, background: "rgba(0,0,0,0.55)", padding: "8px 18px", fontFamily: MONO, fontSize: 26, color: "#fff" }}>0:0{sec} / 0:34</div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 300, textAlign: "center", opacity: drop, transform: `scale(${mix(0.8, 1, drop)})` }}>
            <div style={{ fontFamily: SANS, fontSize: 110, fontWeight: 700, color: "#fff", letterSpacing: "-0.04em" }}>0:04</div>
            <div style={{ fontFamily: MONO, fontSize: 30, color: "#fff", marginTop: 6 }}>−{LOST}% in 2 seconds</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- 2 · o segundo exato */

function Find({ f }: { f: number }) {
  const S = T.find;
  if (f < S.title - 1 || f > S.out + 14) return null;
  const draw = progress(f, S.curve, 30, easeInOut);
  const pop = progress(f, S.drop, 10);
  const lost = Math.round(LOST * progress(f, S.drop + 2, 14, easeOut));
  const played = pop > 0 ? mix(1, SAMPLE.dropAtSec / SAMPLE.durationSec, progress(f, S.drop, 8, easeInOut)) : draw;
  return (
    <div style={{ position: "absolute", inset: 0, ...leave(f, S.out, 12) }}>
      <Serif f={f} lines={[[{ t: "Publishub shows you" }], [{ t: "the exact second.", em: true }]]} at={S.title} step={3} size={112} color={D.ink} emColor={D.caramelInk} style={{ position: "absolute", left: X, top: 240 }} />
      <div style={{ position: "absolute", left: X, top: 540, width: W_IN, ...card, overflow: "hidden", ...enter(f, S.window, 18, 70) }}>
        <div style={{ height: 76, borderBottom: `2px solid ${D.line}`, display: "flex", alignItems: "center", padding: "0 30px", gap: 12, background: D.surface }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ width: 16, height: 16, borderRadius: 8, background: "#DCCDB6" }} />
          ))}
          <span style={{ flex: 1, textAlign: "center", fontFamily: MONO, fontSize: 26, color: D.muted, marginRight: 60 }}>{FILE}</span>
        </div>
        <div style={{ padding: "36px 44px 34px" }}>
          <div style={{ display: "flex", gap: 34, alignItems: "center" }}>
            <div style={{ width: 168, height: 298, borderRadius: 20, overflow: "hidden", flexShrink: 0 }}>
              <DeskReel played={played} scale={0.62} ui={false} id="reel-thumb" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={labelStyle}>{UI.retention}</span>
                <span style={{ fontFamily: MONO, fontSize: 21, color: D.muted, border: `2px solid ${D.line}`, borderRadius: 999, padding: "4px 14px" }}>example</span>
              </div>
              <div style={{ fontFamily: SANS, fontSize: 78, fontWeight: 600, letterSpacing: "-0.035em", color: D.ink, marginTop: 10, opacity: mix(0.25, 1, pop) }}>Drop at 0:04</div>
              <div style={{ fontFamily: MONO, fontSize: 36, color: D.accent, marginTop: 4, opacity: progress(f, S.drop + 2, 8) }}>−{lost}% in 2 seconds</div>
            </div>
          </div>
          <div style={{ marginTop: 34 }}>
            <RetentionCurve points={SAMPLE.retention} durationSec={SAMPLE.durationSec} dropAtSec={SAMPLE.dropAtSec} axisSize={26} draw={draw} pop={pop} ring={progress(f, S.drop + 2, 24)} id="acq-curve" />
          </div>
        </div>
      </div>
      <Hand f={f} at={S.note} size={76} color={D.caramelInk} rotate={-3} style={{ position: "absolute", left: 400, top: 1430 }}>
        the second they left
      </Hand>
      <HandArrow f={f} at={S.note + 10} d="M 385 1466 C 290 1470, 236 1420, 224 1360" head="M 209 1378 L 223 1356 L 239 1376" color={D.caramelInk} style={{ left: 0, top: 0 }} />
    </div>
  );
}

/* ---------------------------------------------------------------- 3 · o porquê: a frase daquele segundo */

const STALE = "So, before anything else, let me give you some quick context";
const REST = " on why I decided to do this.";

function Why({ f }: { f: number }) {
  const S = T.why;
  if (f < S.title - 1 || f > S.out + 14) return null;
  const mark = progress(f, S.mark, 22, easeInOut);
  return (
    <div style={{ position: "absolute", inset: 0, ...leave(f, S.out, 12) }}>
      <Serif f={f} lines={[[{ t: "And" }, { t: "why.", em: true }]]} at={S.title} step={5} size={170} color={D.ink} emColor={D.caramelInk} style={{ position: "absolute", left: X, top: 230 }} />
      <div style={{ position: "absolute", left: X, top: 500, width: W_IN, ...card, padding: "44px 48px", ...enter(f, S.quote, 16, 60) }}>
        <div style={labelStyle}>{UI.said}</div>
        <div style={{ marginTop: 24, borderLeft: `6px solid ${D.accent}`, paddingLeft: 32, fontFamily: SANS, fontSize: 52, lineHeight: 1.36, color: D.ink, letterSpacing: "-0.01em" }}>
          “
          <span style={{ backgroundImage: "linear-gradient(rgba(201,130,74,0.32), rgba(201,130,74,0.32))", backgroundRepeat: "no-repeat", backgroundSize: `${mark * 100}% 100%`, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>{STALE}</span>
          {REST}”
        </div>
      </div>
      <Hand f={f} at={S.instead} size={78} color={D.caramelInk} rotate={-3} style={{ position: "absolute", left: X + 6, top: 1140 }}>
        try this instead:
      </Hand>
      <div style={{ position: "absolute", left: X, top: 1250, width: W_IN, borderRadius: 30, border: `3px dashed ${D.caramel}`, background: "rgba(255,253,248,0.6)", padding: "34px 44px", fontFamily: SANS, fontSize: 50, fontWeight: 600, lineHeight: 1.3, letterSpacing: "-0.02em", color: D.ink, ...enter(f, S.instead + 12, 14, 30) }}>
        Open with the result: “A full Reel, edited in 10 minutes.”
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- 4 · o plano, e você aceita */

const PLAN_Y = [520, 790, 1060];
const BTN = { right: 40, top: 28, w: 220, h: 70 };

function Plan({ f }: { f: number }) {
  const S = T.plan;
  if (f < S.title - 1 || f > S.out + 14) return null;
  return (
    <div style={{ position: "absolute", inset: 0, ...leave(f, S.out, 12) }}>
      <Serif f={f} lines={[[{ t: "Then" }, { t: "what to cut.", em: true }]]} at={S.title} step={3} size={124} color={D.ink} emColor={D.caramelInk} style={{ position: "absolute", left: X, top: 240 }} />
      <div style={{ position: "absolute", left: X, right: X, top: 420, display: "flex", justifyContent: "space-between", alignItems: "baseline", ...enter(f, S.cards[0] - 6, 12, 20) }}>
        <span style={{ fontFamily: SANS, fontSize: 48, fontWeight: 600, letterSpacing: "-0.03em", color: D.ink }}>Fix plan</span>
        <span style={{ fontFamily: MONO, fontSize: 28, color: D.muted }}>{UI.suggestions}</span>
      </div>
      {UI.items.map((it, i) => {
        const at = S.accept[i];
        const press = at === undefined ? 0 : progress(f, at - 3, 3) * (1 - progress(f, at, 3));
        const done = at === undefined ? 0 : progress(f, at + 1, 8);
        return (
          <div key={it.text} style={{ position: "absolute", left: X, top: PLAN_Y[i], width: W_IN, height: 246, ...card, borderColor: done > 0 ? `rgba(31,71,166,${0.15 + 0.35 * done})` : D.line, padding: "40px 44px", ...enter(f, S.cards[i], 16, 50) }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <span style={{ fontFamily: MONO, fontSize: 30, color: D.muted }}>{it.time}</span>
              <span style={{ fontFamily: SANS, fontSize: 26, fontWeight: 500, color: D.accent, background: D.accentSoft, border: "2px solid rgba(31,71,166,0.25)", borderRadius: 999, padding: "4px 18px" }}>{it.kind}</span>
            </div>
            <div style={{ marginTop: 34, fontFamily: SANS, fontSize: 44, fontWeight: 500, lineHeight: 1.25, letterSpacing: "-0.015em", color: D.ink, width: W_IN - 88 }}>{it.text}</div>
            <div style={{ position: "absolute", right: BTN.right, top: BTN.top, width: BTN.w, height: BTN.h }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: 999, border: `2px solid ${D.line}`, background: D.raised, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, fontSize: 32, fontWeight: 600, color: D.ink, opacity: 1 - done, transform: `scale(${1 - 0.06 * press})` }}>{UI.accept}</div>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, fontFamily: SANS, fontSize: 32, fontWeight: 600, color: D.accent, opacity: done, transform: `scale(${mix(0.85, 1, done)})` }}>
                <Check size={36} strokeWidth={2.6} />
                {UI.accepted}
              </div>
            </div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: X, top: 1328, fontFamily: MONO, fontSize: 28, color: D.muted, ...enter(f, S.note, 12, 16) }}>Ordered by what moves retention most.</div>
      <Cursor f={f} />
    </div>
  );
}

/* o cursor do plano: entra, aceita o corte e a legenda */
function Cursor({ f }: { f: number }) {
  const S = T.plan;
  const btn = (i: number) => ({ x: X + W_IN - BTN.right - BTN.w / 2 + 20, y: PLAN_Y[i] + BTN.top + BTN.h / 2 + 8 });
  const path = [
    { f: S.cards[2] + 6, x: 760, y: 1500 },
    { f: S.accept[0] - 4, ...btn(0) },
    { f: S.accept[0] + 6, ...btn(0) },
    { f: S.accept[1] - 4, ...btn(1) },
    { f: S.accept[1] + 10, ...btn(1) },
    { f: S.out, x: 820, y: 1220 },
  ];
  const op = progress(f, path[0].f - 4, 6) * (1 - progress(f, S.out - 4, 6));
  if (op <= 0) return null;
  let x = path[0].x;
  let y = path[0].y;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    if (f >= a.f) {
      const k = progress(f, a.f, b.f - a.f, easeInOut);
      x = mix(a.x, b.x, k);
      y = mix(a.y, b.y, k);
    }
  }
  const press = S.accept.reduce((m, at) => Math.max(m, progress(f, at - 3, 2) * (1 - progress(f, at, 3))), 0);
  return (
    <svg width={52} height={64} viewBox="0 0 40 50" style={{ position: "absolute", left: x - 8, top: y - 5, opacity: op, transform: `scale(${1 - 0.14 * press})`, transformOrigin: "8px 5px", filter: "drop-shadow(0 8px 14px rgba(60,35,10,0.3))" }}>
      <path d="M6 4 L6 39 L15 31 L21 45 L27.5 42 L21.5 28.5 L33 28.5 Z" fill={D.ink} stroke="#fff" strokeWidth={2.4} strokeLinejoin="round" />
    </svg>
  );
}

/* ---------------------------------------------------------------- 5 · o vídeo novo */

// os trechos que saem (s): a introdução, uma pausa e um trecho parado; 34 s → 24 s
const CUTS: [number, number][] = [
  [0, 4],
  [12, 15],
  [22, 25],
];
const TRACK = { x: X, y: 640, w: W_IN, h: 150 };

function Edit({ f }: { f: number }) {
  const S = T.edit;
  if (f < S.title - 1 || f > S.out + 14) return null;
  const mark = progress(f, S.track + 8, 12);
  const cut = progress(f, S.cut, 22, easeInOut);
  const total = 34 - 10 * cut;
  const scale = TRACK.w / 34;
  const press = progress(f, S.export - 3, 3) * (1 - progress(f, S.export, 3));
  const done = progress(f, S.export + 2, 10);
  // os segmentos que ficam, encostando uns nos outros conforme os cortes fecham
  const keep: [number, number][] = [
    [4, 12],
    [15, 22],
    [25, 34],
  ];
  let cursor = 0;
  const pieces: { x: number; w: number; kind: "keep" | "cut" }[] = [];
  const all = [...CUTS.map((c) => ({ c, kind: "cut" as const })), ...keep.map((c) => ({ c, kind: "keep" as const }))].sort((a, b) => a.c[0] - b.c[0]);
  for (const { c, kind } of all) {
    const w = (c[1] - c[0]) * scale * (kind === "cut" ? 1 - cut : 1);
    pieces.push({ x: cursor, w, kind });
    cursor += w;
  }
  const secs = Math.round(total);
  return (
    <div style={{ position: "absolute", inset: 0, ...leave(f, S.out, 12) }}>
      <Serif f={f} lines={[[{ t: "Accept the cuts." }], [{ t: "Get the new edit.", em: true }]]} at={S.title} step={3} size={112} color={D.ink} emColor={D.caramelInk} style={{ position: "absolute", left: X, top: 240 }} />
      <div style={{ position: "absolute", left: TRACK.x, top: TRACK.y, width: TRACK.w, height: TRACK.h, ...enter(f, S.track, 14, 40) }}>
        {pieces.map((p, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.x,
              top: 0,
              width: Math.max(0, p.w - 4),
              height: TRACK.h,
              borderRadius: 16,
              overflow: "hidden",
              background: p.kind === "keep" ? D.raised : `repeating-linear-gradient(135deg, rgba(201,130,74,${0.18 + 0.3 * mark}) 0 12px, rgba(201,130,74,0.08) 12px 24px)`,
              border: `2px solid ${p.kind === "keep" ? D.line : `rgba(201,130,74,${0.4 + 0.5 * mark})`}`,
              opacity: p.kind === "cut" ? 1 - cut * 0.6 : 1,
            }}
          >
            {p.kind === "keep" && (
              <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100" style={{ position: "absolute", inset: 0 }}>
                <path d={`M0 60 ${Array.from({ length: 20 }, (_, k) => `L${k * 5 + 2.5} ${50 + Math.sin((k + i * 7) * 1.7) * 22}`).join(" ")} L100 55`} fill="none" stroke={D.line} strokeWidth={3} vectorEffect="non-scaling-stroke" />
              </svg>
            )}
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", left: X, top: TRACK.y + TRACK.h + 18, width: TRACK.w * (total / 34), display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 24, color: D.muted, opacity: progress(f, S.track + 6, 10) }}>
        <span>0:00</span>
        <span>0:{String(secs).padStart(2, "0")}</span>
      </div>
      <div style={{ position: "absolute", left: X, top: 900, fontFamily: "Fraunces, serif", fontWeight: 500, fontSize: 150, letterSpacing: "-0.03em", color: D.ink, fontVariationSettings: "'opsz' 144, 'SOFT' 30", ...enter(f, S.cut - 4, 12, 30) }}>
        0:34 <span style={{ color: D.caramelInk }}>→</span> 0:{String(secs).padStart(2, "0")}
      </div>
      <div style={{ position: "absolute", left: X, top: 1120, display: "flex", alignItems: "center", gap: 26, ...enter(f, S.notes, 12, 24) }}>
        <div style={{ height: 104, padding: "0 46px", borderRadius: 999, background: D.accent, color: "#fff", display: "flex", alignItems: "center", gap: 16, fontFamily: SANS, fontSize: 40, fontWeight: 600, transform: `scale(${1 - 0.05 * press})`, boxShadow: `0 14px 30px rgba(31,71,166,${0.25 + 0.2 * done})` }}>
          {done > 0.5 ? <Check size={42} strokeWidth={2.6} /> : <Download size={40} strokeWidth={2.4} />}
          {UI.export}
        </div>
      </div>
      <div style={{ position: "absolute", left: X, top: 1270, fontFamily: MONO, fontSize: 28, color: D.muted, ...enter(f, S.notes + 6, 12, 16) }}>Notes for CapCut, Premiere or DaVinci.</div>
    </div>
  );
}

/* ---------------------------------------------------------------- o convite */

function Cta({ f }: { f: number }) {
  const S = T.cta;
  if (f < S.logo - 1) return null;
  const ring = progress(f, S.logo, 40, easeInOut);
  const pulse = 1 + 0.025 * Math.sin(Math.max(0, f - S.button - 20) / 6) * progress(f, S.button + 16, 10);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <circle cx={940} cy={200} r={220} fill="none" stroke={D.caramel} strokeWidth={22} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - ring} transform="rotate(100 940 200)" />
      </svg>
      <div style={{ position: "absolute", left: X, top: 330 }}>
        <BrandLockup size={84} build={progress(f, S.logo, 30)} word={progress(f, S.logo + 14, 16, easeInOut)} color={D.ink} id="acq-logo" />
      </div>
      <Serif f={f} lines={[[{ t: "See where your edit" }], [{ t: "loses viewers.", em: true }]]} at={S.title} step={3} size={124} color={D.ink} emColor={D.caramelInk} style={{ position: "absolute", left: X, top: 520 }} />
      <div style={{ position: "absolute", left: X, top: 860, width: W_IN, height: 150, borderRadius: 999, background: D.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 20, fontFamily: SANS, fontSize: 50, fontWeight: 600, letterSpacing: "-0.02em", boxShadow: "0 20px 50px rgba(31,71,166,0.3)", transform: `scale(${pulse})`, ...enter(f, S.button, 14, 40) }}>
        Analyze your video for free
        <ArrowRight size={52} strokeWidth={2.4} />
      </div>
      <div style={{ position: "absolute", left: X, right: X, top: 1050, textAlign: "center", fontFamily: SANS, fontSize: 36, color: D.muted, ...enter(f, S.note, 12, 16) }}>No account · No card · Results in ~3 min</div>
      <div style={{ position: "absolute", left: X, right: X, top: 1140, textAlign: "center", fontFamily: SANS, fontSize: 58, fontWeight: 600, letterSpacing: "-0.03em", color: D.ink, ...enter(f, S.url, 12, 16) }}>getpublishub.com</div>
    </div>
  );
}

/* ---------------------------------------------------------------- a composição */

export function Acquire({ sound = true }: { sound?: boolean }) {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: D.stage, fontFamily: SANS, overflow: "hidden" }}>
      {sound && <Audio src={staticFile("soundtrack-acquire.wav")} />}
      <Backdrop f={f} />
      <Hook f={f} />
      <Find f={f} />
      <Why f={f} />
      <Plan f={f} />
      <Edit f={f} />
      <Cta f={f} />
    </AbsoluteFill>
  );
}
