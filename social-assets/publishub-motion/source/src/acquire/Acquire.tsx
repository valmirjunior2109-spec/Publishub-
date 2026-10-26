import type { CSSProperties, ReactNode } from "react";
import { ArrowRight, Check, Download, Film, Upload } from "lucide-react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { easeInOut, easeOut, mix, progress } from "../anim";
import { RetentionCurve } from "../components/RetentionCurve";
import { Hand, HandArrow, enter, leave, MONO, SANS, Serif, type Line } from "../components/Type";
import { NotebookLogo, type LogoTimeline } from "../logo/NotebookLogo";
import { LOST, SAMPLE, UI } from "../theme";
import { DeskReel } from "./DeskReel";
import T from "./timeline.json";

/* ==========================================================================
   Publishub · anúncio de aquisição, 39 s, sem rosto, em dois formatos:
   reels (9:16, 1080 × 1920: Reels, TikTok, Shorts) e feed (4:5, 1080 × 1350).
   O gancho → a décima passada → o envio → o segundo exato → o porquê →
   as sete frentes → o plano → o vídeo novo → a memória → o caderno do logo
   abre, escreve e fecha (NotebookLogo) → o convite.
   A interface e os textos são os da landing (frontend/messages/en.json:
   Landing.hero, .app, .value, .tour, .plan, .memory, .facts), com o selo
   "example" como no site. O Reel do exemplo é uma mesa de edição (DeskReel).
   Cada cena é um título em Fraunces e um corpo; o corpo se encaixa na altura
   que sobra em cada formato. Os quadros estão em timeline.json; a trilha
   (make-sound-acquire.mjs) lê o mesmo.
   ========================================================================== */

export const ACQUIRE_FPS = T.fps;
export const ACQUIRE_FRAMES = T.durationInFrames;
export type Format = "reels" | "feed";

/* o tema claro do site (globals.css) */
const D = { paper: "#F6F0E4", stage: "#F0E2CA", raised: "#FFFDF8", surface: "#EFE6D6", ink: "#1E1B18", muted: "#5C544B", line: "#E4D6C1", caramel: "#C9824A", caramelInk: "#8A4F22", accent: "#1F47A6", accentSoft: "#E3E9F7", night: "#1E1B18" };
const X = 80;
const W_IN = 1080 - 2 * X;
const FILE = "edit-in-10-minutes.mp4"; // o exemplo do anúncio: um Reel sobre editar rápido

/* onde o título começa, quanto ele encolhe e o que fica reservado embaixo, por formato.
   No reels, os 360 px de baixo são da interface do Reels/TikTok (legenda, botões). */
const FORMAT = {
  reels: { h: 1920, top: 230, k: 1, gap: 70, bottom: 360 },
  feed: { h: 1350, top: 84, k: 0.86, gap: 46, bottom: 64 },
};

const card: CSSProperties = { borderRadius: 36, background: D.raised, border: `2px solid ${D.line}`, boxShadow: "0 30px 80px rgba(80,50,20,0.13)" };
const labelStyle: CSSProperties = { fontFamily: MONO, fontSize: 25, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: D.muted };
const abs = (left: number, top: number, extra?: CSSProperties): CSSProperties => ({ position: "absolute", left, top, ...extra });

/**
 * Uma cena: o título no alto e o corpo logo abaixo, em coordenadas próprias
 * (1080 de largura, `bodyH` de altura). Se o corpo não couber, ele encolhe; se
 * sobrar espaço, ele desce um pouco para o centro ótico.
 */
function Scene({ f, fm, from, out, lines, at, step = 3, size, bodyH, children }: { f: number; fm: Format; from: number; out: number; lines: Line[]; at: number | number[]; step?: number; size: number; bodyH: number; children: ReactNode }) {
  if (f < from - 1 || f > out + 14) return null;
  const F = FORMAT[fm];
  const hs = size * F.k;
  const bodyTop = F.top + lines.length * hs * 1.04 + F.gap;
  const avail = F.h - F.bottom - bodyTop;
  const s = Math.min(1, avail / bodyH);
  const slack = Math.max(0, avail - bodyH * s);
  return (
    <div style={{ position: "absolute", inset: 0, ...leave(f, out, 12) }}>
      <Serif f={f} lines={lines} at={at} step={step} size={hs} color={D.ink} emColor={D.caramelInk} style={abs(X, F.top)} />
      <div style={{ position: "absolute", left: (1080 - 1080 * s) / 2, top: bodyTop + Math.min(slack * 0.3, 90), width: 1080, height: bodyH, transform: `scale(${s})`, transformOrigin: "0 0" }}>{children}</div>
    </div>
  );
}

