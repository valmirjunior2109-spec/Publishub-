/* ==========================================================================
   Publishub · gráfico de retenção (SVG)
   --------------------------------------------------------------------------
   retentionChart({ points, duration, markers, width, height }) → string <svg>

   O nome do gráfico (ex.: "Retenção · curva ilustrativa") fica fora do SVG, no
   rótulo do cartão (chart.tag no JSON): assim ele quebra linha se precisar.

   points    [[segundo, %], ...]  a curva, de 0 a 100 (ex.: [[0, 100], [3, 92], [5, 61]])
   duration  segundos do vídeo (o fim do eixo x)
   markers   [{ at, label, kind }]  kind: "predicted" (a aposta, tracejada em tinta)
                                     ou "actual" (o Insights, em caramelo, com ponto na curva)
   width     largura em px; o post passa a largura real do cartão, então 1 unidade = 1 px
   height    altura em px

   A curva é monotônica (Fritsch–Carlson): entre dois pontos ela nunca sobe ou
   desce além deles, então o desenho não mostra um pico que os dados não têm.
   ========================================================================== */
(function () {
  const C = {
    ink: "#1e1b18",
    muted: "#5c544b",
    line: "#e0d1ba",
    caramel: "#c9824a",
    caramelInk: "#8a4f22",
    paper: "#fffdf8",
  };

  function esc(text) {
    return String(text).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  }

  function timecode(seconds) {
    const s = Math.max(0, Math.round(seconds));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  /** As tangentes de Fritsch–Carlson: monotônica entre pontos vizinhos. */
  function monotonePath(pts) {
    const n = pts.length;
    if (n < 2) return "";
    const dx = [];
    const slope = [];
    for (let i = 0; i < n - 1; i++) {
      dx.push(pts[i + 1][0] - pts[i][0]);
      slope.push((pts[i + 1][1] - pts[i][1]) / dx[i]);
    }
    const m = [slope[0]];
    for (let i = 1; i < n - 1; i++) m.push(slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2);
    m.push(slope[n - 2]);
    for (let i = 0; i < n - 1; i++) {
      if (slope[i] === 0) {
        m[i] = 0;
        m[i + 1] = 0;
        continue;
      }
      const a = m[i] / slope[i];
      const b = m[i + 1] / slope[i];
      const h = Math.hypot(a, b);
      if (h > 3) {
        m[i] = (3 * a * slope[i]) / h;
        m[i + 1] = (3 * b * slope[i]) / h;
      }
    }
    let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < n - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      const h = dx[i] / 3;
      d += ` C ${(x0 + h).toFixed(1)} ${(y0 + m[i] * h).toFixed(1)}, ${(x1 - h).toFixed(1)} ${(y1 - m[i + 1] * h).toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)}`;
    }
    return d;
  }

  /** O valor da curva (em %) num segundo qualquer, por interpolação linear entre os pontos. */
  function valueAt(points, t) {
    if (t <= points[0][0]) return points[0][1];
    for (let i = 0; i < points.length - 1; i++) {
      const [t0, v0] = points[i];
      const [t1, v1] = points[i + 1];
      if (t >= t0 && t <= t1) return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0 || 1);
    }
    return points[points.length - 1][1];
  }

  function retentionChart({ points, duration, markers = [], width = 880, height = 420 }) {
    if (!Array.isArray(points) || points.length < 2) throw new Error("retentionChart: 'points' precisa de pelo menos 2 pontos [segundo, %]");
    const end = duration ?? points[points.length - 1][0];
    const font = 26; // rótulos do gráfico: lidos no celular a 1080 px
    const rows = Math.max(1, markers.length);
    const pad = { left: 96, right: 24, top: rows * (font + 18) + 18, bottom: font + 30 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const x = (t) => pad.left + (Math.min(Math.max(t, 0), end) / end) * plotW;
    const y = (v) => pad.top + (1 - Math.min(Math.max(v, 0), 100) / 100) * plotH;
    const pts = points.map(([t, v]) => [x(t), y(v)]);
    const curve = monotonePath(pts);
    const base = y(0);
    const parts = [];

    // a grade: 0, 50 e 100%
    for (const v of [0, 50, 100]) {
      parts.push(`<line x1="${pad.left}" x2="${width - pad.right}" y1="${y(v)}" y2="${y(v)}" stroke="${C.line}" stroke-width="${v === 0 ? 3 : 2}" ${v === 0 ? "" : 'stroke-dasharray="2 10" stroke-linecap="round"'}/>`);
      parts.push(`<text x="${pad.left - 18}" y="${y(v) + font * 0.36}" text-anchor="end" font-family="Geist Mono" font-size="${font - 2}" fill="${C.muted}">${v}%</text>`);
    }

    // a área sob a curva (tinta a 6%) e a curva
    parts.push(`<path d="${curve} L ${pts[pts.length - 1][0].toFixed(1)} ${base} L ${pts[0][0].toFixed(1)} ${base} Z" fill="${C.ink}" fill-opacity="0.06"/>`);
    parts.push(`<path d="${curve}" fill="none" stroke="${C.ink}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`);

    // os marcadores: uma linha por marcador, o rótulo na faixa de cima
    markers.forEach((marker, i) => {
      const mx = x(marker.at);
      const actual = marker.kind === "actual";
      const color = actual ? C.caramel : C.ink;
      const labelY = 18 + (i + 1) * (font + 18) - 18;
      const anchor = mx < pad.left + plotW * 0.22 ? "start" : mx > pad.left + plotW * 0.78 ? "end" : "middle";
      const lx = anchor === "start" ? mx - 6 : anchor === "end" ? mx + 6 : mx;
      parts.push(`<line x1="${mx}" x2="${mx}" y1="${pad.top - 10}" y2="${base}" stroke="${color}" stroke-width="${actual ? 4 : 3}" ${actual ? "" : 'stroke-dasharray="10 9"'} stroke-linecap="round"/>`);
      parts.push(`<text x="${lx}" y="${labelY}" text-anchor="${anchor}" font-family="Geist Mono" font-weight="500" font-size="${font}" fill="${actual ? C.caramelInk : C.ink}">${esc(marker.label)}</text>`);
      if (actual) {
        const cy = y(valueAt(points, marker.at));
        parts.push(`<circle cx="${mx}" cy="${cy}" r="13" fill="${C.caramel}" stroke="${C.paper}" stroke-width="5"/>`);
      }
    });

    // o eixo x: o começo, cada marcador e o fim (sem repetir o mesmo segundo)
    const ticks = [0, end];
    const tickY = height - 8;
    for (const t of ticks) {
      const anchor = t === 0 ? "start" : "end";
      parts.push(`<text x="${x(t)}" y="${tickY}" text-anchor="${anchor}" font-family="Geist Mono" font-size="${font - 2}" fill="${C.muted}">${timecode(t)}</text>`);
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img">${parts.join("")}</svg>`;
  }

  window.retentionChart = retentionChart;
  window.retentionTimecode = timecode;
})();
