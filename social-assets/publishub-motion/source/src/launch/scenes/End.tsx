// 45–58 s · O fechamento. A pergunta da marca, os dois caminhos do site (lista de espera grátis e Founding Customers,
// $0 hoje) e o endereço. Os termos são os de frontend/src/app/page.tsx e lib/founding.ts: nada é cobrado hoje; a cobrança
// só começa depois do lançamento, com aviso de 7 dias; dá para cancelar antes e não pagar nada. O preço em si vem do
// Stripe e não aparece aqui.

import { AbsoluteFill } from "remotion";
import { C, CUE, MONO, PIXEL, SANS, VO, lerp, p, settle, useStage } from "../theme";
import { Cursor, Pill, Rise, Wordmark } from "../ui";

function Star({ size = 18, color = C.accent }: { size?: number; color?: string }) {
  // a estrela pixel do site (PixelIcon "star")
  return (
    <svg width={size} height={size} viewBox="0 0 7 7" shapeRendering="crispEdges">
      <g fill={color}>
        <rect x="3" y="0" width="1" height="7" />
        <rect x="0" y="3" width="7" height="1" />
        <rect x="2" y="2" width="3" height="3" />
      </g>
    </svg>
  );
}

function Waitlist({ t, v, w }: { t: number; v: boolean; w: number }) {
  const k = p(t, CUE.endWaitlist - 0.15, 0.7);
  const hot = p(t, CUE.endWaitlist, 0.4) * (1 - p(t, CUE.endFounding - 0.1, 0.5));
  return (
    <div
      style={{
        width: w,
        boxSizing: "border-box",
        border: `2px solid ${hot ? `rgba(242,215,160,${0.35 + hot * 0.5})` : C.lineStrong}`,
        background: C.card,
        boxShadow: `6px 6px 0 0 ${C.line}`,
        padding: v ? "26px 30px" : "28px 32px",
        opacity: k,
        transform: `translateY(${(1 - k) * 50}px)`,
        display: "flex",
        alignItems: "center",
        gap: 24,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: PIXEL, fontWeight: 600, fontSize: v ? 40 : 38, color: C.ink, letterSpacing: "0.02em" }}>JOIN THE WAITLIST</div>
        <div style={{ fontFamily: SANS, fontSize: v ? 25 : 24, color: C.muted, marginTop: 8 }}>Free · product updates · launch notice</div>
      </div>
      <div style={{ fontFamily: PIXEL, fontSize: v ? 34 : 32, color: C.success, border: `2px solid ${C.success}`, padding: "4px 14px" }}>FREE</div>
    </div>
  );
}

function Founding({ t, v, w }: { t: number; v: boolean; w: number }) {
  const k = p(t, CUE.endFounding - 0.15, 0.7);
  const zero = p(t, CUE.endZero - 0.05, 0.35, settle);
  const press = t >= CUE.endClick && t < CUE.endClick + 0.18 ? 1 : 0;
  const hit = p(t, CUE.endHit, 1.2, (n) => n);
  const sweep = hit > 0 && hit < 1 ? hit : -1;
  const items = ["Exclusive founding pricing", "Early access at launch", "Help shape the product"];
  return (
    <div
      style={{
        width: w,
        boxSizing: "border-box",
        position: "relative",
        border: `3px solid ${C.action}`,
        background: "linear-gradient(180deg, #1D1530 0%, #17131F 60%)",
        boxShadow: `10px 10px 0 0 ${C.pixelShadow}, 0 30px 90px -20px rgba(145,71,255,0.45)`,
        padding: v ? "34px 32px 30px" : "34px 36px 30px",
        opacity: k,
        transform: `translateY(${(1 - k) * 60}px)`,
        overflow: "hidden",
      }}
    >
      {sweep >= 0 && <div style={{ position: "absolute", inset: 0, background: `linear-gradient(105deg, transparent ${sweep * 160 - 50}%, rgba(193,138,255,0.25) ${sweep * 160 - 30}%, transparent ${sweep * 160 - 10}%)`, pointerEvents: "none" }} />}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div style={{ fontFamily: PIXEL, fontWeight: 600, fontSize: v ? 40 : 38, color: C.ink, letterSpacing: "0.02em", lineHeight: 1.1 }}>
          BECOME A<br />FOUNDING CUSTOMER
        </div>
        <div
          style={{
            fontFamily: PIXEL,
            fontWeight: 600,
            fontSize: v ? 40 : 38,
            color: C.success,
            border: `3px solid ${C.success}`,
            padding: "6px 14px",
            whiteSpace: "nowrap",
            transform: `rotate(${lerp(-14, -4, zero)}deg) scale(${zero ? lerp(1.8, 1, zero) : 0})`,
            opacity: zero,
            background: C.successSoft,
          }}
        >
          $0 TODAY
        </div>
      </div>
      <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: v ? 31 : 30, color: C.white, marginTop: 16, letterSpacing: "-0.01em" }}>Reserve your founding spot for $0 today.</div>
      <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
        {items.map((it, i) => {
          const q = p(t, CUE.endFounding + 0.4 + i * 0.18, 0.5);
          return (
            <div key={it} style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: SANS, fontSize: v ? 26 : 25, color: C.ink, opacity: q, transform: `translateX(${(1 - q) * -16}px)` }}>
              <Star size={v ? 20 : 18} />
              {it}
            </div>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 24,
          height: v ? 76 : 72,
          background: C.action,
          color: "#fff",
          fontFamily: SANS,
          fontWeight: 600,
          fontSize: v ? 29 : 27,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `${6 - press * 4}px ${6 - press * 4}px 0 0 ${C.pixelShadow}`,
          transform: `translate(${press * 4}px, ${press * 4}px)`,
        }}
      >
        Reserve my founding spot · $0 today
      </div>
      <div style={{ fontFamily: SANS, fontSize: v ? 19 : 18, color: C.muted, marginTop: 16, lineHeight: 1.4 }}>
        Charged only after launch, with 7 days’ notice. Cancel before then and pay nothing.
      </div>
    </div>
  );
}

