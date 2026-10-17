import type { ReactNode } from "react";
import { Check, Copy as CopyIcon, Download, Film, ImageIcon, Loader2, Scissors, Share2, Upload } from "lucide-react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { easeInOut, easeOut, mix, progress } from "../anim";
import { ReelFrame } from "../components/ReelFrame";
import { RetentionCurve } from "../components/RetentionCurve";
import { Badge, label as labelStyle, MockButton } from "../components/ui";
import { C, FONT, SAMPLE } from "../theme";
import { BrandLockup } from "./Brand";
import { COPY, type Lang } from "./copy";
import T from "./timeline.json";

/* ==========================================================================
   Demo do produto (16:9, 48 s): uma janela só, que passa pelo fluxo de verdade.
   Envio → análise → o segundo da queda, a frase e o porquê → o plano →
   os cortes e o vídeo editado → o logo. Uma legenda por passo, embaixo.
   Os quadros de cada coisa estão em timeline.json (a trilha lê o mesmo arquivo).
   ========================================================================== */

const WIN = { x: 160, y: 52, w: 1600, h: 856 };
// a trilha lofi fica de fundo: baixa o bastante para alguém narrar por cima
const MUSIC_VOLUME = 0.5;
const BAR = 52;
const BODY_H = WIN.h - BAR;

type P = { f: number; c: (typeof COPY)["en"] };

/** `clean`: só o produto, para screenshot (sem legenda, cursor nem zoom de câmera). */
export function Demo({ lang = "en", sound = true, clean = false }: { lang?: Lang; sound?: boolean; clean?: boolean }) {
  const f = useCurrentFrame();
  const c = COPY[lang];
  const windowIn = progress(f, T.upload.window, 26);
  const windowOut = progress(f, T.end.start - 12, 18, easeInOut);
  const cam = clean ? { scale: 1, ox: 0, oy: 0 } : camera(f);

  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 40%, #FBF6EC 0%, ${C.paper} 60%, #EFE5D3 100%)`, fontFamily: FONT.sans, color: C.ink }}>
      {sound && <Audio src={staticFile("soundtrack-demo.wav")} volume={MUSIC_VOLUME} />}
      <Intro f={f} c={c} />

      {/* a janela do produto */}
      {f >= T.upload.window - 2 && f < T.end.start + 10 && (
        <div
          style={{
            position: "absolute",
            left: WIN.x,
            // sem a legenda embaixo, a janela fica no centro do quadro
            top: clean ? (1080 - WIN.h) / 2 : WIN.y,
            width: WIN.w,
            height: WIN.h,
            opacity: windowIn * (1 - windowOut),
            transform: `translateY(${(1 - windowIn) * 60 + windowOut * -30}px) scale(${1 - windowOut * 0.04})`,
          }}
        >
          <Window url={urlFor(f)} cam={cam}>
            <Screen f={f} from={T.upload.start} to={T.upload.out + 8}>
              <UploadScreen f={f} c={c} />
            </Screen>
            <Screen f={f} from={T.processing.start} to={T.processing.out + 8}>
              <ProcessingScreen f={f} c={c} />
            </Screen>
            <Screen f={f} from={T.result.start} to={T.cuts.start + 8}>
              <ResultScreen f={f} c={c} />
            </Screen>
            <Screen f={f} from={T.cuts.start} to={T.end.start + 10}>
              <CutsScreen f={f} c={c} />
            </Screen>
            {!clean && <Cursor f={f} />}
          </Window>
        </div>
      )}

      {!clean && <Caption f={f} c={c} />}
      <End f={f} c={c} />
    </AbsoluteFill>
  );
}

/* ---------------------------------------------------------------- câmera */

/** Escala e ponto de origem (em px da janela): aproxima só na queda e nas frases. */
function camera(f: number) {
  const R = T.result;
  const zoomIn = progress(f, R.zoomIn, 30, easeInOut);
  const toQuote = progress(f, R.quote - 6, 34, easeInOut);
  const zoomOut = progress(f, R.zoomOut, 34, easeInOut);
  const scale = 1 + 0.16 * zoomIn * (1 - zoomOut);
  // em px do corpo da janela: primeiro a queda na curva, depois a frase e o porquê.
  // x = 1320 mantém a borda direita do conteúdo (1545 px) dentro da janela a 1,16x
  const ox = 1320;
  const oy = mix(230, 700, toQuote);
  return { scale, ox, oy };
}

