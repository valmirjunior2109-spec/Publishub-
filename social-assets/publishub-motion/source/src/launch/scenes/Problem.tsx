// 11,5–20 s · O problema escondido. O agente mexeu em mais do que a tarefa; uma linha em lib/cart.ts quebra o checkout,
// longe dali; ninguém percebe até um cliente clicar em "Pay now".

import { AbsoluteFill } from "remotion";
import { Checkout, payButton } from "../store";
import { C, CUE, MONO, PIXEL, SANS, VO, lerp, p, settle, useStage } from "../theme";
import { Cursor, Status, Window } from "../ui";

const FILES: { f: string; add: number; del: number; task: boolean }[] = [
  { f: "checkout/coupon.ts", add: 86, del: 0, task: true },
  { f: "checkout/form.tsx", add: 12, del: 3, task: true },
  { f: "lib/cart.ts", add: 9, del: 14, task: false },
  { f: "api/orders.ts", add: 4, del: 2, task: false },
  { f: "auth/session.ts", add: 2, del: 2, task: false },
];

function Changes({ t, w }: { t: number; w: number }) {
  return (
    <Window w={w} h={640} title="Changes · agent/coupon-codes">
      <div style={{ padding: "22px 28px" }}>
        <div style={{ fontFamily: SANS, fontSize: 22, color: C.muted, marginBottom: 18 }}>
          Task: <span style={{ color: C.white }}>add coupon codes to checkout</span>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {FILES.map((x, i) => {
            const k = p(t, VO.prob1 - 0.4 + i * 0.12, 0.4);
            const flag = !x.task ? p(t, VO.prob1 + 0.95 + (i - 2) * 0.16, 0.35) : 0;
            const isCart = x.f === "lib/cart.ts";
            return (
              <div
                key={x.f}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  height: 64,
                  padding: "0 18px",
                  borderRadius: 10,
                  border: `1px solid ${flag ? `rgba(255,191,105,${0.25 + flag * 0.35})` : C.line}`,
                  background: flag ? `rgba(255,191,105,${flag * 0.06})` : C.surface,
                  opacity: k,
                  transform: `translateX(${(1 - k) * -24}px)`,
                  boxShadow: isCart && t > CUE.probZoom - 0.3 ? `0 0 0 2px ${C.warn}` : undefined,
                }}
              >
                <span style={{ fontFamily: MONO, fontSize: 18, color: C.warn, width: 20 }}>M</span>
                <span style={{ fontFamily: MONO, fontSize: 24, color: C.white, flex: 1 }}>{x.f}</span>
                <span style={{ fontFamily: MONO, fontSize: 19, color: C.success }}>+{x.add}</span>
                <span style={{ fontFamily: MONO, fontSize: 19, color: C.critical, width: 54 }}>−{x.del}</span>
                <span
                  style={{
                    fontFamily: PIXEL,
                    fontSize: 18,
                    padding: "3px 10px",
                    border: `2px solid ${x.task ? C.line : C.warn}`,
                    color: x.task ? C.muted : C.warn,
                    width: 156,
                    textAlign: "center",
                    opacity: x.task ? 1 : flag,
                  }}
                >
                  {x.task ? "in task" : "not asked for"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Window>
  );
}

function Diff({ t, w }: { t: number; w: number }) {
  const k = p(t, CUE.probZoom + 0.3, 0.5);
  const L = [
    { n: 40, s: " ", c: <><span style={{ color: C.accent }}>export function</span> <span style={{ color: C.white }}>applyCoupon</span>(cart, coupon) {"{"}</> },
    { n: 41, s: "-", c: <>  <span style={{ color: C.accent }}>const</span> total = cart.items.reduce(sum, 0)</> },
    { n: 41, s: "+", c: <>  <span style={{ color: C.accent }}>const</span> total = cart.summary.total</> },
    { n: 42, s: " ", c: <>  <span style={{ color: C.accent }}>return</span> total - total * coupon.rate</> },
    { n: 43, s: " ", c: <>{"}"}</> },
  ];
  return (
    <Window w={w} h={360} title="lib/cart.ts">
      <div style={{ padding: "18px 0", fontFamily: MONO, fontSize: w > 1000 ? 26 : 23, lineHeight: 1.9 }}>
        {L.map((l, i) => {
          const bg = l.s === "+" ? `rgba(87,217,140,${0.1 + (l.s === "+" ? k * 0.08 : 0)})` : l.s === "-" ? "rgba(255,107,117,0.1)" : "transparent";
          return (
            <div key={i} style={{ display: "flex", background: bg, padding: "0 24px", color: C.muted, whiteSpace: "pre" }}>
              <span style={{ width: 50, color: C.dim }}>{l.n}</span>
              <span style={{ width: 30, color: l.s === "+" ? C.success : l.s === "-" ? C.critical : C.dim }}>{l.s}</span>
              <span>{l.c}</span>
            </div>
          );
        })}
      </div>
    </Window>
  );
}

const STEPS = ["Sign up", "Onboarding", "Add to cart", "Checkout", "Confirmation"];

function Journey({ t, v }: { t: number; v: boolean }) {
  const at = CUE.probBreak - 0.85;
  const travel = p(t, at, 0.85, (n) => n); // o pulso percorre até o checkout
  const broke = t >= CUE.probBreak;
  const node = (i: number) => {
    const reached = travel * 3 >= i - 0.001;
    const failed = broke && i === 3;
    const dead = broke && i === 4;
    const col = failed ? C.critical : reached ? C.success : C.lineStrong;
    const k = p(t, at - 0.3 + i * 0.06, 0.4);
    return (
      <div key={i} style={{ display: "flex", flexDirection: v ? "row" : "column", alignItems: "center", gap: 18, opacity: k * (dead ? 0.35 : 1), transform: `scale(${failed ? 1 + 0.08 * (1 - p(t, CUE.probBreak, 0.5)) : 1})` }}>
        <div style={{ width: 92, height: 92, border: `3px solid ${col}`, background: failed ? C.criticalSoft : reached ? C.successSoft : C.card, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `6px 6px 0 0 ${failed ? "#5A1E26" : "#1C1626"}` }}>
          {failed ? <Status kind="fail" size={44} /> : reached && !dead ? <Status kind="pass" size={44} /> : <span style={{ width: 14, height: 14, background: C.lineStrong }} />}
        </div>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 30, color: failed ? C.critical : C.white, width: v ? 300 : undefined, whiteSpace: "nowrap" }}>{STEPS[i]}</div>
      </div>
    );
  };
  const seg = (i: number) => {
    const fill = Math.max(0, Math.min(1, travel * 3 - i));
    return (
      <div key={`s${i}`} style={{ position: "relative", width: v ? 4 : 120, height: v ? 56 : 4, background: C.line, marginLeft: v ? 44 : 0, marginTop: v ? 0 : -48 }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: v ? 4 : `${(i < 3 ? fill : 0) * 100}%`, height: v ? `${(i < 3 ? fill : 0) * 100}%` : 4, background: C.success }} />
      </div>
    );
  };
  return (
    <div style={{ display: "flex", flexDirection: v ? "column" : "row", alignItems: v ? "flex-start" : "center" }}>
      {STEPS.map((_, i) => (
        <div key={i} style={{ display: "contents" }}>
          {node(i)}
          {i < STEPS.length - 1 && seg(i)}
        </div>
      ))}
    </div>
  );
}

