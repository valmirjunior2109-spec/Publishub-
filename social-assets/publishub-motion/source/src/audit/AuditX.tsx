import type { CSSProperties, ReactNode } from "react";
import { Check, Copy as CopyIcon, Download, Film, Loader2, Upload } from "lucide-react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { easeInOut, easeOut, mix, progress } from "../anim";
import { Badge, label as labelStyle, MockButton } from "../components/ui";
import { C, FONT } from "../theme";
import { BrandLockup } from "../demo/Brand";
import T from "./timeline.json";

/* ==========================================================================
   A auditoria grátis (/tools/video-audit) para o X: 16:9, 30 s, sem narração.
   Logo → envio → análise → o relatório (nota, queda, dimensões, as 3 mudanças,
   checklist) → copiar → o link. A câmera aproxima onde o cursor clica.
   Os quadros estão em timeline.json; a trilha (make-sound-audit.mjs) lê o mesmo.
   ========================================================================== */

export const AUDIT_FPS = T.fps;
export const AUDIT_FRAMES = T.durationInFrames;

const WIN = { x: 160, y: 52, w: 1600, h: 856 };
const BAR = 52;
const BODY_H = WIN.h - BAR;
const SCROLL = 720; // quanto o relatório rola para mostrar as mudanças e o checklist
// a trilha já sai mixada (scripts/make-sound-audit.mjs): aqui só o volume geral
const MUSIC_VOLUME = 0.8;

/* ---------------------------------------------------------------- o que aparece na tela */

const COPY = {
  title: "Free video audit",
  sub: "Upload your edit. Get the report before you post.",
  captions: ["Upload your edit", "Get the audit in about 3 minutes", "Fix it before you post or deliver"],
  upload: {
    title: "Free video audit",
    lead: "Overall score, hook, pacing, structure, the 3 changes that matter most and a checklist. No account.",
    drop: "Upload your edited video",
    hint: "MP4, MOV or WEBM · up to 500 MB",
    file: "client-reel-gym.mp4",
    meta: "0:41 · 86 MB",
    received: "Uploaded",
    submit: "Audit my video",
  },
  processing: { eyebrow: "Video audit", title: "Auditing your video", steps: ["Uploading video", "Listening to the speech", "Measuring pauses and scene changes", "Reading frames of the video", "Writing the report"] },
  report: {
    eyebrow: "Video audit",
    overall: "Overall score",
    overallNote: "An editorial read of the whole video, not a prediction of views.",
    dropLabel: "Where viewers most likely leave",
    phrase: "So, before anything else, let me tell you why I decided to do this",
    dims: "Dimension by dimension",
    aiRead: "AI read",
    top: "The 3 changes that matter most",
    checklist: "Before you post",
    copy: "Copy report",
    copied: "Copied",
    download: "Download .txt",
  },
  dimensions: [
    { name: "Hook", status: "priority", detail: "Hook score: 4/10" },
    { name: "Pacing", status: "attention", detail: "Pacing: slow" },
    { name: "Structure", status: "ok", detail: "Nothing flagged" },
    { name: "Captions and on-screen text", status: "attention", detail: "1 suggestion in the plan" },
    { name: "Visuals", status: "priority", detail: "1 suggestion in the plan" },
    { name: "Call to action", status: "ok", detail: "Nothing flagged" },
  ] as { name: string; status: Status; detail: string }[],
  topItems: [
    { time: "0:00 → 0:04", kind: "Hook", title: "Open with the result, not the context", why: "People decide to stay in the first seconds." },
    { time: "0:09 → 0:15", kind: "B-roll", title: "Change the shot between 9s and 15s", why: "Six seconds in the same frame tires the viewer." },
    { time: "0:22 → 0:23", kind: "Pacing", title: "Shorten the pause at 22s", why: "The video gets shorter without losing anything." },
  ],
  checks: ["Cut the 0.8 s of silence at the start", "Show the payoff or the problem in the first 3 seconds", "Shorten the long pauses (the longest is 1.4 s)", "Change the shot where the image sits still", "Watch it once with the sound off before posting"],
  end: { line: "Free video audit", url: "getpublishub.com/tools/video-audit", note: "No account · about 3 minutes" },
};