function urlFor(f: number) {
  if (f < T.processing.start) return "getpublishub.com/new-analysis";
  return "getpublishub.com/results/7f3a91c2";
}

/* ---------------------------------------------------------------- moldura */

function Window({ url, cam, children }: { url: string; cam: { scale: number; ox: number; oy: number }; children: ReactNode }) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        borderRadius: 22,
        border: `1px solid ${C.line}`,
        background: C.paperRaised,
        boxShadow: "0 1px 2px rgba(30,27,24,0.05), 0 30px 70px -28px rgba(30,27,24,0.35)",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", height: BAR, borderBottom: `1px solid ${C.line}`, padding: "0 20px", background: C.paperRaised }}>
        <span style={{ display: "flex", gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ width: 12, height: 12, borderRadius: 999, background: C.line }} />
          ))}
        </span>
        <span style={{ minWidth: 520, textAlign: "center", borderRadius: 999, background: C.paper, border: `1px solid ${C.line}`, padding: "6px 22px", fontFamily: FONT.mono, fontSize: 15, color: C.inkMuted }}>{url}</span>
        <span />
      </div>
      {/* a câmera aproxima dentro da janela: a moldura e a legenda ficam paradas */}
      <div style={{ position: "relative", height: BODY_H, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, transform: `scale(${cam.scale})`, transformOrigin: `${cam.ox}px ${cam.oy}px` }}>{children}</div>
      </div>
    </div>
  );
}

/** Cada tela entra e sai em fade cruzado com a seguinte. */
function Screen({ f, from, to, children }: { f: number; from: number; to: number; children: ReactNode }) {
  if (f < from - 1 || f > to) return null;
  const o = progress(f, from, 12) * (1 - progress(f, to - 12, 12));
  return <div style={{ position: "absolute", inset: 0, opacity: o }}>{children}</div>;
}

/* ---------------------------------------------------------------- abertura e fechamento */

function Intro({ f, c }: P) {
  const I = T.intro;
  if (f > T.upload.window + 10) return null;
  const build = progress(f, I.logo, 34, easeOut);
  const word = progress(f, I.logo + 14, 22);
  const tag = progress(f, I.tagline, 20);
  const leave = progress(f, I.out, 14, easeInOut);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: 1 - leave, transform: `translateY(${-leave * 30}px)` }}>
      <BrandLockup size={92} build={build} word={word} id="intro" />
      <p style={{ margin: "40px 0 0", fontSize: 34, color: C.inkMuted, letterSpacing: "-0.01em", opacity: tag, transform: `translateY(${(1 - tag) * 14}px)` }}>{c.tagline}</p>
    </AbsoluteFill>
  );
}

function End({ f, c }: P) {
  const E = T.end;
  if (f < E.start) return null;
  const build = progress(f, E.logo, 32);
  const word = progress(f, E.logo + 12, 22);
  const line = progress(f, E.line, 20);
  const cta = progress(f, E.cta, 20);
  const fade = progress(f, E.fade, 16);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: 1 - fade }}>
      <BrandLockup size={100} build={build} word={word} id="end" />
      <p style={{ margin: "44px 0 0", fontSize: 40, fontWeight: 500, letterSpacing: "-0.02em", opacity: line, transform: `translateY(${(1 - line) * 14}px)` }}>{c.end.line}</p>
      <div style={{ marginTop: 44, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, opacity: cta, transform: `translateY(${(1 - cta) * 14}px)` }}>
        <MockButton style={{ height: 68, padding: "0 36px", fontSize: 26, borderRadius: 16 }}>{c.end.cta} →</MockButton>
        <span style={{ fontFamily: FONT.mono, fontSize: 24, color: C.ink }}>{c.url}</span>
        <span style={{ fontSize: 19, color: C.inkMuted }}>{c.end.note}</span>
      </div>
    </AbsoluteFill>
  );
}

/* ---------------------------------------------------------------- a legenda de cada passo */

