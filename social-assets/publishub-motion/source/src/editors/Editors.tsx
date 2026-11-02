import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame } from "remotion";
import { easeIn, easeInOut, easeOut, progress } from "../anim";
import { BrandLockup } from "../demo/Brand";
import { FONT } from "../theme";
import T from "./timeline.json";

/* ==========================================================================
   Reel para editores (9:16, 27 s): "Rewatch #47".
   O gancho é a dor de quem edita: rever o mesmo corte dezenas de vezes e
   receber do cliente um "tá lento em algum lugar". A virada é a Publishub, e o
   meio do vídeo é o produto de verdade: cada tela é captura da interface real
   (frontend em 390 px, DSF 3, tema escuro), com a análise de exemplo da landing.
   Os quadros de tudo estão em timeline.json (a trilha lê o mesmo arquivo).
   ========================================================================== */

// o tema escuro do site (frontend/src/app/globals.css)
const K = {
  bg: "#0E0C09",
  paper: "#17140f",
  raised: "#201c17",
  surface: "#26211b",
  ink: "#f4ecdf",
  muted: "#b3a797",
  line: "#3a322a",
  accent: "#8faaf0",
  caramel: "#d18e57",
  red: "#F08A7A",
};

// as capturas em public/editors (px da imagem: 390 css × 3)
const IMG = {
  upload_empty: [1170, 1140],
  upload_file: [1170, 1140],
  processing: [1170, 1610],
  curve: [1170, 1602],
  insight: [1170, 1627],
  cuts_head: [1170, 931],
  cuts_head_acc: [1170, 931],
  cuts_cards: [1170, 2467],
  cuts_cards_acc: [1170, 2411],
  apply_bar: [1170, 368],
  edit_ready: [1170, 690],
} as const;
type ImgName = keyof typeof IMG;

const W = 1080;
const H = 1920;

