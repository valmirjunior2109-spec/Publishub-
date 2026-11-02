import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { easeInOut, easeOut, progress, tween } from "../anim";
import { FONT } from "../theme";
import { D, DPR, SHOT_W } from "./theme";

/* ---------- fundo: o papel escuro do site, com um brilho azul que respira ---------- */
export function Backdrop({ glowX = 50, glowY = 38 }: { glowX?: number; glowY?: number }) {
  const frame = useCurrentFrame();
  const breathe = 0.5 + 0.5 * Math.sin(frame / 40);
  return (
    <AbsoluteFill style={{ backgroundColor: D.paper }}>
      <AbsoluteFill style={{ background: `radial-gradient(60% 42% at ${glowX}% ${glowY}%, rgba(143,170,240,${0.1 + 0.05 * breathe}), rgba(143,170,240,0) 70%)` }} />
      {/* grade fina: a pauta do caderno, quase invisível */}
      <AbsoluteFill style={{ backgroundImage: "linear-gradient(rgba(244,236,223,0.035) 1px, transparent 1px)", backgroundSize: "100% 64px", maskImage: "linear-gradient(180deg, transparent, black 30%, black 70%, transparent)" }} />
    </AbsoluteFill>
  );
}

/* ---------- câmera sobre uma captura real ----------
   `view` é o retângulo da página que enche o cartão, em px CSS da página (432 de largura).
   Entre dois `keys`, a câmera desliza com ida e volta suave. */
export interface View {
  y: number; // topo do recorte, em px CSS
  w?: number; // largura do recorte em px CSS (padrão: a página inteira, 432)
  x?: number; // esquerda do recorte em px CSS
}
export interface Key {
  at: number;
  view: View;
  dur?: number;
}

export function viewAt(frame: number, keys: Key[]): Required<View> {
  const norm = (v: View) => ({ y: v.y, w: v.w ?? 432, x: v.x ?? (432 - (v.w ?? 432)) / 2 });
  let cur = norm(keys[0].view);
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    const dur = k.dur ?? 18;
    if (frame < k.at) break;
    const next = norm(k.view);
    const t = progress(frame, k.at, dur, easeInOut);
    cur = { y: cur.y + (next.y - cur.y) * t, w: cur.w + (next.w - cur.w) * t, x: cur.x + (next.x - cur.x) * t };
  }
  return cur;
}

/** Mostra `src` (captura de 1080 px de largura) com a câmera em `view`, dentro de w × h. */
export function Shot({ src, view, w, h, opacity = 1 }: { src: string; view: Required<View>; w: number; h: number; opacity?: number }) {
  const scale = w / view.w; // px na tela por px CSS da página
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", opacity }}>
      <Img
        src={staticFile(src)}
        style={{ position: "absolute", left: -view.x * scale, top: -view.y * scale, width: (SHOT_W / DPR) * scale, height: "auto", maxWidth: "none" }}
      />
    </div>
  );
}

/** Converte um retângulo da página (px CSS) para coordenadas dentro do cartão. */
export function toScreen(rect: { x: number; y: number; w: number; h: number }, view: Required<View>, w: number) {
  const s = w / view.w;
  return { x: (rect.x - view.x) * s, y: (rect.y - view.y) * s, w: rect.w * s, h: rect.h * s };
}

/* ---------- o cartão da tela: borda fina, cantos do site, sombra profunda ---------- */
export function ScreenCard({ x, y, w, h, children, style, label }: { x: number; y: number; w: number; h: number; children: ReactNode; style?: CSSProperties; label?: string }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, ...style }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 40, overflow: "hidden", backgroundColor: D.paper, border: `2px solid ${D.line}`, boxShadow: "0 40px 120px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.4)" }}>{children}</div>
      {label && (
        <div style={{ position: "absolute", top: -54, left: 8, fontFamily: FONT.mono, fontSize: 24, letterSpacing: 2, color: D.muted, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 10, height: 10, borderRadius: 99, backgroundColor: D.confirmed, boxShadow: `0 0 14px ${D.confirmed}` }} />
          {label}
        </div>
      )}
    </div>
  );
}