export function Problem() {
  const { t, v } = useStage();
  // fase 1: a lista de mudanças → fase 2: o diff (empurrão) → fase 3: a jornada → fase 4: o cliente
  const toDiff = p(t, CUE.probZoom, 0.6);
  const toJourney = p(t, CUE.probBreak - 0.6, 0.45);
  const toUser = p(t, VO.prob3 - 0.1, 0.5);
  const w = v ? 960 : 1240;

  const sceneA = { opacity: 1 - toJourney, transform: `perspective(1800px) translateY(${lerp(0, v ? -260 : -190, toDiff)}px) scale(${lerp(1, 0.86, toDiff) * (1 - toJourney * 0.1)}) rotateX(${lerp(8, 18, toDiff)}deg)`, filter: toDiff ? `blur(${toDiff * 3 + toJourney * 10}px)` : undefined };
  const diffIn = { opacity: toDiff * (1 - toJourney), transform: `translateY(${lerp(140, 0, toDiff)}px) scale(${lerp(0.94, 1, toDiff) * (1 + toJourney * 0.08)})`, filter: toJourney ? `blur(${toJourney * 12}px)` : undefined };

  // o cliente
  const shopW = v ? 960 : 1240;
  const shopH = v ? 900 : 640;
  const pb = payButton(shopW, 1, v);
  const btn = { x: pb.x, y: pb.y };
  const cx = lerp(shopW * 0.92, btn.x, p(t, VO.prob3 + 0.3, 0.9, settle));
  const cy = lerp(shopH * 0.15, btn.y, p(t, VO.prob3 + 0.3, 0.9, settle));
  const press = t >= CUE.probUserClick && t < CUE.probUserClick + 0.2 ? 1 : 0;

  return (
    <AbsoluteFill style={{ alignItems: "center" }}>
      {t < CUE.probBreak && (
        <>
          <div style={{ position: "absolute", top: v ? 330 : 170, ...sceneA }}>
            <Changes t={t} w={w} />
          </div>
          <div style={{ position: "absolute", top: v ? 760 : 560, ...diffIn }}>
            <Diff t={t} w={w} />
          </div>
        </>
      )}
      {t >= CUE.probBreak - 0.6 && t < VO.prob3 + 0.5 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: v ? 260 : 60, opacity: toJourney * (1 - toUser), transform: `scale(${lerp(1.06, 1, toJourney) * (1 + toUser * 0.08)})`, filter: toUser ? `blur(${toUser * 12}px)` : undefined }}>
          <div style={{ fontFamily: PIXEL, fontSize: 30, color: C.muted, marginBottom: 50, letterSpacing: "0.04em" }}>USER JOURNEY · CHECKOUT</div>
          <Journey t={t} v={v} />
        </AbsoluteFill>
      )}
      {t >= VO.prob3 - 0.1 && (
        <div style={{ position: "absolute", top: v ? 330 : 200, opacity: toUser, transform: `translateY(${(1 - toUser) * 80}px) scale(${lerp(0.96, 1, toUser)})` }}>
          <Window w={shopW} h={shopH} tone="light" url="acme-store.com/checkout">
            <Checkout w={shopW} h={shopH - 52} stack={v} s={{ broken: true, press, toast: p(t, CUE.probUserClick + 0.2, 0.3) }} />
            <Cursor x={cx} y={cy} press={press} ring={p(t, CUE.probUserClick, 0.4, (n) => n)} label="Customer" />
          </Window>
        </div>
      )}
    </AbsoluteFill>
  );
}