function Caption({ f, c }: P) {
  const steps = [T.upload.start + 18, T.processing.start, T.result.start, T.plan.start, T.cuts.start];
  const ends = [T.upload.out + 4, T.processing.out + 4, T.result.out + 4, T.plan.out + 4, T.cuts.out + 4];
  return (
    <>
      {steps.map((from, i) => {
        const to = ends[i];
        if (f < from - 1 || f > to + 14) return null;
        const o = progress(f, from, 14) * (1 - progress(f, to, 12));
        return (
          <div key={i} style={{ position: "absolute", left: WIN.x + 6, top: WIN.y + WIN.h + 40, display: "flex", alignItems: "baseline", gap: 22, opacity: o, transform: `translateY(${(1 - progress(f, from, 16)) * 10}px)` }}>
            <span style={{ fontFamily: FONT.mono, fontSize: 22, fontWeight: 500, color: C.accent }}>0{i + 1}</span>
            <span style={{ fontSize: 34, fontWeight: 500, letterSpacing: "-0.02em" }}>{c.captions[i]}</span>
          </div>
        );
      })}
    </>
  );
}

/* ---------------------------------------------------------------- cursor */

/* Onde o cursor está (px dentro do corpo da janela) e quando clica. */
const CURSOR: { f: number; x: number; y: number }[] = [
  { f: T.upload.received, x: 1180, y: 560 },
  { f: T.upload.press - 4, x: 1360, y: 724 },
  { f: T.plan.cards[3] + 20, x: 1180, y: 520 },
  { f: T.plan.accept[0] - 4, x: 926, y: 150 },
  { f: T.plan.accept[1] - 4, x: 926, y: 272 },
  { f: T.cuts.marks[2] + 20, x: 1120, y: 640 },
  { f: T.cuts.press - 4, x: 1316, y: 486 },
];
const CLICKS = [T.upload.press, T.plan.accept[0], T.plan.accept[1], T.cuts.press];
const CURSOR_SHOWN: [number, number][] = [
  [T.upload.received - 6, T.upload.out],
  [T.plan.cards[3] + 14, T.plan.accept[1] + 22],
  [T.cuts.marks[2] + 14, T.cuts.collapse + 10],
];

function Cursor({ f }: { f: number }) {
  const shown = CURSOR_SHOWN.find(([a, b]) => f >= a && f <= b + 10);
  if (!shown) return null;
  const o = progress(f, shown[0], 8) * (1 - progress(f, shown[1], 10));
  let x = CURSOR[0].x;
  let y = CURSOR[0].y;
  for (let i = 0; i < CURSOR.length - 1; i++) {
    const a = CURSOR[i];
    const b = CURSOR[i + 1];
    if (f >= a.f && f <= b.f) {
      const k = progress(f, a.f, b.f - a.f, easeInOut);
      x = mix(a.x, b.x, k);
      y = mix(a.y, b.y, k);
      break;
    }
    if (f > b.f) {
      x = b.x;
      y = b.y;
    }
  }
  const click = CLICKS.reduce((m, at) => Math.max(m, progress(f, at - 4, 4) * (1 - progress(f, at, 6))), 0);
  return (
    <svg width="34" height="40" viewBox="0 0 24 28" style={{ position: "absolute", left: x, top: y, opacity: o, transform: `scale(${1 - click * 0.14})`, transformOrigin: "4px 3px", filter: "drop-shadow(0 3px 5px rgba(30,27,24,0.28))", zIndex: 10 }}>
      <path d="M3 2 L3 22 L8.5 17 L12 25 L15.5 23.5 L12 15.6 L19 15.6 Z" fill={C.ink} stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------------------------------------------------------------- 01 · envio */

function UploadScreen({ f, c }: P) {
  const U = T.upload;
  const video = progress(f, U.video, 18);
  const shot = progress(f, U.screenshot, 18);
  const uploading = progress(f, U.video + 10, U.received - U.video - 10, easeInOut);
  const received = progress(f, U.received, 10);
  const press = progress(f, U.press - 3, 3) * (1 - progress(f, U.press, 5));
  return (
    <div style={{ padding: "64px 96px" }}>
      <p style={{ margin: 0, fontSize: 46, fontWeight: 600, letterSpacing: "-0.03em" }}>{c.upload.title}</p>
      <p style={{ margin: "14px 0 0", fontSize: 22, color: C.inkMuted, maxWidth: 900 }}>{c.upload.lead}</p>

      <div style={{ marginTop: 48, display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 28 }}>
        <Drop label={c.upload.video} icon={<Film size={30} strokeWidth={1.6} />} filled={video}>
          <FileCard p={video} icon={<Film size={22} strokeWidth={1.8} />} name={c.file} meta="0:34 · 18 MB" progressValue={uploading} done={received} received={c.upload.received} />
        </Drop>
        <Drop label={c.upload.screenshot} badge={c.upload.optional} icon={<ImageIcon size={30} strokeWidth={1.6} />} filled={shot}>
          <FileCard p={shot} icon={<ImageIcon size={22} strokeWidth={1.8} />} name={c.insightsFile} meta="PNG · 240 KB" progressValue={progress(f, U.screenshot + 8, 24)} done={received} received={c.upload.received} />
        </Drop>
      </div>

      <div style={{ position: "absolute", right: 96, bottom: 56 }}>
        <MockButton style={{ height: 60, padding: "0 30px", fontSize: 22, borderRadius: 14, opacity: 0.35 + 0.65 * received, transform: `scale(${1 - press * 0.05})` }}>
          <Upload size={20} strokeWidth={2.2} />
          {c.upload.analyze}
        </MockButton>
      </div>
    </div>
  );
}

function Drop({ label, badge, icon, filled, children }: { label: string; badge?: string; icon: ReactNode; filled: number; children: ReactNode }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ ...labelStyle, fontSize: 15 }}>{label}</span>
        {badge && <Badge style={{ fontSize: 13 }}>{badge}</Badge>}
      </div>
      <div style={{ position: "relative", height: 300, borderRadius: 22, border: `2px dashed ${filled > 0.5 ? "transparent" : C.line}`, background: filled > 0 ? C.paper : C.paperRaised }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: C.inkMuted, opacity: 1 - filled }}>{icon}</div>
        <div style={{ position: "absolute", inset: 0, padding: 28, display: "flex", alignItems: "flex-end" }}>{children}</div>
      </div>
    </div>
  );
}