export function Editors({ sound = true }: { sound?: boolean }) {
  const f = useCurrentFrame();
  const flash = flashAt(f);
  const sh = shakeAll(f);
  return (
    <AbsoluteFill style={{ background: K.bg, fontFamily: FONT.sans, color: K.ink, overflow: "hidden" }}>
      {sound && <Audio src={staticFile("editors/soundtrack.wav")} />}
      <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px)` }}>
        {f < T.hook.out + 2 && <Hook f={f} />}
        {f >= T.pain.start && f < T.pain.out && <Pain f={f} />}
        {f >= T.turn.start && f < T.turn.out && <Turn f={f} />}
        {f >= T.upload.start && f < T.payoff.start && <Product f={f} />}
        {f >= T.payoff.start && f < T.end.start + 4 && <Payoff f={f} />}
        {f >= T.end.start && <End f={f} />}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: flash.color, opacity: flash.o, pointerEvents: "none" }} />
      <Grain f={f} />
      <AbsoluteFill style={{ background: "radial-gradient(120% 80% at 50% 45%, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />
    </AbsoluteFill>
  );
}

/* ---------- efeitos globais ---------- */

/** Quadros de impacto: um clarão curto na cor da batida. */
function flashAt(f: number) {
  const hits: [number, string, number][] = [
    [T.hook.slam, K.red, 0.42],
    [T.pain.somewhere, K.caramel, 0.3],
    [T.upload.start, K.accent, 0.5],
    [T.payoff.start, "#ffffff", 0.18],
  ];
  for (const [at, color, max] of hits) {
    if (f >= at && f < at + 6) return { color, o: max * (1 - (f - at) / 6) };
  }
  return { color: "transparent", o: 0 };
}

/** Tremor da câmera nas batidas fortes, amortecido. */
function shakeAll(f: number) {
  let x = 0;
  let y = 0;
  for (const [at, amp] of [
    [T.hook.slam, 22],
    [T.pain.somewhere, 18],
    [T.pain.timestamp, 10],
    [T.upload.start, 8],
  ] as const) {
    const t = f - at;
    if (t >= 0 && t < 12) {
      const d = Math.exp(-t / 3.2);
      x += Math.sin(t * 7.3) * amp * d;
      y += Math.cos(t * 5.1) * amp * 0.6 * d;
    }
  }
  return { x, y };
}

function Grain({ f }: { f: number }) {
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: 0.075, mixBlendMode: "overlay", pointerEvents: "none" }}>
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={Math.floor(f / 2)} stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  );
}

/* ---------- tipografia ---------- */

/** Palavra por palavra: sobe, desfoca e assenta. `*palavra*` sai no azul; `_palavra_`, no caramelo. */
function Words({ text, f, at, size, weight = 800, color = K.ink, stagger = 2, style, lineHeight = 1.02 }: { text: string; f: number; at: number; size: number; weight?: number; color?: string; stagger?: number; style?: CSSProperties; lineHeight?: number }) {
  const words = text.split(" ");
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: size * 0.26, rowGap: size * 0.06, fontSize: size, fontWeight: weight, letterSpacing: "-0.045em", lineHeight, textAlign: "center", ...style }}>
      {words.map((raw, i) => {
        const p = progress(f, at + i * stagger, 9);
        const accent = raw.startsWith("*");
        const warm = raw.startsWith("_");
        const word = raw.replace(/[*_]/g, "");
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              color: accent ? K.accent : warm ? K.caramel : color,
              opacity: p,
              transform: `translateY(${(1 - p) * size * 0.4}px) scale(${1 + (1 - p) * 0.14})`,
              filter: `blur(${(1 - p) * 8}px)`,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}

function Eyebrow({ f, at, children }: { f: number; at: number; children: ReactNode }) {
  const p = progress(f, at, 8);
  return (
    <div style={{ fontFamily: FONT.mono, fontSize: 30, letterSpacing: "0.2em", color: K.caramel, textAlign: "center", opacity: p, transform: `translateY(${(1 - p) * 14}px)` }}>
      {children}
    </div>
  );
}

/* ---------- 0–2 s · o gancho ---------- */

function countAt(f: number) {
  const t = Math.min(1, Math.max(0, (f - T.hook.countFrom) / (T.hook.slam - T.hook.countFrom)));
  return 1 + Math.round((T.hook.count - 1) * Math.pow(t, T.hook.countPow));
}

function Hook({ f }: { f: number }) {
  const n = countAt(f);
  const slam = progress(f, T.hook.slam, 9);
  const punch = f >= T.hook.slam ? 1 + 0.32 * (1 - slam) : 1 + 0.03 * Math.sin(f * 1.7);
  const out = progress(f, T.hook.out - 4, 6, easeIn);
  // o playhead vai e volta para o zero: rever, rever, rever (cada vez mais rápido)
  const head = (f * 0.75 + Math.max(0, f - 18) * 0.6) % 7.5;
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <div style={{ position: "absolute", top: 300, width: W, textAlign: "center" }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 44, letterSpacing: "0.34em", color: K.caramel, marginLeft: "0.34em" }}>REWATCH</div>
        <div
          style={{
            fontSize: 330,
            fontWeight: 800,
            letterSpacing: "-0.06em",
            lineHeight: 1,
            marginTop: 10,
            color: f >= T.hook.slam ? K.ink : "rgba(244,236,223,0.92)",
            transform: `scale(${punch})`,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          #{String(n).padStart(2, "0")}
        </div>
        <div style={{ marginTop: 26 }}>
          <Words text="of the same 40-second cut." f={f} at={T.hook.sub} size={56} weight={500} color={K.muted} stagger={1} />
        </div>
      </div>
      <Nle f={f} y={1010} head={head} />
    </AbsoluteFill>
  );
}

/** A timeline de um editor qualquer (não é a Publishub): o problema, não a solução. */
const CLIPS: [number, number][] = [[0, 4], [4, 9], [9, 14], [14, 17.5], [17.5, 23], [23, 28], [28, 29.8], [29.8, 35], [35, 41]];
const CLIP_COLORS = ["#3d4c6e", "#5b4834", "#4a5a3f", "#6a4140", "#3f5c5c", "#584a6a"];
const TITLES: [number, number][] = [[0.6, 5], [17.5, 22], [30.5, 35.5]];
const DUR = 41;

function Nle({ f, y, head, dim = 0 }: { f: number; y: number; head: number; dim?: number }) {
  const X = 40;
  const WIDTH = 1000;
  const tx = (s: number) => 34 + (s / DUR) * (WIDTH - 68);
  const ss = Math.floor(head);
  const ff = Math.floor((head - ss) * 30);
  return (
    <div style={{ position: "absolute", left: X, top: y, width: WIDTH, height: 440, borderRadius: 28, background: "#14110D", border: `2px solid #2a241d`, opacity: 1 - dim * 0.75, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 30, top: 22, fontFamily: FONT.mono, fontSize: 34, color: K.caramel, letterSpacing: "0.02em" }}>
        00:00:{String(ss).padStart(2, "0")}:{String(ff).padStart(2, "0")}
      </div>
      <div style={{ position: "absolute", right: 30, top: 28, fontFamily: FONT.mono, fontSize: 24, color: K.muted }}>client_cut_v7_FINAL</div>
      {/* régua */}
      {Array.from({ length: 9 }, (_, i) => i * 5).map((s) => (
        <div key={s} style={{ position: "absolute", left: tx(s), top: 82, height: 16, borderLeft: "2px solid #4a4036" }}>
          <span style={{ position: "absolute", left: 6, top: -4, fontFamily: FONT.mono, fontSize: 18, color: "#7d7163" }}>0:{String(s).padStart(2, "0")}</span>
        </div>
      ))}
      {/* V2: títulos */}
      {TITLES.map(([a, b], i) => (
        <div key={i} style={{ position: "absolute", left: tx(a), top: 112, width: tx(b) - tx(a) - 4, height: 56, borderRadius: 10, background: "#6d5236", border: "2px solid #8a6a47", fontFamily: FONT.mono, fontSize: 18, color: "#f0d9bd", padding: "15px 12px", overflow: "hidden", whiteSpace: "nowrap" }}>
          TITLE
        </div>
      ))}
      {/* V1: clipes com miniaturas */}
      {CLIPS.map(([a, b], i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: tx(a),
            top: 180,
            width: tx(b) - tx(a) - 4,
            height: 104,
            borderRadius: 10,
            background: `repeating-linear-gradient(90deg, ${CLIP_COLORS[i % CLIP_COLORS.length]} 0 52px, rgba(0,0,0,0.25) 52px 54px)`,
            border: "2px solid rgba(255,255,255,0.12)",
          }}
        />
      ))}
      {/* A1: forma de onda, com os trechos mortos (o começo arrastado e a pausa) */}
      {Array.from({ length: 164 }, (_, i) => {
        const s = (i / 164) * DUR;
        const quiet = s >= 28 && s < 29.8;
        const amp = quiet ? 0.05 : 0.22 + 0.7 * Math.abs(Math.sin(s * 2.3) * Math.sin(s * 0.71 + 1.3)) + 0.08 * Math.sin(i * 12.9898);
        return <div key={i} style={{ position: "absolute", left: tx(s), top: 350 - amp * 50, width: 3, height: Math.max(3, amp * 100), borderRadius: 2, background: "#6f9a74" }} />;
      })}
      {/* playhead */}
      <div style={{ position: "absolute", left: tx(head) - 1, top: 78, width: 3, height: 362, background: "#F6EEE0", boxShadow: "0 0 18px rgba(246,238,224,0.6)" }} />
      <div style={{ position: "absolute", left: tx(head) - 14, top: 70, width: 0, height: 0, borderLeft: "15px solid transparent", borderRight: "15px solid transparent", borderTop: `20px solid ${K.caramel}` }} />
    </div>
  );
}