/* ---------- destaque: um contorno da caneta que se desenha em volta do alvo ---------- */
export function Callout({ x, y, w, h, start, radius = 18, pad = 10, color = D.accent, end }: { x: number; y: number; w: number; h: number; start: number; radius?: number; pad?: number; color?: string; end?: number }) {
  const frame = useCurrentFrame();
  const p = progress(frame, start, 16);
  const out = end === undefined ? 0 : progress(frame, end, 8);
  if (p <= 0 || out >= 1) return null;
  const W = w + pad * 2;
  const H = h + pad * 2;
  const perimeter = 2 * (W + H);
  const pulse = 0.5 + 0.5 * Math.sin((frame - start) / 6);
  return (
    <svg style={{ position: "absolute", left: x - pad, top: y - pad, width: W, height: H, overflow: "visible", opacity: 1 - out }}>
      <rect x={0} y={0} width={W} height={H} rx={radius} fill={`rgba(143,170,240,${0.1 * p})`} />
      <rect x={0} y={0} width={W} height={H} rx={radius} fill="none" stroke={color} strokeWidth={5} strokeDasharray={perimeter} strokeDashoffset={perimeter * (1 - p)} style={{ filter: `drop-shadow(0 0 ${10 + 8 * pulse}px rgba(143,170,240,0.6))` }} />
    </svg>
  );
}

/* ---------- cursor: a seta do sistema, com o toque em anel ---------- */
export function Cursor({ path, tapAt = [] }: { path: { at: number; x: number; y: number }[]; tapAt?: number[] }) {
  const frame = useCurrentFrame();
  if (frame < path[0].at - 6) return null;
  let x = path[0].x;
  let y = path[0].y;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    if (frame <= a.at) break;
    const t = interpolate(frame, [a.at, b.at], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut });
    x = a.x + (b.x - a.x) * t;
    y = a.y + (b.y - a.y) * t;
  }
  const appear = progress(frame, path[0].at - 6, 8);
  const press = tapAt.reduce((acc, f) => Math.max(acc, frame >= f && frame < f + 8 ? 1 - Math.abs(frame - f - 3) / 5 : 0), 0);
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: appear, pointerEvents: "none" }}>
      {tapAt.map((f) => {
        const r = progress(frame, f, 16);
        if (frame < f || r >= 1) return null;
        return <div key={f} style={{ position: "absolute", left: -46 * r - 4, top: -46 * r - 4, width: 92 * r + 8, height: 92 * r + 8, borderRadius: 999, border: `4px solid rgba(143,170,240,${1 - r})` }} />;
      })}
      <svg width={56} height={56} viewBox="0 0 28 28" style={{ transform: `scale(${1 - press * 0.12})`, transformOrigin: "4px 3px", filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.5))" }}>
        <path d="M4 3 L4 22 L9 17.5 L12.4 25 L15.6 23.6 L12.3 16.3 L19 16.3 Z" fill="#FFFFFF" stroke="#0C0A08" strokeWidth={1.6} strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/* ---------- headline: as palavras sobem de uma máscara; as em destaque vêm na caneta ---------- */
export function Headline({ lines, start, accent = [], size = 84, top, exit, stagger = 3 }: { lines: string[][]; start: number; accent?: string[]; size?: number; top: number; exit?: number; stagger?: number }) {
  const frame = useCurrentFrame();
  let i = 0;
  return (
    <div style={{ position: "absolute", top, left: 0, right: 0, textAlign: "center", fontFamily: FONT.sans, fontWeight: 700, fontSize: size, lineHeight: 1.02, letterSpacing: "-0.035em", color: D.ink }}>
      {lines.map((line, li) => (
        <div key={li} style={{ whiteSpace: "nowrap" }}>
          {line.map((word, wi) => {
            const k = i++;
            const p = progress(frame, start + k * stagger, 14);
            const out = exit === undefined ? 0 : progress(frame, exit + k, 8);
            const yy = (1 - p) * 105 - out * 105;
            return (
              <span key={wi} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingBottom: "0.12em", marginBottom: "-0.12em", marginRight: wi === line.length - 1 ? 0 : "0.24em" }}>
                <span style={{ display: "inline-block", transform: `translateY(${yy}%)`, color: accent.includes(word) ? D.accent : D.ink }}>{word}</span>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ---------- etiqueta: o rótulo pequeno do site (mono, caixa alta) dentro de uma pílula ---------- */
export function Chip({ children, color = D.accent, bg = "rgba(143,170,240,0.14)", style }: { children: ReactNode; color?: string; bg?: string; style?: CSSProperties }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "10px 20px", borderRadius: 999, backgroundColor: bg, color, fontFamily: FONT.mono, fontSize: 26, letterSpacing: 1.5, textTransform: "uppercase", whiteSpace: "nowrap", ...style }}>
      {children}
    </span>
  );
}

/** Entrada padrão de um bloco: sobe 40 px e acende. */
export function rise(frame: number, start: number, dur = 16) {
  const p = progress(frame, start, dur, easeOut);
  return { opacity: p, transform: `translateY(${(1 - p) * 40}px)` };
}

export { tween };