function Url({ t, v }: { t: number; v: boolean }) {
  const text = "getpublishub.com";
  const n = Math.max(0, Math.min(text.length, Math.floor((t - CUE.endUrl) * 30)));
  const k = p(t, CUE.endUrl - 0.2, 0.5);
  const hit = p(t, CUE.endHit, 0.6);
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 18, opacity: k, transform: `scale(${0.96 + 0.04 * k + hit * 0.02})` }}>
      <div style={{ fontFamily: MONO, fontWeight: 500, fontSize: v ? 58 : 52, color: C.ink, letterSpacing: "-0.02em", borderBottom: `4px solid ${C.action}`, paddingBottom: 6, textShadow: hit ? `0 0 ${hit * 30}px rgba(193,138,255,0.5)` : undefined }}>
        {text.slice(0, n)}
        <span style={{ opacity: 0 }}>{text.slice(n)}</span>
      </div>
    </div>
  );
}

export function End() {
  const { t, v } = useStage();
  const z0 = 45;
  const build = p(t, z0 + 0.05, 0.7, (n) => n);
  const settleIn = p(t, z0, 1.2);
  const pill = p(t, VO.end1 - 0.1, 0.5);
  // a câmera: um afastamento lento o tempo todo, e um empurrão curto no impacto final
  const cam = 1.04 - 0.04 * p(t, z0, 10, (n) => n) + 0.015 * p(t, CUE.endHit, 0.3) - 0.015 * p(t, CUE.endHit + 0.3, 1.5);

  // o cursor clica no botão do Founding: no 9:16 o cartão está embaixo; no 16:9, à direita
  const cx = v ? lerp(1000, 640, p(t, CUE.endClick - 0.7, 0.6)) : lerp(1880, 1480, p(t, CUE.endClick - 0.7, 0.6));
  const cy = v ? lerp(1420, 1238, p(t, CUE.endClick - 0.7, 0.6)) : lerp(1060, 800, p(t, CUE.endClick - 0.7, 0.6));
  const cursorOn = t >= CUE.endClick - 0.8 && t < CUE.endClick + 1.0;
  const cOut = 1 - p(t, CUE.endClick + 0.6, 0.4);

  const head = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: v ? "center" : "flex-start", gap: v ? 26 : 24 }}>
      <div style={{ opacity: pill }}>
        <Pill size={v ? 24 : 22}>EARLY ACCESS IS OPEN · IN DEVELOPMENT</Pill>
      </div>
      <div style={{ transform: `scale(${lerp(1.1, 1, settleIn)})`, transformOrigin: v ? "50% 50%" : "0 50%" }}>
        <Wordmark size={v ? 104 : 96} build={build} chars={Math.floor(p(t, z0 + 0.45, 0.35, (n) => n) * 8 + 0.0001)} />
      </div>
      <div style={{ marginTop: v ? 6 : 8 }}>
        <Rise t={t} at={z0 + 0.6} text="Your AI writes the code." size={v ? 58 : 58} color={C.muted} align={v ? "center" : "left"} stagger={0.06} />
        <Rise t={t} at={z0 + 1.0} text="Who verifies it actually works?" size={v ? 72 : 72} color={C.ink} align={v ? "center" : "left"} stagger={0.06} style={{ maxWidth: v ? 900 : 760 }} />
      </div>
    </div>
  );

  return (
    <AbsoluteFill style={{ transform: `scale(${cam})` }}>
      {v ? (
        <div style={{ position: "absolute", top: 186, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
          {head}
          <div style={{ display: "flex", flexDirection: "column", gap: 26, marginTop: 6 }}>
            <Waitlist t={t} v={v} w={920} />
            <Founding t={t} v={v} w={920} />
          </div>
          <div style={{ marginTop: 6 }}>
            <Url t={t} v={v} />
          </div>
        </div>
      ) : (
        <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "1fr 820px", gap: 80, padding: "0 110px", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 44 }}>
            {head}
            <Url t={t} v={v} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <Waitlist t={t} v={v} w={820} />
            <Founding t={t} v={v} w={820} />
          </div>
        </div>
      )}
      {cursorOn && (
        <div style={{ opacity: cOut }}>
          <Cursor x={cx} y={cy} press={t >= CUE.endClick && t < CUE.endClick + 0.18 ? 1 : 0} ring={p(t, CUE.endClick, 0.4, (n) => n)} scale={1.15} />
        </div>
      )}
    </AbsoluteFill>
  );
}