/* ---------------------------------------------------------------- o fundo */

function Backdrop({ f }: { f: number }) {
  const paper = progress(f, T.hook.out, 14) * (1 - progress(f, T.logo.at - 8, 16));
  return (
    <>
      <AbsoluteFill style={{ background: D.stage }} />
      <AbsoluteFill style={{ background: D.paper, opacity: paper }} />
    </>
  );
}

/* ---------------------------------------------------------------- 1 · o gancho: horas de edição, 4 segundos */

const PHONE = { w: 472, h: 840 };

function Hook({ f, fm }: { f: number; fm: Format }) {
  const S = T.hook;
  const played = mix(0, SAMPLE.dropAtSec / SAMPLE.durationSec, progress(f, 0, S.drop, (t) => t));
  const drop = progress(f, S.drop, 8, easeOut);
  const shake = f >= S.drop && f < S.drop + 10 ? Math.sin((f - S.drop) * 2.4) * 6 * (1 - (f - S.drop) / 10) : 0;
  const sec = Math.min(4, Math.floor((f / S.drop) * 4));
  return (
    <Scene f={f} fm={fm} from={0} out={S.out} lines={[[{ t: "You spent hours" }], [{ t: "on this edit." }], [{ t: "They left at 0:04.", em: true }]]} at={S.title} size={124} bodyH={PHONE.h + 20}>
      <div style={{ ...abs((1080 - PHONE.w) / 2, 0), width: PHONE.w, height: PHONE.h, borderRadius: 64, border: `14px solid ${D.ink}`, background: D.ink, overflow: "hidden", boxShadow: "0 40px 90px rgba(60,35,10,0.25)", transform: `translateX(${shake}px) rotate(${-2.5 * drop}deg) translateY(${(1 - progress(f, 0, 14)) * 80}px)`, opacity: progress(f, 0, 8) }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 50, overflow: "hidden" }}>
          <DeskReel played={played} scale={1.75} caption={1 - drop} id={`reel-hook-${fm}`} />
          <div style={{ position: "absolute", inset: 0, background: `rgba(30,27,24,${0.55 * drop})` }} />
          <div style={{ position: "absolute", right: 22, top: 24, borderRadius: 999, background: "rgba(0,0,0,0.55)", padding: "8px 18px", fontFamily: MONO, fontSize: 26, color: "#fff" }}>0:0{sec} / 0:34</div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 300, textAlign: "center", opacity: drop, transform: `scale(${mix(0.8, 1, drop)})` }}>
            <div style={{ fontFamily: SANS, fontSize: 110, fontWeight: 700, color: "#fff", letterSpacing: "-0.04em" }}>0:04</div>
            <div style={{ fontFamily: MONO, fontSize: 30, color: "#fff", marginTop: 6 }}>−{LOST}% in 2 seconds</div>
          </div>
        </div>
      </div>
    </Scene>
  );
}

/* ---------------------------------------------------------------- 2 · a décima passada (Landing.value.lead) */