type Status = "ok" | "attention" | "priority";
const STATUS: Record<Status, { text: string; color: string; bg: string; border: string }> = {
  ok: { text: "Looks good", color: C.confirmed, bg: "transparent", border: C.line },
  attention: { text: "Worth a look", color: C.ink, bg: "transparent", border: C.line },
  priority: { text: "Priority", color: C.accent, bg: C.accentSoft, border: "rgba(31,71,166,0.35)" },
};

/* ---------------------------------------------------------------- cursor e câmera (px no corpo da janela) */

const R = T.report;
const U = T.upload;
// onde o cursor está; entre dois pontos ele desliza com ida e volta suave
const PATH: { f: number; x: number; y: number }[] = [
  { f: U.cursorIn, x: 1260, y: 640 },
  { f: U.drop - 4, x: 796, y: 392 },
  { f: U.received + 4, x: 796, y: 392 },
  { f: U.press - 4, x: 216, y: 604 },
  { f: R.tick[0] - 26, x: 900, y: 420 },
  { f: R.tick[0] - 4, x: 104, y: 453 },
  { f: R.tick[1] - 4, x: 104, y: 505 },
  { f: R.copy - 4, x: 188, y: 740 },
];
const CLICKS = [U.drop, U.press, R.tick[0], R.tick[1], R.copy];
const SHOWN: [number, number][] = [
  [U.cursorIn - 6, U.out],
  [R.tick[0] - 30, R.out - 10],
];

function cursorAt(f: number) {
  let x = PATH[0].x;
  let y = PATH[0].y;
  for (let i = 0; i < PATH.length - 1; i++) {
    const a = PATH[i];
    const b = PATH[i + 1];
    if (f >= a.f && f <= b.f) {
      const k = progress(f, a.f, b.f - a.f, easeInOut);
      return { x: mix(a.x, b.x, k), y: mix(a.y, b.y, k) };
    }
    if (f > b.f) {
      x = b.x;
      y = b.y;
    }
  }
  return { x, y };
}

/** A câmera aproxima perto de cada clique, centrada no cursor, e volta depois. */
function camera(f: number) {
  const zoom = CLICKS.reduce((m, at) => Math.max(m, progress(f, at - 22, 20, easeInOut) * (1 - progress(f, at + 14, 22, easeInOut))), 0);
  const { x, y } = cursorAt(f);
  return { scale: 1 + 0.2 * zoom, ox: x, oy: y };
}

/* ---------------------------------------------------------------- a composição */

export function AuditX({ sound = true }: { sound?: boolean }) {
  const f = useCurrentFrame();
  const windowIn = progress(f, T.window, 24);
  const windowOut = progress(f, T.end.start - 12, 18, easeInOut);
  const cam = camera(f);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 40%, #FBF6EC 0%, ${C.paper} 60%, #EFE5D3 100%)`, fontFamily: FONT.sans, color: C.ink }}>
      {sound && <Audio src={staticFile("soundtrack-audit.wav")} volume={(fr) => MUSIC_VOLUME * (1 - progress(fr, AUDIT_FRAMES - 45, 45))} />}
      <Intro f={f} />

      {f >= T.window - 2 && f < T.end.start + 10 && (
        <div style={{ position: "absolute", left: WIN.x, top: WIN.y, width: WIN.w, height: WIN.h, opacity: windowIn * (1 - windowOut), transform: `translateY(${(1 - windowIn) * 60 + windowOut * -30}px) scale(${1 - windowOut * 0.04})` }}>
          <Window url={f < T.processing.start ? "getpublishub.com/tools/video-audit" : "getpublishub.com/tools/video-audit/7f3a91c2"} cam={cam}>
            <Screen f={f} from={U.start} to={U.out + 8}>
              <UploadScreen f={f} />
            </Screen>
            <Screen f={f} from={T.processing.start} to={T.processing.out + 8}>
              <ProcessingScreen f={f} />
            </Screen>
            <Screen f={f} from={R.start} to={T.end.start + 10}>
              <ReportScreen f={f} />
            </Screen>
            <Cursor f={f} />
          </Window>
        </div>
      )}

      <Caption f={f} />
      <End f={f} />
    </AbsoluteFill>
  );
}

/* ---------------------------------------------------------------- moldura */