/* ---------- 2–5,7 s · a dor ---------- */

const KEY_SEQ = ["J", "J", "K", "L", "L", "K", "J"];

function Pain({ f }: { f: number }) {
  const scrub = f < T.pain.client;
  const chat = f >= T.pain.client && f < T.pain.somewhere;
  const stamp = f >= T.pain.somewhere;
  // J/K/L: o editor caçando o ponto em que arrasta
  const keyIdx = T.pain.keys.findIndex((k, i) => f >= k && f < (T.pain.keys[i + 1] ?? k + 4));
  const pressed = keyIdx >= 0 ? KEY_SEQ[keyIdx] : null;
  const head = 9 + 2.6 * Math.sin((f - T.pain.start) * 0.55) + (pressed === "L" ? 0.6 : pressed === "J" ? -0.6 : 0);
  const chatDim = progress(f, T.pain.client, 6);
  return (
    <AbsoluteFill>
      {!stamp && (
        <>
          <div style={{ position: "absolute", top: 300, width: W, opacity: 1 - chatDim }}>
            <Words text="Where does it *drag?*" f={f} at={T.pain.start} size={110} />
          </div>
          <div style={{ position: "absolute", top: 640, width: W, display: "flex", justifyContent: "center", gap: 34, opacity: 1 - chatDim * 0.85, transform: `scale(${1 - chatDim * 0.08})` }}>
            {["J", "K", "L"].map((k) => {
              const on = scrub && pressed === k;
              return (
                <div key={k} style={{ width: 168, height: 168, borderRadius: 30, background: on ? K.accent : K.surface, color: on ? "#14110D" : K.ink, borderBottom: `12px solid ${on ? "#5f79c0" : "#100d0a"}`, transform: `translateY(${on ? 10 : 0}px)`, display: "grid", placeItems: "center", fontSize: 84, fontWeight: 700, fontFamily: FONT.mono }}>
                  {k}
                </div>
              );
            })}
          </div>
          <Nle f={f} y={1010} head={head} dim={chatDim} />
        </>
      )}
      {chat && (
        <div style={{ position: "absolute", top: 360, left: 70, width: 940 }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 30, color: K.muted, textAlign: "center", marginBottom: 40, opacity: progress(f, T.pain.client, 6) }}>11:48 PM</div>
          <Bubble f={f} at={T.pain.client} name="Client" text="Love it!! It just feels slow somewhere." />
          <Bubble f={f} at={T.pain.client2} text="Can you tighten it before tonight?" />
        </div>
      )}
      {stamp && (
        <div style={{ position: "absolute", top: 640, width: W, textAlign: "center" }}>
          <div style={{ fontSize: 150, fontWeight: 800, letterSpacing: "-0.06em", color: K.caramel, transform: `scale(${1 + 0.5 * (1 - progress(f, T.pain.somewhere, 6))})`, opacity: progress(f, T.pain.somewhere, 3) }}>
            “Somewhere.”
          </div>
          <div style={{ marginTop: 40 }}>
            <Words text="isn't a timestamp." f={f} at={T.pain.timestamp} size={96} stagger={1} />
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
}

function Bubble({ f, at, name, text }: { f: number; at: number; name?: string; text: string }) {
  const p = progress(f, at, 10, easeOut);
  const over = Math.sin(Math.min(1, (f - at) / 10) * Math.PI) * 0.06;
  if (f < at) return null;
  return (
    <div style={{ marginBottom: 26, transformOrigin: "0% 100%", transform: `scale(${0.7 + 0.3 * p + over})`, opacity: p }}>
      {name && <div style={{ fontSize: 30, color: K.muted, margin: "0 0 12px 30px", fontWeight: 600 }}>{name}</div>}
      <div style={{ display: "inline-block", maxWidth: 820, background: "#2c2721", borderRadius: 46, borderBottomLeftRadius: 12, padding: "30px 42px", fontSize: 54, lineHeight: 1.2, fontWeight: 500, letterSpacing: "-0.02em" }}>
        {text}
      </div>
    </div>
  );
}

/* ---------- 5,7–6,7 s · a virada ---------- */

function Turn({ f }: { f: number }) {
  const zoom = progress(f, T.turn.out - 6, 6, easeIn);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(70% 45% at 50% 47%, #1d2236 0%, ${K.bg} 100%)`, opacity: 1 - zoom, transform: `scale(${1 + zoom * 0.5})` }}>
      <div style={{ position: "absolute", top: 700, width: W }}>
        <Eyebrow f={f} at={T.turn.start}>BEFORE REWATCH #48</Eyebrow>
      </div>
      <div style={{ position: "absolute", top: 800, width: W, display: "flex", justifyContent: "center" }}>
        <BrandLockup size={128} build={progress(f, T.turn.logo, 16)} word={progress(f, T.turn.logo + 6, 12)} color={K.ink} id="turn" />
      </div>
    </AbsoluteFill>
  );
}

/* ---------- 6,7–21,5 s · o produto (capturas reais) ---------- */

/** Uma captura da interface: `y0…y1` em px da imagem; `children(s)` desenha por cima, em px da imagem × s. */
function Shot({ src, src2, mix2 = 0, y0 = 0, y1, x = 70, y, width = 940, style, children }: { src: ImgName; src2?: ImgName; mix2?: number; y0?: number; y1?: number; x?: number; y: number; width?: number; style?: CSSProperties; children?: (s: number) => ReactNode }) {
  const [iw, ih] = IMG[src];
  const s = width / iw;
  const bottom = y1 ?? ih;
  const layer = (name: ImgName, opacity: number) => <Img src={staticFile(`editors/${name}.png`)} style={{ position: "absolute", left: 0, top: 0, width, height: IMG[name][1] * s, opacity }} />;
  return (
    <div style={{ position: "absolute", left: x, top: y, width, height: (bottom - y0) * s, borderRadius: 30, overflow: "hidden", border: `2px solid ${K.line}`, background: K.paper, boxShadow: "0 50px 120px rgba(0,0,0,0.6)", ...style }}>
      <div style={{ position: "absolute", left: 0, top: -y0 * s, width, height: ih * s }}>
        {layer(src, 1)}
        {src2 && mix2 > 0 && layer(src2, mix2)}
        {children?.(s)}
      </div>
    </div>
  );
}

/** O dedo: aparece, toca e some. `x`, `y` já em px da tela do Shot. */
function Tap({ f, at, x, y }: { f: number; at: number; x: number; y: number }) {
  if (f < at - 10 || f > at + 18) return null;
  const inn = progress(f, at - 10, 8);
  const press = f < at ? 0 : 1 - progress(f, at, 6);
  const ring = progress(f, at, 14);
  const gone = progress(f, at + 8, 10);
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: inn * (1 - gone) }}>
      <div style={{ position: "absolute", left: -44, top: -44, width: 88, height: 88, borderRadius: 99, border: `5px solid rgba(255,255,255,${0.9 * (1 - ring)})`, transform: `scale(${f >= at ? 1 + ring * 1.6 : 0.6})` }} />
      <div style={{ position: "absolute", left: -32, top: -32, width: 64, height: 64, borderRadius: 99, background: "rgba(255,255,255,0.85)", boxShadow: "0 6px 24px rgba(0,0,0,0.5)", transform: `scale(${1 - press * 0.25 + (1 - inn) * 0.6})` }} />
    </div>
  );
}

