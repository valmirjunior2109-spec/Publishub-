// Peças de interface do filme: a logo pixel-art, janelas, cursor, ícones de estado, selos e o fundo.

import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, random } from "remotion";
import L from "./logo-rects.json";
import { C, MONO, PIXEL, SANS, lerp, p, settle } from "./theme";

type Rect = [number, number, number, number, string];
const RECTS = L.rects as Rect[];

/**
 * A logo oficial. `build` (0..1) monta os blocos um a um: cada bloco cai do alto, já no lugar no fim.
 * A ordem é de cima para baixo, com um pouco de acaso, como pixels chegando.
 */
export function LogoMark({ size, build = 1, glow = 0 }: { size: number; build?: number; glow?: number }) {
  const order = RECTS.map((r, i) => ({ r, i, k: (r[1] + 3.5) / 21 * 0.75 + random(`logo-${i}`) * 0.25 }));
  return (
    <svg width={size} height={size} viewBox="-4 -3.5 20.5 20.5" shapeRendering="crispEdges" style={{ overflow: "visible", filter: glow ? `drop-shadow(0 0 ${glow}px rgba(145,71,255,0.55))` : undefined }}>
      {order.map(({ r: [x, y, w, h, fill], i, k }) => {
        const local = Math.max(0, Math.min(1, (build - k * 0.7) / 0.3));
        const e = settle(local);
        if (local <= 0) return null;
        return <rect key={i} x={x} y={y - (1 - e) * 3} width={w} height={h} fill={fill} opacity={Math.min(1, local * 2)} />;
      })}
    </svg>
  );
}

/** [P]ublishub: a logo no lugar do "P", em Pixelify Sans, como no cabeçalho do site. `chars` revela as letras. */
export function Wordmark({ size, build = 1, chars = 99, color = C.ink }: { size: number; build?: number; chars?: number; color?: string }) {
  const word = "ublishub";
  const mark = (0.9 * 20.5) / 16;
  return (
    <div style={{ display: "inline-flex", alignItems: "baseline", fontFamily: PIXEL, fontWeight: 600, fontSize: size, color, lineHeight: 1, letterSpacing: "0.01em", whiteSpace: "nowrap" }}>
      <span style={{ display: "inline-block", width: `${mark}em`, height: `${mark}em`, verticalAlign: `-${0.9 / 16}em`, position: "relative", top: `${0.9 / 16}em` }}>
        <LogoMark size={size * mark} build={build} />
      </span>
      <span>
        {word.split("").map((ch, i) => (
          <span key={i} style={{ opacity: i < chars ? 1 : 0 }}>
            {ch}
          </span>
        ))}
      </span>
    </div>
  );
}

/** O fundo do filme: Midnight, a grade do site, um feixe de luz roxa vindo de cima, vinheta e grão. */
export function Backdrop({ t, beam = 1, grid = 1, hue = C.action }: { t: number; beam?: number; grid?: number; hue?: string }) {
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill
        style={{
          opacity: 0.55 * grid,
          backgroundImage: `linear-gradient(rgba(242,215,160,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(242,215,160,0.045) 1px, transparent 1px)`,
          backgroundSize: "72px 72px",
          backgroundPosition: `${(t * 6) % 72}px ${(t * 10) % 72}px`,
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 20%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 20%, transparent 75%)",
        }}
      />
      <AbsoluteFill style={{ opacity: 0.32 * beam, background: `radial-gradient(ellipse 55% 42% at 50% -6%, ${hue}, transparent 70%)` }} />
      <AbsoluteFill style={{ opacity: 0.1 * beam, background: `radial-gradient(ellipse 40% 30% at 50% 108%, ${C.lavender}, transparent 70%)` }} />
    </AbsoluteFill>
  );
}

export function Vignette() {
  return <AbsoluteFill style={{ background: "radial-gradient(ellipse 85% 75% at 50% 50%, transparent 55%, rgba(5,4,8,0.7) 100%)", pointerEvents: "none" }} />;
}

/** Grão de filme: ruído fractal com semente por quadro, bem leve. */
export function Grain({ frame, opacity = 0.06 }: { frame: number; opacity?: number }) {
  return (
    <AbsoluteFill style={{ opacity, mixBlendMode: "overlay", pointerEvents: "none" }}>
      <svg width="100%" height="100%">
        <filter id={`g${frame % 6}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={frame % 6} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#g${frame % 6})`} />
      </svg>
    </AbsoluteFill>
  );
}

