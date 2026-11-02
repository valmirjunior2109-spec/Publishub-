import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame } from "remotion";
import { BrandLockup } from "../demo/Brand";
import { FONT } from "../theme";
import { measure } from "../caderno/ink";
import T from "./timeline.json";

/* ==========================================================================
   Reel "Cortes" (9:16, 26 s), cara de ferramenta: fundo escuro com grade, cantos
   de visor, REC e timecode, linhas de comando e as telas reais em janelas.
   A regra continua: nada desliza nem dá zoom. O texto aparece letra a letra no
   lugar (máquina de escrever, alinhado à esquerda), as cenas trocam em corte seco
   no tempo da música (15 quadros) e cada corte tem 2 quadros de glitch.
   As telas são capturas reais da interface (public/editors).
   ========================================================================== */

const D = {
  bg: "#0B0C10",
  panel: "#12141B",
  grid: "rgba(143,170,240,0.06)",
  line: "rgba(143,170,240,0.25)",
  text: "#E9EDF5",
  muted: "#7E8796",
  blue: "#8FAAF0",
  caramel: "#D18E57",
  red: "#FF6B5B",
  green: "#5BE49B",
};
const W = 1080;
const X = 72;
const MONO = FONT.mono;
const SANS = FONT.sans;

const clamp = (v: number) => Math.min(1, Math.max(0, v));

/* ---------- peças ---------- */

/** Máquina de escrever: as letras aparecem no lugar, com o cursor piscando no fim. */
function Type({ f, at, text, cps = 2, style, cursor = true }: { f: number; at: number; text: string; cps?: number; style: CSSProperties; cursor?: boolean }) {
  if (f < at) return null;
  const n = Math.min(text.length, Math.floor((f - at) * cps) + 1);
  const typing = n < text.length;
  const blink = typing || Math.floor((f - at) / 8) % 2 === 0;
  return (
    <div style={{ position: "absolute", whiteSpace: "pre", ...style }}>
      {text.slice(0, n)}
      {cursor && <span style={{ opacity: blink ? 1 : 0, color: D.blue }}>▍</span>}
    </div>
  );
}

const sans = (size: number, color = D.text, weight = 800): CSSProperties => ({ fontFamily: SANS, fontWeight: weight, fontSize: size, letterSpacing: "-0.045em", lineHeight: 1, color });
const mono = (size: number, color = D.muted): CSSProperties => ({ fontFamily: MONO, fontSize: size, letterSpacing: "0.02em", lineHeight: 1.2, color });

/** A moldura de sempre: grade, cantos de visor, nome, timecode e REC. */
function Hud({ f }: { f: number }) {
  const s = Math.floor(f / 30);
  const fr = f % 30;
  const corner = (x: number, y: number, sx: number, sy: number) => (
    <div style={{ position: "absolute", left: x - (sx < 0 ? 40 : 0), top: y - (sy < 0 ? 40 : 0), width: 40, height: 40, borderLeft: sx > 0 ? `3px solid ${D.line}` : undefined, borderRight: sx < 0 ? `3px solid ${D.line}` : undefined, borderTop: sy > 0 ? `3px solid ${D.line}` : undefined, borderBottom: sy < 0 ? `3px solid ${D.line}` : undefined }} />
  );
  return (
    <>
      <AbsoluteFill style={{ background: `repeating-linear-gradient(0deg, ${D.grid} 0 2px, transparent 2px 54px), repeating-linear-gradient(90deg, ${D.grid} 0 2px, transparent 2px 54px)` }} />
      {corner(40, 100, 1, 1)}
      {corner(1040, 100, -1, 1)}
      {corner(40, 1780, 1, -1)}
      {corner(1040, 1780, -1, -1)}
      <div style={{ position: "absolute", left: X, top: 150, ...mono(24, D.blue), letterSpacing: "0.14em" }}>PUBLISHUB // EDITOR COPILOT</div>
      <div style={{ position: "absolute", right: X, top: 150, ...mono(24, D.text), fontVariantNumeric: "tabular-nums" }}>
        00:00:{String(s).padStart(2, "0")}:{String(fr).padStart(2, "0")}
      </div>
      <div style={{ position: "absolute", left: X, top: 1700, display: "flex", alignItems: "center", gap: 14, ...mono(22, D.muted), letterSpacing: "0.14em" }}>
        <span style={{ width: 14, height: 14, borderRadius: 99, background: D.red, opacity: Math.floor(f / 15) % 2 ? 0.35 : 1 }} />
        REC · 1080×1920 · 30 FPS
      </div>
    </>
  );
}

