import { ArrowRight, Brain, Check, Clapperboard, Link2, MousePointer2, Scissors, Sparkles, TrendingUp } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { easeIn, easeInOut, mix, progress, tween } from "../anim";
import { Lockup, Mark } from "../components/Logo";
import { FONT } from "../theme";
import { at, until } from "./timeline";
import { TH } from "./theme";

/** Entrada (0 → 1) e saída (0 → 1) de um elemento entre dois quadros. */
function life(frame: number, start: number, end: number, enter = 10, exit = 8) {
  return { p: progress(frame, start, enter), out: progress(frame, end - exit, exit, easeIn) };
}

/* Os cartões ficam na faixa entre o queixo e a legenda: o rosto nunca é coberto. */
export const CARD_TOP = 1140;

/* ---------- as ferramentas que ele cita, na parede ao lado do rosto ---------- */

export function ToolChips() {
  const frame = useCurrentFrame();
  const tools = [
    { name: "CapCut", w: 18 },
    { name: "DaVinci", w: 19 },
    { name: "Premiere", w: 20 },
  ];
  const exitAt = at(26); // "tudo manualmente": as ferramentas saem, a palavra fica sozinha
  return (
    <div style={{ position: "absolute", left: 46, top: 470, display: "flex", flexDirection: "column", gap: 18, alignItems: "flex-start" }}>
      {tools.map((t, n) => {
        const { p, out } = life(frame, at(t.w) - 2, exitAt + n * 3 + 8, 11, 8);
        if (p <= 0 || out >= 1) return <div key={t.name} style={{ height: 70 }} />;
        return (
          <div
            key={t.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              height: 70,
              padding: "0 24px 0 18px",
              borderRadius: 999,
              background: TH.glass,
              border: `1.5px solid ${TH.glassLine}`,
              boxShadow: "0 14px 34px -12px rgba(0,0,0,0.55)",
              color: TH.text,
              fontFamily: FONT.sans,
              fontWeight: 600,
              fontSize: 34,
              letterSpacing: "-0.02em",
              opacity: p * (1 - out),
              transform: `translateX(${(1 - p) * -60 - out * 40}px) scale(${mix(0.9, 1, p)})`,
              transformOrigin: "0 50%",
            }}
          >
            <Clapperboard size={28} color={TH.pen} strokeWidth={2.2} />
            {t.name}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- "uma solução que se chama Publishub": o logo e a frase dele ---------- */

export function BrandCard() {
  const frame = useCurrentFrame();
  const start = at(50) - 3;
  const { p, out } = life(frame, start, at(60), 12, 9);
  if (p <= 0 || out >= 1) return null;
  // entra com um pequeno salto: passa de 1 e volta, no instante em que ele diz o nome
  const pop = tween(frame, [start, start + 8], [0.86, 1.04]) - tween(frame, [start + 8, start + 16], [0, 0.04]);
  const build = progress(frame, start + 2, 20);
  const word = progress(frame, start + 10, 14);
  const tagline = "copiloto de inteligência artificial";
  const typed = Math.round(tween(frame, [at(54), until(57)], [0, tagline.length], (t) => t));
  return (
    <Center top={CARD_TOP}>
      <div
        style={{
          ...cardStyle,
          padding: "34px 52px 30px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          opacity: p * (1 - out),
          transform: `translateY(${(1 - p) * 28 + out * -10}px) scale(${pop})`,
        }}
      >
        <Lockup size={74} build={build} word={word} variant="color" color={TH.ink} />
        <div style={{ fontFamily: FONT.mono, fontSize: 27, color: TH.muted, height: 34, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
          <span style={{ color: TH.accent }}>{tagline.slice(0, typed)}</span>
          <span style={{ opacity: typed > 0 && typed < tagline.length && Math.floor(frame / 8) % 2 === 0 ? 1 : 0, color: TH.accent }}>▍</span>
        </div>
      </div>
    </Center>
  );
}

/* ---------- "funciona assim": o produto, nos três passos que ele descreve ---------- */

const STEPS = [
  { from: at(76), label: "01 / 03" }, // a pessoa joga o vídeo
  { from: at(84), label: "02 / 03" }, // copiloto, sugestões
  { from: at(100), label: "03 / 03" }, // aprende com você
];

export function ProductCard() {
  const frame = useCurrentFrame();
  const start = at(76) - 4;
  const end = until(116) + 10;
  const { p, out } = life(frame, start, end, 12, 9);
  if (p <= 0 || out >= 1) return null;
  const step = STEPS.reduce((k, s, n) => (frame >= s.from ? n : k), 0);

  const states: { from: number; to: number; node: ReactNode }[] = [
    { from: start, to: at(84), node: <Upload /> },
    { from: at(84), to: at(92), node: <Copilot /> },
    { from: at(92), to: at(100), node: <Suggestions /> },
    { from: at(100), to: end + 20, node: <Learn /> },
  ];

  return (
    <Center top={CARD_TOP - 16}>
      <div
        style={{
          ...cardStyle,
          width: 900,
          height: 212,
          padding: "18px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          opacity: p * (1 - out),
          transform: `translateY(${(1 - p) * 30 + out * -10}px) scale(${mix(0.95, 1, p)})`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 40 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: FONT.sans, fontWeight: 600, fontSize: 27, letterSpacing: "-0.035em", color: TH.ink }}>
            <Mark height={34} variant="color" />
            Publishub
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {STEPS.map((_, n) => (
              <span key={n} style={{ width: n === step ? 30 : 10, height: 10, borderRadius: 99, background: n <= step ? TH.accent : TH.line }} />
            ))}
            <span style={{ fontFamily: FONT.mono, fontSize: 21, color: TH.muted, marginLeft: 6 }}>{STEPS[step].label}</span>
          </span>
        </div>
        <div style={{ position: "relative", flex: 1 }}>
          {states.map((s, n) => {
            const sp = progress(frame, s.from, 9);
            const so = n === states.length - 1 ? 0 : progress(frame, s.to - 1, 6, easeIn);
            if ((n > 0 && sp <= 0) || so >= 1) return null;
            const vis = n === 0 ? 1 - so : sp * (1 - so);
            return (
              <div key={n} style={{ position: "absolute", inset: 0, opacity: vis, transform: `translateY(${(1 - (n === 0 ? 1 : sp)) * 14 - so * 10}px)` }}>
                {s.node}
              </div>
            );
          })}
        </div>
      </div>
    </Center>
  );
}

function Upload() {
  const frame = useCurrentFrame();
  const fill = tween(frame, [at(78), until(83)], [0, 1], easeInOut); // "joga o vídeo lá na plataforma"
  const done = progress(frame, until(83), 8);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22, height: "100%" }}>
      <Thumb n={0} w={74} h={118} drop={progress(frame, at(78) - 6, 12)} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FONT.sans, fontSize: 28, fontWeight: 600, color: TH.ink, letterSpacing: "-0.02em" }}>
          <span>seu-video.mp4</span>
          <span style={{ fontFamily: FONT.mono, fontSize: 22, fontWeight: 400, color: done > 0 ? TH.confirmed : TH.muted, display: "flex", alignItems: "center", gap: 6 }}>
            {done > 0 ? <Check size={24} strokeWidth={3} style={{ transform: `scale(${done})` }} /> : null}
            {Math.round(fill * 100)}%
          </span>
        </div>
        <div style={{ height: 12, borderRadius: 99, background: TH.surface, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${fill * 100}%`, borderRadius: 99, background: TH.accent }} />
        </div>
      </div>
    </div>
  );
}

function Copilot() {
  const frame = useCurrentFrame();
  const scan = tween(frame, [at(84), at(92)], [0, 1], easeInOut);
  const N = 8;
  const W = 66;
  const G = 8;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, height: "100%" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 190 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: FONT.sans, fontWeight: 650, fontSize: 30, color: TH.accent, letterSpacing: "-0.02em" }}>
          <Sparkles size={30} strokeWidth={2.2} />
          Copiloto
        </span>
        <span style={{ fontFamily: FONT.mono, fontSize: 20, color: TH.muted }}>seu vídeo</span>
      </div>
      <div style={{ position: "relative", display: "flex", gap: G }}>
        {Array.from({ length: N }, (_, n) => (
          <Thumb key={n} n={n} w={W} h={112} lit={scan * N > n} />
        ))}
        <div style={{ position: "absolute", top: -8, bottom: -8, left: scan * (N * (W + G) - G), width: 4, marginLeft: -2, borderRadius: 2, background: TH.accent, boxShadow: `0 0 18px ${TH.accent}` }} />
      </div>
    </div>
  );
}

function Suggestions() {
  const frame = useCurrentFrame();
  const rows = [
    { icon: <Scissors size={26} strokeWidth={2.3} />, text: "Sugestão de corte", from: at(94), extra: <CutMarks frame={frame} from={at(96)} /> },
    { icon: <TrendingUp size={26} strokeWidth={2.3} />, text: "Sugestão de retenção", from: at(97), extra: <Spark frame={frame} from={at(99)} /> },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%", justifyContent: "center" }}>
      {rows.map((r, n) => {
        const p = progress(frame, r.from - 2, 10);
        return (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: 16, height: 58, padding: "0 16px 0 10px", borderRadius: 16, background: TH.paperDeep, border: `1.5px solid ${TH.line}`, opacity: p, transform: `translateX(${(1 - p) * 40}px)` }}>
            <span style={{ display: "grid", placeItems: "center", width: 42, height: 42, borderRadius: 12, background: TH.accentSoft, color: TH.accent }}>{r.icon}</span>
            <span style={{ flex: 1, fontFamily: FONT.sans, fontWeight: 600, fontSize: 27, color: TH.ink, letterSpacing: "-0.02em" }}>{r.text}</span>
            {r.extra}
          </div>
        );
      })}
    </div>
  );
}

/** Uma faixa de linha do tempo com o trecho marcado para sair. */
function CutMarks({ frame, from }: { frame: number; from: number }) {
  const p = progress(frame, from, 12);
  return (
    <svg width={180} height={30} viewBox="0 0 180 30">
      <rect x={0} y={9} width={180} height={12} rx={6} fill={TH.surface} />
      <rect x={70} y={4} width={50 * p} height={22} rx={5} fill="rgba(31,71,166,0.16)" stroke={TH.accent} strokeWidth={2} opacity={p > 0 ? 1 : 0} />
    </svg>
  );
}

/** Uma curva de retenção pequena, desenhando. */
function Spark({ frame, from }: { frame: number; from: number }) {
  const p = progress(frame, from - 4, 16);
  return (
    <svg width={180} height={36} viewBox="0 0 180 36">
      <path d="M2 6 C 30 7, 46 9, 62 22 S 100 26, 130 25 S 168 24, 178 24" fill="none" stroke={TH.accent} strokeWidth={3} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
    </svg>
  );
}

function Learn() {
  const frame = useCurrentFrame();
  const sub = "todos os processos da edição";
  const typed = Math.round(tween(frame, [at(106), until(110)], [0, sub.length], (t) => t));
  const learn = tween(frame, [at(100), until(116)], [0.08, 1], easeInOut);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22, height: "100%" }}>
      <span style={{ display: "grid", placeItems: "center", width: 96, height: 96, borderRadius: 26, background: TH.accentSoft, color: TH.accent, transform: `scale(${1 + Math.sin(frame / 9) * 0.03})` }}>
        <Brain size={52} strokeWidth={1.9} />
      </span>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        <span style={{ fontFamily: FONT.sans, fontWeight: 650, fontSize: 32, color: TH.ink, letterSpacing: "-0.025em" }}>Aprende com você</span>
        <span style={{ fontFamily: FONT.mono, fontSize: 22, color: TH.muted, height: 28, whiteSpace: "nowrap" }}>{sub.slice(0, typed)}</span>
        <div style={{ display: "flex", gap: 6 }}>
          {Array.from({ length: 18 }, (_, n) => (
            <span key={n} style={{ flex: 1, height: 8, borderRadius: 99, background: n / 18 < learn ? TH.accent : TH.surface }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Thumb({ n, w, h, lit = true, drop }: { n: number; w: number; h: number; lit?: boolean; drop?: number }) {
  const d = drop ?? 1;
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 10,
        overflow: "hidden",
        flexShrink: 0,
        background: TH.surface,
        boxShadow: "0 6px 16px -8px rgba(30,27,24,0.5)",
        opacity: d,
        transform: `translateY(${(1 - d) * -40}px) rotate(${(1 - d) * -8}deg)`,
      }}
    >
      <Img src={staticFile(`talking/thumb-${n}.jpg`)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: lit ? "none" : "grayscale(0.85) brightness(1.08)", opacity: lit ? 1 : 0.55 }} />
    </div>
  );
}

/* ---------- o convite: "testar a plataforma… clicar no link aí na bio" ---------- */

export function CtaButton({ end }: { end: number }) {
  const frame = useCurrentFrame();
  const start = at(124) - 3; // "testar"
  const { p, out } = life(frame, start, end, 12, 6);
  if (p <= 0 || out >= 1) return null;
  const click = until(130); // "clicar"
  const arrive = progress(frame, at(129) - 4, 14, easeInOut);
  const press = tween(frame, [click - 2, click + 2], [0, 1]) - tween(frame, [click + 3, click + 9], [0, 1]);
  const ring = progress(frame, click, 16);
  const swap = progress(frame, at(132) - 2, 8); // "link": o botão vira o caminho até a bio
  const cursorOut = progress(frame, click + 10, 10, easeIn);
  return (
    <Center top={CARD_TOP + 10}>
      <div style={{ position: "relative", opacity: p * (1 - out), transform: `translateY(${(1 - p) * 26}px) scale(${mix(0.92, 1, p) * (1 - press * 0.05)})` }}>
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 112,
            width: 720,
            borderRadius: 999,
            background: TH.accent,
            color: TH.paper,
            fontFamily: FONT.sans,
            fontWeight: 650,
            fontSize: 42,
            letterSpacing: "-0.025em",
            boxShadow: "0 22px 50px -18px rgba(31,71,166,0.75), inset 0 1px 0 rgba(255,255,255,0.18)",
            overflow: "hidden",
          }}
        >
          <span style={{ position: "absolute", display: "flex", alignItems: "center", gap: 16, opacity: 1 - swap, transform: `translateY(${swap * -40}px)` }}>
            <span style={{ display: "grid", placeItems: "center", width: 62, height: 62, borderRadius: 999, background: TH.paper }}>
              <Mark height={42} variant="color" />
            </span>
            Testar a plataforma
            <ArrowRight size={40} strokeWidth={2.4} />
          </span>
          <span style={{ position: "absolute", display: "flex", alignItems: "center", gap: 16, opacity: swap, transform: `translateY(${(1 - swap) * 40}px)` }}>
            <Link2 size={40} strokeWidth={2.4} />
            Link na bio
          </span>
        </div>
        {ring > 0 && ring < 1 ? (
          <div style={{ position: "absolute", inset: 0, borderRadius: 999, border: `4px solid ${TH.pen}`, opacity: 1 - ring, transform: `scale(${1 + ring * 0.18})` }} />
        ) : null}
        <div
          style={{
            position: "absolute",
            left: mix(760, 470, arrive),
            top: mix(220, 62, arrive),
            opacity: arrive * (1 - cursorOut),
            transform: `scale(${1 - press * 0.12})`,
            filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.45))",
          }}
        >
          <MousePointer2 size={64} fill={TH.paper} color={TH.ink} strokeWidth={1.6} />
        </div>
      </div>
    </Center>
  );
}

/* ---------- peças comuns ---------- */

const cardStyle: CSSProperties = {
  borderRadius: 34,
  background: TH.paper,
  border: `1.5px solid ${TH.line}`,
  boxShadow: "0 30px 70px -28px rgba(0,0,0,0.7), 0 2px 0 rgba(255,255,255,0.6) inset",
};

function Center({ top, children }: { top: number; children: ReactNode }) {
  return <div style={{ position: "absolute", left: 0, right: 0, top, display: "flex", justifyContent: "center" }}>{children}</div>;
}

