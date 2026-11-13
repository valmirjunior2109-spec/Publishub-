// 4–11,5 s · A revolução. Um campo de editores escrevendo código sozinhos, em 3D; os três agentes entram no tempo da fala.

import { AbsoluteFill } from "remotion";
import { C, CUE, MONO, SANS, VO, lerp, p, useStage } from "../theme";
import { GhostLine, Rise } from "../ui";

const FILES = ["checkout/page.tsx", "lib/cart.ts", "api/orders.ts", "auth/session.ts", "app/layout.tsx", "billing/plans.ts", "onboarding/steps.tsx", "emails/welcome.tsx", "db/schema.sql", "search/index.ts", "settings/team.tsx", "api/webhooks.ts", "dashboard/chart.tsx", "lib/flags.ts", "invite/accept.tsx"];

function Pane({ i, t, w, h }: { i: number; t: number; w: number; h: number }) {
  const start = 4 + (i % 5) * 0.18;
  const rows = 14;
  const speed = 4.5 + (i % 3);
  const written = Math.max(0, (t - start) * speed);
  return (
    <div style={{ width: w, height: h, borderRadius: 14, background: "rgba(23,19,31,0.92)", border: `1px solid ${C.line}`, overflow: "hidden", boxShadow: "0 30px 60px -20px rgba(0,0,0,0.6)" }}>
      <div style={{ height: 40, display: "flex", alignItems: "center", gap: 10, padding: "0 16px", borderBottom: `1px solid ${C.line}`, fontFamily: MONO, fontSize: 16, color: C.muted }}>
        <span style={{ width: 8, height: 8, background: i % 4 === 0 ? C.success : C.action }} />
        {FILES[i % FILES.length]}
      </div>
      <div style={{ padding: "16px 18px", display: "grid", gap: 11 }}>
        {Array.from({ length: rows }, (_, r) => {
          const k = Math.max(0, Math.min(1, written - r));
          return (
            <div key={r} style={{ display: "flex", gap: 14, alignItems: "center", opacity: k > 0 ? 1 : 0.18 }}>
              <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim, width: 18 }}>{r + 1}</span>
              <GhostLine seed={`p${i}r${r}`} w={w - 80} reveal={k} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Chip({ t, at, label }: { t: number; at: number; label: string }) {
  const k = p(t, at, 0.5);
  const flash = 1 - p(t, at, 0.6);
  return (
    <div
      style={{
        opacity: k,
        transform: `translateY(${(1 - k) * 30}px) scale(${0.9 + 0.1 * k})`,
        filter: k < 1 ? `blur(${(1 - k) * 6}px)` : undefined,
        fontFamily: MONO,
        fontWeight: 500,
        fontSize: 46,
        color: C.white,
        padding: "14px 26px",
        border: `2px solid ${flash > 0.05 ? C.lavender : C.line}`,
        background: `rgba(145,71,255,${0.08 + flash * 0.25})`,
        boxShadow: `6px 6px 0 0 ${C.pixelShadow}`,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
  );
}

export function Era() {
  const { t, v } = useStage();
  const cols = v ? 3 : 5;
  const rowsN = v ? 5 : 3;
  const pw = 560;
  const ph = 380;
  const gap = 36;
  const gw = cols * pw + (cols - 1) * gap;
  const gh = rowsN * ph + (rowsN - 1) * gap;
  const local = t - 4;
  const two = t >= VO.era2 - 0.15;
  const swap = p(t, VO.era2 - 0.2, 0.5);

  return (
    <AbsoluteFill>
      {/* o campo de editores, deitado em perspectiva, deslizando devagar */}
      <AbsoluteFill style={{ perspective: 2000, alignItems: "center", justifyContent: "center", opacity: 0.85 }}>
        <div
          style={{
            width: gw,
            height: gh,
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, ${pw}px)`,
            gap,
            transform: `translateY(${v ? 120 : 160}px) rotateX(52deg) rotateZ(${v ? -24 : -18}deg) scale(${v ? 1.25 : 1.1}) translateY(${-local * 38}px)`,
            transformStyle: "preserve-3d",
            maskImage: "linear-gradient(to bottom, transparent 0%, black 30%, black 75%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 30%, black 75%, transparent 100%)",
          }}
        >
          {Array.from({ length: cols * rowsN }, (_, i) => (
            <Pane key={i} i={i} t={t} w={pw} h={ph} />
          ))}
        </div>
      </AbsoluteFill>
      {/* um véu para o texto respirar */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse ${v ? "95% 45%" : "60% 55%"} at 50% ${v ? 38 : 45}%, rgba(13,11,18,0.92) 30%, rgba(13,11,18,0.35) 80%)` }} />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: v ? 430 : 250 }}>
        {!two || swap < 1 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: v ? 56 : 48, opacity: 1 - swap, transform: `translateY(${-swap * 60}px)`, filter: swap ? `blur(${swap * 12}px)` : undefined }}>
            <div style={{ width: v ? 920 : 1500 }}>
              <Rise t={t} at={VO.era1 - 0.1} text="Developers are shipping" size={v ? 92 : 104} color={C.muted} stagger={0.12} />
              <Rise t={t} at={VO.era1 + 0.75} text="entire products with" size={v ? 92 : 104} color={C.white} stagger={0.14} />
            </div>
            <div style={{ display: "flex", flexDirection: v ? "column" : "row", gap: v ? 28 : 32, alignItems: "center" }}>
              <Chip t={t} at={CUE.eraTool1 - 0.05} label="Claude Code" />
              <Chip t={t} at={CUE.eraTool2 - 0.05} label="Cursor" />
              <Chip t={t} at={CUE.eraTool3 - 0.05} label="Codex" />
            </div>
          </div>
        ) : null}
        {two && (
          <div style={{ position: "absolute", top: v ? 600 : 330, width: v ? 940 : 1600, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <Rise t={t} at={VO.era2 - 0.05} text="AI can write a feature" size={v ? 100 : 120} color={C.white} stagger={0.09} />
            <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
              <Rise t={t} at={VO.era2 + 0.95} text="in minutes." size={v ? 100 : 120} color={C.accent} />
            </div>
            <div style={{ marginTop: 40, opacity: p(t, VO.era2 + 0.4, 0.5), fontFamily: MONO, fontSize: v ? 30 : 30, color: C.muted, display: "flex", gap: 18, alignItems: "center" }}>
              <span style={{ color: C.success }}>●</span> agent · coupon-codes
              <span style={{ color: C.dim }}>·</span>
              <span style={{ color: C.white, fontVariantNumeric: "tabular-nums" }}>{`00:0${Math.min(9, Math.floor(lerp(0, 6, p(t, VO.era2, 2.2, (n) => n))))}:${String(Math.floor((t * 37) % 60)).padStart(2, "0")}`}</span>
            </div>
          </div>
        )}
      </AbsoluteFill>
      <div style={{ display: "none", fontFamily: SANS }} />
    </AbsoluteFill>
  );
}
