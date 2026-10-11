/* ==========================================================================
   Publishub · campanha social: copy, tema e desenho compartilhados
   --------------------------------------------------------------------------
   Tudo que as duas peças (instagram.html e x.html) escrevem vem daqui.
   Mude a copy em COPY, as cores em THEMES/THEME e a timeline em CLIPS;
   depois rode `node render.mjs`.
   ========================================================================== */

const COPY = {
  eyebrow: "AI editing copilot",
  keep: "Better videos.", // o que fica
  cut: "More hours.", // o que a caneta risca
  note: "cut · not worth the time it takes",
  support: "Know what to fix before you open the timeline.",
  tagline: "AI that edits with you, not for you.",
  url: "getpublishub.com",
  draft: "Draft",
  final: "Your cut",
};

/* O vídeo de exemplo, em segundos. `cut: true` é o trecho que a análise marca
   para sair; o primeiro trecho que fica vira o gancho na versão final. */
const CLIPS = [
  { d: 4, cut: true }, // a introdução
  { d: 8 },
  { d: 3, cut: true }, // a pausa
  { d: 9 },
  { d: 4.5 },
  { d: 2.5, cut: true }, // a volta que não leva a nada
  { d: 3 },
];

/* ---------- temas ----------
   caramelo: o fundo na cor do caderno e tudo em tinta, como o símbolo em uma
             cor; o creme do papel só no gancho.
   papel:    o tema claro do site: papel creme, tinta e o azul da caneta. */
const THEMES = {
  caramelo: {
    logo: "mono",
    paper: "#C9824A", // o caramelo do caderno, o mesmo do símbolo
    ink: "#1E1B18",
    muted: "rgba(30, 27, 24, 0.74)",
    faint: "#9A5D31", // o texto riscado: um caramelo queimado, recua sem sumir
    line: "rgba(30, 27, 24, 0.22)",
    strike: "#1E1B18", // a caneta risca em tinta
    note: "#1E1B18",
    tick: "rgba(30, 27, 24, 0.55)",
    draftKeep: "rgba(30, 27, 24, 0.12)",
    draftWave: "rgba(30, 27, 24, 0.5)",
    cutFill: "rgba(251, 243, 230, 0.16)",
    cutWave: "rgba(30, 27, 24, 0.3)",
    ribbon: "rgba(30, 27, 24, 0.085)",
    finalFill: "#1E1B18",
    finalWave: "rgba(201, 130, 74, 0.8)",
    hookFill: "#FBF3E6",
    hookWave: "rgba(30, 27, 24, 0.6)",
    ghost: "rgba(30, 27, 24, 0.42)",
  },
  papel: {
    logo: "color",
    paper: "#F6F0E4",
    ink: "#1E1B18",
    muted: "#5C544B",
    faint: "#A99D8D",
    line: "#E4D6C1",
    strike: "#1F47A6",
    note: "#1F47A6",
    tick: "rgba(92, 84, 75, 0.7)",
    draftKeep: "#E9DFCD",
    draftWave: "rgba(30, 27, 24, 0.32)",
    cutFill: "#E3E9F7",
    cutWave: "rgba(31, 71, 166, 0.28)",
    ribbon: "rgba(30, 27, 24, 0.055)",
    finalFill: "#1E1B18",
    finalWave: "rgba(246, 240, 228, 0.42)",
    hookFill: "#1F47A6",
    hookWave: "rgba(246, 240, 228, 0.55)",
    ghost: "#A99D8D",
  },
};

const THEME = "caramelo";
const C = THEMES[THEME];

/* ---------- o símbolo ----------
   Os mesmos números de frontend/src/components/Logo.tsx. "color" é o símbolo do
   site; "mono" é o mesmo desenho em uma cor só (tinta), recortado no fundo:
   o elástico, a borda das páginas e o contorno da caneta viram o próprio fundo. */
const LOGO = {
  color: () => `
<svg viewBox="0 0 104 120" aria-hidden="true">
  <rect x="8" y="8" width="66" height="104" rx="11" fill="#C9824A"/>
  <rect x="14" y="93" width="54" height="9" rx="4.5" fill="#FBF3E6"/>
  <rect x="54" y="8" width="8" height="104" fill="#1E1B18"/>
  <g transform="rotate(20 75 58)" fill="#1F47A6">
    <rect x="70" y="8" width="10" height="80" rx="5"/>
    <rect x="78" y="12" width="5" height="4" rx="1"/>
    <rect x="81" y="12" width="3.4" height="26" rx="1.7"/>
    <path d="M70.5 86 L79.5 86 L75 99 Z"/>
    <rect x="74.2" y="40" width="1.6" height="40" rx="0.8" fill="#FBF3E6"/>
    <circle cx="75" cy="99.5" r="1.3" fill="#1E1B18"/>
  </g>
</svg>`,
  mono: () => `
<svg viewBox="0 0 104 120" aria-hidden="true">
  <rect x="8" y="8" width="66" height="104" rx="11" fill="${C.ink}"/>
  <rect x="14" y="93" width="54" height="9" rx="4.5" fill="${C.paper}"/>
  <rect x="16.4" y="95.4" width="49.2" height="4.2" rx="2.1" fill="${C.ink}"/>
  <rect x="54" y="8" width="8" height="104" fill="${C.paper}"/>
  <g transform="rotate(20 75 58)" fill="${C.ink}" stroke="${C.paper}" stroke-width="3.4" stroke-linejoin="round" paint-order="stroke">
    <rect x="70" y="8" width="10" height="80" rx="5"/>
    <rect x="81" y="12" width="3.4" height="26" rx="1.7"/>
    <path d="M70.5 86 L79.5 86 L75 99 Z"/>
  </g>
  <g transform="rotate(20 75 58)" fill="${C.ink}">
    <rect x="78" y="12" width="5" height="4" rx="1"/>
    <rect x="70" y="8" width="10" height="79" rx="5"/>
    <rect x="70" y="84.4" width="10" height="2.2" fill="${C.paper}"/>
    <rect x="74.2" y="40" width="1.6" height="40" rx="0.8" fill="${C.paper}"/>
  </g>
</svg>`,
};