function Pass({ f, fm }: { f: number; fm: Format }) {
  const S = T.pass;
  const pass = 6 + Math.max(1, S.passes.filter((p) => f >= p).length); // 7, 8, 9, 10: uma a cada passada
  const lap = S.passes.reduce((acc, p, i) => (f >= p ? i : acc), -1);
  const lapStart = lap >= 0 ? S.passes[lap] : S.editor;
  const head = ((f - lapStart) % 12) / 12; // o cursor de reprodução varre a timeline a cada passada
  const blur = progress(f, S.passes[1], 30) * 5; // de tanto ver, a imagem perde o foco
  const bump = lap >= 0 ? 1 - progress(f, lapStart, 8) : 0;
  const clips = [
    [0, 120, "#3D66C9"],
    [126, 210, "#3D66C9"],
    [342, 150, "#3D66C9"],
    [498, 170, "#3D66C9"],
    [674, 150, "#3D66C9"],
  ] as const;
  return (
    <Scene f={f} fm={fm} from={S.title} out={S.out} lines={[[{ t: "After the tenth pass," }], [{ t: "you stop seeing" }], [{ t: "your own video.", em: true }]]} at={S.title} size={108} bodyH={760}>
      <div style={{ ...abs(X, 0), width: W_IN, height: 470, borderRadius: 32, background: D.night, overflow: "hidden", boxShadow: "0 30px 80px rgba(60,35,10,0.25)", ...enter(f, S.editor, 16, 50) }}>
        <div style={{ ...abs(40, 34), width: 176, height: 312, borderRadius: 14, overflow: "hidden", filter: `blur(${blur}px)` }}>
          <DeskReel played={0.1 + head * 0.8} scale={0.66} ui={false} id={`reel-pass-${fm}`} />
        </div>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ ...abs(250, 44 + i * 44), width: [380, 300, 420, 260, 340, 220][i], height: 14, borderRadius: 7, background: "#2E2A26" }} />
        ))}
        <div style={{ ...abs(250, 300), fontFamily: MONO, fontSize: 24, color: "#B3A797" }}>{FILE}</div>
        <div style={{ ...abs(40, 372), width: W_IN - 80, height: 1, background: "#3A322A" }} />
        {clips.map(([x, w], i) => (
          <div key={i} style={{ ...abs(40 + x, 386), width: w, height: 30, borderRadius: 7, background: "#3D66C9", opacity: 0.9 }} />
        ))}
        {[0, 160, 330, 520, 690].map((x, i) => (
          <div key={i} style={{ ...abs(52 + x, 424), width: 120, height: 18, borderRadius: 6, background: D.caramel, opacity: 0.9 }} />
        ))}
        <div style={{ ...abs(40 + head * (W_IN - 80), 378), width: 3, height: 74, background: "#fff" }} />
      </div>
      <div style={{ ...abs(X, 520), display: "flex", alignItems: "baseline", gap: 26, ...enter(f, S.passes[0] - 4, 10, 20) }}>
        <span style={{ ...labelStyle, fontSize: 30 }}>pass</span>
        <span style={{ fontFamily: "Fraunces, serif", fontWeight: 500, fontSize: 190, lineHeight: 1, letterSpacing: "-0.04em", color: pass === 10 ? D.caramelInk : D.ink, fontVariationSettings: "'opsz' 144, 'SOFT' 30", display: "inline-block", transform: `scale(${1 + 0.08 * bump})`, transformOrigin: "0 80%" }}>{pass}</span>
      </div>
    </Scene>
  );
}

/* ---------------------------------------------------------------- 3 · o envio (Landing.upload, .tour) */

const STEPS = ["Speech transcribed", "Pacing measured", "Drops marked to the second"];

function UploadScene({ f, fm }: { f: number; fm: Format }) {
  const S = T.upload;
  const fly = progress(f, S.file, S.drop - S.file, easeInOut);
  const landed = progress(f, S.drop, 8);
  const bar = progress(f, S.progress, S.steps[2] + 6 - S.progress, (t) => t);
  // o arquivo vem do alto à direita e pousa dentro da área de envio
  const fx = mix(560, 260, fly);
  const fy = mix(-250, 94, fly);
  return (
    <Scene f={f} fm={fm} from={S.title} out={S.out} lines={[[{ t: "Upload the cut" }], [{ t: "you’re about to post.", em: true }]]} at={S.title} size={112} bodyH={860}>
      <div style={{ ...abs(X, 0), width: W_IN, height: 300, borderRadius: 36, background: D.raised, border: `3px dashed ${landed > 0 ? D.accent : D.caramel}`, padding: "44px 48px", ...enter(f, S.card, 14, 40) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 26, opacity: 1 - landed }}>
          <div style={{ width: 84, height: 84, borderRadius: 42, background: D.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", color: D.accent }}>
            <Upload size={44} strokeWidth={2.2} />
          </div>
          <div style={{ fontFamily: SANS, fontSize: 44, fontWeight: 600, letterSpacing: "-0.025em", color: D.ink }}>Send your video and get the plan</div>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 26, color: D.muted, marginTop: 30, opacity: 1 - landed }}>MP4, MOV or WEBM · up to 500 MB · no account</div>
      </div>
      {/* o arquivo, arrastado pelo cursor */}
      <div style={{ ...abs(fx, fy), width: 560, height: 112, borderRadius: 24, background: D.raised, border: `2px solid ${landed > 0 ? "rgba(31,71,166,0.5)" : D.line}`, boxShadow: `0 ${20 * (1 - landed) + 8}px ${40 * (1 - landed) + 16}px rgba(60,35,10,${0.22 - 0.12 * landed})`, display: "flex", alignItems: "center", gap: 22, padding: "0 28px", transform: `rotate(${(1 - landed) * -4 * fly}deg)`, opacity: progress(f, S.file, 6), zIndex: 2 }}>
        <Film size={44} color={D.accent} strokeWidth={2} />
        <div>
          <div style={{ fontFamily: MONO, fontSize: 28, color: D.ink }}>{FILE}</div>
          <div style={{ fontFamily: MONO, fontSize: 22, color: D.muted, marginTop: 4 }}>0:34</div>
        </div>
      </div>
      {f >= S.file && f < S.drop + 10 && (
        <svg width={46} height={58} viewBox="0 0 40 50" style={{ ...abs(fx + 470, fy + 66), zIndex: 3, opacity: 1 - progress(f, S.drop + 2, 6), filter: "drop-shadow(0 8px 14px rgba(60,35,10,0.3))" }}>
          <path d="M6 4 L6 39 L15 31 L21 45 L27.5 42 L21.5 28.5 L33 28.5 Z" fill={D.ink} stroke="#fff" strokeWidth={2.4} strokeLinejoin="round" />
        </svg>
      )}
      {/* a análise: a barra e as três etapas */}
      <div style={{ ...abs(X, 360), width: W_IN, ...enter(f, S.progress, 10, 20) }}>
        <div style={{ height: 14, borderRadius: 7, background: D.line, overflow: "hidden" }}>
          <div style={{ width: `${bar * 100}%`, height: "100%", background: D.accent, borderRadius: 7 }} />
        </div>
        {STEPS.map((st, i) => {
          const done = progress(f, S.steps[i], 8);
          return (
            <div key={st} style={{ display: "flex", alignItems: "center", gap: 20, marginTop: i ? 22 : 40, fontFamily: SANS, fontSize: 40, fontWeight: 500, letterSpacing: "-0.015em", color: done > 0 ? D.ink : "rgba(30,27,24,0.35)" }}>
              <span style={{ width: 52, height: 52, borderRadius: 26, display: "flex", alignItems: "center", justifyContent: "center", background: done > 0 ? D.accent : "transparent", border: `3px solid ${done > 0 ? D.accent : D.line}`, color: "#fff", transform: `scale(${mix(0.8, 1, done)})` }}>{done > 0 && <Check size={30} strokeWidth={3} />}</span>
              {st}
            </div>
          );
        })}
      </div>
      <Hand f={f} at={S.note} size={74} color={D.caramelInk} rotate={-3} style={abs(X + 380, 760)}>
        about 3 minutes
      </Hand>
    </Scene>
  );
}

