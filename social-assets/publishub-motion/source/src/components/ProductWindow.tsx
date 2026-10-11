import type { CSSProperties, ReactNode } from "react";
import { Check, Download } from "lucide-react";
import { useCurrentFrame } from "remotion";
import { easeInOut, mix, progress } from "../anim";
import { C, FONT, LOST, SAMPLE, UI } from "../theme";
import T from "../timeline.json";
import { ReelFrame } from "./ReelFrame";
import { RetentionCurve } from "./RetentionCurve";
import { Badge, label, MockButton } from "./ui";

/**
 * A tela de análise do Publishub (frontend/src/components/landing/HeroProduct.tsx),
 * com os dados do exemplo da landing e os estados animados quadro a quadro:
 * o vídeo toca enquanto a curva se desenha, a queda acende em 0:04, a frase
 * daquele segundo aparece e o plano chega, com duas sugestões aceitas.
 *
 * vertical: tudo empilhado, para o Reels (zoom 2,1: o texto de 14 px vira 29 px).
 * horizontal: as três colunas da landing (vídeo · curva · plano), para o X.
 */
export type Layout = "vertical" | "horizontal";

function useWindowState() {
  const f = useCurrentFrame();
  const d = T.demo;
  const draw = progress(f, d.curve - 26, 56, easeInOut);
  const pop = progress(f, d.drop, 10);
  return {
    draw,
    pop,
    ring: progress(f, d.drop + 2, 22),
    // o vídeo toca junto com a curva; quando a queda acende, ele volta para 0:04
    played: pop > 0 ? mix(1, SAMPLE.dropAtSec / SAMPLE.durationSec, progress(f, d.drop, 8, easeInOut)) : draw,
    seconds: pop > 0 ? SAMPLE.dropAtSec : Math.round(draw * SAMPLE.durationSec),
    heading: progress(f, d.drop + 2, 14),
    lost: Math.round(LOST * progress(f, d.drop + 4, 14, easeInOut)),
    quote: progress(f, d.quote, 16),
    cards: d.cards.map((at) => progress(f, at, 14)),
    // aceitar: o botão afunda (press), some (leave) e só então a confirmação entra (accept)
    press: d.accept.map((at) => progress(f, at - 6, 5) * (1 - progress(f, at - 1, 3))),
    leave: d.accept.map((at) => progress(f, at - 1, 3)),
    accept: d.accept.map((at) => progress(f, at + 2, 8)),
    lostIn: progress(f, d.drop + 4, 6),
    finalEdit: progress(f, d.finalEdit, 12),
    // no vertical a janela não se move: o conteúdo rola dentro dela, da curva para o plano
    scroll: progress(f, d.pan, 24, easeInOut),
    // no horizontal a janela fica inteira: o foco vem de um véu sobre a coluna que não importa agora
    veilPlan: progress(f, d.copy1, 14) * (1 - progress(f, d.pan, 16, easeInOut)),
    veilLeft: progress(f, d.pan, 16, easeInOut) * (1 - progress(f, T.end.start - 16, 8)),
  };
}

type State = ReturnType<typeof useWindowState>;

export function ProductWindow({ layout, style }: { layout: Layout; style?: CSSProperties }) {
  const s = useWindowState();
  const vertical = layout === "vertical";
  return (
    <div style={{ zoom: vertical ? 2.1 : 1.45, width: vertical ? 470 : 1180, ...style }}>
      <AppWindow>{vertical ? <VerticalBody s={s} /> : <HorizontalBody s={s} />}</AppWindow>
    </div>
  );
}

function AppWindow({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        overflow: "hidden",
        borderRadius: 24,
        border: `1px solid ${C.line}`,
        background: C.paperRaised,
        boxShadow: "0 2px 4px rgba(30,27,24,0.06), 0 40px 80px -30px rgba(30,27,24,0.45)",
        fontFamily: FONT.sans,
        color: C.ink,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12, height: 44, borderBottom: `1px solid ${C.line}`, padding: "0 16px" }}>
        <span style={{ display: "flex", gap: 6 }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ width: 10, height: 10, borderRadius: 999, background: C.line }} />
          ))}
        </span>
        <span style={{ fontFamily: FONT.mono, fontSize: 12, color: C.inkMuted }}>{UI.file}</span>
        <span style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
          <Badge>{UI.example}</Badge>
          <Badge tone="confirmed" dot>
            {UI.ready}
          </Badge>
        </span>
      </div>
      {children}
    </div>
  );
}

/* ---------- os blocos ---------- */