/* ---------- tema, copy e marca ---------- */

function applyTheme() {
  const root = document.documentElement.style;
  root.setProperty("--paper", C.paper);
  root.setProperty("--ink", C.ink);
  root.setProperty("--ink-muted", C.muted);
  root.setProperty("--ink-faint", C.faint);
  root.setProperty("--line", C.line);
  root.setProperty("--accent", C.note);
}

function fillCopy() {
  document.querySelectorAll("[data-copy]").forEach((el) => {
    el.textContent = COPY[el.dataset.copy];
  });
  // a seta da anotação: desenhada, porque a Geist Mono não tem "↳"
  document.querySelectorAll("[data-arrow]").forEach((el) => {
    el.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 1.5 V9.5 H13 M9.5 6 L13 9.5 L9.5 13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  });
  document.querySelectorAll("[data-logo]").forEach((el) => {
    el.innerHTML = `${LOGO[C.logo]()}<span>Publishub</span>`;
  });
}

/* O risco da caneta sobre o texto cortado: uma linha só, ponta redonda, subindo
   um grau, como quem risca à mão com régua. */
function drawStrikes() {
  document.querySelectorAll(".headline .cut").forEach((el) => {
    const w = el.getBoundingClientRect().width;
    const h = el.getBoundingClientRect().height;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    const stroke = fs * 0.085;
    const y = h * 0.56;
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "strike");
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("preserveAspectRatio", "none");
    const path = document.createElementNS(ns, "path");
    const x0 = fs * 0.02;
    const x1 = w + fs * 0.06;
    path.setAttribute("d", `M ${x0} ${y + fs * 0.035} C ${w * 0.35} ${y + fs * 0.01}, ${w * 0.7} ${y - fs * 0.02}, ${x1} ${y - fs * 0.04}`);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", C.strike);
    path.setAttribute("stroke-width", stroke);
    path.setAttribute("stroke-linecap", "round");
    svg.appendChild(path);
    svg.style.left = "0";
    svg.style.width = `${w}px`;
    el.appendChild(svg);
  });
}

/* ---------- a timeline ---------- */

/* Gerador determinístico: a mesma forma de onda em toda renderização. */
function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function waveform(x, y, w, h, color, seed, bar) {
  const rand = seeded(seed);
  const step = bar * 2;
  const n = Math.max(1, Math.floor((w - bar * 2) / step));
  const start = x + (w - (n - 1) * step) / 2;
  let out = "";
  for (let i = 0; i < n; i++) {
    // fala: picos irregulares sobre um envelope suave
    const env = 0.35 + 0.65 * Math.abs(Math.sin((i / n) * Math.PI * (1.2 + (seed % 3) * 0.4) + seed));
    const amp = Math.max(0.12, env * (0.35 + rand() * 0.65));
    const bh = h * 0.72 * amp;
    out += `<rect x="${(start + i * step - bar / 2).toFixed(2)}" y="${(y + (h - bh) / 2).toFixed(2)}" width="${bar}" height="${bh.toFixed(2)}" rx="${bar / 2}" fill="${color}"/>`;
  }
  return out;
}

/**
 * Desenha a timeline "rascunho → seu corte" num <svg data-timeline>.
 * Opções (data-attributes no svg): width, trackH, ribbonH, gap, bar, fontSize.
 */