/** Entrada e saída de cada passo: sobe e assenta; sai encolhendo. */
function beat(f: number, start: number, out: number, delay = 0) {
  const inn = progress(f, start + delay, 10);
  const leave = progress(f, out - 6, 6, easeIn);
  return { opacity: inn * (1 - leave), transform: `translateY(${(1 - inn) * 110 - leave * 40}px) scale(${1 - leave * 0.05})` } satisfies CSSProperties;
}

function Header({ f, start, out, eyebrow, line, at, line2, at2 }: { f: number; start: number; out: number; eyebrow: string; line: string; at?: number; line2?: string; at2?: number }) {
  const leave = progress(f, out - 6, 6, easeIn);
  const swap = line2 && at2 !== undefined ? progress(f, at2 - 5, 5, easeIn) : 0;
  const showSecond = line2 && at2 !== undefined && f >= at2;
  return (
    <div style={{ position: "absolute", top: 210, width: W, opacity: 1 - leave }}>
      <Eyebrow f={f} at={start}>{eyebrow}</Eyebrow>
      <div style={{ marginTop: 22, padding: "0 60px", opacity: showSecond ? 1 : 1 - swap }}>
        {showSecond ? <Words text={line2!} f={f} at={at2!} size={92} /> : <Words text={line} f={f} at={at ?? start + 2} size={92} />}
      </div>
    </div>
  );
}

