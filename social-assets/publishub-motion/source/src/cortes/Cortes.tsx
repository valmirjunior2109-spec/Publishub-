import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame } from "remotion";
import { BrandLockup, BrandMark } from "../demo/Brand";
import { FONT } from "../theme";
import { measure } from "../caderno/ink";
import T from "./timeline.json";

/* ==========================================================================
   Reel "Cortes" (9:16, 26 s): a mesma história dos Reels para editores, em
   cartazes chapados que trocam em corte seco, no tempo da música (1 tempo =
   15 quadros). Sem câmera: nada desliza nem dá zoom. Texto e telas entram por
   recorte (a letra fica parada e é revelada), então nada tremula.
   As telas são capturas reais da interface (public/editors).
   ========================================================================== */

const C = {
  cream: "#F4EDDF",
  ink: "#1E1B18",
  caramel: "#C9824A",
  blue: "#1F47A6",
  muted: "#6B6157",
  red: "#C8452F",
};
const SERIF = "Fraunces, Georgia, serif";
const W = 1080;
const X = 72; // margem do grid

const clamp = (v: number) => Math.min(1, Math.max(0, v));
/** Revelação em degraus de quadro inteiro (sem curva sub-pixel): 0 → 1 em `dur` quadros. */
const reveal = (f: number, at: number, dur = 6) => clamp(Math.round(((f - at) / dur) * 12) / 12);

/** Recorte que descobre o conteúdo; a letra não se move. */
function Wipe({ f, at, dur = 6, from = "left", children, style }: { f: number; at: number; dur?: number; from?: "left" | "top" | "bottom"; children: ReactNode; style?: CSSProperties }) {
  const p = reveal(f, at, dur);
  if (p <= 0) return null;
  const hide = `${(1 - p) * 100}%`;
  const clip = from === "left" ? `inset(-20% ${hide} -20% -2%)` : from === "top" ? `inset(-2% -2% ${hide} -2%)` : `inset(${hide} -2% -2% -2%)`;
  return <div style={{ position: "absolute", clipPath: p >= 1 ? undefined : clip, ...style }}>{children}</div>;
}

const big = (size: number, color: string, extra?: CSSProperties): CSSProperties => ({ fontFamily: FONT.sans, fontWeight: 800, fontSize: size, letterSpacing: "-0.05em", lineHeight: 0.95, color, whiteSpace: "nowrap", ...extra });
const mono = (size: number, color: string): CSSProperties => ({ fontFamily: FONT.mono, fontSize: size, letterSpacing: "0.12em", color, whiteSpace: "nowrap" });

/** A faixa de cima: o nome e o timecode, como no monitor de um editor. */
function Chrome({ f, color }: { f: number; color: string }) {
  const s = Math.floor(f / 30);
  const fr = f % 30;
  return (
    <>
      <div style={{ position: "absolute", left: X, top: 150, ...mono(26, color) }}>PUBLISHUB · FOR EDITORS</div>
      <div style={{ position: "absolute", right: X, top: 150, ...mono(26, color), fontVariantNumeric: "tabular-nums" }}>
        00:00:{String(s).padStart(2, "0")}:{String(fr).padStart(2, "0")}
      </div>
    </>
  );
}

const IMG = { upload_file: [1170, 1140], insight: [1170, 1627], cuts_head_acc: [1170, 931], edit_ready: [1170, 690] } as const;

/** Uma captura chapada: sem sombra nem perspectiva, revelada de cima para baixo. */
function Shot({ f, at, src, crop, x = 140, y, w = 800, dark = false }: { f: number; at: number; src: keyof typeof IMG; crop: [number, number]; x?: number; y: number; w?: number; dark?: boolean }) {
  const [iw] = IMG[src];
  const h = Math.round(((crop[1] - crop[0]) * w) / iw);
  return (
    <Wipe f={f} at={at} dur={8} from="top" style={{ left: x, top: y }}>
      <div style={{ width: w, height: h, overflow: "hidden", position: "relative", borderRadius: 26, border: `3px solid ${dark ? "rgba(244,237,223,0.25)" : C.ink}` }}>
        <Img src={staticFile(`editors/${src}.png`)} style={{ position: "absolute", left: 0, top: Math.round((-crop[0] * w) / iw), width: w }} />
      </div>
    </Wipe>
  );
}

function Step({ f, n, label, color }: { f: number; n: number; label: string; color: string }) {
  return <div style={{ position: "absolute", left: X, top: 330, ...mono(30, color) }}>{`0${n} / 05 · ${label}`}</div>;
}

