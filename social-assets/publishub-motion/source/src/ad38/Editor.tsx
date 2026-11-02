import { Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { easeOut, mix, progress } from "../anim";
import { FONT } from "../theme";
import { D } from "./theme";
import WAVE from "./waveform.json";

/* O editor de quem criou o Reel (não é a Publishub): prévia, timeline com as
   miniaturas reais do Reel de demonstração e a forma de onda real dele. */

export const RED = "#F08A7A";
const TOTAL = WAVE.duration; // 22 s
const CUT = WAVE.cutAt; // 10,94 s: onde "weeknight bolognese" começa

export interface Mark {
  from: number; // segundos no Reel
  to: number;
  label: string;
  start: number; // quadro em que aparece
  color?: string;
  row?: number; // 0 ou 1: fileiras de rótulos acima da timeline
}

/** Tempo do Reel → x na timeline, com o trecho [0, CUT] encolhido por `collapse` (0 → 1). */
function place(t: number, width: number, collapse: number) {
  const shrink = 1 - collapse;
  const total = CUT * shrink + (TOTAL - CUT);
  const x = t < CUT ? t * shrink : CUT * shrink + (t - CUT);
  return (x / total) * width;
}

const fmt = (s: number) => `0:${String(Math.round(s)).padStart(2, "0")}`;

export function Editor({
  x,
  y,
  w,
  h,
  focus = 0,
  video = "ad38/demo-reel.mp4",
  videoStart = 0,
  playhead,
  marks = [],
  collapse = 0,
  hookMark,
  post = 0,
  durationLabel,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  focus?: number; // 0: prévia grande; 1: a timeline toma conta
  video?: string;
  videoStart?: number; // quadro do anúncio em que o vídeo começa do zero
  playhead: number; // segundos no Reel
  marks?: Mark[];
  collapse?: number;
  hookMark?: number; // quadro em que o gancho (0:11) ganha a estrela
  post?: number; // 0 → 1: o botão Post acende ("pronto para postar")
  durationLabel?: string;
}) {
  const frame = useCurrentFrame();
  const pad = 36;
  const barH = 92;
  const previewH = mix(560, 370, focus);
  const previewW = (previewH * 9) / 16;
  const stripTop = barH + 24 + previewH + 24;
  const stripW = w - pad * 2;
  const thumbH = mix(92, 130, focus);
  const waveH = mix(70, 120, focus);
  const thumbW = (thumbH * 9) / 16;
  const labelsH = mix(70, 110, focus);

  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: 40, backgroundColor: D.raised, border: `2px solid ${D.line}`, boxShadow: "0 40px 120px rgba(0,0,0,0.55)", overflow: "hidden", fontFamily: FONT.sans, color: D.ink }}>
      {/* barra do editor */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: barH, display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${pad}px`, borderBottom: `2px solid ${D.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {[0, 1, 2].map((k) => <span key={k} style={{ width: 16, height: 16, borderRadius: 99, backgroundColor: D.line }} />)}
          <span style={{ marginLeft: 14, fontFamily: FONT.mono, fontSize: 27, color: D.muted }}>weeknight-bolognese.mp4</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 30px", borderRadius: 999, fontSize: 28, fontWeight: 650, backgroundColor: post > 0 ? `rgba(143,170,240,${0.25 + 0.75 * post})` : "rgba(143,170,240,0.22)", color: post > 0.5 ? D.onAccent : D.accentStrong, boxShadow: post > 0 ? `0 0 ${30 * post}px rgba(143,170,240,${0.5 * post})` : "none" }}>
          {post > 0.5 ? "✓ Ready to post" : "Post"}
        </div>
      </div>

      {/* prévia 9:16 */}
      <div style={{ position: "absolute", top: barH + 24, left: (w - previewW) / 2, width: previewW, height: previewH, borderRadius: 22, overflow: "hidden", backgroundColor: D.black }}>
        <Sequence from={videoStart} layout="none">
          <OffthreadVideo src={staticFile(video)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </Sequence>
        <div style={{ position: "absolute", left: 14, bottom: 12, fontFamily: FONT.mono, fontSize: 22, color: "#fff", textShadow: "0 1px 6px rgba(0,0,0,0.8)" }}>{fmt(playhead)}</div>
      </div>

      {/* timeline */}
      <div style={{ position: "absolute", left: pad, top: stripTop, width: stripW }}>
        {/* rótulos dos trechos */}
        <div style={{ position: "relative", height: labelsH }}>
          {marks.map((m, k) => {
            const p = progress(frame, m.start, 14);
            if (p <= 0) return null;
            const left = place(m.from, stripW, collapse);
            const right = place(m.to, stripW, collapse);
            const color = m.color ?? RED;
            const rowY = (m.row ?? 0) === 0 ? labelsH - 52 : labelsH - 104;
            return (
              <div key={k} style={{ position: "absolute", left, top: rowY, width: Math.max(0, right - left), opacity: p * (1 - collapse), transform: `translateY(${(1 - p) * 14}px)` }}>
                <div style={{ fontFamily: FONT.mono, fontSize: mix(22, 26, focus), letterSpacing: 1, textTransform: "uppercase", color, whiteSpace: "nowrap" }}>{m.label}</div>
              </div>
            );
          })}
        </div>

        {/* miniaturas */}
        <div style={{ position: "relative", height: thumbH, borderRadius: 14, overflow: "hidden", backgroundColor: D.black }}>
          {Array.from({ length: 12 }, (_, k) => {
            const t0 = (TOTAL * k) / 12;
            const t1 = (TOTAL * (k + 1)) / 12;
            const left = place(t0, stripW, collapse);
            const right = place(t1, stripW, collapse);
            return (
              <div key={k} style={{ position: "absolute", left, top: 0, width: Math.max(0, right - left), height: thumbH, overflow: "hidden", borderRight: "2px solid rgba(0,0,0,0.5)" }}>
                <Img src={staticFile(`ad38/thumbs/t${String(k).padStart(2, "0")}.jpg`)} style={{ height: thumbH, width: Math.max(thumbW, right - left), objectFit: "cover" }} />
              </div>
            );
          })}
          {/* faixas dos trechos sobre as miniaturas */}
          {marks.map((m, k) => {
            const p = progress(frame, m.start, 12);
            if (p <= 0) return null;
            const left = place(m.from, stripW, collapse);
            const right = place(m.to, stripW, collapse);
            const color = m.color ?? RED;
            return <div key={k} style={{ position: "absolute", left, top: 0, width: Math.max(0, right - left), height: "100%", backgroundColor: `${color}${Math.round(0x40 * p).toString(16).padStart(2, "0")}`, border: `3px solid ${color}`, borderRadius: 10, opacity: p * (1 - collapse) }} />;
          })}
        </div>

        {/* forma de onda real */}
        <div style={{ position: "relative", height: waveH, marginTop: 12 }}>
          {WAVE.rms.map((v, k) => {
            const t = ((k + 0.5) / WAVE.rms.length) * TOTAL;
            const left = place(t, stripW, collapse);
            const wBar = Math.max(1, place(TOTAL / WAVE.rms.length, stripW, 0) * (t < CUT ? 1 - collapse : 1) - 2);
            const hh = Math.max(3, v * waveH * 0.92);
            const silent = v < 0.06;
            return <div key={k} style={{ position: "absolute", left: left - wBar / 2, top: (waveH - hh) / 2, width: wBar, height: hh, borderRadius: 3, backgroundColor: silent ? "rgba(244,236,223,0.18)" : "rgba(143,170,240,0.75)" }} />;
          })}
        </div>

        {/* agulha */}
        {(() => {
          const px = place(Math.min(playhead, TOTAL), stripW, collapse);
          return <div style={{ position: "absolute", left: px - 2, top: labelsH - 8, width: 4, height: thumbH + waveH + 30, backgroundColor: "#fff", borderRadius: 2, boxShadow: "0 0 12px rgba(255,255,255,0.6)" }} />;
        })()}

        {/* o gancho que estava escondido em 0:11 */}
        {hookMark !== undefined && (() => {
          const p = progress(frame, hookMark, 16, easeOut);
          if (p <= 0) return null;
          const px = place(CUT, stripW, collapse);
          return (
            <div style={{ position: "absolute", left: px, top: labelsH + thumbH + waveH + 24, transform: `translate(-50%, ${(1 - p) * 20}px)`, opacity: p, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ width: 0, height: 0, borderLeft: "12px solid transparent", borderRight: "12px solid transparent", borderBottom: `16px solid ${D.accent}` }} />
              <div style={{ padding: "8px 18px", borderRadius: 999, backgroundColor: D.accent, color: D.onAccent, fontWeight: 650, fontSize: 25, whiteSpace: "nowrap" }}>The hook is here · 0:11</div>
            </div>
          );
        })()}

        {/* duração */}
        <div style={{ position: "absolute", right: 0, top: labelsH + thumbH + waveH + 30, fontFamily: FONT.mono, fontSize: 26, color: D.muted, opacity: hookMark === undefined ? 1 : 0 }}>{durationLabel ?? fmt(TOTAL)}</div>
      </div>
    </div>
  );
}

export { CUT, TOTAL, place };