function Reel({ s, width, height, scale }: { s: State; width: number; height: number; scale: number }) {
  return (
    <div style={{ width }}>
      <div style={{ width, height, borderRadius: 12, overflow: "hidden" }}>
        <ReelFrame exampleLabel={UI.example} played={s.played} scale={scale} />
      </div>
      <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", fontFamily: FONT.mono, fontSize: 11.5, color: C.inkMuted }}>
        <span>
          <span style={{ color: C.accent }}>0:{String(s.seconds).padStart(2, "0")}</span> / 0:{SAMPLE.durationSec}
        </span>
        <span>9:16</span>
      </div>
    </div>
  );
}

/** Um bloco cinza no lugar do texto que ainda não chegou; o texto entra por cima. */
function Arrive({ p, children, skeleton }: { p: number; children: ReactNode; skeleton: ReactNode }) {
  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, opacity: 1 - Math.min(1, p * 2.4) }}>{skeleton}</div>
      <div style={{ opacity: p, transform: `translateY(${(1 - p) * 8}px)` }}>{children}</div>
    </div>
  );
}

const bar = (w: number | string, h: number, mt = 0): CSSProperties => ({ width: w, height: h, borderRadius: 6, background: C.surface, marginTop: mt });

function DropHeading({ s, size }: { s: State; size: number }) {
  return (
    <div>
      <p style={{ ...label, margin: 0 }}>{UI.retention}</p>
      <Arrive
        p={s.heading}
        skeleton={
          <>
            <div style={bar("72%", size * 0.8, 10)} />
            <div style={bar("46%", 12, 10)} />
          </>
        }
      >
        <p style={{ margin: "8px 0 0", fontSize: size, fontWeight: 600, lineHeight: 1.15, letterSpacing: "-0.03em" }}>{UI.dropAt}</p>
        <p style={{ margin: "4px 0 0", fontFamily: FONT.mono, fontSize: 13, fontWeight: 500, color: C.accent, opacity: s.lostIn }}>{UI.lost(Math.max(1, s.lost))}</p>
      </Arrive>
    </div>
  );
}

function Quote({ s, size }: { s: State; size: number }) {
  return (
    <div style={{ position: "relative", paddingLeft: 14 }}>
      <span style={{ position: "absolute", left: 0, top: 0, width: 2, height: `${s.quote * 100}%`, background: C.accent, borderRadius: 2 }} />
      <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: C.line, opacity: 1 - s.quote }} />
      <Arrive
        p={s.quote}
        skeleton={
          <>
            <div style={bar("44%", 10, 2)} />
            <div style={bar("100%", 11, 12)} />
            <div style={bar("88%", 11, 9)} />
            <div style={bar("60%", 11, 9)} />
          </>
        }
      >
        <p style={{ ...label, margin: 0 }}>{UI.said}</p>
        <p style={{ margin: "6px 0 0", fontSize: size, lineHeight: 1.5 }}>“{UI.phrase}”</p>
      </Arrive>
    </div>
  );
}

function PlanPanel({ s, horizontal, text = 14 }: { s: State; horizontal: boolean; text?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", background: C.surface, borderLeft: horizontal ? `1px solid ${C.line}` : undefined, borderTop: horizontal ? undefined : `1px solid ${C.line}`, height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottom: `1px solid ${C.line}`, padding: "13px 20px" }}>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>{UI.plan}</p>
        <p style={{ margin: 0, fontFamily: FONT.mono, fontSize: 11.5, color: C.inkMuted, opacity: s.cards[0] }}>{UI.suggestions}</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12 }}>
        {UI.items.map((item, i) => (
          <PlanCard key={item.kind} item={item} index={i} p={s.cards[i]} accepted={i < 2 ? s.accept[i] : 0} press={i < 2 ? s.press[i] : 0} leave={i < 2 ? s.leave[i] : 0} text={text} />
        ))}
      </div>
      <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderTop: `1px solid ${C.line}`, padding: "14px 20px" }}>
        <p style={{ margin: 0, fontFamily: FONT.mono, fontSize: 12, color: C.inkMuted, opacity: s.finalEdit }}>{UI.finalEdit}</p>
        <MockButton style={{ opacity: 0.35 + 0.65 * s.finalEdit }}>
          <Download size={14} strokeWidth={2.25} />
          {UI.export}
        </MockButton>
      </div>
    </div>
  );
}