/* ---------------------------------------------------------------- 4 · o segundo exato */

function Find({ f, fm }: { f: number; fm: Format }) {
  const S = T.find;
  const draw = progress(f, S.curve, 30, easeInOut);
  const pop = progress(f, S.drop, 10);
  const lost = Math.round(LOST * progress(f, S.drop + 2, 14, easeOut));
  const played = pop > 0 ? mix(1, SAMPLE.dropAtSec / SAMPLE.durationSec, progress(f, S.drop, 8, easeInOut)) : draw;
  return (
    <Scene f={f} fm={fm} from={S.title} out={S.out} lines={[[{ t: "Publishub shows you" }], [{ t: "the exact second.", em: true }]]} at={S.title} size={112} bodyH={880}>
      <div style={{ ...abs(X, 0), width: W_IN, ...card, overflow: "hidden", ...enter(f, S.window, 18, 70) }}>
        <div style={{ height: 76, borderBottom: `2px solid ${D.line}`, display: "flex", alignItems: "center", padding: "0 30px", gap: 12, background: D.surface }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ width: 16, height: 16, borderRadius: 8, background: "#DCCDB6" }} />
          ))}
          <span style={{ flex: 1, textAlign: "center", fontFamily: MONO, fontSize: 26, color: D.muted, marginRight: 60 }}>{FILE}</span>
        </div>
        <div style={{ padding: "36px 44px 34px" }}>
          <div style={{ display: "flex", gap: 34, alignItems: "center" }}>
            <div style={{ width: 168, height: 298, borderRadius: 20, overflow: "hidden", flexShrink: 0 }}>
              <DeskReel played={played} scale={0.62} ui={false} id={`reel-thumb-${fm}`} />
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
            <RetentionCurve points={SAMPLE.retention} durationSec={SAMPLE.durationSec} dropAtSec={SAMPLE.dropAtSec} axisSize={26} draw={draw} pop={pop} ring={progress(f, S.drop + 2, 24)} id={`acq-curve-${fm}`} />
          </div>
        </div>
      </div>
      <Hand f={f} at={S.note} size={76} color={D.caramelInk} rotate={-3} style={abs(400, 790)}>
        the second they left
      </Hand>
      <HandArrow f={f} at={S.note + 10} d="M 385 826 C 290 830, 236 790, 224 735" head="M 209 753 L 223 731 L 239 751" color={D.caramelInk} style={abs(0, 0)} />
    </Scene>
  );
}

/* ---------------------------------------------------------------- 5 · o porquê: a frase daquele segundo */