function drawTimeline(svg) {
  const o = {
    width: +svg.dataset.width,
    trackH: +svg.dataset.trackH,
    ribbonH: +svg.dataset.ribbonH,
    gap: +(svg.dataset.gap || 6),
    bar: +(svg.dataset.bar || 3),
    fs: +(svg.dataset.fontSize || 14),
    rulerH: +(svg.dataset.rulerH || 40),
    labelH: +(svg.dataset.labelH || 34),
  };
  const total = CLIPS.reduce((a, c) => a + c.d, 0);
  const px = (o.width + o.gap) / total; // a última folga fica fora da largura
  const r = Math.min(10, o.trackH * 0.16);

  const yDraft = o.rulerH + o.labelH;
  const yFinal = yDraft + o.trackH + o.ribbonH;
  const height = yFinal + o.trackH + o.labelH;
  svg.setAttribute("viewBox", `0 0 ${o.width} ${height}`);
  svg.setAttribute("width", o.width);
  svg.setAttribute("height", height);

  let s = "";
  const mono = `font-family="Geist Mono, monospace" font-weight="500"`;

  // régua: um traço por segundo, um timecode a cada cinco
  for (let t = 0; t <= Math.floor(total); t++) {
    const x = Math.min(t * px, o.width - 1);
    const major = t % 5 === 0;
    s += `<rect x="${x.toFixed(2)}" y="${o.rulerH - (major ? 12 : 6)}" width="1.25" height="${major ? 12 : 6}" fill="${major ? C.muted : C.tick}"/>`;
    if (major) {
      s += `<text x="${x + 6}" y="${o.rulerH - 14}" ${mono} font-size="${o.fs * 0.92}" fill="${C.muted}" letter-spacing="0.04em">0:${String(t).padStart(2, "0")}</text>`;
    }
  }
  s += `<rect x="0" y="${o.rulerH}" width="${o.width}" height="1" fill="${C.line}"/>`;

  // as posições no rascunho e na versão final
  let tDraft = 0;
  let tFinal = 0;
  const placed = CLIPS.map((c, i) => {
    const p = { ...c, i, x: tDraft * px, w: c.d * px - o.gap };
    tDraft += c.d;
    if (!c.cut) {
      p.fx = tFinal * px;
      tFinal += c.d;
    }
    return p;
  });
  const kept = placed.filter((c) => !c.cut);

  // as faixas que ligam cada trecho que fica ao seu novo lugar
  kept.forEach((c) => {
    const y0 = yDraft + o.trackH;
    const y1 = yFinal;
    const m = (y0 + y1) / 2;
    s += `<path d="M ${c.x} ${y0} C ${c.x} ${m}, ${c.fx} ${m}, ${c.fx} ${y1} L ${c.fx + c.w} ${y1} C ${c.fx + c.w} ${m}, ${c.x + c.w} ${m}, ${c.x + c.w} ${y0} Z" fill="${C.ribbon}"/>`;
  });

  // rótulos das duas trilhas
  const lbl = (y, text, color) => `<text x="0" y="${y}" ${mono} font-size="${o.fs}" fill="${color}" letter-spacing="0.08em">${text.toUpperCase()}</text>`;
  s += lbl(yDraft - o.fs * 0.9, COPY.draft, C.muted);

  // rascunho: o que fica num tom mais fundo, o que sai riscado pela caneta
  placed.forEach((c) => {
    if (c.cut) {
      s += `<rect x="${c.x}" y="${yDraft}" width="${c.w}" height="${o.trackH}" rx="${r}" fill="${C.cutFill}"/>`;
      s += waveform(c.x, yDraft, c.w, o.trackH, C.cutWave, c.i + 3, o.bar);
      const ym = yDraft + o.trackH * 0.5;
      s += `<path d="M ${c.x - 3} ${ym + 3} L ${c.x + c.w + 3} ${ym - 3}" stroke="${C.strike}" stroke-width="${Math.max(4, o.trackH * 0.07)}" stroke-linecap="round"/>`;
    } else {
      s += `<rect x="${c.x}" y="${yDraft}" width="${c.w}" height="${o.trackH}" rx="${r}" fill="${C.draftKeep}"/>`;
      s += waveform(c.x, yDraft, c.w, o.trackH, C.draftWave, c.i + 3, o.bar);
    }
  });

  // versão final: só o que ficou, encostado, em tinta; o gancho em destaque
  kept.forEach((c, k) => {
    const hook = k === 0;
    s += `<rect x="${c.fx}" y="${yFinal}" width="${c.w}" height="${o.trackH}" rx="${r}" fill="${hook ? C.hookFill : C.finalFill}"/>`;
    s += waveform(c.fx, yFinal, c.w, o.trackH, hook ? C.hookWave : C.finalWave, c.i + 3, o.bar);
  });

  // o tempo que o vídeo deixou de carregar: só o contorno, tracejado
  const end = tFinal * px;
  if (o.width - end > o.gap * 3) {
    s += `<rect x="${end + 0.75}" y="${yFinal + 0.75}" width="${o.width - end - 1.5}" height="${o.trackH - 1.5}" rx="${r}" fill="none" stroke="${C.ghost}" stroke-width="1.5" stroke-dasharray="5 6"/>`;
  }

  // o rótulo da versão final fica embaixo dela: em cima passam as faixas
  s += lbl(yFinal + o.trackH + o.labelH * 0.78, COPY.final, C.ink);

  svg.innerHTML = s;
}

async function render() {
  applyTheme();
  fillCopy();
  await document.fonts.ready;
  drawStrikes();
  document.querySelectorAll("svg[data-timeline]").forEach(drawTimeline);
  document.body.dataset.ready = "true";
}

render();
