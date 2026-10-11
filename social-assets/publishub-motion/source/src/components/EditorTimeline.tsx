import { useCurrentFrame } from "remotion";
import { progress, easeOut } from "../anim";
import { C, FONT } from "../theme";
import T from "../timeline.json";

/**
 * A abertura: a timeline de um editor de vídeo qualquer, de madrugada. Os clipes
 * correm rápido, a lâmina corta no ritmo do som (T.hook.cuts) e tudo para de
 * repente quando entra a pergunta (T.hook.question). Não é a interface do
 * Publishub: é o problema que ele resolve.
 */

const SPEED = 34; // px por quadro, enquanto a edição corre

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Quanto a timeline já andou no quadro `f` (freia em 8 quadros na pergunta). */
export function scrollAt(f: number): number {
  const q = T.hook.question;
  return SPEED * Math.min(f, q) + SPEED * 4 * progress(f, q, 8, easeOut);
}

interface Clip {
  x: number;
  w: number;
  color: string;
}

function makeTrack(seed: number, total: number, min: number, max: number, palette: string[]): Clip[] {
  const rand = seeded(seed);
  const clips: Clip[] = [];
  let x = -200;
  let i = 0;
  while (x < total) {
    const w = min + rand() * (max - min);
    clips.push({ x, w, color: palette[i++ % palette.length] });
    x += w + 6;
  }
  return clips;
}

const V_PALETTE = ["#4A3B2F", "#33405A", "#5A4A37", "#2E3A31", "#5E4330", "#3A3550"];
const B_PALETTE = ["#2B3546", "#463528", "#2D3B34"];

export function EditorTimeline({ width, trackH, rulerH = 44, labelW = 0 }: { width: number; trackH: number; rulerH?: number; labelW?: number }) {
  const f = useCurrentFrame();
  const offset = scrollAt(f);
  const total = width + scrollAt(T.durationInFrames) + 400;
  const playX = width * 0.5;
  const gap = 10;

  const tracks = [
    { name: "V2", clips: makeTrack(3, total, 140, 420, B_PALETTE), h: trackH * 0.72 },
    { name: "V1", clips: makeTrack(7, total, 120, 300, V_PALETTE), h: trackH },
    { name: "A1", clips: makeTrack(11, total, 260, 620, ["#2A241D"]), h: trackH * 0.8, audio: true },
  ];
  const height = rulerH + tracks.reduce((a, t) => a + t.h + gap, 0);

  // onde cada corte caiu, em coordenadas da timeline (anda junto com ela)
  const cuts = T.hook.cuts.filter((c) => c <= f).map((c) => ({ at: c, x: scrollAt(c) + playX }));

  let y = rulerH;
  return (
    <div style={{ position: "relative", width, height, overflow: "hidden", fontFamily: FONT.mono }}>
      {/* régua: timecodes de 2 em 2 segundos, correndo */}
      {Array.from({ length: Math.ceil(total / 120) }).map((_, i) => {
        const x = i * 120 - offset;
        if (x < -120 || x > width + 120) return null;
        const secs = i * 2 + 3600 + 47 * 60;
        const hh = Math.floor(secs / 3600);
        const mm = Math.floor((secs % 3600) / 60);
        const ss = secs % 60;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: 0, height: rulerH, borderLeft: `1.5px solid ${C.nightLine}`, paddingLeft: 8, fontSize: rulerH * 0.36, color: "#6E6355", lineHeight: `${rulerH * 0.7}px` }}>
            {`${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`}
          </div>
        );
      })}

      {tracks.map((t) => {
        const top = y;
        y += t.h + gap;
        return (
          <div key={t.name} style={{ position: "absolute", left: 0, top, width, height: t.h, background: C.nightRaised }}>
            {t.clips.map((c, i) => {
              const x = c.x - offset;
              if (x + c.w < -10 || x > width + 10) return null;
              return (
                <div key={i} style={{ position: "absolute", left: x, top: 4, width: c.w, height: t.h - 8, borderRadius: 8, background: c.color, overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}>
                  {t.audio ? <Wave w={c.w} h={t.h - 8} seed={i + 5} /> : <Frames w={c.w} h={t.h - 8} seed={i + (t.name === "V1" ? 1 : 40)} />}
                </div>
              );
            })}
            {/* as emendas dos cortes, abertas no clipe */}
            {cuts.map((c) => {
              const x = c.x - offset;
              return <div key={c.at} style={{ position: "absolute", left: x - 2, top: 0, width: 4, height: t.h, background: C.night }} />;
            })}
            {labelW > 0 && <div style={{ position: "absolute", left: 0, top: 0, width: labelW, height: t.h, background: C.nightRaised, borderRight: `1px solid ${C.nightLine}`, color: "#8A7D6B", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>{t.name}</div>}
          </div>
        );
      })}

      {/* a agulha */}
      <div style={{ position: "absolute", left: playX - 1.5, top: rulerH * 0.35, width: 3, height: height - rulerH * 0.35, background: C.caramel }} />
      <div style={{ position: "absolute", left: playX - 11, top: rulerH * 0.2, width: 22, height: 18, background: C.caramel, clipPath: "polygon(0 0, 100% 0, 100% 55%, 50% 100%, 0 55%)" }} />

      {/* o clarão da lâmina a cada corte */}
      {cuts.map((c) => {
        const k = (f - c.at) / 5;
        if (k < 0 || k > 1) return null;
        return <div key={c.at} style={{ position: "absolute", left: playX - 3, top: rulerH, width: 6, height: height - rulerH, background: C.cream, opacity: 1 - k, boxShadow: `0 0 ${24 * (1 - k)}px rgba(251,243,230,0.6)` }} />;
      })}
    </div>
  );
}

/** Miniaturas de quadros dentro do clipe: faixas de luz e sombra, sem imagem de ninguém. */
function Frames({ w, h, seed }: { w: number; h: number; seed: number }) {
  const rand = seeded(seed * 31 + 7);
  const n = Math.max(1, Math.floor(w / (h * 0.9)));
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", gap: 2, padding: 2 }}>
      {Array.from({ length: n }).map((_, i) => {
        const l = 0.06 + rand() * 0.12;
        return <div key={i} style={{ flex: 1, borderRadius: 5, background: `linear-gradient(180deg, rgba(255,255,255,${l + 0.05}) 0%, rgba(255,255,255,${l * 0.4}) 60%, rgba(0,0,0,0.15) 100%)` }} />;
      })}
    </div>
  );
}

function Wave({ w, h, seed }: { w: number; h: number; seed: number }) {
  const rand = seeded(seed * 13 + 3);
  const n = Math.floor(w / 6);
  return (
    <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>
      {Array.from({ length: n }).map((_, i) => {
        const env = 0.3 + 0.7 * Math.abs(Math.sin(i * 0.21 + seed));
        const bh = h * 0.78 * env * (0.35 + rand() * 0.65);
        return <rect key={i} x={i * 6 + 2} y={(h - bh) / 2} width={3} height={bh} rx={1.5} fill={C.caramel} opacity={0.55} />;
      })}
    </svg>
  );
}