function Window({ url, cam, children }: { url: string; cam: { scale: number; ox: number; oy: number }; children: ReactNode }) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", borderRadius: 22, border: `1px solid ${C.line}`, background: C.paperRaised, boxShadow: "0 1px 2px rgba(30,27,24,0.05), 0 30px 70px -28px rgba(30,27,24,0.35)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", height: BAR, borderBottom: `1px solid ${C.line}`, padding: "0 20px" }}>
        <span style={{ display: "flex", gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ width: 12, height: 12, borderRadius: 999, background: C.line }} />
          ))}
        </span>
        <span style={{ minWidth: 560, textAlign: "center", borderRadius: 999, background: C.paper, border: `1px solid ${C.line}`, padding: "6px 22px", fontFamily: FONT.mono, fontSize: 15, color: C.inkMuted }}>{url}</span>
        <span />
      </div>
      <div style={{ position: "relative", height: BODY_H, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, transform: `scale(${cam.scale})`, transformOrigin: `${cam.ox}px ${cam.oy}px` }}>{children}</div>
      </div>
    </div>
  );
}

function Screen({ f, from, to, children }: { f: number; from: number; to: number; children: ReactNode }) {
  if (f < from - 1 || f > to) return null;
  const o = progress(f, from, 12) * (1 - progress(f, to - 12, 12));
  return <div style={{ position: "absolute", inset: 0, opacity: o }}>{children}</div>;
}

function Cursor({ f }: { f: number }) {
  const shown = SHOWN.find(([a, b]) => f >= a && f <= b + 10);
  if (!shown) return null;
  const o = progress(f, shown[0], 8) * (1 - progress(f, shown[1], 10));
  const { x, y } = cursorAt(f);
  const click = CLICKS.reduce((m, at) => Math.max(m, progress(f, at - 4, 4) * (1 - progress(f, at, 6))), 0);
  // o anel do clique: abre e some logo depois de cada clique
  const ring = CLICKS.reduce((m, at) => (f >= at && f < at + 16 ? progress(f, at, 16) : m), 0);
  return (
    <>
      {ring > 0 && <span style={{ position: "absolute", left: x + 4 - 28 * ring, top: y + 3 - 28 * ring, width: 56 * ring, height: 56 * ring, borderRadius: 999, border: `2px solid rgba(31,71,166,${0.5 * (1 - ring)})`, zIndex: 9 }} />}
      <svg width="34" height="40" viewBox="0 0 24 28" style={{ position: "absolute", left: x, top: y, opacity: o, transform: `scale(${1 - click * 0.14})`, transformOrigin: "4px 3px", filter: "drop-shadow(0 3px 5px rgba(30,27,24,0.28))", zIndex: 10 }}>
        <path d="M3 2 L3 22 L8.5 17 L12 25 L15.5 23.5 L12 15.6 L19 15.6 Z" fill={C.ink} stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </>
  );
}

/* ---------------------------------------------------------------- abertura, legenda e fechamento */

function Intro({ f }: { f: number }) {
  const I = T.intro;
  if (f > T.window + 10) return null;
  const build = progress(f, I.logo, 30, easeOut);
  const word = progress(f, I.logo + 12, 20);
  const title = progress(f, I.title, 18);
  const sub = progress(f, I.sub, 18);
  const leave = progress(f, I.out, 12, easeInOut);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: 1 - leave, transform: `translateY(${-leave * 30}px)` }}>
      <BrandLockup size={54} build={build} word={word} id="audit-intro" />
      <p style={{ margin: "44px 0 0", fontSize: 76, fontWeight: 600, letterSpacing: "-0.04em", opacity: title, transform: `translateY(${(1 - title) * 16}px)` }}>{COPY.title}</p>
      <p style={{ margin: "18px 0 0", fontSize: 30, color: C.inkMuted, letterSpacing: "-0.01em", opacity: sub, transform: `translateY(${(1 - sub) * 12}px)` }}>{COPY.sub}</p>
    </AbsoluteFill>
  );
}

