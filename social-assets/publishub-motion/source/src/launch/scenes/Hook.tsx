// 0–4 s · O gancho. O agente termina: compilou, o lint passou. Corte para o checkout: o "Pay now" não faz nada.

import { AbsoluteFill } from "remotion";
import { Checkout, payButton } from "../store";
import { C, CUE, MONO, SANS, lerp, p, settle, useStage } from "../theme";
import { Cursor, Rise, Status, Window } from "../ui";

function Terminal({ t, w, h }: { t: number; w: number; h: number }) {
  const lines: { at: number; node: React.ReactNode }[] = [
    { at: -1, node: <span style={{ color: C.muted }}>~/acme-store</span> },
    { at: -1, node: <span><span style={{ color: C.accent }}>›</span> <span style={{ color: C.white }}>add coupon codes to checkout</span></span> },
    { at: -1, node: <span style={{ color: C.muted }}>  Edited 14 files  <span style={{ color: C.success }}>+412</span> <span style={{ color: C.critical }}>−97</span></span> },
    { at: 0.05, node: <span style={{ color: C.dim }}>  M checkout/coupon.ts · M lib/cart.ts · M api/orders.ts …</span> },
    { at: CUE.hookCheck1, node: <Ok label="Build passed" /> },
    { at: CUE.hookCheck2, node: <Ok label="Lint passed" /> },
    { at: 1.55, node: <Ok label="Ready to deploy" /> },
  ];
  return (
    <Window w={w} h={h} title="agent — acme-store">
      <div style={{ padding: "26px 30px", fontFamily: MONO, fontSize: 25, lineHeight: 1.75, color: C.ink }}>
        {lines.map((l, i) => {
          const k = p(t, l.at, 0.25);
          return (
            <div key={i} style={{ opacity: l.at < 0 ? 1 : k, transform: `translateX(${(1 - k) * -10}px)`, whiteSpace: "nowrap" }}>
              {l.node}
            </div>
          );
        })}
        <div style={{ width: 14, height: 28, background: C.ink, marginTop: 6, opacity: Math.floor(t * 3) % 2 ? 0 : 0.9 }} />
      </div>
    </Window>
  );
}

function Ok({ label }: { label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
      <Status kind="pass" size={26} />
      <span style={{ color: C.success }}>{label}</span>
    </span>
  );
}

export function Hook() {
  const { t, v, width, height } = useStage();
  const toShop = p(t, 1.95, 0.45);
  const broken = t >= CUE.hookError;
  const err = p(t, CUE.hookError, 0.35);
  // glitch curto no erro: deslocamento de cor por 4 quadros
  const g = t >= CUE.hookError && t < CUE.hookError + 0.14 ? Math.sin(t * 200) * 10 : 0;

  // terminal: empurrão lento da câmera; sai para trás quando a loja entra
  const termW = v ? 960 : 1140;
  const termH = v ? 560 : 520;
  const push = lerp(0, 1, p(t, 0, 2, (n) => n));
  const termStyle = {
    transform: `perspective(1600px) rotateX(${lerp(14, 6, push)}deg) scale(${lerp(0.94, 1.0, push) * (1 - toShop * 0.25)}) translateY(${-toShop * 140}px)`,
    opacity: 1 - toShop,
    filter: toShop > 0 ? `blur(${toShop * 10}px)` : undefined,
  };

  // a loja
  const shopW = v ? 960 : 1240;
  const shopH = v ? 900 : 640;
  const shopIn = p(t, 1.95, 0.5);
  const pb = payButton(shopW, 1, v);
  const btn = { x: pb.x, y: pb.y };
  const cx = lerp(shopW * 0.95, btn.x, p(t, 2.1, 0.45, settle));
  const cy = lerp(shopH * 1.05, btn.y, p(t, 2.1, 0.45, settle));
  const press = t >= CUE.hookClick && t < CUE.hookClick + 0.2 ? 1 : 0;
  const ring = p(t, CUE.hookClick, 0.4, (n) => n);

  const textTop = v ? 250 : 70;
  return (
    <AbsoluteFill>
      {/* o texto grande: a fala, tipografia cinética */}
      <div style={{ position: "absolute", top: textTop, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, zIndex: 5 }}>
        {t < 2.0 ? (
          <div style={{ display: "flex", gap: v ? 0 : 26, flexDirection: v ? "column" : "row", alignItems: "center" }}>
            <Rise t={t} at={-0.5} text="It compiled." size={v ? 104 : 96} color={C.white} />
            <Rise t={t} at={1.05} text="Lint passed." size={v ? 104 : 96} color={C.white} />
          </div>
        ) : (
          <div style={{ display: "flex", gap: v ? 0 : 26, flexDirection: v ? "column" : "row", alignItems: "center", transform: `translateX(${g}px)` }}>
            <Rise t={t} at={2.0} text="And checkout" size={v ? 104 : 96} color={C.white} />
            <Rise t={t} at={2.3} text="is broken." size={v ? 104 : 96} color={broken ? C.critical : C.white} />
          </div>
        )}
      </div>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingTop: v ? 380 : 220 }}>
        <div style={{ position: "absolute", top: v ? 640 : 300, ...termStyle }}>
          <Terminal t={t} w={termW} h={termH} />
        </div>
        {t >= 1.95 && (
          <div
            style={{
              position: "absolute",
              top: v ? 560 : 300,
              opacity: shopIn,
              transform: `perspective(1600px) translateY(${(1 - shopIn) * 160}px) rotateX(${(1 - shopIn) * 12}deg) translateX(${g * 0.6}px)`,
              filter: g ? `drop-shadow(${g}px 0 0 rgba(255,107,117,0.7)) drop-shadow(${-g}px 0 0 rgba(145,71,255,0.7))` : undefined,
            }}
          >
            <Window w={shopW} h={shopH} tone="light" url="acme-store.com/checkout">
              <Checkout w={shopW} h={shopH - 52} stack={v} s={{ broken, press, toast: err, console: p(t, CUE.hookError + 0.15, 0.4) }} />
              <Cursor x={cx} y={cy} press={press} ring={ring} />
            </Window>
          </div>
        )}
      </AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, width, height, pointerEvents: "none", background: `rgba(255,107,117,${broken ? (1 - err) * 0.12 : 0})` }} />
    </AbsoluteFill>
  );
}
