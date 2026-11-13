// A loja de exemplo (fictícia, "Acme") que aparece no navegador: o app que o agente mudou e que a Publishub verifica.
// A história: o agente adicionou cupons ao checkout; o total quebrou ("$NaN") e o "Pay now" não faz nada.

import type { ReactNode } from "react";
import { C, MONO, SANS } from "./theme";

const S = C.store;

function Header({ scale }: { scale: number }) {
  return (
    <div style={{ height: 64 * scale, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${32 * scale}px`, borderBottom: `1px solid ${S.line}` }}>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 24 * scale, letterSpacing: "-0.04em", color: S.ink }}>acme</div>
      <div style={{ display: "flex", gap: 22 * scale, fontFamily: SANS, fontSize: 16 * scale, color: S.muted }}>
        <span>Shop</span>
        <span>About</span>
        <span style={{ color: S.ink, fontWeight: 600 }}>Cart (1)</span>
      </div>
    </div>
  );
}

/** A bolsa, desenhada: nada de foto de banco de imagens. */
export function Tote({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <defs>
        <linearGradient id="tote" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E9DCC3" />
          <stop offset="1" stopColor="#CDB892" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="#F3EFE8" />
      <path d="M36 38 C36 22, 64 22, 64 38" fill="none" stroke="#8A7552" strokeWidth="3.2" />
      <path d="M26 38 H74 L70 82 H30 Z" fill="url(#tote)" />
      <path d="M26 38 H74 L73 44 H27 Z" fill="#BCA57D" />
    </svg>
  );
}

function Field({ label, value, scale }: { label: string; value: string; scale: number }) {
  return (
    <div style={{ display: "grid", gap: 6 * scale }}>
      <div style={{ fontFamily: SANS, fontSize: 14 * scale, lineHeight: 1.2, color: S.muted }}>{label}</div>
      <div style={{ height: 44 * scale, boxSizing: "border-box", border: `1px solid ${S.line}`, borderRadius: 8 * scale, display: "flex", alignItems: "center", padding: `0 ${14 * scale}px`, fontFamily: SANS, fontSize: 17 * scale, color: S.ink }}>{value}</div>
    </div>
  );
}

function Row({ a, b, scale, strong, color }: { a: ReactNode; b: ReactNode; scale: number; strong?: boolean; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: (strong ? 25 : 20) * scale, lineHeight: 1, fontFamily: SANS, fontSize: (strong ? 20 : 16) * scale, fontWeight: strong ? 700 : 400, color: color ?? (strong ? S.ink : S.muted) }}>
      <span>{a}</span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{b}</span>
    </div>
  );
}

export type CheckoutState = {
  broken: boolean;
  /** 0..1: o botão afundando */
  press?: number;
  /** 0..1: o aviso de erro da loja */
  toast?: number;
  /** destaque vermelho no total (comparação) */
  mark?: number;
  /** o console do navegador, embaixo */
  console?: number;
};

/** O checkout. `stack`: resumo em cima e formulário embaixo (telas estreitas). */
export function Checkout({ w, h, s, stack = false, scale = 1 }: { w: number; h: number; s: CheckoutState; stack?: boolean; scale?: number }) {
  const total = s.broken ? "$NaN" : "$43.20";
  const press = s.press ?? 0;
  const summary = (
    <div style={{ background: S.soft, borderRadius: 14 * scale, padding: 24 * scale, display: "grid", gap: 14 * scale, alignContent: "start" }}>
      <div style={{ display: "flex", gap: 16 * scale, alignItems: "center", height: 66 * scale }}>
        <div style={{ borderRadius: 10 * scale, overflow: "hidden", border: `1px solid ${S.line}`, height: 64 * scale, boxSizing: "border-box" }}>
          <Tote size={64 * scale} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: SANS, fontSize: 17 * scale, fontWeight: 600, color: S.ink }}>Everyday Tote</div>
          <div style={{ fontFamily: SANS, fontSize: 14 * scale, color: S.muted }}>Sand · Qty 1</div>
        </div>
        <div style={{ fontFamily: SANS, fontSize: 17 * scale, color: S.ink }}>$48.00</div>
      </div>
      <div style={{ height: 1 * scale, background: S.line }} />
      <Row a="Subtotal" b="$48.00" scale={scale} />
      <Row a={<span>Coupon <span style={{ fontFamily: MONO, fontSize: 14 * scale, background: "#ECE6F7", color: "#5B2DB8", padding: `${2 * scale}px ${6 * scale}px`, borderRadius: 4 * scale }}>WELCOME10</span></span>} b="−$4.80" scale={scale} />
      <Row a="Shipping" b="Free" scale={scale} />
      <div style={{ height: 1 * scale, background: S.line }} />
      <div style={{ position: "relative" }}>
        <Row a="Total" b={total} scale={scale} strong color={s.broken ? "#C4202F" : undefined} />
        {(s.mark ?? 0) > 0 && (
          <div style={{ position: "absolute", inset: -10 * scale, border: `${3 * scale}px solid ${C.critical}`, borderRadius: 8 * scale, opacity: s.mark, boxShadow: `0 0 0 ${6 * scale}px rgba(255,107,117,0.18)` }} />
        )}
      </div>
    </div>
  );
  const form = (
    <div style={{ display: "grid", gap: 14 * scale, alignContent: "start" }}>
      <div style={{ fontFamily: SANS, fontSize: 24 * scale, lineHeight: 1.2, fontWeight: 700, letterSpacing: "-0.02em", color: S.ink }}>Checkout</div>
      <Field label="Email" value="sam@example.com" scale={scale} />
      <Field label="Card" value="•••• •••• •••• 4242" scale={scale} />
      <div
        style={{
          marginTop: 6 * scale,
          height: 54 * scale,
          borderRadius: 10 * scale,
          background: S.btn,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: SANS,
          fontWeight: 600,
          fontSize: 18 * scale,
          transform: `scale(${1 - press * 0.04})`,
          opacity: 1 - press * 0.15,
        }}
      >
        Pay now · {total}
      </div>
    </div>
  );
  return (
    <div style={{ width: w, height: h, background: S.bg, position: "relative", overflow: "hidden" }}>
      <Header scale={scale} />
      <div style={{ display: "grid", gridTemplateColumns: stack ? "1fr" : "1.05fr 1fr", gap: 28 * scale, padding: 32 * scale }}>
        {stack ? (
          <>
            {summary}
            {form}
          </>
        ) : (
          <>
            {form}
            {summary}
          </>
        )}
      </div>
      {(s.toast ?? 0) > 0 && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 84 * scale,
            transform: `translate(-50%, ${(1 - (s.toast ?? 0)) * -20}px)`,
            opacity: s.toast,
            background: "#FFF1F2",
            border: "1px solid #F7C4C9",
            color: "#9F1C2A",
            borderRadius: 10 * scale,
            padding: `${12 * scale}px ${18 * scale}px`,
            fontFamily: SANS,
            fontSize: 16 * scale,
            fontWeight: 600,
            whiteSpace: "nowrap",
            boxShadow: "0 12px 30px -10px rgba(0,0,0,0.25)",
          }}
        >
          Something went wrong. Please try again.
        </div>
      )}
      {(s.console ?? 0) > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 120 * scale, transform: `translateY(${(1 - (s.console ?? 0)) * 100}%)`, background: "#1B1820", borderTop: "1px solid #2E2836", padding: `${12 * scale}px ${18 * scale}px`, fontFamily: MONO, fontSize: 14.5 * scale, lineHeight: 1.55 }}>
          <div style={{ color: "#8C8497", marginBottom: 4 * scale }}>Console</div>
          <div style={{ color: "#FF8A93", background: "rgba(255,107,117,0.08)", padding: `${4 * scale}px ${8 * scale}px`, borderRadius: 4 * scale }}>
            ✕ Uncaught TypeError: Cannot read properties of undefined (reading &apos;total&apos;)
          </div>
          <div style={{ color: "#8C8497", padding: `${2 * scale}px ${8 * scale}px` }}>    at applyCoupon (cart.ts:42)</div>
        </div>
      )}
    </div>
  );
}

/** A página do produto (o primeiro passo da jornada). */
export function ProductPage({ w, h, scale = 1, press = 0 }: { w: number; h: number; scale?: number; press?: number }) {
  return (
    <div style={{ width: w, height: h, background: S.bg, overflow: "hidden" }}>
      <Header scale={scale} />
      <div style={{ display: "grid", gridTemplateColumns: w > h ? "1fr 1fr" : "1fr", gap: 28 * scale, padding: 32 * scale }}>
        <div style={{ borderRadius: 14 * scale, overflow: "hidden", aspectRatio: w > h ? "1 / 1" : "16 / 10", display: "flex", alignItems: "center", justifyContent: "center", background: "#F3EFE8" }}>
          <Tote size={Math.min(w > h ? w * 0.4 : w * 0.55, 420) * 1} />
        </div>
        <div style={{ display: "grid", gap: 14 * scale, alignContent: "start" }}>
          <div style={{ fontFamily: SANS, fontSize: 14 * scale, lineHeight: 1.2, color: S.muted, letterSpacing: "0.08em" }}>BAGS</div>
          <div style={{ fontFamily: SANS, fontSize: 32 * scale, lineHeight: 1.2, fontWeight: 700, letterSpacing: "-0.03em", color: S.ink }}>Everyday Tote</div>
          <div style={{ fontFamily: SANS, fontSize: 22 * scale, lineHeight: 1.2, color: S.ink }}>$48.00</div>
          <div style={{ fontFamily: SANS, fontSize: 16 * scale, color: S.muted, lineHeight: 1.5, whiteSpace: "nowrap" }}>Heavy canvas, leather handles, room for a laptop.</div>
          <div style={{ marginTop: 8 * scale, height: 54 * scale, borderRadius: 10 * scale, background: S.btn, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, fontWeight: 600, fontSize: 18 * scale, transform: `scale(${1 - press * 0.04})` }}>
            Add to cart
          </div>
        </div>
      </div>
    </div>
  );
}

/** O centro do botão "Pay now" dentro do checkout (sem a barra do navegador), para o cursor acertar. */
export function payButton(w: number, scale: number, stack: boolean) {
  const s = scale;
  const form = 28.8 * s + 14 * s + 66.8 * s + 14 * s + 66.8 * s + 14 * s + 6 * s + 27 * s;
  if (stack) {
    const summary = 48 * s + 66 * s + 6 * 14 * s + 2 * s + 20 * s * 3 + 25 * s;
    return { x: w / 2, y: 64 * s + 32 * s + summary + 28 * s + form };
  }
  const col = ((w - 64 * s - 28 * s) * 1.05) / 2.05;
  return { x: 32 * s + col / 2, y: 64 * s + 32 * s + form };
}

/** O centro do "Add to cart" na página do produto (layout de duas colunas). */
export function cartButton(w: number, scale: number) {
  const s = scale;
  const col = (w - 64 * s - 28 * s) / 2;
  return { x: 32 * s + col + 28 * s + col / 2, y: 64 * s + 32 * s + 16.8 * s + 14 * s + 38.4 * s + 14 * s + 26.4 * s + 14 * s + 24 * s + 14 * s + 8 * s + 27 * s };
}