function PlanCard({ item, index, p, accepted, press, leave, text }: { item: (typeof UI.items)[number]; index: number; p: number; accepted: number; press: number; leave: number; text: number }) {
  const border = accepted > 0 ? `rgba(31, 71, 166, ${0.35 * accepted + 0.0})` : C.line;
  return (
    <div style={{ position: "relative" }}>
      {/* o lugar do cartão, enquanto a sugestão não chega */}
      <div style={{ position: "absolute", inset: 0, borderRadius: 12, border: "1.5px dashed #D6C4A8", opacity: 1 - Math.min(1, p * 2), padding: 14 }}>
        <div style={{ ...bar("38%", 10, 4), background: "#E6D8C2" }} />
        <div style={{ ...bar("82%", 11, 14), background: "#E6D8C2" }} />
      </div>
      <div
        style={{
          borderRadius: 12,
          border: `1px solid ${border}`,
          background: C.paperRaised,
          padding: 14,
          opacity: p,
          transform: `translateX(${(1 - p) * 28}px)`,
          boxShadow: accepted > 0 ? `0 0 0 ${3 * accepted}px rgba(31, 71, 166, ${0.08 * accepted})` : undefined,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, height: 28 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: FONT.mono, fontSize: 11.5, color: C.inkMuted }}>{item.time}</span>
            <Badge tone={index === 0 ? "accent" : "neutral"} style={{ paddingTop: 0, paddingBottom: 0, fontSize: 11 }}>
              {item.kind}
            </Badge>
          </span>
          <span style={{ position: "relative", display: "inline-flex", justifyContent: "flex-end", minWidth: 92 }}>
            <MockButton variant="secondary" style={{ height: 28, padding: "0 10px", fontSize: 12, opacity: 1 - leave, transform: `scale(${1 - press * 0.1 - leave * 0.15})` }}>
              {UI.accept}
            </MockButton>
            <span style={{ position: "absolute", right: 0, top: "50%", transform: `translateY(-50%) scale(${0.85 + 0.15 * accepted})`, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: C.accent, opacity: accepted }}>
              <Check size={13} strokeWidth={2.75} />
              {UI.accepted}
            </span>
          </span>
        </div>
        <p style={{ margin: "8px 0 0", fontSize: text, lineHeight: 1.35 }}>{item.text}</p>
      </div>
    </div>
  );
}

/* ---------- os dois layouts ---------- */

/* As medidas do vertical (px do site, antes do zoom 2,1): a janela mostra 430 px
   de conteúdo; a seção da curva tem 426 e o plano 430, então cada um cabe
   inteiro e a rolagem leva de um ao outro. */
const V_VIEW = 430;
const V_RETENTION = 426;

function VerticalBody({ s }: { s: State }) {
  return (
    <div style={{ height: V_VIEW, overflow: "hidden" }}>
      <div style={{ transform: `translateY(${-s.scroll * V_RETENTION}px)` }}>
      <div style={{ padding: 16, height: V_RETENTION, boxSizing: "border-box" }}>
        <div style={{ display: "flex", gap: 16 }}>
          <Reel s={s} width={124} height={220} scale={0.7} />
          <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
            <DropHeading s={s} size={26} />
            <Quote s={s} size={13.5} />
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          <RetentionCurve id="v" points={SAMPLE.retention} durationSec={SAMPLE.durationSec} dropAtSec={SAMPLE.dropAtSec} axisSize={34} draw={s.draw} pop={s.pop} ring={s.ring} />
        </div>
      </div>
      <div style={{ height: V_VIEW }}>
        <PlanPanel s={s} horizontal={false} text={15.5} />
      </div>
      </div>
    </div>
  );
}

/** O véu de foco: a cor da própria superfície, por cima do que sai de cena. */
function Veil({ amount, color }: { amount: number; color: string }) {
  if (amount <= 0) return null;
  return <div style={{ position: "absolute", inset: 0, background: color, opacity: amount * 0.62, pointerEvents: "none" }} />;
}

function HorizontalBody({ s }: { s: State }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "248px minmax(0, 1fr) 340px" }}>
      <div style={{ position: "relative", borderRight: `1px solid ${C.line}`, padding: 16 }}>
        <Reel s={s} width={216} height={384} scale={1} />
        <Veil amount={s.veilLeft} color={C.paperRaised} />
      </div>
      <div style={{ position: "relative", minWidth: 0, padding: 24 }}>
        <Veil amount={s.veilLeft} color={C.paperRaised} />
        <DropHeading s={s} size={28} />
        <div style={{ marginTop: 20 }}>
          <RetentionCurve id="h" points={SAMPLE.retention} durationSec={SAMPLE.durationSec} dropAtSec={SAMPLE.dropAtSec} axisSize={20} draw={s.draw} pop={s.pop} ring={s.ring} />
        </div>
        <div style={{ marginTop: 20 }}>
          <Quote s={s} size={15} />
        </div>
      </div>
      <div style={{ position: "relative" }}>
        <PlanPanel s={s} horizontal />
        <Veil amount={s.veilPlan} color={C.surface} />
      </div>
    </div>
  );
}