/** Janela com barra de título. `tone="dark"` é a Publishub; `tone="light"` é o navegador mostrando a loja de exemplo. */
export function Window({ w, h, title, url, tone = "dark", children, style, shadow = true }: { w: number; h: number; title?: ReactNode; url?: string; tone?: "dark" | "light"; children: ReactNode; style?: CSSProperties; shadow?: boolean }) {
  const dark = tone === "dark";
  const bar = 52;
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 18,
        overflow: "hidden",
        background: dark ? C.card : C.store.bg,
        border: `1px solid ${dark ? C.line : "rgba(255,255,255,0.14)"}`,
        boxShadow: shadow ? "0 40px 120px -20px rgba(0,0,0,0.75), 0 0 0 1px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)" : undefined,
        position: "relative",
        ...style,
      }}
    >
      <div style={{ height: bar, display: "flex", alignItems: "center", gap: 18, padding: "0 20px", background: dark ? C.surface : "#EFEDF2", borderBottom: `1px solid ${dark ? C.line : C.store.line}` }}>
        <div style={{ display: "flex", gap: 8 }}>
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
            <span key={c} style={{ width: 12, height: 12, borderRadius: 6, background: dark ? "#3A3145" : c, opacity: dark ? 1 : 0.85 }} />
          ))}
        </div>
        {url !== undefined && (
          <div style={{ flex: 1, height: 32, borderRadius: 8, background: dark ? C.bg : "#FFFFFF", border: `1px solid ${dark ? C.line : C.store.line}`, display: "flex", alignItems: "center", padding: "0 14px", fontFamily: MONO, fontSize: 16, color: dark ? C.muted : C.store.muted, whiteSpace: "nowrap", overflow: "hidden" }}>
            {url}
          </div>
        )}
        {title && <div style={{ flex: url === undefined ? 1 : undefined, fontFamily: SANS, fontSize: 17, color: dark ? C.muted : C.store.muted, textAlign: url === undefined ? "center" : undefined, marginRight: url === undefined ? 56 : 0 }}>{title}</div>}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: bar, bottom: 0 }}>{children}</div>
    </div>
  );
}

/** O ponteiro do mouse. `press` (0..1) afunda um pouco no clique, e um anel se abre. */
export function Cursor({ x, y, press = 0, ring = 0, label, scale = 1 }: { x: number; y: number; press?: number; ring?: number; label?: string; scale?: number }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `scale(${scale * (1 - press * 0.12)})`, transformOrigin: "0 0", zIndex: 50, pointerEvents: "none" }}>
      {ring > 0 && ring < 1 && (
        <div style={{ position: "absolute", left: -30 * ring - 6, top: -30 * ring - 6, width: 12 + 60 * ring, height: 12 + 60 * ring, borderRadius: "50%", border: `3px solid ${C.lavender}`, opacity: 1 - ring }} />
      )}
      <svg width="34" height="40" viewBox="0 0 17 20" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.45))" }}>
        <path d="M1 1 L1 16 L5 12.4 L7.8 18.6 L10.4 17.4 L7.7 11.4 L13 11.4 Z" fill="#FFFFFF" stroke="#0D0B12" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
      {label && (
        <div style={{ position: "absolute", left: 30, top: 30, background: C.action, color: "#fff", fontFamily: SANS, fontWeight: 600, fontSize: 18, padding: "4px 10px", borderRadius: 6, whiteSpace: "nowrap" }}>{label}</div>
      )}
    </div>
  );
}