const IMG = { upload_file: [1170, 1140], insight: [1170, 1627], cuts_head_acc: [1170, 931], edit_ready: [1170, 690] } as const;

/** Uma tela real numa janela: barra de título, cantos azuis e a linha de varredura na entrada. */
function Window({ f, at, src, crop, title, y, x = 120, w = 840 }: { f: number; at: number; src: keyof typeof IMG; crop: [number, number]; title: string; y: number; x?: number; w?: number }) {
  if (f < at) return null;
  const [iw] = IMG[src];
  const h = Math.round(((crop[1] - crop[0]) * w) / iw);
  const p = clamp(Math.round(((f - at) / 8) * 16) / 16);
  const bar = 54;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h + bar, border: `2px solid ${D.line}`, borderRadius: 14, overflow: "hidden", background: D.panel }}>
      <div style={{ height: bar, display: "flex", alignItems: "center", gap: 10, padding: "0 18px", borderBottom: `2px solid ${D.line}` }}>
        {[D.red, D.caramel, D.green].map((c) => (
          <span key={c} style={{ width: 13, height: 13, borderRadius: 99, background: c, opacity: 0.8 }} />
        ))}
        <span style={{ marginLeft: 12, ...mono(22, D.muted) }}>{title}</span>
      </div>
      <div style={{ position: "relative", width: w, height: h, overflow: "hidden", clipPath: p >= 1 ? undefined : `inset(0 0 ${(1 - p) * 100}% 0)` }}>
        <Img src={staticFile(`editors/${src}.png`)} style={{ position: "absolute", left: 0, top: Math.round((-crop[0] * w) / iw), width: w }} />
      </div>
      {p < 1 && <div style={{ position: "absolute", left: 0, top: bar + Math.round(p * h), width: w, height: 3, background: D.blue, boxShadow: `0 0 18px ${D.blue}` }} />}
    </div>
  );
}

function Tag({ n, label }: { n: number; label: string }) {
  return <div style={{ position: "absolute", left: X, top: 290, ...mono(30, D.blue), letterSpacing: "0.1em" }}>{`[0${n}/05] ${label}`}</div>;
}

/** A curva de retenção do exemplo, desenhada da esquerda para a direita, com a queda marcada. */
function Curve({ f, at, x, y, w, h }: { f: number; at: number; x: number; y: number; w: number; h: number }) {
  const pts: [number, number][] = [[0, 100], [2, 92], [4, 74], [6, 66], [10, 61], [15, 57], [20, 54], [25, 51], [30, 48], [35, 46], [41, 44]];
  const px = (s: number) => (s / 41) * w;
  const py = (v: number) => (1 - (v - 30) / 75) * h;
  const d = pts.map(([s, v], i) => `${i ? "L" : "M"}${px(s).toFixed(1)} ${py(v).toFixed(1)}`).join(" ");
  const p = clamp(Math.round(((f - at) / 10) * 20) / 20);
  const dropOn = f >= at + 10;
  return (
    <svg width={w} height={h + 40} style={{ position: "absolute", left: x, top: y, overflow: "visible" }}>
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1={0} x2={w} y1={h * g} y2={h * g} stroke={D.grid.replace("0.06", "0.14")} strokeWidth={2} />
      ))}
      <line x1={0} x2={w} y1={h} y2={h} stroke={D.line} strokeWidth={2} />
      <clipPath id="curve-reveal">
        <rect x={-4} y={-20} width={(w + 8) * p} height={h + 40} />
      </clipPath>
      <path d={d} fill="none" stroke={D.blue} strokeWidth={5} strokeLinejoin="round" clipPath="url(#curve-reveal)" />
      {dropOn && (
        <>
          <line x1={px(4)} x2={px(4)} y1={0} y2={h} stroke={D.red} strokeWidth={2} strokeDasharray="8 8" />
          <circle cx={px(4)} cy={py(74)} r={11} fill={D.red} />
          <text x={px(4) + 22} y={py(74) - 18} fill={D.red} style={{ fontFamily: MONO, fontSize: 28 }}>DROP 0:04 · −26%</text>
        </>
      )}
      <text x={0} y={h + 36} fill={D.muted} style={{ fontFamily: MONO, fontSize: 22 }}>0:00</text>
      <text x={w - 58} y={h + 36} fill={D.muted} style={{ fontFamily: MONO, fontSize: 22 }}>0:41</text>
    </svg>
  );
}

/* ---------- as cenas ---------- */

type Scene = { from: number; to: number; render: (f: number) => ReactNode };