/* ---------- as cenas: cada uma é um cartaz parado ---------- */

type Scene = { from: number; to: number; bg: string; fg: string; render: (f: number) => ReactNode };

function countAt(f: number) {
  const [a, b] = T.hook.count;
  return 1 + Math.floor(46 * Math.pow(clamp((f - a) / (b - a)), 2));
}

const SCENES: Scene[] = [
  // 0–2,4 s · o gancho: o contador de revisões, em corte seco
  {
    from: 0, to: T.hook.slam, bg: C.cream, fg: C.ink,
    render: (f) => (
      <>
        <div style={{ position: "absolute", left: X, top: 580, ...mono(40, C.caramel) }}>REWATCH</div>
        <div style={{ position: "absolute", left: X - 14, top: 660, ...big(470, C.ink), fontVariantNumeric: "tabular-nums" }}>#{String(countAt(f)).padStart(2, "0")}</div>
        <Wipe f={f} at={T.hook.sub} style={{ left: X, top: 1160 }}>
          <div style={big(64, C.muted, { fontWeight: 600, letterSpacing: "-0.03em" })}>of the same 40-second cut.</div>
        </Wipe>
      </>
    ),
  },
  {
    from: T.hook.slam, to: T.hook.out, bg: C.caramel, fg: C.ink,
    render: () => (
      <>
        <div style={{ position: "absolute", left: X, top: 580, ...mono(40, C.ink) }}>REWATCH</div>
        <div style={{ position: "absolute", left: X - 14, top: 660, ...big(470, C.cream) }}>#47</div>
        <div style={{ position: "absolute", left: X, top: 1160, ...big(64, C.ink, { fontWeight: 600, letterSpacing: "-0.03em" }) }}>of the same 40-second cut.</div>
      </>
    ),
  },
  // 2,4–5,7 s · o cliente, uma palavra por tempo
  ...(["love it!!", "just feels", "slow"] as const).map((word, i): Scene => ({
    from: T.client.words[i], to: T.client.words[i + 1], bg: C.cream, fg: C.ink,
    render: () => (
      <>
        <div style={{ position: "absolute", left: X, top: 780, ...mono(34, C.muted) }}>CLIENT · 11:48 PM</div>
        <div style={{ position: "absolute", left: X - 6, top: 860, ...big(200, C.ink) }}>{word}</div>
      </>
    ),
  })),
  {
    from: T.client.words[3], to: T.client.quote, bg: C.caramel, fg: C.ink,
    render: () => (
      <>
        <div style={{ position: "absolute", left: X, top: 780, ...mono(34, C.ink) }}>CLIENT · 11:48 PM</div>
        <div style={{ position: "absolute", left: X - 6, top: 870, ...big(150, C.ink) }}>somewhere??</div>
      </>
    ),
  },
  {
    from: T.client.quote, to: T.client.out, bg: C.blue, fg: C.cream,
    render: (f) => (
      <>
        <div style={{ position: "absolute", left: X, top: 760, fontFamily: SERIF, fontWeight: 600, fontSize: 170, letterSpacing: "-0.03em", lineHeight: 1, color: C.cream, whiteSpace: "nowrap" }}>“Somewhere”</div>
        <Wipe f={f} at={T.client.timestamp} style={{ left: X, top: 990 }}>
          <div style={big(104, C.cream, { fontWeight: 700, letterSpacing: "-0.04em" })}>isn&apos;t a timestamp.</div>
        </Wipe>
      </>
    ),
  },
  // 5,7–7 s · a marca
  {
    from: T.logo.start, to: T.logo.out, bg: C.ink, fg: C.cream,
    render: (f) => {
      const ww = measure("Publishub", "600 130px Geist") - 0.035 * 130 * 9;
      const MH = 170;
      const MW = Math.round((MH * 500) / 524);
      const left = Math.round(540 - (MW + 52 + ww) / 2);
      return (
        <>
          <div style={{ position: "absolute", left, top: 840 }}>
            <BrandMark height={MH} build={clamp((f - T.logo.start) / 14)} id="cortes-logo" />
          </div>
          <Wipe f={f} at={T.logo.word} dur={8} style={{ left: left + MW + 52, top: 862 }}>
            <div style={{ fontFamily: FONT.sans, fontWeight: 600, fontSize: 130, letterSpacing: "-0.035em", lineHeight: 1, color: C.cream, whiteSpace: "nowrap" }}>Publishub</div>
          </Wipe>
          <Wipe f={f} at={T.logo.later} style={{ left: 0, top: 1130, width: W }}>
            <div style={{ textAlign: "center", fontFamily: SERIF, fontWeight: 500, fontSize: 60, color: C.caramel }}>~3 minutes later:</div>
          </Wipe>
        </>
      );
    },
  },
  // 7–19 s · o produto, em cinco cartazes
  {
    from: T.upload.start, to: T.upload.out, bg: C.cream, fg: C.ink,
    render: (f) => (
      <>
        <Step f={f} n={1} label="UPLOAD" color={C.blue} />
        <Wipe f={f} at={T.upload.start} style={{ left: X, top: 400 }}>
          <div style={big(150, C.ink)}>Drop the cut.</div>
        </Wipe>
        <Shot f={f} at={T.upload.shot} src="upload_file" crop={[0, 1110]} y={660} />
      </>
    ),
  },
  {
    from: T.second.start, to: T.second.out, bg: C.cream, fg: C.ink,
    render: (f) => (
      <>
        <Step f={f} n={2} label="THE SECOND" color={C.blue} />
        <div style={{ position: "absolute", left: X - 16, top: 390, ...big(400, C.blue), fontVariantNumeric: "tabular-nums" }}>0:04</div>
        <Wipe f={f} at={T.second.note} style={{ left: X, top: 800 }}>
          <div style={big(70, C.ink, { fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.1 })}>
            26% of viewers
            <br />
            left right here.
          </div>
        </Wipe>
        <Shot f={f} at={T.second.shot} src="insight" crop={[0, 640]} y={1060} />
      </>
    ),
  },
  {
    from: T.line.start, to: T.line.out, bg: C.ink, fg: C.cream,
    render: (f) => {
      const lines = ["“Hey guys,", "so today I want", "to tell you about", "something…”"];
      return (
        <>
          <Step f={f} n={3} label="THE LINE" color={C.caramel} />
          {lines.map((l, i) => {
            const w = measure(l, `600 104px Fraunces`);
            const y = 520 + i * 132;
            return (
              <div key={l}>
                <div style={{ position: "absolute", left: X, top: y, fontFamily: SERIF, fontWeight: 600, fontSize: 104, lineHeight: 1, letterSpacing: "-0.02em", color: C.cream, whiteSpace: "nowrap" }}>{l}</div>
                <Wipe f={f} at={T.line.strikes[i]} dur={5} style={{ left: X - 6, top: y + 52 }}>
                  <div style={{ width: Math.round(w + 12), height: 12, background: C.caramel }} />
                </Wipe>
              </div>
            );
          })}
          <Wipe f={f} at={T.line.cut} style={{ left: X, top: 1120 }}>
            <div style={big(76, C.caramel, { fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.1 })}>
              Cut it.
              <br />
              Open with the result.
            </div>
          </Wipe>
        </>
      );
    },
  },
  {
    from: T.cuts.start, to: T.cuts.out, bg: C.cream, fg: C.ink,
    render: (f) => {
      const rows: [string, string][] = [["0:00–0:04  slow intro", "−4.0s"], ["0:14–0:18  repeated line", "−3.5s"], ["0:28–0:30  long pause", "−1.8s"]];
      return (
        <>
          <Step f={f} n={4} label="THE CUTS" color={C.blue} />
          <Wipe f={f} at={T.cuts.start} style={{ left: X, top: 400 }}>
            <div style={big(120, C.ink, { lineHeight: 1 })}>
              You decide
              <br />
              what goes.
            </div>
          </Wipe>
          {rows.map(([label, secs], i) =>
            f >= T.cuts.rows[i] ? (
              <div key={label} style={{ position: "absolute", left: X, top: 700 + i * 84, width: W - 2 * X, display: "flex", alignItems: "center", gap: 28 }}>
                <div style={{ width: 52, height: 52, borderRadius: 10, background: C.blue, color: C.cream, display: "grid", placeItems: "center", fontFamily: FONT.sans, fontWeight: 800, fontSize: 34 }}>✓</div>
                <div style={{ ...mono(38, C.ink), letterSpacing: "0.02em", whiteSpace: "pre", flex: 1 }}>{label}</div>
                <div style={{ ...mono(38, C.red), letterSpacing: "0.02em" }}>{secs}</div>
              </div>
            ) : null,
          )}
          <Shot f={f} at={T.cuts.shot} src="cuts_head_acc" crop={[0, 640]} y={1000} />
        </>
      );
    },
  },
  {
    from: T.export.start, to: T.export.out, bg: C.blue, fg: C.cream,
    render: (f) => (
      <>
        <Step f={f} n={5} label="EXPORT" color={C.cream} />
        <div style={{ position: "absolute", left: X - 8, top: 420, ...big(210, C.cream), fontVariantNumeric: "tabular-nums" }}>0:41</div>
        <Wipe f={f} at={T.export.out1} style={{ left: X - 8, top: 630 }}>
          <div style={{ ...big(210, C.cream), fontVariantNumeric: "tabular-nums" }}>
            <span style={{ opacity: 0.55 }}>→</span> 0:32
          </div>
        </Wipe>
        <Wipe f={f} at={T.export.untouched} style={{ left: X, top: 880 }}>
          <div style={big(60, C.cream, { fontWeight: 600, letterSpacing: "-0.03em" })}>Your original stays untouched.</div>
        </Wipe>
        <Shot f={f} at={T.export.shot} src="edit_ready" crop={[70, 530]} y={1040} dark />
      </>
    ),
  },
  // 19–22 s · o fecho, uma palavra por tempo
  { from: T.payoff.words[0], to: T.payoff.words[1], bg: C.cream, fg: C.ink, render: () => <div style={{ position: "absolute", left: X - 8, top: 840, ...big(250, C.ink) }}>You&apos;re</div> },
  { from: T.payoff.words[1], to: T.payoff.words[2], bg: C.ink, fg: C.cream, render: () => <div style={{ position: "absolute", left: X - 8, top: 840, ...big(250, C.cream) }}>still</div> },
  {
    from: T.payoff.words[2], to: T.payoff.out, bg: C.blue, fg: C.cream,
    render: (f) => (
      <>
        <div style={{ position: "absolute", left: X - 8, top: 700, ...big(200, C.cream, { lineHeight: 1 }) }}>
          the
          <br />
          editor.
        </div>
        <Wipe f={f} at={T.payoff.line} dur={8} style={{ left: X, top: 1160 }}>
          <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 72, lineHeight: 1.15, color: C.cream }}>
            publishub just finds
            <br />
            the <span style={{ color: "#F2B98A" }}>dead moments.</span>
          </div>
        </Wipe>
      </>
    ),
  },
  // 22–26 s · o CTA
  {
    from: T.end.start, to: T.durationInFrames, bg: C.cream, fg: C.ink,
    render: (f) => (
      <>
        <div style={{ position: "absolute", left: 0, top: 680, width: W, display: "flex", justifyContent: "center" }}>
          <BrandLockup size={120} build={clamp((f - T.end.start) / 14)} word={reveal(f, T.end.start + 6, 8)} color={C.ink} id="cortes-end" />
        </div>
        <Wipe f={f} at={T.end.line} style={{ left: 0, top: 930, width: W }}>
          <div style={{ textAlign: "center", ...big(60, C.ink, { fontWeight: 700, letterSpacing: "-0.03em" }) }}>See where your edit loses viewers.</div>
        </Wipe>
        {f >= T.end.cta && (
          <div style={{ position: "absolute", left: 0, top: 1070, width: W, display: "flex", justifyContent: "center" }}>
            <div style={{ background: C.blue, color: C.cream, borderRadius: 999, padding: "32px 64px", fontFamily: FONT.sans, fontSize: 56, fontWeight: 700, letterSpacing: "-0.02em" }}>Analyze your video free</div>
          </div>
        )}
        {f >= T.end.url && <div style={{ position: "absolute", left: 0, top: 1250, width: W, textAlign: "center", fontFamily: FONT.mono, fontSize: 52, color: C.ink }}>getpublishub.com</div>}
        {f >= T.end.note && <div style={{ position: "absolute", left: 0, top: 1330, width: W, textAlign: "center", fontFamily: FONT.sans, fontSize: 36, color: C.muted }}>No account · No card · Results in ~3 min</div>}
      </>
    ),
  },
];

export function Cortes({ sound = true }: { sound?: boolean }) {
  const f = useCurrentFrame();
  const scene = SCENES.find((s) => f >= s.from && f < s.to) ?? SCENES[SCENES.length - 1];
  return (
    <AbsoluteFill style={{ background: scene.bg, overflow: "hidden" }}>
      {sound && <Audio src={staticFile("cortes/soundtrack.wav")} />}
      <Chrome f={f} color={scene.fg} />
      {scene.render(f)}
    </AbsoluteFill>
  );
}

export const CORTES_FPS = T.fps;
export const CORTES_FRAMES = T.durationInFrames;