function Caption({ f }: { f: number }) {
  const spans: [number, number][] = [
    [U.start + 18, U.out + 4],
    [T.processing.start, R.scroll - 6],
    [R.scroll + 10, R.out],
  ];
  return (
    <>
      {spans.map(([from, to], i) => {
        if (f < from - 1 || f > to + 14) return null;
        const o = progress(f, from, 14) * (1 - progress(f, to, 12));
        return (
          <div key={i} style={{ position: "absolute", left: WIN.x + 6, top: WIN.y + WIN.h + 40, display: "flex", alignItems: "baseline", gap: 22, opacity: o, transform: `translateY(${(1 - progress(f, from, 16)) * 10}px)` }}>
            <span style={{ fontFamily: FONT.mono, fontSize: 22, fontWeight: 500, color: C.accent }}>0{i + 1}</span>
            <span style={{ fontSize: 34, fontWeight: 500, letterSpacing: "-0.02em" }}>{COPY.captions[i]}</span>
          </div>
        );
      })}
    </>
  );
}

function End({ f }: { f: number }) {
  const E = T.end;
  if (f < E.start) return null;
  const build = progress(f, E.logo, 30);
  const word = progress(f, E.logo + 12, 20);
  const line = progress(f, E.line, 20);
  const url = progress(f, E.url, 20);
  const fade = progress(f, E.fade, 16);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: 1 - fade }}>
      <BrandLockup size={84} build={build} word={word} id="audit-end" />
      <p style={{ margin: "46px 0 0", fontSize: 58, fontWeight: 600, letterSpacing: "-0.035em", opacity: line, transform: `translateY(${(1 - line) * 14}px)` }}>{COPY.end.line}</p>
      <div style={{ marginTop: 30, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, opacity: url, transform: `translateY(${(1 - url) * 12}px)` }}>
        <span style={{ fontFamily: FONT.mono, fontSize: 30, color: C.accent }}>{COPY.end.url}</span>
        <span style={{ fontSize: 22, color: C.inkMuted }}>{COPY.end.note}</span>
      </div>
    </AbsoluteFill>
  );
}

/* ---------------------------------------------------------------- 01 · envio */

function UploadScreen({ f }: { f: number }) {
  const card = progress(f, U.card, 16);
  const uploading = progress(f, U.card + 6, U.received - U.card - 6, easeInOut);
  const received = progress(f, U.received, 10);
  const press = progress(f, U.press - 3, 3) * (1 - progress(f, U.press, 5));
  const hover = progress(f, U.drop - 16, 10) * (1 - card);
  return (
    <div style={{ padding: "64px 96px" }}>
      <p style={{ margin: 0, fontSize: 50, fontWeight: 600, letterSpacing: "-0.035em" }}>{COPY.upload.title}</p>
      <p style={{ margin: "14px 0 0", fontSize: 22, color: C.inkMuted, maxWidth: 980, lineHeight: 1.45 }}>{COPY.upload.lead}</p>

      <div style={{ position: "relative", marginTop: 44, height: 300, borderRadius: 22, border: `2px dashed ${card > 0.5 ? "transparent" : hover > 0 ? "rgba(31,71,166,0.5)" : C.line}`, background: card > 0 ? C.paper : C.paperRaised }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: C.inkMuted, opacity: 1 - card }}>
          <Film size={34} strokeWidth={1.5} />
          <span style={{ fontSize: 24, fontWeight: 600, color: C.ink }}>{COPY.upload.drop}</span>
          <span style={{ fontSize: 17 }}>{COPY.upload.hint}</span>
        </div>
        {card > 0 && (
          <div style={{ position: "absolute", inset: 0, padding: 32, display: "flex", alignItems: "flex-end" }}>
            <div style={{ width: "100%", borderRadius: 16, border: `1px solid ${C.line}`, background: C.paperRaised, padding: "20px 24px", opacity: card, transform: `translateY(${(1 - card) * -36}px) scale(${0.96 + 0.04 * card})`, boxShadow: "0 12px 30px -18px rgba(30,27,24,0.35)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ display: "grid", placeItems: "center", width: 46, height: 46, borderRadius: 12, background: C.accentSoft, color: C.accent }}>
                  <Film size={22} strokeWidth={1.8} />
                </span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 21, fontWeight: 600 }}>{COPY.upload.file}</p>
                  <p style={{ margin: "3px 0 0", fontFamily: FONT.mono, fontSize: 14, color: C.inkMuted }}>{COPY.upload.meta}</p>
                </div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 17, fontWeight: 600, color: C.confirmed, opacity: received }}>
                  <Check size={18} strokeWidth={2.6} />
                  {COPY.upload.received}
                </span>
                <span style={{ fontFamily: FONT.mono, fontSize: 16, color: C.inkMuted, opacity: 1 - received }}>{Math.round(uploading * 100)}%</span>
              </div>
              <div style={{ marginTop: 16, height: 6, borderRadius: 999, background: C.surface, overflow: "hidden", opacity: 1 - received }}>
                <div style={{ width: `${uploading * 100}%`, height: "100%", borderRadius: 999, background: C.accent }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 32, display: "flex", alignItems: "center", gap: 22 }}>
        <MockButton style={{ height: 60, padding: "0 30px", fontSize: 22, borderRadius: 14, opacity: 0.35 + 0.65 * received, transform: `scale(${1 - press * 0.05})` }}>
          <Upload size={20} strokeWidth={2.2} />
          {COPY.upload.submit}
        </MockButton>
        <span style={{ fontSize: 18, color: C.inkMuted }}>No account · no card</span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- 02 · análise */