function countAt(f: number) {
  const [a, b] = T.hook.count;
  return 1 + Math.floor(46 * Math.pow(clamp((f - a) / (b - a)), 2));
}

const CLIENT_1 = "love it!! just feels";
const CLIENT_2 = "slow somewhere??";

const SCENES: Scene[] = [
  {
    from: 0, to: T.hook.out,
    render: (f) => {
      const hot = f >= T.hook.slam;
      const n = hot ? 47 : countAt(f);
      return (
        <>
          <Type f={f} at={0} cps={4} text="> rewatch_count client_cut_v7_FINAL.mp4" cursor={false} style={{ left: X, top: 700, ...mono(30) }} />
          <div style={{ position: "absolute", left: X - 10, top: 780, ...sans(400, hot ? D.caramel : D.text), fontVariantNumeric: "tabular-nums" }}>#{String(n).padStart(2, "0")}</div>
          <div style={{ position: "absolute", left: X, top: 1220, width: W - 2 * X, height: 12, background: D.line }}>
            <div style={{ width: `${(n / 47) * 100}%`, height: "100%", background: hot ? D.red : D.blue }} />
          </div>
          <Type f={f} at={T.hook.sub} cps={3} text={hot ? "// same 40-second cut. still \"slow\"?" : "// same 40-second cut"} style={{ left: X, top: 1270, ...mono(38, hot ? D.caramel : D.muted) }} />
        </>
      );
    },
  },
  {
    from: T.client.words[0], to: T.client.quote,
    render: (f) => {
      const at2 = T.client.words[0] + Math.ceil(CLIENT_1.length / 1.2) + 2;
      const flag = f >= T.client.words[3];
      const off = measure("slow ", `600 88px Geist`);
      const sw = measure("somewhere", `600 88px Geist`);
      return (
        <>
          <div style={{ position: "absolute", left: X, top: 700, ...mono(28, D.blue), letterSpacing: "0.1em" }}>[ INCOMING · CLIENT · 23:48 ]</div>
          <Type f={f} at={T.client.words[0]} cps={1.2} cursor={f < at2} text={CLIENT_1} style={{ left: X, top: 790, ...sans(88, D.text, 600), letterSpacing: "-0.03em" }} />
          <Type f={f} at={at2} cps={1.2} text={CLIENT_2} style={{ left: X, top: 900, ...sans(88, D.text, 600), letterSpacing: "-0.03em" }} />
          {flag && (
            <>
              <div style={{ position: "absolute", left: X + off - 10, top: 892, width: sw + 20, height: 104, border: `4px solid ${D.red}`, borderRadius: 10 }} />
              <div style={{ position: "absolute", left: X + off - 10, top: 1020, ...mono(32, D.red) }}>ERR_NO_TIMESTAMP</div>
            </>
          )}
        </>
      );
    },
  },
  {
    from: T.client.quote, to: T.client.out,
    render: (f) => (
      <>
        <div style={{ position: "absolute", left: X, top: 740, ...mono(30, D.red) }}>error: &quot;somewhere&quot; is not a timestamp</div>
        <div style={{ position: "absolute", left: X - 6, top: 830, ...sans(140, D.caramel) }}>“somewhere”</div>
        <Type f={f} at={T.client.timestamp} cps={2} text="isn't a timestamp." style={{ left: X, top: 1010, ...sans(100, D.text, 700) }} />
      </>
    ),
  },
  {
    from: T.logo.start, to: T.logo.out,
    render: (f) => {
      const run = clamp((f - T.logo.later) / (T.logo.out - 4 - T.logo.later));
      const blocks = Math.round(run * 20);
      return (
        <>
          <div style={{ position: "absolute", left: X, top: 800 }}>
            <BrandLockup size={120} build={clamp((f - T.logo.start) / 12)} word={clamp((f - T.logo.start - 4) / 8)} color={D.text} pen={D.blue} id="tech-logo" />
          </div>
          <Type f={f} at={T.logo.word} cps={3} text="> publishub analyze client_cut_v7_FINAL.mp4" cursor={f < T.logo.later} style={{ left: X, top: 1060, ...mono(30, D.text) }} />
          {f >= T.logo.later && (
            <div style={{ position: "absolute", left: X, top: 1120, ...mono(30, run >= 1 ? D.green : D.blue) }}>
              [{"■".repeat(blocks)}
              <span style={{ color: D.line }}>{"■".repeat(20 - blocks)}</span>] {Math.round(run * 100)}% · ~3 min
            </div>
          )}
        </>
      );
    },
  },
  {
    from: T.upload.start, to: T.upload.out,
    render: (f) => (
      <>
        <Tag n={1} label="UPLOAD" />
        <Type f={f} at={T.upload.start} cps={2} cursor={false} text="Drop the cut." style={{ left: X, top: 350, ...sans(130) }} />
        <Type f={f} at={T.upload.start + 6} cps={3} text="> upload client_cut_v7_FINAL.mp4  ✓ 5.7 MB" style={{ left: X, top: 520, ...mono(30, D.green) }} />
        <Window f={f} at={T.upload.shot} src="upload_file" crop={[0, 1110]} title="getpublishub.com/new-analysis" y={600} />
      </>
    ),
  },
  {
    from: T.second.start, to: T.second.out,
    render: (f) => (
      <>
        <Tag n={2} label="THE SECOND" />
        <div style={{ position: "absolute", left: X - 12, top: 350, ...sans(300, D.blue), fontVariantNumeric: "tabular-nums" }}>0:04</div>
        <Type f={f} at={T.second.start + 4} cps={3} text="drop_detected · −26% viewers" style={{ left: X, top: 680, ...mono(36, D.red) }} />
        <Curve f={f} at={T.second.note} x={X} y={760} w={W - 2 * X} h={230} />
        <Window f={f} at={T.second.shot} src="insight" crop={[0, 520]} title="getpublishub.com/results" y={1100} />
      </>
    ),
  },
  {
    from: T.line.start, to: T.line.out,
    render: (f) => {
      const rows: [string, string, string | null, number | null][] = [
        ["0:00", "Hey guys, so today I want to…", "DEAD_START", T.line.strikes[0]],
        ["0:04", "I quit coffee completely…", null, null],
        ["0:09", "I had headaches, I was tired…", null, null],
        ["0:14", "Like I said, the first week…", "REPEAT", T.line.strikes[1]],
        ["0:17", "But by week two my sleep…", null, null],
        ["0:28", "[ 1.8s silence ]", "PAUSE", T.line.strikes[2]],
      ];
      return (
        <>
          <Tag n={3} label="THE LINE" />
          <div style={{ position: "absolute", left: X, top: 360, ...mono(26, D.muted), letterSpacing: "0.1em" }}>TRANSCRIPT · TIMESTAMPED</div>
          {rows.map(([ts, text, flag, at], i) => {
            const y = 420 + i * 74;
            const hit = at !== null && f >= at;
            const w = measure(text, `400 30px "Geist Mono"`);
            return (
              <div key={ts}>
                <div style={{ position: "absolute", left: X, top: y, ...mono(30, D.muted) }}>{ts}</div>
                <div style={{ position: "absolute", left: X + 110, top: y, ...mono(30, hit ? D.muted : D.text) }}>{text}</div>
                {hit && <div style={{ position: "absolute", left: X + 104, top: y + 17, width: Math.round(w + 12), height: 4, background: D.red }} />}
                {hit && flag && <div style={{ position: "absolute", right: X, top: y + 2, ...mono(24, D.red), letterSpacing: "0.08em" }}>{flag}</div>}
              </div>
            );
          })}
          <Type f={f} at={T.line.cut} cps={3} text="→ cut it. open with the result." style={{ left: X, top: 920, ...sans(62, D.caramel, 700), letterSpacing: "-0.03em" }} />
        </>
      );
    },
  },
  {
    from: T.cuts.start, to: T.cuts.out,
    render: (f) => {
      const rows: [string, string][] = [["0:00–0:04  slow_intro", "−4.0s"], ["0:14–0:18  repeated_line", "−3.5s"], ["0:28–0:30  long_pause", "−1.8s"]];
      return (
        <>
          <Tag n={4} label="THE CUTS" />
          <Type f={f} at={T.cuts.start} cps={2} cursor={false} text="You decide" style={{ left: X, top: 350, ...sans(116) }} />
          <Type f={f} at={T.cuts.start + 6} cps={2} cursor={false} text="what goes." style={{ left: X, top: 470, ...sans(116) }} />
          {rows.map(([label, secs], i) =>
            f >= T.cuts.rows[i] ? (
              <div key={label} style={{ position: "absolute", left: X, top: 640 + i * 66, width: W - 2 * X, display: "flex", ...mono(32, D.text) }}>
                <span style={{ color: D.green, width: 90 }}>[✓]</span>
                <span style={{ flex: 1, whiteSpace: "pre" }}>{label}</span>
                <span style={{ color: D.red }}>{secs}</span>
              </div>
            ) : null,
          )}
          <Window f={f} at={T.cuts.shot} src="cuts_head_acc" crop={[0, 640]} title="getpublishub.com/results · cuts" y={880} />
        </>
      );
    },
  },
  {
    from: T.export.start, to: T.export.out,
    render: (f) => (
      <>
        <Tag n={5} label="EXPORT" />
        <div style={{ position: "absolute", left: X - 8, top: 360, ...sans(190, D.text), fontVariantNumeric: "tabular-nums" }}>0:41</div>
        {f >= T.export.out1 && (
          <div style={{ position: "absolute", left: X - 8, top: 560, ...sans(190, D.blue), fontVariantNumeric: "tabular-nums" }}>
            <span style={{ color: D.muted }}>→</span> 0:32
          </div>
        )}
        <Type f={f} at={T.export.untouched} cps={3} text="✓ original: untouched   −9.3s · 3 cuts" style={{ left: X, top: 790, ...mono(32, D.green) }} />
        <Window f={f} at={T.export.shot} src="edit_ready" crop={[70, 530]} title="client_cut_v7_FINAL.edited.mp4" y={880} />
      </>
    ),
  },
  {
    from: T.payoff.words[0], to: T.payoff.out,
    render: (f) => (
      <>
        <Type f={f} at={T.payoff.words[0]} cps={1} cursor={f < T.payoff.words[1]} text="you're still" style={{ left: X, top: 760, ...sans(150) }} />
        <Type f={f} at={T.payoff.words[1]} cps={1} cursor={f < T.payoff.line} text="the editor." style={{ left: X, top: 920, ...sans(150, D.blue) }} />
        <Type f={f} at={T.payoff.line} cps={3} text={"// publishub just finds\n// the dead moments."} style={{ left: X, top: 1130, ...mono(44, D.caramel) }} />
      </>
    ),
  },
  {
    from: T.end.start, to: T.durationInFrames,
    render: (f) => (
      <>
        <div style={{ position: "absolute", left: X, top: 700 }}>
          <BrandLockup size={130} build={clamp((f - T.end.start) / 12)} word={clamp((f - T.end.start - 4) / 8)} color={D.text} pen={D.blue} id="tech-end" />
        </div>
        <Type f={f} at={T.end.line} cps={3} cursor={f < T.end.cta} text="> see where your edit loses viewers" style={{ left: X, top: 940, ...mono(36, D.muted) }} />
        {f >= T.end.cta && (
          <div style={{ position: "absolute", left: X, top: 1030, background: D.blue, color: D.bg, borderRadius: 14, padding: "30px 52px", ...sans(54, D.bg, 700), letterSpacing: "-0.02em" }}>Analyze your video free →</div>
        )}
        {f >= T.end.url && <div style={{ position: "absolute", left: X, top: 1210, ...mono(52, D.text) }}>getpublishub.com</div>}
        {f >= T.end.note && <div style={{ position: "absolute", left: X, top: 1290, ...mono(30, D.muted) }}>no account · no card · results in ~3 min</div>}
      </>
    ),
  },
];