const STALE = "So, before anything else, let me give you some quick context";
const REST = " on why I decided to do this.";

function Why({ f, fm }: { f: number; fm: Format }) {
  const S = T.why;
  const mark = progress(f, S.mark, 22, easeInOut);
  return (
    <Scene f={f} fm={fm} from={S.title} out={S.out} lines={[[{ t: "And" }, { t: "why.", em: true }]]} at={S.title} step={5} size={170} bodyH={760}>
      <div style={{ ...abs(X, 0), width: W_IN, ...card, padding: "44px 48px", ...enter(f, S.quote, 16, 60) }}>
        <div style={labelStyle}>{UI.said}</div>
        <div style={{ marginTop: 24, borderLeft: `6px solid ${D.accent}`, paddingLeft: 32, fontFamily: SANS, fontSize: 52, lineHeight: 1.36, color: D.ink, letterSpacing: "-0.01em" }}>
          “
          <span style={{ backgroundImage: "linear-gradient(rgba(201,130,74,0.32), rgba(201,130,74,0.32))", backgroundRepeat: "no-repeat", backgroundSize: `${mark * 100}% 100%`, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>{STALE}</span>
          {REST}”
        </div>
      </div>
      <Hand f={f} at={S.instead} size={78} color={D.caramelInk} rotate={-3} style={abs(X + 6, 440)}>
        try this instead:
      </Hand>
      <div style={{ ...abs(X, 550), width: W_IN, borderRadius: 30, border: `3px dashed ${D.caramel}`, background: "rgba(255,253,248,0.6)", padding: "34px 44px", fontFamily: SANS, fontSize: 50, fontWeight: 600, lineHeight: 1.3, letterSpacing: "-0.02em", color: D.ink, ...enter(f, S.instead + 12, 14, 30) }}>
        Open with the result: “A full Reel, edited in 10 minutes.”
      </div>
    </Scene>
  );
}

/* ---------------------------------------------------------------- 6 · as sete frentes (Landing.plan) */

const FRONTS: [string, string][] = [
  ["Hook", "what to say or show in the first 3 seconds"],
  ["Cuts", "the stretch that doesn't pay for the time it takes"],
  ["Pacing", "the pause to trim, the part to speed up"],
  ["B-roll", "where the screen sits still and what to put there"],
  ["Captions", "the text on screen and when it comes in"],
  ["Structure", "what to pull forward, what to hold back"],
  ["CTA", "where the ask goes and how to word it"],
];

function Fronts({ f, fm }: { f: number; fm: Format }) {
  const S = T.fronts;
  return (
    <Scene f={f} fm={fm} from={S.title} out={S.out} lines={[[{ t: "Seven fronts," }], [{ t: "one ordered plan.", em: true }]]} at={S.title} size={120} bodyH={900}>
      {FRONTS.map(([name, detail], i) => {
        const at = S.rows + i * 5;
        const tick = progress(f, at + 8, 8);
        return (
          <div key={name} style={{ ...abs(X, i * 128), width: W_IN, height: 112, borderRadius: 26, background: D.raised, border: `2px solid ${tick > 0 ? `rgba(31,71,166,${0.12 + 0.2 * tick})` : D.line}`, display: "flex", alignItems: "center", gap: 26, padding: "0 30px", ...enter(f, at, 12, 30) }}>
            <span style={{ fontFamily: MONO, fontSize: 24, color: D.muted, width: 40 }}>{String(i + 1).padStart(2, "0")}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: SANS, fontSize: 38, fontWeight: 600, letterSpacing: "-0.02em", color: D.ink, lineHeight: 1.1 }}>{name}</div>
              <div style={{ fontFamily: SANS, fontSize: 26, color: D.muted, marginTop: 4 }}>{detail}</div>
            </div>
            <span style={{ width: 46, height: 46, borderRadius: 23, background: D.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", opacity: tick, transform: `scale(${mix(0.6, 1, tick)})` }}>
              <Check size={28} strokeWidth={3} />
            </span>
          </div>
        );
      })}
    </Scene>
  );
}

/* ---------------------------------------------------------------- 7 · o plano, e você aceita */

const PLAN_Y = [90, 360, 630];
const BTN = { right: 40, top: 28, w: 220, h: 70 };

function Plan({ f, fm }: { f: number; fm: Format }) {
  const S = T.plan;
  return (
    <Scene f={f} fm={fm} from={S.title} out={S.out} lines={[[{ t: "Then" }, { t: "what to cut.", em: true }]]} at={S.title} size={124} bodyH={1000}>
      <div style={{ ...abs(X, 0), width: W_IN, display: "flex", justifyContent: "space-between", alignItems: "baseline", ...enter(f, S.cards[0] - 6, 12, 20) }}>
        <span style={{ fontFamily: SANS, fontSize: 48, fontWeight: 600, letterSpacing: "-0.03em", color: D.ink }}>Fix plan</span>
        <span style={{ fontFamily: MONO, fontSize: 28, color: D.muted }}>{UI.suggestions}</span>
      </div>
      {UI.items.map((it, i) => {
        const at = S.accept[i];
        const press = at === undefined ? 0 : progress(f, at - 3, 3) * (1 - progress(f, at, 3));
        const done = at === undefined ? 0 : progress(f, at + 1, 8);
        return (
          <div key={it.text} style={{ ...abs(X, PLAN_Y[i]), width: W_IN, height: 246, ...card, borderColor: done > 0 ? `rgba(31,71,166,${0.15 + 0.35 * done})` : D.line, padding: "40px 44px", ...enter(f, S.cards[i], 16, 50) }}>
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
      <Hand f={f} at={S.note} size={74} color={D.caramelInk} rotate={-3} style={abs(X + 4, 908)}>
        nothing changes without your OK
      </Hand>
      <PlanCursor f={f} />
    </Scene>
  );
}

/* o cursor do plano: entra, aceita o corte e o gancho */
function PlanCursor({ f }: { f: number }) {
  const S = T.plan;
  const btn = (i: number) => ({ x: X + W_IN - BTN.right - BTN.w / 2 + 20, y: PLAN_Y[i] + BTN.top + BTN.h / 2 + 8 });
  const path = [
    { f: S.cards[2] + 6, x: 760, y: 980 },
    { f: S.accept[0] - 4, ...btn(0) },
    { f: S.accept[0] + 6, ...btn(0) },
    { f: S.accept[1] - 4, ...btn(1) },
    { f: S.accept[1] + 10, ...btn(1) },
    { f: S.out, x: 820, y: 800 },
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
    <svg width={52} height={64} viewBox="0 0 40 50" style={{ ...abs(x - 8, y - 5), opacity: op, transform: `scale(${1 - 0.14 * press})`, transformOrigin: "8px 5px", filter: "drop-shadow(0 8px 14px rgba(60,35,10,0.3))" }}>
      <path d="M6 4 L6 39 L15 31 L21 45 L27.5 42 L21.5 28.5 L33 28.5 Z" fill={D.ink} stroke="#fff" strokeWidth={2.4} strokeLinejoin="round" />
    </svg>
  );
}

/* ---------------------------------------------------------------- 8 · o vídeo novo */

// os trechos que saem (s): a introdução, uma pausa e um trecho parado; 34 s → 24 s
const CUTS: [number, number][] = [
  [0, 4],
  [12, 15],
  [22, 25],
];
const KEEP: [number, number][] = [
  [4, 12],
  [15, 22],
  [25, 34],
];
const TRACK_H = 150;

function Edit({ f, fm }: { f: number; fm: Format }) {
  const S = T.edit;
  const mark = progress(f, S.track + 8, 12);
  const cut = progress(f, S.cut, 22, easeInOut);
  const total = 34 - 10 * cut;
  const scale = W_IN / 34;
  const press = progress(f, S.export - 3, 3) * (1 - progress(f, S.export, 3));
  const done = progress(f, S.export + 2, 10);
  let cursor = 0;
  const pieces: { x: number; w: number; kind: "keep" | "cut" }[] = [];
  const all = [...CUTS.map((c) => ({ c, kind: "cut" as const })), ...KEEP.map((c) => ({ c, kind: "keep" as const }))].sort((a, b) => a.c[0] - b.c[0]);
  for (const { c, kind } of all) {
    const w = (c[1] - c[0]) * scale * (kind === "cut" ? 1 - cut : 1);
    pieces.push({ x: cursor, w, kind });
    cursor += w;
  }
  const secs = String(Math.round(total)).padStart(2, "0");
  return (
    <Scene f={f} fm={fm} from={S.title} out={S.out} lines={[[{ t: "Accept the cuts." }], [{ t: "Get the new edit.", em: true }]]} at={S.title} size={112} bodyH={700}>
      <div style={{ ...abs(X, 0), width: W_IN, height: TRACK_H, ...enter(f, S.track, 14, 40) }}>
        {pieces.map((p, i) => (
          <div
            key={i}
            style={{
              ...abs(p.x, 0),
              width: Math.max(0, p.w - 4),
              height: TRACK_H,
              borderRadius: 16,
              overflow: "hidden",
              background: p.kind === "keep" ? D.raised : `repeating-linear-gradient(135deg, rgba(201,130,74,${0.18 + 0.3 * mark}) 0 12px, rgba(201,130,74,0.08) 12px 24px)`,
              border: `2px solid ${p.kind === "keep" ? D.line : `rgba(201,130,74,${0.4 + 0.5 * mark})`}`,
              opacity: p.kind === "cut" ? 1 - cut * 0.6 : 1,
            }}
          >
            {p.kind === "keep" && (
              <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100" style={abs(0, 0)}>
                <path d={`M0 60 ${Array.from({ length: 20 }, (_, k) => `L${k * 5 + 2.5} ${50 + Math.sin((k + i * 7) * 1.7) * 22}`).join(" ")} L100 55`} fill="none" stroke={D.line} strokeWidth={3} vectorEffect="non-scaling-stroke" />
              </svg>
            )}
          </div>
        ))}
      </div>
      <div style={{ ...abs(X, TRACK_H + 18), width: W_IN * (total / 34), display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 24, color: D.muted, opacity: progress(f, S.track + 6, 10) }}>
        <span>0:00</span>
        <span>0:{secs}</span>
      </div>
      <div style={{ ...abs(X, 250), fontFamily: "Fraunces, serif", fontWeight: 500, fontSize: 150, letterSpacing: "-0.03em", color: D.ink, fontVariationSettings: "'opsz' 144, 'SOFT' 30", ...enter(f, S.cut - 4, 12, 30) }}>
        0:34 <span style={{ color: D.caramelInk }}>→</span> 0:{secs}
      </div>
      <div style={{ ...abs(X, 470), height: 104, padding: "0 46px", borderRadius: 999, background: D.accent, color: "#fff", display: "flex", alignItems: "center", gap: 16, fontFamily: SANS, fontSize: 40, fontWeight: 600, transform: `scale(${1 - 0.05 * press})`, boxShadow: `0 14px 30px rgba(31,71,166,${0.25 + 0.2 * done})`, ...enter(f, S.notes, 12, 24) }}>
        {done > 0.5 ? <Check size={42} strokeWidth={2.6} /> : <Download size={40} strokeWidth={2.4} />}
        {UI.export}
      </div>
      <div style={{ ...abs(X, 620), fontFamily: MONO, fontSize: 28, color: D.muted, ...enter(f, S.notes + 6, 12, 16) }}>Notes for CapCut, Premiere or DaVinci.</div>
    </Scene>
  );
}

/* ---------------------------------------------------------------- 9 · a memória (Landing.memory) */

function Memory({ f, fm }: { f: number; fm: Format }) {
  const S = T.memory;
  return (
    <Scene f={f} fm={fm} from={S.title} out={S.out} lines={[[{ t: "The more you use it," }], [{ t: "the more it learns" }], [{ t: "your style.", em: true }]]} at={S.title} size={108} bodyH={760}>
      {S.rows.map((at, i) => (
        <div key={i} style={{ ...abs(X, i * 136), width: W_IN, height: 116, borderRadius: 26, background: D.raised, border: `2px solid ${D.line}`, display: "flex", alignItems: "center", gap: 26, padding: "0 32px", ...enter(f, at, 12, 30) }}>
          <span style={{ ...labelStyle, width: 130 }}>video {i + 1}</span>
          <span style={{ flex: 1, fontFamily: SANS, fontSize: 38, fontWeight: 500, letterSpacing: "-0.015em", color: D.ink }}>Cut the long intro</span>
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: SANS, fontSize: 30, fontWeight: 600, color: D.accent, opacity: progress(f, at + 6, 8) }}>
            <Check size={32} strokeWidth={2.6} />
            {UI.accepted}
          </span>
        </div>
      ))}
      <div style={{ ...abs(X, 450), width: W_IN, borderRadius: 32, background: D.accentSoft, border: "2px solid rgba(31,71,166,0.3)", padding: "36px 44px", ...enter(f, S.learned, 16, 40) }}>
        <div style={{ ...labelStyle, color: D.accent }}>learned</div>
        <div style={{ fontFamily: SANS, fontSize: 46, fontWeight: 600, letterSpacing: "-0.025em", color: D.ink, marginTop: 14 }}>You always cut long intros.</div>
        <div style={{ fontFamily: SANS, fontSize: 32, color: D.muted, marginTop: 10, lineHeight: 1.35 }}>Next time, those cuts come already marked your way.</div>
      </div>
    </Scene>
  );
}

/* ---------------------------------------------------------------- 10 · o convite, com os números da landing (Landing.facts) */

const FACTS: [string, string][] = [
  ["~3 min", "from upload to fix plan"],
  ["7", "areas reviewed in every video"],
  ["0", "cuts applied without your OK"],
];
const CTA_H = 1040;

function Cta({ f, fm }: { f: number; fm: Format }) {
  const S = T.cta;
  const G = T.logo;
  if (f < G.at - 1) return null;
  const F = FORMAT[fm];
  const top = F.top + Math.max(0, (F.h - F.bottom - F.top - CTA_H) / 2);
  const ring = progress(f, S.title - 10, 40, easeInOut);
  const pulse = 1 + 0.025 * Math.sin(Math.max(0, f - S.button - 20) / 6) * progress(f, S.button + 16, 10);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <svg width={1080} height={F.h} style={abs(0, 0)}>
        {/* o arco caramelo: no alto do 9:16; no 4:5, no canto de baixo, longe do título */}
        <circle cx={fm === "reels" ? 950 : 1010} cy={fm === "reels" ? 150 : F.h - 40} r={200} fill="none" stroke={D.caramel} strokeWidth={22} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - ring} transform={`rotate(100 ${fm === "reels" ? 950 : 1010} ${fm === "reels" ? 150 : F.h - 40})`} />
      </svg>
      <div style={{ position: "absolute", left: 0, top, width: 1080, height: CTA_H }}>
        <Serif f={f} lines={[[{ t: "See where your edit" }], [{ t: "loses viewers.", em: true }]]} at={S.title} step={3} size={124} color={D.ink} emColor={D.caramelInk} style={abs(X, 150)} />
        <div style={{ ...abs(X, 450), width: W_IN, display: "flex", justifyContent: "space-between" }}>
          {FACTS.map(([v, l], i) => (
            <div key={v} style={{ width: 280, ...enter(f, S.facts + i * 4, 12, 24) }}>
              <div style={{ fontFamily: "Fraunces, serif", fontWeight: 500, fontSize: 96, lineHeight: 1, letterSpacing: "-0.03em", color: D.caramelInk, fontVariationSettings: "'opsz' 144, 'SOFT' 30" }}>{v}</div>
              <div style={{ fontFamily: SANS, fontSize: 28, color: D.muted, marginTop: 10, lineHeight: 1.3 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ ...abs(X, 720), width: W_IN, height: 140, borderRadius: 999, background: D.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 20, fontFamily: SANS, fontSize: 50, fontWeight: 600, letterSpacing: "-0.02em", boxShadow: "0 20px 50px rgba(31,71,166,0.3)", transform: `scale(${pulse})`, ...enter(f, S.button, 14, 40) }}>
          Analyze your video for free
          <ArrowRight size={52} strokeWidth={2.4} />
        </div>
        <div style={{ ...abs(X, 900), width: W_IN, textAlign: "center", fontFamily: SANS, fontSize: 34, color: D.muted, ...enter(f, S.note, 12, 16) }}>No account · No card · Results in ~3 min</div>
        <div style={{ ...abs(X, 970), width: W_IN, textAlign: "center", fontFamily: SANS, fontSize: 56, fontWeight: 600, letterSpacing: "-0.03em", color: D.ink, ...enter(f, S.url, 12, 16) }}>getpublishub.com</div>
      </div>
      {/* o caderno abre no meio da tela, a caneta escreve, fecha e vira o logo no alto do convite */}
      <NotebookLogo f={f - G.at} L={G as unknown as LogoTimeline} start={{ cx: 540, cy: F.h / 2 + 40, k: fm === "reels" ? 1.05 : 0.92 }} end={{ left: X, cy: top + 52, markH: 104 }} ink={D.ink} id={`acq-logo-${fm}`} />
    </div>
  );
}

/* ---------------------------------------------------------------- a composição */

export function Acquire({ format = "reels", sound = true }: { format?: Format; sound?: boolean }) {
  const f = useCurrentFrame();
  const fm = format;
  return (
    <AbsoluteFill style={{ background: D.stage, fontFamily: SANS, overflow: "hidden" }}>
      {sound && <Audio src={staticFile("soundtrack-acquire.wav")} />}
      <Backdrop f={f} />
      {f <= T.hook.out + 14 && <Hook f={f} fm={fm} />}
      <Pass f={f} fm={fm} />
      <UploadScene f={f} fm={fm} />
      <Find f={f} fm={fm} />
      <Why f={f} fm={fm} />
      <Fronts f={f} fm={fm} />
      <Plan f={f} fm={fm} />
      <Edit f={f} fm={fm} />
      <Memory f={f} fm={fm} />
      <Cta f={f} fm={fm} />
    </AbsoluteFill>
  );
}