function ProcessingScreen({ f }: { f: number }) {
  const S = T.processing.steps;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 110 }}>
      <p style={{ ...labelStyle, fontSize: 16, color: C.accent }}>{COPY.processing.eyebrow}</p>
      <p style={{ margin: "14px 0 0", fontSize: 46, fontWeight: 600, letterSpacing: "-0.03em" }}>{COPY.processing.title}</p>
      <ol style={{ listStyle: "none", margin: "56px 0 0", padding: 0, width: 860, display: "flex", flexDirection: "column", gap: 4 }}>
        {COPY.processing.steps.map((step, i) => {
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

/* ---------------------------------------------------------------- 03 · o relatório */

function ReportScreen({ f }: { f: number }) {
  const scroll = progress(f, R.scroll, 34, easeInOut) * SCROLL;
  const score = progress(f, R.score, 16);
  const count = Math.round(mix(0, 6, progress(f, R.score, 30, easeOut)));
  const drop = progress(f, R.drop, 16);
  const dims = progress(f, R.dims - 6, 14);
  const copied = f >= R.copy;
  const copyPress = progress(f, R.copy - 3, 3) * (1 - progress(f, R.copy, 5));
  const actions = progress(f, R.actions, 14);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 96, right: 96, top: 0, transform: `translateY(${-scroll}px)` }}>
        <p style={{ ...labelStyle, margin: "40px 0 0", fontSize: 15, color: C.accent }}>{COPY.report.eyebrow}</p>
        <p style={{ margin: "8px 0 0", fontSize: 44, fontWeight: 600, letterSpacing: "-0.03em" }}>{COPY.upload.file}</p>

        {/* a nota e a queda */}
        <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "440px 1fr", gap: 20, height: 210 }}>
          <Card style={{ opacity: score, transform: `translateY(${(1 - score) * 14}px)` }}>
            <p style={{ ...labelStyle, margin: 0, fontSize: 14 }}>{COPY.report.overall}</p>
            <p style={{ margin: "14px 0 0", fontSize: 78, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.04em" }}>
              {count}
              <span style={{ fontSize: 30, color: C.inkMuted }}>/10</span>
            </p>
            <p style={{ margin: "14px 0 0", fontSize: 15.5, color: C.inkMuted, lineHeight: 1.45 }}>{COPY.report.overallNote}</p>
          </Card>
          <Card style={{ opacity: drop, transform: `translateY(${(1 - drop) * 14}px)` }}>
            <p style={{ ...labelStyle, margin: 0, fontSize: 14 }}>{COPY.report.dropLabel}</p>
            <p style={{ margin: "14px 0 0", fontFamily: FONT.mono, fontSize: 46, fontWeight: 500, color: C.accent }}>0:04</p>
            <p style={{ margin: "12px 0 0", fontSize: 21, lineHeight: 1.45 }}>“{COPY.report.phrase}”</p>
          </Card>
        </div>

        {/* as dimensões */}
        <div style={{ marginTop: 36, display: "flex", alignItems: "center", justifyContent: "space-between", opacity: dims }}>
          <p style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>{COPY.report.dims}</p>
          <Badge style={{ fontSize: 14 }}>{COPY.report.aiRead}</Badge>
        </div>
        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {COPY.dimensions.map((d, i) => {
            const p = progress(f, R.dims + i * 7, 14);
            const chip = progress(f, R.chips + i * 5, 10);
            const s = STATUS[d.status];
            return (
              <Card key={d.name} style={{ height: 120, padding: "20px 22px", opacity: p, transform: `translateY(${(1 - p) * 14}px)` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ fontSize: 19, fontWeight: 600 }}>{d.name}</span>
                  <span style={{ whiteSpace: "nowrap", borderRadius: 999, border: `1px solid ${s.border}`, background: s.bg, color: s.color, padding: "3px 12px", fontSize: 14, fontWeight: 600, opacity: chip, transform: `scale(${0.85 + 0.15 * chip})` }}>{s.text}</span>
                </div>
                <p style={{ margin: "14px 0 0", fontSize: 17, fontWeight: 500 }}>{d.detail}</p>
              </Card>
            );
          })}
        </div>

        {/* as 3 mudanças */}
        <p style={{ margin: "54px 0 0", fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>{COPY.report.top}</p>
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          {COPY.topItems.map((item, i) => {
            const p = progress(f, R.top[i], 14);
            return (
              <Card key={item.title} style={{ height: 76, padding: "14px 22px", display: "flex", alignItems: "center", gap: 20, opacity: p, transform: `translateX(${(1 - p) * 30}px)` }}>
                <span style={{ fontSize: 28, fontWeight: 600, color: C.accent, width: 20 }}>{i + 1}</span>
                <span style={{ fontFamily: FONT.mono, fontSize: 15, color: C.inkMuted, width: 120 }}>{item.time}</span>
                <Badge style={{ fontSize: 13 }}>{item.kind}</Badge>
                <span style={{ fontSize: 20, fontWeight: 600 }}>{item.title}</span>
                <span style={{ fontSize: 16, color: C.inkMuted }}>{item.why}</span>
              </Card>
            );
          })}
        </div>

        {/* o checklist */}
        <p style={{ margin: "46px 0 0", fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>{COPY.report.checklist}</p>
        <div style={{ marginTop: 12 }}>
          {COPY.checks.map((check, i) => {
            const p = progress(f, R.checks[i], 12);
            const at = R.tick[i];
            const ticked = at !== undefined ? progress(f, at, 8) : 0;
            return (
              <div key={check} style={{ height: 52, display: "flex", alignItems: "center", gap: 16, borderBottom: `1px solid ${C.line}`, opacity: p }}>
                <span style={{ position: "relative", width: 22, height: 22, borderRadius: 6, border: `2px solid ${ticked > 0.5 ? C.accent : C.line}`, background: ticked > 0 ? `rgba(31,71,166,${ticked})` : C.paperRaised, display: "grid", placeItems: "center", color: "#fff" }}>
                  {ticked > 0 && <Check size={15} strokeWidth={3} style={{ transform: `scale(${ticked})` }} />}
                </span>
                <span style={{ fontSize: 19, color: ticked > 0.5 ? C.inkMuted : C.ink, textDecoration: ticked > 0.5 ? "line-through" : "none" }}>{check}</span>
              </div>
            );
          })}
        </div>

        {/* as ações */}
        <div style={{ marginTop: 26, display: "flex", gap: 14, opacity: actions }}>
          <MockButton variant="secondary" style={{ height: 54, padding: "0 24px", fontSize: 19, borderRadius: 999, transform: `scale(${1 - copyPress * 0.06})`, color: copied ? C.confirmed : undefined }}>
            {copied ? <Check size={18} strokeWidth={2.6} /> : <CopyIcon size={18} strokeWidth={2} />}
            {copied ? COPY.report.copied : COPY.report.copy}
          </MockButton>
          <MockButton variant="secondary" style={{ height: 54, padding: "0 24px", fontSize: 19, borderRadius: 999 }}>
            <Download size={18} strokeWidth={2} />
            {COPY.report.download}
          </MockButton>
        </div>
      </div>
    </div>
  );
}

function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ borderRadius: 20, border: `1px solid ${C.line}`, background: C.paperRaised, padding: "24px 26px", boxShadow: "0 10px 26px -20px rgba(30,27,24,0.3)", ...style }}>{children}</div>;
}