/* ---------- o glitch dos cortes: 2 quadros de fatias deslocadas ---------- */

function Glitch({ f, scene }: { f: number; scene: Scene }) {
  const k = f - scene.from;
  if (scene.from === 0 || k > 1) return null;
  const bands: [number, number, number, string][] = k === 0 ? [[22, 31, 34, D.blue], [58, 64, -28, D.red], [80, 84, 18, D.blue]] : [[40, 47, -20, D.red], [70, 76, 26, D.blue]];
  return (
    <>
      {bands.map(([a, b, dx, tint], i) => (
        <AbsoluteFill key={i} style={{ clipPath: `inset(${a}% 0 ${100 - b}% 0)`, transform: `translateX(${dx}px)`, background: D.bg }}>
          <Hud f={f} />
          {scene.render(f)}
          <AbsoluteFill style={{ background: tint, mixBlendMode: "screen", opacity: 0.12 }} />
        </AbsoluteFill>
      ))}
    </>
  );
}

export function Cortes({ sound = true }: { sound?: boolean }) {
  const f = useCurrentFrame();
  const scene = SCENES.find((s) => f >= s.from && f < s.to) ?? SCENES[SCENES.length - 1];
  return (
    <AbsoluteFill style={{ background: D.bg, overflow: "hidden", color: D.text }}>
      {sound && <Audio src={staticFile("cortes/soundtrack.wav")} />}
      <Hud f={f} />
      {scene.render(f)}
      <Glitch f={f} scene={scene} />
    </AbsoluteFill>
  );
}

export const CORTES_FPS = T.fps;
export const CORTES_FRAMES = T.durationInFrames;