/** Ícones de estado no estilo pixel: passou, falhou, rodando, na fila. */
export function Status({ kind, size = 26, t = 0 }: { kind: "pass" | "fail" | "run" | "queue"; size?: number; t?: number }) {
  if (kind === "run") {
    return (
      <svg width={size} height={size} viewBox="0 0 26 26">
        <circle cx="13" cy="13" r="10" fill="none" stroke={C.line} strokeWidth="3" />
        <circle cx="13" cy="13" r="10" fill="none" stroke={C.accent} strokeWidth="3" strokeDasharray="18 60" strokeLinecap="round" transform={`rotate(${t * 420} 13 13)`} />
      </svg>
    );
  }
  if (kind === "queue") {
    return (
      <svg width={size} height={size} viewBox="0 0 26 26">
        <circle cx="13" cy="13" r="10" fill="none" stroke={C.line} strokeWidth="3" strokeDasharray="3 4" />
      </svg>
    );
  }
  const pass = kind === "pass";
  const col = pass ? C.success : C.critical;
  return (
    <svg width={size} height={size} viewBox="0 0 13 13" shapeRendering="crispEdges">
      <rect x="0" y="0" width="13" height="13" rx="0" fill={pass ? C.successSoft : C.criticalSoft} />
      <rect x="0" y="0" width="13" height="1" fill={col} opacity="0.5" />
      {pass ? (
        <g fill={col}>
          <rect x="3" y="6" width="1" height="1" />
          <rect x="4" y="7" width="1" height="1" />
          <rect x="5" y="8" width="1" height="1" />
          <rect x="6" y="7" width="1" height="1" />
          <rect x="7" y="6" width="1" height="1" />
          <rect x="8" y="5" width="1" height="1" />
          <rect x="9" y="4" width="1" height="1" />
          <rect x="3" y="7" width="1" height="1" />
          <rect x="4" y="8" width="1" height="1" />
          <rect x="5" y="9" width="1" height="1" />
          <rect x="6" y="8" width="1" height="1" />
          <rect x="7" y="7" width="1" height="1" />
          <rect x="8" y="6" width="1" height="1" />
          <rect x="9" y="5" width="1" height="1" />
        </g>
      ) : (
        <g fill={col}>
          {[3, 4, 5, 6, 7, 8, 9].map((k) => (
            <g key={k}>
              <rect x={k} y={k} width="1.2" height="1.2" />
              <rect x={12 - k} y={k} width="1.2" height="1.2" />
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}

/** Selo pixel (como "Early access · Coming soon" do site). */
export function Pill({ children, color = C.accent, dot = C.action, size = 22, style }: { children: ReactNode; color?: string; dot?: string; size?: number; style?: CSSProperties }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: size * 0.45, border: `2px solid ${C.line}`, background: "rgba(13,11,18,0.7)", padding: `${size * 0.25}px ${size * 0.6}px`, fontFamily: PIXEL, fontSize: size, color, letterSpacing: "0.04em", whiteSpace: "nowrap", ...style }}>
      <span style={{ width: size * 0.36, height: size * 0.36, background: dot }} />
      {children}
    </div>
  );
}

/** Uma linha de "código fantasma": barras com cores de sintaxe, para os editores ao fundo. */
export function GhostLine({ seed, w, reveal = 1 }: { seed: string; w: number; reveal?: number }) {
  const n = 2 + Math.floor(random(seed) * 4);
  const cols = [C.accent, C.ink, C.muted, C.lavender, C.success, C.dim];
  let x = Math.floor(random(seed + "i") * 4) * 22;
  const parts: { x: number; w: number; c: string }[] = [];
  for (let i = 0; i < n; i++) {
    const pw = 30 + random(seed + i) * 120;
    if (x + pw > w) break;
    parts.push({ x, w: pw, c: cols[Math.floor(random(seed + "c" + i) * cols.length)] });
    x += pw + 12;
  }
  const max = x * reveal;
  return (
    <div style={{ position: "relative", height: 10, width: w }}>
      {parts.map((q, i) => (q.x < max ? <span key={i} style={{ position: "absolute", left: q.x, width: Math.min(q.w, max - q.x), height: 10, borderRadius: 3, background: q.c, opacity: 0.55 }} /> : null))}
    </div>
  );
}

/** Texto cinético: cada palavra sobe de dentro de uma máscara, em cascata. */
export function Rise({ t, at, text, size, color = C.ink, weight = 600, stagger = 0.055, dur = 0.7, align = "center", lineHeight = 1.04, tracking = -0.045, style, font = SANS }: { t: number; at: number; text: string; size: number; color?: string; weight?: number; stagger?: number; dur?: number; align?: "center" | "left"; lineHeight?: number; tracking?: number; style?: CSSProperties; font?: string }) {
  const words = text.split(" ");
  return (
    <div style={{ fontFamily: font, fontSize: size, fontWeight: weight, color, lineHeight, letterSpacing: `${tracking}em`, textAlign: align, textWrap: "balance", ...style }}>
      {words.map((wd, i) => {
        const k = p(t, at + i * stagger, dur);
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingBottom: "0.12em", marginBottom: "-0.12em" }}>
            <span style={{ display: "inline-block", transform: `translateY(${lerp(105, 0, k)}%)`, opacity: k > 0 ? 1 : 0 }}>
              {wd}
              {i < words.length - 1 ? " " : ""}
            </span>
          </span>
        );
      })}
    </div>
  );
}
