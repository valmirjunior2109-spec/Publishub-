import { Heart, MessageCircle, Send } from "lucide-react";
import type { ReactNode } from "react";
import { Freeze, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { progress } from "../anim";
import { FONT } from "../theme";
import { D, UI } from "./theme";

/**
 * Um celular tocando o Reel de exemplo, com a interface do Reels por cima.
 * O que toca vem de `schedule`: cada trecho é um clipe real (public/footage),
 * em quadros absolutos do anúncio; `freezeAt` congela o trecho num quadro.
 */
export interface Segment {
  src: string;
  from: number;
  to: number;
  trim?: number; // quadros a pular no começo do clipe
  freezeAt?: number; // quadro absoluto em que a imagem para
}

export function ReelVideo({ schedule }: { schedule: Segment[] }) {
  return (
    <>
      {schedule.map((s) => (
        <Sequence key={s.src + s.from} from={s.from} durationInFrames={s.to - s.from} layout="none">
          <Clip s={s} />
        </Sequence>
      ))}
    </>
  );
}

function Clip({ s }: { s: Segment }) {
  const video = <OffthreadVideo src={staticFile(s.src)} muted trimBefore={s.trim ?? 0} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />;
  if (s.freezeAt === undefined) return video;
  return <FreezeAfter at={s.freezeAt - s.from}>{video}</FreezeAfter>;
}

/** Deixa tocar até `at` (quadro relativo ao trecho) e congela dali em diante. */
function FreezeAfter({ at, children }: { at: number; children: ReactNode }) {
  const f = useCurrentFrame();
  return f < at ? <>{children}</> : <Freeze frame={at}>{children}</Freeze>;
}

export function Phone({
  width,
  schedule,
  played,
  caption = 0,
  drop = 0,
  example = true,
}: {
  width: number;
  schedule: Segment[];
  played: number; // 0 → 1, a barra de progresso do Reels
  caption?: number; // 0 → 1, a legenda aplicada pela sugestão aceita
  drop?: number; // 0 → 1, o destaque da queda (vídeo parado)
  example?: boolean;
}) {
  const s = width / 400; // o desenho foi feito para 400 px de largura
  const height = (width * 16) / 9;
  const bezel = 10 * s;
  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        borderRadius: 54 * s,
        background: D.black,
        padding: bezel,
        boxShadow: `0 0 0 ${1.5 * s}px ${D.line}, 0 ${40 * s}px ${90 * s}px -${30 * s}px rgba(0,0,0,0.7)`,
      }}
    >
      <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 44 * s, overflow: "hidden", background: "#000" }}>
        <ReelVideo schedule={schedule} />

        {/* sombra embaixo, para a interface do Reels ler sobre qualquer imagem */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "38%", background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 100%)" }} />

        {/* a queda: o vídeo para, escurece um pouco e ganha o contorno da caneta */}
        {drop > 0 && (
          <>
            <div style={{ position: "absolute", inset: 0, background: "rgba(12,10,8,0.35)", opacity: drop }} />
            <div style={{ position: "absolute", inset: 8 * s, borderRadius: 38 * s, border: `${3 * s}px solid ${D.accent}`, opacity: drop }} />
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "46%",
                transform: `translate(-50%, -50%) scale(${0.9 + 0.1 * drop})`,
                opacity: drop,
                background: D.accent,
                color: D.onAccent,
                borderRadius: 999,
                padding: `${10 * s}px ${20 * s}px`,
                fontFamily: FONT.mono,
                fontWeight: 600,
                fontSize: 22 * s,
                whiteSpace: "nowrap",
              }}
            >
              {UI.dropAt}
            </div>
          </>
        )}

        {/* a legenda que a sugestão aceita colocou na tela */}
        {caption > 0 && (
          <div style={{ position: "absolute", left: 0, right: 0, top: "18%", display: "flex", justifyContent: "center" }}>
            <span
              style={{
                display: "inline-block",
                maxWidth: "84%",
                textAlign: "center",
                background: "#FFFFFF",
                color: "#111",
                fontFamily: FONT.sans,
                fontWeight: 700,
                fontSize: 30 * s,
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                padding: `${8 * s}px ${16 * s}px`,
                borderRadius: 10 * s,
                opacity: Math.min(1, caption * 2),
                transform: `scale(${0.8 + 0.2 * caption}) rotate(${(1 - caption) * -3}deg)`,
              }}
            >
              {UI.caption}
            </span>
          </div>
        )}

        {example && (
          <span style={{ position: "absolute", left: 18 * s, top: 20 * s, borderRadius: 999, background: "rgba(0,0,0,0.55)", padding: `${4 * s}px ${11 * s}px`, fontFamily: FONT.mono, fontSize: 14 * s, fontWeight: 500, color: "#fff" }}>{UI.example}</span>
        )}
        <div style={{ position: "absolute", right: 16 * s, bottom: 70 * s, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 * s, color: "#fff" }}>
          <Heart size={28 * s} strokeWidth={2} />
          <MessageCircle size={28 * s} strokeWidth={2} />
          <Send size={26 * s} strokeWidth={2} />
        </div>
        <span style={{ position: "absolute", left: 18 * s, right: 18 * s, bottom: 26 * s, height: 4 * s, borderRadius: 999, background: "rgba(255,255,255,0.35)" }}>
          <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(1, played) * 100}%`, borderRadius: 999, background: "#fff" }} />
        </span>
      </div>
    </div>
  );
}

/** Um dedo invisível passando o Reel para cima: só o círculo do toque e o rastro. */
export function SwipeHint({ start, x, y0, y1, size }: { start: number; x: number; y0: number; y1: number; size: number }) {
  const f = useCurrentFrame();
  const p = progress(f, start, 10);
  const fade = 1 - progress(f, start + 8, 6);
  if (f < start - 4 || fade <= 0) return null;
  const appear = progress(f, start - 4, 4);
  const y = y0 + (y1 - y0) * p;
  return (
    <>
      <div style={{ position: "absolute", left: x - size * 0.1, top: y, width: size * 0.2, height: (y0 - y) + size * 0.2, borderRadius: 999, background: "linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0))", opacity: fade * appear }} />
      <div style={{ position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: 999, background: "rgba(255,255,255,0.28)", border: "2px solid rgba(255,255,255,0.7)", opacity: fade * appear, transform: `scale(${0.9 + 0.1 * appear})` }} />
    </>
  );
}
