// 24–41,5 s · A experiência do produto (conceito). Os quatro passos do site, nesta ordem:
// conectar o projeto e escolher as jornadas → rodar num navegador de verdade → comparar com a última versão que funcionou →
// a evidência: o passo que falhou, o print e o relatório para devolver ao agente.
// A Publishub está em desenvolvimento: o selo "Concept preview" fica na tela a cena inteira, e nada aqui mostra
// números de clientes ou integrações que ainda não existem.

import type { ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { Checkout, ProductPage, cartButton, payButton } from "../store";
import { C, CUE, MONO, PIXEL, SANS, VO, lerp, p, settle, typed, useStage } from "../theme";
import { Cursor, Pill, Status, Window, Wordmark } from "../ui";

const JOURNEYS = [
  { name: "Sign up", steps: 4, pass: 28.55 },
  { name: "Onboarding", steps: 6, pass: 29.25 },
  { name: "Add to cart", steps: 3, pass: 29.95 },
  { name: "Checkout", steps: 5, fail: CUE.prodFail },
  { name: "Password reset", steps: 4, pass: 31.4 },
];
const RUN = CUE.prodRun;
const URL = "https://pr-142.preview.acme-store.dev";
const STEPS = ["Open product", "Add to cart", "Open checkout", "Pay now", "See confirmation"];

type Geo = { W: number; H: number; v: boolean; jh: number; stage: { x: number; y: number; w: number; h: number } };

function geometry(v: boolean, t: number): Geo {
  if (!v) return { W: 1720, H: 940, v, jh: 776, stage: { x: 548, y: 140, w: 1148, h: 776 } };
  const collapse = p(t, CUE.prodCompare - 0.35, 0.6, settle);
  const jh = 300 * (1 - collapse);
  const y = 140 + jh + 20 * (1 - collapse);
  return { W: 1000, H: 1090, v, jh, stage: { x: 24, y, w: 952, h: 1090 - 24 - y } };
}

/* ---------------------------------------------------------------- painel de jornadas */

function Journeys({ t, g }: { t: number; g: Geo }) {
  const rowH = g.v ? 46 : 72;
  return (
    <div style={{ position: "absolute", left: 24, top: 140, width: g.v ? 952 : 500, height: g.jh, overflow: "hidden", border: `1px solid ${C.line}`, borderRadius: 14, background: C.surface, opacity: g.v ? Math.min(1, g.jh / 120) : 1, boxSizing: "border-box" }}>
      <div style={{ height: g.v ? 52 : 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px", borderBottom: `1px solid ${C.line}` }}>
        <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: g.v ? 22 : 24, color: C.white }}>User journeys</span>
        <span style={{ fontFamily: MONO, fontSize: g.v ? 17 : 19, color: C.muted }}>{t < RUN ? `${Math.min(5, Math.max(0, Math.floor((t - CUE.prodSelect) / 0.24) + 1))} selected` : "pr-142 vs main"}</span>
      </div>
      <div style={{ padding: g.v ? "6px 10px" : "10px 12px" }}>
        {JOURNEYS.map((j, i) => {
          const picked = t >= CUE.prodSelect + i * 0.24;
          const running = t >= RUN + 0.1 + i * 0.08;
          const done = j.pass !== undefined && t >= j.pass;
          const failed = j.fail !== undefined && t >= j.fail;
          const pop = p(t, done ? (j.pass as number) : failed ? (j.fail as number) : 0, 0.35);
          let icon: ReactNode;
          let meta: ReactNode = <span style={{ color: C.dim }}>{j.steps} steps</span>;
          if (!running) {
            icon = (
              <span style={{ width: 24, height: 24, border: `2px solid ${picked ? C.action : C.lineStrong}`, background: picked ? C.action : "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}>
                {picked && <span style={{ width: 10, height: 10, background: "#fff" }} />}
              </span>
            );
          } else if (failed) {
            icon = <Status kind="fail" size={26} />;
            meta = <span style={{ color: C.critical }}>Failed · step 4</span>;
          } else if (done) {
            icon = <Status kind="pass" size={26} />;
            meta = <span style={{ color: C.success }}>Passed</span>;
          } else {
            icon = <Status kind="run" size={26} t={t} />;
            meta = <span style={{ color: C.accent }}>Running…</span>;
          }
          const hl = failed ? p(t, j.fail as number, 0.4) : 0;
          return (
            <div key={j.name} style={{ height: rowH, display: "flex", alignItems: "center", gap: 16, padding: "0 12px", borderRadius: 10, background: hl ? `rgba(255,107,117,${0.1 * hl})` : picked && !running ? "rgba(145,71,255,0.06)" : "transparent", border: `1px solid ${hl ? `rgba(255,107,117,${0.4 * hl})` : "transparent"}` }}>
              <span style={{ transform: `scale(${1 + (1 - pop) * (done || failed ? 0.3 : 0)})`, display: "inline-flex" }}>{icon}</span>
              <span style={{ flex: 1, fontFamily: SANS, fontSize: g.v ? 22 : 24, color: C.white }}>{j.name}</span>
              <span style={{ fontFamily: MONO, fontSize: g.v ? 17 : 18 }}>{meta}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- fase A: conectar */

function Label({ children }: { children: ReactNode }) {
  return <div style={{ fontFamily: SANS, fontSize: 19, lineHeight: 1.2, color: C.muted, marginBottom: 10 }}>{children}</div>;
}

function Box({ children, focus = 0 }: { children: ReactNode; focus?: number }) {
  return (
    <div style={{ height: 60, boxSizing: "border-box", border: `1px solid ${focus ? C.lavender : C.lineStrong}`, boxShadow: focus ? `0 0 0 3px rgba(193,138,255,${0.25 * focus})` : undefined, borderRadius: 10, background: C.bg, display: "flex", alignItems: "center", padding: "0 18px", fontFamily: MONO, fontSize: 21, color: C.white, whiteSpace: "nowrap", overflow: "hidden" }}>
      {children}
    </div>
  );
}

const BTN_Y = 430;
const BTN_W = 380;

function Connect({ t, g }: { t: number; g: Geo }) {
  const url = typed(t, VO.prod1 + 0.2, URL, 34);
  const caret = url.length < URL.length || Math.floor(t * 2.5) % 2 === 0;
  const press = t >= RUN && t < RUN + 0.18 ? 1 : 0;
  const w = g.stage.w - 64;
  return (
    <div style={{ position: "absolute", left: 32, top: 26, width: w }}>
      <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 32, lineHeight: 1.2, color: C.white, letterSpacing: "-0.02em", marginBottom: 28 }}>Verify a change</div>
      <Label>Preview deployment</Label>
      <Box focus={url.length < URL.length && t > VO.prod1 ? 1 : 0}>
        <span style={{ color: C.accent }}>{url.slice(0, 8)}</span>
        {url.slice(8)}
        {caret && t < VO.prod1 + 2.2 && <span style={{ display: "inline-block", width: 2, height: 26, background: C.white, marginLeft: 2 }} />}
      </Box>
      <div style={{ height: 30 }} />
      <Label>Compare with</Label>
      <Box>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
          <Status kind="pass" size={22} />
          <span>Last version that worked · main@a41f2c</span>
        </span>
      </Box>
      <div
        style={{
          position: "absolute",
          top: BTN_Y - 26,
          left: 0,
          width: BTN_W,
          height: 64,
          background: C.action,
          color: "#fff",
          fontFamily: SANS,
          fontWeight: 600,
          fontSize: 23,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          boxShadow: `${6 - press * 4}px ${6 - press * 4}px 0 0 ${C.pixelShadow}`,
          transform: `translate(${press * 4}px, ${press * 4}px)`,
        }}
      >
        Verify this change <span style={{ fontFamily: MONO }}>→</span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- fase B: rodar */

function browserRect(g: Geo) {
  return { x: 32, y: 112, w: g.stage.w - 64, h: g.stage.h - 112 - 28 };
}

function stepAt(t: number) {
  if (t < 28.45) return 0;
  if (t < 28.95) return 1;
  if (t < 30.3) return 2;
  return 3;
}

function Run({ t, g }: { t: number; g: Geo }) {
  const b = browserRect(g);
  const scale = g.v ? 0.62 : 0.92;
  const onCheckout = t >= 28.95;
  const failed = t >= CUE.prodFail;
  const step = stepAt(t);
  const press = t >= 30.55 && t < 30.75 ? 1 : 0;
  const pressCart = t >= 28.45 && t < 28.62 ? 1 : 0;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", left: 32, top: 24, right: 32, display: "flex", alignItems: "center", gap: 14 }}>
        {failed ? <Status kind="fail" size={30} /> : <Status kind="run" size={30} t={t} />}
        <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 28, color: C.white }}>Checkout</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: MONO, fontSize: 20, color: failed ? C.critical : C.muted }}>
          {failed ? "Failed at step 4 of 5" : `Step ${step + 1} of 5 · ${STEPS[step]}`}
        </span>
      </div>
      <div style={{ position: "absolute", left: 32, right: 32, top: 74, display: "flex", gap: 8 }}>
        {STEPS.map((s, i) => {
          const col = i < step ? C.success : i === step ? (failed ? C.critical : C.accent) : C.line;
          return <div key={s} style={{ flex: 1, height: 8, background: col }} />;
        })}
      </div>
      <div style={{ position: "absolute", left: b.x, top: b.y }}>
        <Window w={b.w} h={b.h} tone="light" url={onCheckout ? "pr-142.preview.acme-store.dev/checkout" : "pr-142.preview.acme-store.dev/products/everyday-tote"} shadow={false}>
          {onCheckout ? (
            <Checkout w={b.w} h={b.h - 52} scale={scale} s={{ broken: true, press, toast: p(t, CUE.prodFail, 0.3), console: p(t, CUE.prodFail + 0.15, 0.35) }} />
          ) : (
            <ProductPage w={b.w} h={b.h - 52} scale={scale} press={pressCart} />
          )}
        </Window>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- fase C: comparar */

function Compare({ t, g }: { t: number; g: Geo }) {
  const gap = 24;
  const top = g.v ? 100 : 128;
  const bottom = g.v ? 84 : 28;
  const pw = g.v ? g.stage.w - 64 : (g.stage.w - 64 - gap) / 2;
  const ph = g.v ? (g.stage.h - top - bottom - gap) / 2 : g.stage.h - top - bottom;
  const scan = p(t, CUE.prodCompare + 0.5, 1.0, (n) => n);
  const mark = p(t, CUE.prodCompare + 1.2, 0.4);
  const panel = (i: number) => {
    const broken = i === 1;
    const k = p(t, CUE.prodCompare + 0.1 + i * 0.15, 0.5);
    return (
      <div key={i} style={{ width: pw, height: ph, borderRadius: 12, overflow: "hidden", border: `2px solid ${broken && mark ? C.critical : C.line}`, background: C.surface, opacity: k, transform: `translateY(${(1 - k) * 30}px)`, position: "relative", boxSizing: "border-box" }}>
        <div style={{ height: 50, display: "flex", alignItems: "center", gap: 12, padding: "0 18px", borderBottom: `1px solid ${C.line}` }}>
          <Status kind={broken ? "fail" : "pass"} size={24} />
          <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 21, color: C.white }}>{broken ? "This change" : "Last version that worked"}</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontFamily: MONO, fontSize: 18, color: C.muted }}>{broken ? "pr-142" : "main@a41f2c"}</span>
        </div>
        <div style={{ position: "absolute", top: 50, left: 0, right: 0, bottom: 0, overflow: "hidden" }}>
          <Checkout w={pw} h={ph - 50} scale={g.v ? 0.6 : 0.72} stack={!g.v} s={{ broken, mark: broken ? mark : 0 }} />
        </div>
        {/* a linha de comparação percorrendo o print */}
        {scan > 0 && scan < 1 && <div style={{ position: "absolute", top: 50, bottom: 0, left: `${scan * 100}%`, width: 3, background: C.lavender, boxShadow: `0 0 24px 6px rgba(193,138,255,0.5)` }} />}
      </div>
    );
  };
  const chips = p(t, CUE.prodCompare + 1.5, 0.5);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", left: 32, top: 26, right: 32, display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: g.v ? 30 : 28, color: C.white, letterSpacing: "-0.02em", position: "relative", top: g.v ? 0 : -10 }}>Compared with the last version that worked</span>
      </div>
      <div style={{ position: "absolute", left: 32, top, display: "flex", flexDirection: g.v ? "column" : "row", gap }}>
        {panel(0)}
        {panel(1)}
      </div>
      <div style={{ position: "absolute", left: 32, right: 32, ...(g.v ? { bottom: 24 } : { top: 70 }), display: "flex", gap: 14, flexWrap: "wrap", opacity: chips, transform: `translateY(${(1 - chips) * 16}px)` }}>
        <Pill color={C.critical} dot={C.critical} size={20}>REGRESSION</Pill>
        <span style={{ fontFamily: MONO, fontSize: 20, color: C.white, alignSelf: "center" }}>Order total: $43.20 → $NaN</span>
        <span style={{ fontFamily: MONO, fontSize: 20, color: C.muted, alignSelf: "center" }}>· “Pay now” sends no request</span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- fase D: o relatório */

const COPY_W = 470;

function Section({ title, children, glow = 0, style }: { title: string; children: ReactNode; glow?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ border: `1px solid ${glow ? `rgba(193,138,255,${0.3 + glow * 0.6})` : C.line}`, boxShadow: glow ? `0 0 0 4px rgba(145,71,255,${glow * 0.18})` : undefined, borderRadius: 12, background: C.surface, padding: "16px 20px", boxSizing: "border-box", ...style }}>
      <div style={{ fontFamily: PIXEL, fontSize: 19, letterSpacing: "0.06em", color: C.accent, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function copyButtonRect(g: Geo) {
  return { x: 32, y: g.stage.h - 28 - 66, w: g.v ? g.stage.w - 64 : COPY_W, h: 66 };
}

function Report({ t, g }: { t: number; g: Geo }) {
  const r0 = CUE.prodReport;
  const glowStep = p(t, r0 + 0.1, 0.4) * (1 - p(t, CUE.prodShot - 0.1, 0.4));
  const glowShot = p(t, CUE.prodShot, 0.4) * (1 - p(t, CUE.prodReportText, 0.4));
  const glowRepro = p(t, CUE.prodReportText, 0.4) * (1 - p(t, 39.0, 0.4));
  const copied = t >= CUE.prodCopy + 0.1;
  const press = t >= CUE.prodCopy && t < CUE.prodCopy + 0.18 ? 1 : 0;
  const glowBtn = p(t, 39.0, 0.4);
  const cb = copyButtonRect(g);
  const k = (i: number) => p(t, r0 - 0.2 + i * 0.1, 0.5);
  const fade = (i: number) => ({ opacity: k(i), transform: `translateY(${(1 - k(i)) * 20}px)` });
  const colW = g.v ? g.stage.w - 64 : 560;
  const shotW = g.v ? (g.stage.w - 64 - 20) / 2 : g.stage.w - 64 - 560 - 24;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", left: 32, right: 32, top: 24, ...fade(0) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <Status kind="fail" size={34} />
          <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: g.v ? 34 : 36, letterSpacing: "-0.025em", color: C.white }}>Checkout fails at step 4</span>
          <Pill color={C.critical} dot={C.critical} size={18}>REGRESSION</Pill>
        </div>
        <div style={{ fontFamily: SANS, fontSize: 22, color: C.muted, marginTop: 10 }}>“Pay now” does nothing. The order total shows $NaN.</div>
      </div>
      <div style={{ position: "absolute", left: 32, top: g.v ? 140 : 132, width: colW, display: "grid", gap: 16 }}>
        <Section title="FAILING STEP" glow={glowStep} style={fade(1)}>
          <div style={{ fontFamily: SANS, fontSize: 23, color: C.white }}>
            Step 4 of 5 · Click <span style={{ fontFamily: MONO, color: C.ink }}>“Pay now”</span>
          </div>
        </Section>
        <Section title="STEPS TO REPRODUCE" glow={glowRepro} style={fade(2)}>
          <div style={{ display: "grid", gap: 6, fontFamily: MONO, fontSize: 19, color: C.white, lineHeight: 1.35 }}>
            <span><span style={{ color: C.dim }}>1</span>  Open /products/everyday-tote</span>
            <span><span style={{ color: C.dim }}>2</span>  Add to cart</span>
            <span><span style={{ color: C.dim }}>3</span>  Open checkout with WELCOME10</span>
            <span><span style={{ color: C.dim }}>4</span>  Click “Pay now”</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 14px", marginTop: 14, fontFamily: SANS, fontSize: 19 }}>
            <span style={{ color: C.muted }}>Expected</span>
            <span style={{ color: C.white }}>Order confirmation</span>
            <span style={{ color: C.muted }}>Actual</span>
            <span style={{ color: C.critical }}>Error toast, no order request</span>
          </div>
        </Section>
      </div>
      <div style={{ position: "absolute", left: g.v ? 32 : 32 + 560 + 24, top: g.v ? 140 + 112 + 16 + 290 + 16 : 132, display: "flex", flexDirection: g.v ? "row" : "column", gap: g.v ? 20 : 16 }}>
        <Section title="SCREENSHOT" glow={glowShot} style={{ width: shotW, ...fade(3) }}>
          <div style={{ height: g.v ? 170 : 236, borderRadius: 8, overflow: "hidden", border: `1px solid ${C.line}`, position: "relative" }}>
            <div style={{ position: "absolute", left: 0, top: g.v ? -70 : -60 }}>
              <Checkout w={shotW - 40} h={400} scale={g.v ? 0.38 : 0.5} stack s={{ broken: true, mark: 1, toast: 1 }} />
            </div>
          </div>
        </Section>
        <Section title="CONSOLE" glow={glowShot * 0.6} style={{ width: shotW, ...fade(4) }}>
          <div style={{ fontFamily: MONO, fontSize: g.v ? 16 : 18, lineHeight: 1.5, color: "#FF8A93", height: g.v ? 170 : undefined }}>
            TypeError: Cannot read properties of undefined (reading &apos;total&apos;)
            <div style={{ color: C.muted }}>at applyCoupon (lib/cart.ts:42)</div>
          </div>
        </Section>
      </div>
      {/* o botão: copiar o relatório e devolver ao agente */}
      <div style={{ position: "absolute", left: cb.x, top: cb.y, display: "flex", alignItems: "center", gap: 22, ...fade(5) }}>
        <div
          style={{
            width: cb.w,
            height: cb.h,
            background: copied ? C.success : C.action,
            color: copied ? C.bg : "#fff",
            fontFamily: SANS,
            fontWeight: 600,
            fontSize: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            boxShadow: `${6 - press * 4}px ${6 - press * 4}px 0 0 ${copied ? "#1E6B41" : C.pixelShadow}, 0 0 0 ${glowBtn * 6}px rgba(193,138,255,${glowBtn * 0.25 * (copied ? 0 : 1)})`,
            transform: `translate(${press * 4}px, ${press * 4}px)`,
          }}
        >
          {copied ? "Copied · paste it into your agent" : "Copy bug report for your agent"}
        </div>
        {!g.v && <span style={{ fontFamily: MONO, fontSize: 18, color: C.muted }}>Markdown · steps, screenshot, error</span>}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- câmera e cursor */

type Key = { at: number; d: number; x: number; y: number; s: number; rx: number; ry: number };

function pose(t: number, keys: Key[]) {
  let { x, y, s, rx, ry } = keys[0];
  for (const k of keys.slice(1)) {
    const e = p(t, k.at, k.d, settle);
    x = lerp(x, k.x, e);
    y = lerp(y, k.y, e);
    s = lerp(s, k.s, e);
    rx = lerp(rx, k.rx, e);
    ry = lerp(ry, k.ry, e);
  }
  return { x, y, s, rx, ry };
}

function cameraKeys(v: boolean): Key[] {
  if (!v)
    return [
      { at: 24, d: 0, x: 860, y: 470, s: 0.8, rx: 26, ry: 0 },
      { at: 24.02, d: 1.2, x: 860, y: 470, s: 0.94, rx: 0, ry: 0 },
      { at: 24.9, d: 1.0, x: 1000, y: 300, s: 1.18, rx: 0, ry: -3 },
      { at: 26.15, d: 0.9, x: 330, y: 400, s: 1.16, rx: 0, ry: 4 },
      { at: 27.05, d: 0.6, x: 800, y: 560, s: 1.06, rx: 0, ry: 0 },
      { at: 27.85, d: 0.8, x: 1110, y: 540, s: 1.0, rx: 0, ry: -3 },
      { at: 30.35, d: 0.6, x: 1020, y: 600, s: 1.14, rx: 0, ry: -3 },
      { at: 31.3, d: 0.7, x: 860, y: 470, s: 0.94, rx: 0, ry: 0 },
      { at: 32.05, d: 0.7, x: 1120, y: 520, s: 1.0, rx: 0, ry: 0 },
      { at: 33.1, d: 1.0, x: 1400, y: 560, s: 1.2, rx: 0, ry: -3 },
      { at: 35.3, d: 0.7, x: 1110, y: 520, s: 1.0, rx: 0, ry: 0 },
      { at: 36.9, d: 0.7, x: 1380, y: 400, s: 1.12, rx: 0, ry: -3 },
      { at: 37.85, d: 0.7, x: 880, y: 480, s: 1.1, rx: 0, ry: 2 },
      { at: 39.0, d: 0.6, x: 900, y: 790, s: 1.22, rx: 0, ry: 0 },
      { at: 40.3, d: 1.1, x: 860, y: 470, s: 0.94, rx: 8, ry: 0 },
    ];
  return [
    { at: 24, d: 0, x: 500, y: 545, s: 0.82, rx: 24, ry: 0 },
    { at: 24.02, d: 1.2, x: 500, y: 545, s: 0.98, rx: 0, ry: 0 },
    { at: 24.9, d: 1.0, x: 500, y: 600, s: 1.04, rx: 0, ry: 0 },
    { at: 26.15, d: 0.9, x: 500, y: 480, s: 1.04, rx: 0, ry: 0 },
    { at: 27.05, d: 0.6, x: 480, y: 620, s: 1.05, rx: 0, ry: 0 },
    { at: 27.85, d: 0.8, x: 500, y: 600, s: 1.02, rx: 0, ry: 0 },
    { at: 30.35, d: 0.6, x: 490, y: 660, s: 1.06, rx: 0, ry: 0 },
    { at: 31.3, d: 0.7, x: 500, y: 545, s: 0.98, rx: 0, ry: 0 },
    { at: 33.1, d: 1.0, x: 500, y: 640, s: 1.05, rx: 0, ry: 0 },
    { at: 35.3, d: 0.7, x: 500, y: 545, s: 0.98, rx: 0, ry: 0 },
    { at: 36.9, d: 0.7, x: 500, y: 640, s: 1.03, rx: 0, ry: 0 },
    { at: 37.85, d: 0.7, x: 500, y: 520, s: 1.02, rx: 0, ry: 0 },
    { at: 39.0, d: 0.6, x: 500, y: 680, s: 1.06, rx: 0, ry: 0 },
    { at: 40.3, d: 1.1, x: 500, y: 545, s: 0.96, rx: 8, ry: 0 },
  ];
}

type Pt = { at: number; d: number; x: number; y: number };

function cursorAt(t: number, pts: Pt[]) {
  let { x, y } = pts[0];
  for (const k of pts.slice(1)) {
    const e = p(t, k.at, k.d, settle);
    x = lerp(x, k.x, e);
    y = lerp(y, k.y, e);
  }
  return { x, y };
}

/* ---------------------------------------------------------------- a cena */

export function Product() {
  const { t, v } = useStage();
  const g = geometry(v, t);
  const cam = pose(t, cameraKeys(v));
  const center = v ? { x: 540, y: 815 } : { x: 960, y: 580 };

  const phase = t < RUN + 0.15 ? "A" : t < CUE.prodCompare - 0.1 ? "B" : t < CUE.prodReport - 0.1 ? "C" : "D";
  const swap = (at: number) => p(t, at - 0.1, 0.4);

  // as posições dos cliques, no espaço da janela
  const st = g.stage;
  const verify = { x: st.x + 32 + BTN_W / 2, y: st.y + 26 + BTN_Y + 6 };
  const b = browserRect(g);
  const scale = v ? 0.62 : 0.92;
  const cart = cartButton(b.w, scale);
  const pay = payButton(b.w, scale, false);
  const toBrowser = (q: { x: number; y: number }) => ({ x: st.x + b.x + q.x, y: st.y + b.y + 52 + q.y });
  const cartPt = toBrowser(cart);
  const payPt = toBrowser(pay);
  const cb = copyButtonRect(g);
  const copyPt = { x: st.x + cb.x + cb.w / 2, y: st.y + cb.y + cb.h / 2 };
  const pts: Pt[] = [
    { at: 24, d: 0, x: g.W * 0.9, y: g.H * 0.95 },
    { at: 26.7, d: 0.8, x: verify.x + 40, y: verify.y + 10 },
    { at: 27.85, d: 0.5, x: cartPt.x, y: cartPt.y },
    { at: 29.85, d: 0.6, x: payPt.x, y: payPt.y },
    { at: 31.4, d: 0.8, x: g.W * 0.92, y: g.H * 0.9 },
    { at: 38.85, d: 0.7, x: copyPt.x + 30, y: copyPt.y + 8 },
  ];
  const cur = cursorAt(t, pts);
  const clicks = [RUN, 28.45, 30.55, CUE.prodCopy];
  const lastClick = clicks.filter((c) => t >= c).pop() ?? -9;
  const press = t - lastClick < 0.18 ? 1 : 0;
  const ring = p(t, lastClick, 0.4, (n) => n);
  // o cursor da automação ganha o selo "Publishub" quando o navegador roda a jornada
  const auto = t >= RUN + 0.2 && t < 31.3;

  const badge = p(t, 24.3, 0.6);

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: v ? 168 : 34, display: "flex", justifyContent: "center", opacity: badge, zIndex: 10 }}>
        <Pill size={v ? 24 : 22} color={C.ink} style={{ background: C.bg, borderColor: C.lineStrong, boxShadow: "0 10px 30px rgba(0,0,0,0.6)" }}>CONCEPT PREVIEW · PUBLISHUB IS IN DEVELOPMENT</Pill>
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          transformOrigin: "0 0",
          transform: `translate(${center.x}px, ${center.y}px) perspective(2200px) rotateX(${cam.rx}deg) rotateY(${cam.ry}deg) scale(${cam.s}) translate(${-cam.x}px, ${-cam.y}px)`,
        }}
      >
        <Window w={g.W} h={g.H} style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 64, display: "flex", alignItems: "center", gap: 18, padding: "0 24px", borderBottom: `1px solid ${C.line}` }}>
            <Wordmark size={30} />
            <span style={{ fontFamily: SANS, fontSize: 22, color: C.dim }}>/</span>
            <span style={{ fontFamily: SANS, fontSize: 22, color: C.muted }}>acme-store</span>
            <span style={{ fontFamily: SANS, fontSize: 22, color: C.dim }}>/</span>
            <span style={{ fontFamily: SANS, fontSize: 22, color: C.white }}>Verify change</span>
            <span style={{ flex: 1 }} />
            <span style={{ fontFamily: MONO, fontSize: 18, color: C.muted, border: `1px solid ${C.line}`, padding: "6px 12px", borderRadius: 8, display: v ? "none" : "inline" }}>Preview · pr-142 · coupon-codes</span>
          </div>
          {/* o corpo fica abaixo da barra do topo; as medidas (geometry) contam a barra da janela (52) */}
          <div style={{ position: "absolute", left: 0, top: -52, width: g.W, height: g.H }}>
            {g.jh > 1 && <Journeys t={t} g={g} />}
            <div style={{ position: "absolute", left: st.x, top: st.y, width: st.w, height: st.h, border: `1px solid ${C.line}`, borderRadius: 14, background: C.card, overflow: "hidden", boxSizing: "border-box" }}>
              {phase === "A" && <Connect t={t} g={g} />}
              {phase === "B" && (
                <div style={{ position: "absolute", inset: 0, opacity: swap(RUN + 0.15), transform: `translateY(${(1 - swap(RUN + 0.15)) * 20}px)` }}>
                  <Run t={t} g={g} />
                </div>
              )}
              {phase === "C" && (
                <div style={{ position: "absolute", inset: 0, opacity: swap(CUE.prodCompare - 0.1) }}>
                  <Compare t={t} g={g} />
                </div>
              )}
              {phase === "D" && (
                <div style={{ position: "absolute", inset: 0, opacity: swap(CUE.prodReport - 0.1) }}>
                  <Report t={t} g={g} />
                </div>
              )}
            </div>
            <Cursor x={cur.x} y={cur.y} press={press} ring={ring} label={auto ? "Publishub" : undefined} scale={v ? 1.1 : 1} />
          </div>
        </Window>
      </div>
    </AbsoluteFill>
  );
}