function FileCard({ p, icon, name, meta, progressValue, done, received }: { p: number; icon: ReactNode; name: string; meta: string; progressValue: number; done: number; received: string }) {
  if (p <= 0) return null;
  return (
    <div style={{ width: "100%", borderRadius: 16, border: `1px solid ${C.line}`, background: C.paperRaised, padding: "20px 22px", opacity: p, transform: `translateY(${(1 - p) * -40}px) scale(${0.96 + 0.04 * p})`, boxShadow: "0 12px 30px -18px rgba(30,27,24,0.35)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ display: "grid", placeItems: "center", width: 44, height: 44, borderRadius: 12, background: C.accentSoft, color: C.accent }}>{icon}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>{name}</p>
          <p style={{ margin: "3px 0 0", fontFamily: FONT.mono, fontSize: 14, color: C.inkMuted }}>{meta}</p>
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 16, fontWeight: 600, color: C.confirmed, opacity: done }}>
          <Check size={18} strokeWidth={2.6} />
          {received}
        </span>
      </div>
      <div style={{ marginTop: 16, height: 6, borderRadius: 999, background: C.surface, overflow: "hidden", opacity: 1 - done }}>
        <div style={{ width: `${progressValue * 100}%`, height: "100%", borderRadius: 999, background: C.accent }} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- 02 · análise */

function ProcessingScreen({ f, c }: P) {
  const S = T.processing.steps;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 110 }}>
      <p style={{ ...labelStyle, fontSize: 16, color: C.accent }}>{c.processing.eyebrow}</p>
      <p style={{ margin: "14px 0 0", fontSize: 44, fontWeight: 600, letterSpacing: "-0.03em" }}>{c.processing.title}</p>
      <ol style={{ listStyle: "none", margin: "56px 0 0", padding: 0, width: 860, display: "flex", flexDirection: "column", gap: 4 }}>
        {c.processing.steps.map((step, i) => {
          const start = i === 0 ? T.processing.start : S[i - 1];
          const active = f >= start && f < S[i];
          const done = progress(f, S[i], 8);
          const shown = progress(f, start - 4, 10);
          return (
            <li key={step} style={{ display: "flex", alignItems: "center", gap: 20, padding: "16px 22px", borderRadius: 14, background: active ? C.paper : "transparent", opacity: 0.35 + 0.65 * shown }}>
              <span style={{ position: "relative", width: 30, height: 30, flexShrink: 0 }}>
                <span style={{ position: "absolute", inset: 0, borderRadius: 999, border: `2px solid ${C.line}`, opacity: 1 - done }} />
                {active && <Loader2 size={30} strokeWidth={2} color={C.accent} style={{ position: "absolute", inset: 0, transform: `rotate(${f * 12}deg)` }} />}
                <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", borderRadius: 999, background: C.confirmed, color: "#fff", transform: `scale(${done})` }}>
                  <Check size={18} strokeWidth={3} />
                </span>
              </span>
              <span style={{ fontSize: 23, color: done > 0.5 || active ? C.ink : C.inkMuted }}>{step}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ---------------------------------------------------------------- 03 + 04 · resultado e plano */

const LEFT = 360; // a coluna do vídeo

function ResultScreen({ f, c }: P) {
  const R = T.result;
  const draw = progress(f, R.curve, 58, easeInOut);
  const pop = progress(f, R.drop, 10);
  const ring = progress(f, R.drop + 2, 22);
  const played = pop > 0 ? mix(1, SAMPLE.dropAtSec / SAMPLE.durationSec, progress(f, R.drop, 10, easeInOut)) : draw;
  const seconds = pop > 0 ? SAMPLE.dropAtSec : Math.round(draw * SAMPLE.durationSec);
  // o plano entra pela direita e empurra a análise para o lado
  const plan = progress(f, T.plan.start - 4, 26, easeInOut);
  return (
    <div style={{ display: "grid", gridTemplateColumns: `${LEFT}px 1fr`, height: "100%" }}>
      <div style={{ borderRight: `1px solid ${C.line}`, padding: 32 }}>
        <div style={{ width: LEFT - 64, height: ((LEFT - 64) * 16) / 9, borderRadius: 18, overflow: "hidden" }}>
          <ReelFrame played={played} scale={1.3} />
        </div>
        <p style={{ margin: "14px 0 0", display: "flex", justifyContent: "space-between", fontFamily: FONT.mono, fontSize: 16, color: C.inkMuted }}>
          <span>
            <span style={{ color: C.accent }}>0:{String(seconds).padStart(2, "0")}</span> / 0:{SAMPLE.durationSec}
          </span>
          <span>9:16</span>
        </p>
      </div>

      <div style={{ position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, padding: "40px 56px", opacity: 1 - plan, transform: `translateX(${-plan * 120}px)` }}>
          <Insight f={f} c={c} draw={draw} pop={pop} ring={ring} />
        </div>
        {plan > 0 && (
          <div style={{ position: "absolute", inset: 0, opacity: plan, transform: `translateX(${(1 - plan) * 160}px)` }}>
            <Plan f={f} c={c} />
          </div>
        )}
      </div>
    </div>
  );
}

function Insight({ f, c, draw, pop, ring }: P & { draw: number; pop: number; ring: number }) {
  const R = T.result;
  const heading = progress(f, R.drop + 2, 14);
  const quote = progress(f, R.quote, 16);
  const why = progress(f, R.why, 18);
  const test = progress(f, R.test, 18);
  return (
    <div>
      <p style={{ ...labelStyle, margin: 0, fontSize: 15, color: C.accent }}>{c.result.eyebrow}</p>
      <div style={{ marginTop: 6, display: "flex", alignItems: "baseline", gap: 28 }}>
        <p style={{ margin: 0, fontSize: 92, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.05em", opacity: 0.25 + 0.75 * heading }}>0:0{SAMPLE.dropAtSec}</p>
        <p style={{ margin: 0, fontFamily: FONT.mono, fontSize: 20, color: C.inkMuted, opacity: heading, transform: `translateX(${(1 - heading) * -10}px)` }}>{c.result.summary}</p>
      </div>
      <div style={{ marginTop: 22 }}>
        <RetentionCurve id="demo-curve" points={SAMPLE.retention} durationSec={SAMPLE.durationSec} dropAtSec={SAMPLE.dropAtSec} axisSize={17} draw={draw} pop={pop} ring={ring} />
      </div>
      <div style={{ marginTop: 34, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 44 }}>
        <div style={{ position: "relative", paddingLeft: 20, opacity: quote, transform: `translateY(${(1 - quote) * 12}px)` }}>
          <span style={{ position: "absolute", left: 0, top: 0, width: 3, height: `${quote * 100}%`, background: C.accent, borderRadius: 3 }} />
          <p style={{ ...labelStyle, margin: 0, fontSize: 14 }}>{c.result.happening}</p>
          <p style={{ margin: "10px 0 0", fontSize: 25, lineHeight: 1.4, letterSpacing: "-0.01em" }}>“{c.phrase}”</p>
        </div>
        <div>
          <div style={{ opacity: why, transform: `translateY(${(1 - why) * 12}px)` }}>
            <p style={{ ...labelStyle, margin: 0, fontSize: 14 }}>{c.result.why}</p>
            <p style={{ margin: "10px 0 0", fontSize: 19.5, lineHeight: 1.5, color: C.inkMuted }}>{c.result.whyText}</p>
          </div>
          <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 12, opacity: test, transform: `translateY(${(1 - test) * 10}px)` }}>
            <Badge tone="accent" style={{ fontSize: 14 }}>
              {c.result.test}
            </Badge>
            <span style={{ fontSize: 19.5, fontWeight: 600 }}>{c.result.testText}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Plan({ f, c }: P) {
  const Pl = T.plan;
  const rewrite = progress(f, Pl.rewrite, 20);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", height: "100%" }}>
      <div style={{ padding: "40px 40px 40px 56px", background: C.surface, borderRight: `1px solid ${C.line}` }}>
        <p style={{ ...labelStyle, margin: 0, fontSize: 15 }}>{c.plan.label}</p>
        <p style={{ margin: "8px 0 0", fontSize: 19, color: C.inkMuted }}>{c.plan.lead}</p>
        <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 12 }}>
          {c.plan.items.map((item, i) => {
            const p = progress(f, Pl.cards[i], 14);
            // só os dois primeiros são aceitos na demo; os outros ficam esperando a decisão
            const at = i < 2 ? Pl.accept[i] : null;
            const press = at === null ? 0 : progress(f, at - 6, 5) * (1 - progress(f, at - 1, 3));
            const leave = at === null ? 0 : progress(f, at - 1, 3);
            const accepted = at === null ? 0 : progress(f, at + 2, 8);
            return (
              <div
                key={item.kind}
                style={{
                  borderRadius: 16,
                  border: `1px solid ${accepted > 0 ? `rgba(31,71,166,${0.4 * accepted})` : C.line}`,
                  background: C.paperRaised,
                  padding: "18px 22px",
                  opacity: p,
                  transform: `translateX(${(1 - p) * 30}px)`,
                  boxShadow: accepted > 0 ? `0 0 0 ${4 * accepted}px rgba(31,71,166,${0.08 * accepted})` : undefined,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 36 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontFamily: FONT.mono, fontSize: 15, color: C.inkMuted }}>{item.time}</span>
                    <Badge tone={i === 0 ? "accent" : "neutral"} style={{ fontSize: 14 }}>
                      {item.kind}
                    </Badge>
                    <span style={{ fontFamily: FONT.mono, fontSize: 14, color: C.inkMuted }}>
                      {c.plan.impact} {item.impact}/10
                    </span>
                  </span>
                  <span style={{ position: "relative", display: "inline-flex", justifyContent: "flex-end", minWidth: 130 }}>
                    <MockButton variant="secondary" style={{ height: 36, fontSize: 15, opacity: 1 - leave, transform: `scale(${1 - press * 0.1 - leave * 0.15})` }}>
                      {c.plan.accept}
                    </MockButton>
                    <span style={{ position: "absolute", right: 0, top: "50%", transform: `translateY(-50%) scale(${0.85 + 0.15 * accepted})`, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 16, fontWeight: 600, color: C.accent, opacity: accepted }}>
                      <Check size={17} strokeWidth={2.75} />
                      {c.plan.accepted}
                    </span>
                  </span>
                </div>
                <p style={{ margin: "8px 0 0", fontSize: 21, lineHeight: 1.35 }}>{item.text}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: "40px 48px", opacity: rewrite, transform: `translateY(${(1 - rewrite) * 16}px)` }}>
        <p style={{ ...labelStyle, margin: 0, fontSize: 15 }}>{c.plan.rewriteTitle}</p>
        <div style={{ marginTop: 22, borderRadius: 18, border: "1px solid rgba(31,71,166,0.25)", background: C.accentSoft, padding: "26px 28px" }}>
          <p style={{ ...labelStyle, margin: 0, fontSize: 13, color: C.accent }}>{c.plan.version}</p>
          <p style={{ margin: "12px 0 0", fontSize: 28, lineHeight: 1.35, letterSpacing: "-0.015em", fontWeight: 500 }}>“{c.plan.rewrite}”</p>
          <p style={{ margin: "14px 0 0", fontSize: 18, color: C.inkMuted }}>{c.plan.rewriteWhy}</p>
          <span style={{ marginTop: 20, display: "inline-flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 600, color: C.accent }}>
            <CopyIcon size={16} strokeWidth={2.2} />
            {c.plan.copyLine}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- 05 · cortes */

const STRIP_W = 1360;
const STRIP_H = 176;
const PX = STRIP_W / SAMPLE.durationSec;

function waveform(n: number): number[] {
  // determinística: a mesma toda vez
  const out: number[] = [];
  let seed = 7;
  for (let i = 0; i < n; i++) {
    seed = (seed * 16807) % 2147483647;
    const t = i / n;
    const silent = t < 4 / 34 || (t > 17 / 34 && t < 20 / 34) || t > 31 / 34;
    out.push(silent ? 0.05 + (seed % 7) / 200 : 0.25 + ((seed % 1000) / 1000) * 0.7);
  }
  return out;
}
const WAVE = waveform(170);

function CutsScreen({ f, c }: P) {
  const K = T.cuts;
  const collapse = progress(f, K.collapse, 44, easeInOut);
  const press = progress(f, K.press - 3, 3) * (1 - progress(f, K.press, 5));
  const applying = f >= K.press && f < K.ready;
  const ready = progress(f, K.ready, 22);
  const cuts = c.cuts.items;
  // os trechos, na ordem do vídeo: o que fica e o que sai
  const pieces: { from: number; to: number; cut: boolean; label?: string }[] = [];
  let t = 0;
  cuts.forEach((cut) => {
    if (cut.from > t) pieces.push({ from: t, to: cut.from, cut: false });
    pieces.push({ from: cut.from, to: cut.to, cut: true, label: cut.label });
    t = cut.to;
  });
  if (t < SAMPLE.durationSec) pieces.push({ from: t, to: SAMPLE.durationSec, cut: false });
  const total = Math.round(mix(34, 24, collapse));
  const stripWidth = pieces.reduce((w, p) => w + (p.to - p.from) * PX * (p.cut ? 1 - collapse : 1), 0);

  return (
    <div style={{ padding: "48px 96px" }}>
      <p style={{ margin: 0, fontSize: 40, fontWeight: 600, letterSpacing: "-0.03em" }}>{c.cuts.title}</p>
      <p style={{ margin: "10px 0 0", fontSize: 21, color: C.inkMuted }}>{c.cuts.lead}</p>

      <div style={{ marginTop: 44, height: STRIP_H + 92, position: "relative", opacity: 1 - ready * 0.25 }}>
        <div style={{ position: "absolute", left: (STRIP_W - stripWidth) / 2, top: 34, display: "flex", height: STRIP_H }}>
          {pieces.map((piece, i) => {
            const mark = piece.cut ? progress(f, K.marks[cuts.findIndex((x) => x.from === piece.from)], 14) : 0;
            const w = (piece.to - piece.from) * PX * (piece.cut ? 1 - collapse : 1);
            return (
              <div key={i} style={{ position: "relative", width: w, height: "100%" }}>
                <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: i === 0 ? "12px 0 0 12px" : i === pieces.length - 1 ? "0 12px 12px 0" : 0 }}>
                  <Filmstrip offset={piece.from * PX} />
                  {piece.cut && <div style={{ position: "absolute", inset: 0, background: `repeating-linear-gradient(135deg, rgba(166,74,54,0.55) 0 10px, rgba(166,74,54,0.35) 10px 20px)`, opacity: mark, border: `2px solid rgba(166,74,54,${mark})` }} />}
                </div>
                {piece.cut && (
                  <span style={{ position: "absolute", top: -34, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 15, fontWeight: 600, color: "#A64A36", opacity: mark * (1 - collapse * 2) }}>
                    <Scissors size={15} strokeWidth={2.2} />
                    {piece.label}
                  </span>
                )}
                {piece.cut && (
                  <span style={{ position: "absolute", bottom: -30, left: "50%", transform: "translateX(-50%)", fontFamily: FONT.mono, fontSize: 14, color: C.inkMuted, opacity: mark * (1 - collapse * 2) }}>
                    0:{String(piece.from).padStart(2, "0")}–0:{String(piece.to).padStart(2, "0")}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ fontFamily: FONT.mono, fontSize: 20, color: C.inkMuted }}>
          <span style={{ color: collapse > 0 ? C.accent : C.ink }}>0:{total}</span> {collapse > 0 ? `· −${34 - total}s` : ""}
        </span>
        <MockButton style={{ height: 56, padding: "0 26px", fontSize: 20, borderRadius: 14, transform: `scale(${1 - press * 0.05})`, opacity: 1 - ready }}>
          {applying ? <Loader2 size={20} strokeWidth={2.2} style={{ transform: `rotate(${f * 12}deg)` }} /> : <Scissors size={20} strokeWidth={2.2} />}
          {applying ? c.cuts.applying : c.cuts.apply}
        </MockButton>
      </div>

      {/* o vídeo editado */}
      {ready > 0 && (
        <div style={{ position: "absolute", left: 96, right: 96, bottom: 48, display: "flex", alignItems: "center", gap: 32, borderRadius: 22, border: `1px solid ${C.line}`, background: C.paper, padding: 24, opacity: ready, transform: `translateY(${(1 - ready) * 24}px)` }}>
          <div style={{ width: 92, height: 164, borderRadius: 12, overflow: "hidden", flexShrink: 0 }}>
            <ReelFrame played={0.3} scale={0.45} />
          </div>
          <div style={{ flex: 1 }}>
            <Badge tone="confirmed" dot style={{ fontSize: 14 }}>
              {c.cuts.readyLabel}
            </Badge>
            <p style={{ margin: "12px 0 0", fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em" }}>{c.cuts.readyTitle}</p>
            <p style={{ margin: "8px 0 0", fontSize: 17, color: C.inkMuted }}>{c.cuts.note}</p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <MockButton style={{ height: 54, padding: "0 24px", fontSize: 19, borderRadius: 14 }}>
              <Download size={19} strokeWidth={2.2} />
              {c.cuts.download}
            </MockButton>
            <MockButton variant="secondary" style={{ height: 54, padding: "0 22px", fontSize: 19, borderRadius: 14 }}>
              <Share2 size={18} strokeWidth={2.2} />
              {c.cuts.share}
            </MockButton>
          </div>
        </div>
      )}
    </div>
  );
}

/** A tira de quadros do vídeo inteiro, com a onda de áudio por cima; `offset` mostra a parte certa. */
function Filmstrip({ offset }: { offset: number }) {
  const thumbW = (STRIP_H * 9) / 16;
  const count = Math.ceil(STRIP_W / thumbW);
  return (
    <div style={{ position: "absolute", top: 0, left: -offset, width: STRIP_W, height: STRIP_H, display: "flex" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ width: thumbW, height: STRIP_H, flexShrink: 0, opacity: 0.92, borderRight: "1px solid rgba(255,255,255,0.25)" }}>
          <ReelFrame played={i / count} scale={0.32} />
        </div>
      ))}
      <svg viewBox={`0 0 ${WAVE.length} 100`} preserveAspectRatio="none" style={{ position: "absolute", left: 0, bottom: 0, width: STRIP_W, height: 46 }}>
        {WAVE.map((v, i) => (
          <rect key={i} x={i + 0.2} y={50 - v * 45} width={0.6} height={v * 90} fill="rgba(255,253,248,0.9)" />
        ))}
      </svg>
    </div>
  );
}