function ExampleTag({ f, start }: { f: number; start: number }) {
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 1650, textAlign: "center", fontFamily: FONT.mono, fontSize: 24, letterSpacing: "0.14em", color: "#7d7163", opacity: progress(f, start + 6, 10) }}>
      REAL PRODUCT · EXAMPLE ANALYSIS
    </div>
  );
}

function Product({ f }: { f: number }) {
  const glow = 0.5 + 0.5 * Math.sin(f / 14);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(80% 50% at 50% 55%, rgba(143,170,240,${0.1 + glow * 0.04}) 0%, transparent 70%)` }}>
      {f < T.upload.out && <Upload f={f} />}
      {f >= T.processing.start && f < T.processing.out && <Processing f={f} />}
      {f >= T.drop.start && f < T.drop.out && <Drop f={f} />}
      {f >= T.cuts.start && f < T.cuts.out && <Cuts f={f} />}
      {f >= T.apply.start && <Apply f={f} />}
      <ExampleTag f={f} start={T.upload.start} />
    </AbsoluteFill>
  );
}

function Upload({ f }: { f: number }) {
  const U = T.upload;
  const mixFile = progress(f, U.file, 4);
  const bump = 1 + 0.025 * Math.sin(Math.min(1, Math.max(0, (f - U.file) / 8)) * Math.PI);
  return (
    <>
      <Header f={f} start={U.start} out={U.out} eyebrow="01 · UPLOAD" line="Drop the cut." />
      <div style={{ ...beat(f, U.start, U.out, 2) }}>
        <Shot src="upload_empty" src2="upload_file" mix2={mixFile} y={540} y1={1110} style={{ transform: `scale(${bump})` }}>
          {(s) => <Tap f={f} at={U.tap} x={585 * s} y={950 * s} />}
        </Shot>
      </div>
    </>
  );
}

function Processing({ f }: { f: number }) {
  const P = T.processing;
  const bands: [number, number][] = [[590, 712], [722, 858], [868, 1060], [1070, 1268], [1276, 1408]];
  const pan = progress(f, P.start + 6, 50, easeInOut);
  return (
    <>
      <Header f={f} start={P.start} out={P.out} eyebrow="02 · ANALYSIS" line="It watches *every* second." />
      <div style={{ ...beat(f, P.start, P.out, 2) }}>
        <Shot src="processing" y={540} y1={1420} x={110} width={860} style={{ transform: `translateY(${-pan * 30}px)` }}>
          {(s) =>
            bands.map(([a, b], i) => (
              // as etapas acendem uma a uma (a captura já tem as quatro concluídas)
              <div key={i} style={{ position: "absolute", left: 80 * s, top: a * s, width: 1010 * s, height: (b - a) * s, background: "#201c17", opacity: 0.82 * (1 - progress(f, P.rows[i], 5)) }} />
            ))
          }
        </Shot>
      </div>
    </>
  );
}

function Drop({ f }: { f: number }) {
  const D = T.drop;
  const ring = ((f - D.dot) % 22) / 22;
  const dotOn = progress(f, D.dot, 6);
  const mark = progress(f, D.quote, 12, easeInOut);
  const push = progress(f, D.line2 + 4, 40, easeInOut);
  return (
    <>
      <Header f={f} start={D.start} out={D.out} eyebrow="03 · THE DROP" line="The exact *second* they leave." line2="And the *line* you were saying." at2={D.line2} />
      <div style={{ ...beat(f, D.start, D.out, 2) }}>
        <Shot src="curve" y0={1160} y={530} y1={1602}>
          {(s) => (
            <>
              {f >= D.dot && (
                <div style={{ position: "absolute", left: 152 * s - 40, top: 1349 * s - 40, width: 80, height: 80, borderRadius: 99, border: `4px solid ${K.red}`, opacity: (1 - ring) * dotOn, transform: `scale(${0.4 + ring * 1.4})` }} />
              )}
              <div style={{ position: "absolute", left: 152 * s + 36, top: 1349 * s - 96, padding: "10px 20px", borderRadius: 14, background: K.red, color: "#1a0f0c", fontSize: 38, fontWeight: 800, letterSpacing: "-0.02em", opacity: dotOn, transform: `scale(${0.6 + 0.4 * dotOn})`, transformOrigin: "0% 100%" }}>
                0:04 · they leave
              </div>
            </>
          )}
        </Shot>
      </div>
      <div style={{ ...beat(f, D.insight, D.out) }}>
        <Shot src="insight" y={920} y1={640} style={{ transform: `scale(${1 + push * 0.1})`, transformOrigin: "50% 45%" }}>
          {(s) => (
            // o marca-texto na frase dita no segundo da queda
            <div style={{ position: "absolute", left: 128 * s, top: 362 * s, width: 930 * s * mark, height: 136 * s, background: "rgba(143,170,240,0.22)", borderRadius: 8, mixBlendMode: "screen" }} />
          )}
        </Shot>
      </div>
    </>
  );
}

function Cuts({ f }: { f: number }) {
  const C = T.cuts;
  const acc = progress(f, C.accepted, 4);
  const pop = 1 + 0.02 * Math.sin(Math.min(1, Math.max(0, (f - C.accepted) / 8)) * Math.PI);
  const zoom = progress(f, C.accepted + 6, 40, easeInOut);
  return (
    <>
      <Header f={f} start={C.start} out={C.out} eyebrow="04 · THE CUTS" line="Dead moments, *found.*" line2="You decide what *goes.*" at2={C.line2} />
      <div style={{ ...beat(f, C.start, C.out, 2) }}>
        <Shot src="cuts_head" src2="cuts_head_acc" mix2={acc} y={520} y1={640} x={110} width={860} style={{ transform: `scale(${pop})` }} />
      </div>
      <div style={{ ...beat(f, C.start, C.out, 7) }}>
        <Shot src="cuts_cards" src2="cuts_cards_acc" mix2={acc} y={1010} y1={760} x={110} width={860} style={{ transform: `scale(${1 + zoom * 0.06})`, transformOrigin: "50% 30%" }}>
          {(s) => <Tap f={f} at={C.tap} x={230 * s} y={191 * s} />}
        </Shot>
      </div>
    </>
  );
}

function Apply({ f }: { f: number }) {
  const A = T.apply;
  const barOut = progress(f, A.ready - 4, 6, easeIn);
  const press = f >= A.tap && f < A.tap + 6 ? 0.97 : 1;
  const ready = progress(f, A.ready, 10);
  const stat = progress(f, A.stat, 10);
  const leave = progress(f, A.out - 6, 6, easeIn);
  return (
    <>
      <Header f={f} start={A.start} out={A.out} eyebrow="05 · EXPORT" line="Apply. *Edited* video ready." />
      {f < A.ready + 2 && (
        <div style={{ ...beat(f, A.start, A.out, 2), opacity: progress(f, A.start + 2, 10) * (1 - barOut) }}>
          <Shot src="apply_bar" y={680} style={{ transform: `scale(${press})` }}>
            {(s) => <Tap f={f} at={A.tap} x={585 * s} y={229 * s} />}
          </Shot>
        </div>
      )}
      {f >= A.ready && (
        <div style={{ opacity: ready * (1 - leave), transform: `translateY(${(1 - ready) * 90}px)` }}>
          <Shot src="edit_ready" y0={70} y1={530} y={600} />
          <div style={{ position: "absolute", top: 1080, width: W, textAlign: "center", opacity: stat, transform: `scale(${1 + (1 - stat) * 0.2})` }}>
            <div style={{ fontSize: 150, fontWeight: 800, letterSpacing: "-0.055em", lineHeight: 1 }}>
              0:41 <span style={{ color: K.muted, fontWeight: 500 }}>→</span> <span style={{ color: K.accent }}>0:32</span>
            </div>
            <div style={{ marginTop: 26, fontSize: 46, color: K.muted, fontWeight: 500 }}>Your original stays untouched.</div>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------- 21,5–23,9 s · o fecho ---------- */

function Payoff({ f }: { f: number }) {
  const P = T.payoff;
  const leave = progress(f, P.out - 4, 6, easeIn);
  return (
    <AbsoluteFill style={{ background: K.bg, opacity: 1 - leave }}>
      <div style={{ position: "absolute", top: 640, width: W, padding: "0 60px", boxSizing: "border-box" }}>
        <Words text="You're still the _editor._" f={f} at={P.start} size={124} stagger={3} />
        <div style={{ marginTop: 60 }}>
          <Words text="It just finds the *dead moments.*" f={f} at={P.line2} size={70} weight={600} color={K.muted} stagger={2} />
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ---------- 23,9–27 s · o CTA ---------- */

function End({ f }: { f: number }) {
  const E = T.end;
  const cta = progress(f, E.cta, 10);
  const pulse = f > E.cta + 12 ? 1 + 0.02 * Math.sin((f - E.cta) / 4) : 1;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(70% 40% at 50% 42%, #1c2134 0%, ${K.bg} 100%)` }}>
      <div style={{ position: "absolute", top: 560, width: W, display: "flex", justifyContent: "center" }}>
        <BrandLockup size={120} build={progress(f, E.logo, 18)} word={progress(f, E.logo + 8, 12)} color={K.ink} id="end" />
      </div>
      <div style={{ position: "absolute", top: 790, width: W, padding: "0 70px", boxSizing: "border-box" }}>
        <Words text="See where your edit loses viewers." f={f} at={E.line} size={66} weight={700} stagger={1} />
      </div>
      <div style={{ position: "absolute", top: 1010, width: W, display: "flex", justifyContent: "center", opacity: cta, transform: `translateY(${(1 - cta) * 40}px) scale(${pulse})` }}>
        <div style={{ background: K.accent, color: "#14110D", borderRadius: 999, padding: "34px 64px", fontSize: 54, fontWeight: 700, letterSpacing: "-0.02em" }}>Analyze your video free</div>
      </div>
      <div style={{ position: "absolute", top: 1180, width: W, textAlign: "center", opacity: progress(f, E.url, 10) }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 52, color: K.caramel }}>getpublishub.com</div>
        <div style={{ marginTop: 22, fontSize: 36, color: K.muted }}>No account · No card · Results in ~3 min</div>
      </div>
    </AbsoluteFill>
  );
}

export const EDITORS_FPS = T.fps;
export const EDITORS_FRAMES = T.durationInFrames;
