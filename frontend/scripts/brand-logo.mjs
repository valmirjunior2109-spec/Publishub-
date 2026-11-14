// Gera a logo pixel-art do Publishub (o "P" branco com a tela </>, a sombra índigo, a estrela e o cursor)
// a partir de mapas de células, junta as células em retângulos e escreve:
//   - src/lib/brand/logo-art.ts (os retângulos, para o componente React e as imagens geradas)
//   - src/app/icon.svg (favicon: a logo sobre um quadrado preto #020002)
// Uso, de dentro de frontend/: node scripts/brand-logo.mjs [pasta-para-um-svg-avulso]
import { writeFileSync, mkdirSync } from "node:fs";
const frontend = ".";
const preview = process.argv[2];

const WHITE = "#FFFFFF", INDIGO = "#6E74F7", SHADOW = "#4A50D9", SCREEN = "#020002";

// ---------- o P, em blocos de 1 unidade (coluna, linha) ----------
const P = new Set();
const add = (set, x0, x1, y) => { for (let x = x0; x <= x1; x++) set.add(`${x},${y}`); };
add(P, 2, 11, 0);
add(P, 1, 12, 1);
add(P, 0, 13, 2);
for (let y = 3; y <= 8; y++) add(P, 0, 14, y);
add(P, 0, 13, 9);
add(P, 0, 12, 10);
add(P, 0, 11, 11);
for (let y = 12; y <= 15; y++) add(P, 0, 3, y);
// a tela (cols 4..11, linhas 3..8) faz parte da silhueta, mas é escura
const SCREEN_CELLS = new Set();
for (let y = 3; y <= 8; y++) add(SCREEN_CELLS, 4, 11, y);
// a sombra: a silhueta deslocada 1 bloco para a direita e para baixo, onde não há P
const SHADOW_CELLS = new Set();
for (const key of P) {
  const [x, y] = key.split(",").map(Number);
  const k = `${x + 1},${y + 1}`;
  if (!P.has(k)) SHADOW_CELLS.add(k);
}

// ---------- detalhes em meia unidade ----------
const half = [];
// </> dentro da tela (8 x 6 unidades), desenhado como fonte pixel em meias unidades (16 x 12).
// Cada linha do traço tem 2 meias (1 unidade, a espessura dos pixels do P): traço mais fino fica
// abaixo de 1 px no cabeçalho e o navegador desenha apagado e torto. Centrado, com uma coluna
// livre entre os três símbolos.
const GLYPH = [
  "........##......",
  "...##...##.##...",
  "..##...##...##..",
  ".##....##....##.",
  "..##...##...##..",
  "...##.##...##...",
  "......##........",
];
const GLYPH_TOP = 3; // linhas 3–9 de 12: o < e o > (5 linhas) no meio da / (7 linhas)
const glyphCells = new Set();
GLYPH.forEach((row, r) => [...row].forEach((cell, c) => cell === "#" && glyphCells.add(`${4 + c / 2},${3 + (GLYPH_TOP + r) / 2}`)));
// a estrela, acima e à esquerda do P (centro na célula -1,-1)
const star = (hx, hy) => half.push([hx / 2, hy / 2, INDIGO]);
// miolo em losango (distância ≤ 2 do centro) e quatro pontas mais longas
const seen = new Set();
const starOnce = (x, y) => { const k = `${x},${y}`; if (!seen.has(k)) { seen.add(k); star(x, y); } };
for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) if (Math.abs(dx) + Math.abs(dy) <= 2) starOnce(-2 + dx, -2 + dy);
for (const d of [-3, 3]) { starOnce(-2, -2 + d); starOnce(-2 + d, -2); }
star(-2, -7); // o pontinho de cima
star(-7, -2); // o da esquerda

// ---------- junta tudo em retângulos ----------
const rects = [];
const runs = (cells, color, unit = 1) => {
  const byRow = new Map();
  for (const key of cells) { const [x, y] = key.split(",").map(Number); (byRow.get(y) ?? byRow.set(y, []).get(y)).push(x); }
  for (const [y, xs] of [...byRow].sort((a, b) => a[0] - b[0])) {
    xs.sort((a, b) => a - b);
    let start = xs[0], prev = xs[0];
    for (const x of [...xs.slice(1), Infinity]) {
      if (x === prev + unit) { prev = x; continue; }
      rects.push([start, y, prev - start + unit, unit, color]);
      start = prev = x;
    }
  }
};
const bodyCells = new Set([...P].filter((k) => !SCREEN_CELLS.has(k)));
runs(SHADOW_CELLS, SHADOW);
// o corpo do P, a tela e o </>: no site seguem o tema (ver LOGO_PARTS)
const parts = {};
const part = (name, draw) => { const start = rects.length; draw(); parts[name] = [start, rects.length]; };
part("body", () => runs(bodyCells, WHITE));
part("screen", () => runs(SCREEN_CELLS, SCREEN));
// meias unidades: agrupa por cor
part("glyph", () => runs(glyphCells, WHITE, 0.5));
for (const color of [WHITE, INDIGO]) runs(new Set(half.filter((h) => h[2] === color).map(([x, y]) => `${x},${y}`)), color, 0.5);
// o cursor (traço) roxo embaixo, à direita da haste
rects.push([7, 15, 3, 1, INDIGO]);

const xs = rects.flatMap(([x, , w]) => [x, x + w]), ys = rects.flatMap(([, y, , h]) => [y, y + h]);
const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
const size = Math.max(maxX - minX, maxY - minY);
const vb = [minX - (size - (maxX - minX)) / 2, minY - (size - (maxY - minY)) / 2, size, size].map((n) => +n.toFixed(2));
const svg = (pad = 0) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb[0] - pad} ${vb[1] - pad} ${vb[2] + pad * 2} ${vb[3] + pad * 2}" shape-rendering="crispEdges">` +
  rects.map(([x, y, w, h, c]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`).join("") +
  `</svg>`;

mkdirSync(`${frontend}/src/lib/brand`, { recursive: true });
writeFileSync(
  `${frontend}/src/lib/brand/logo-art.ts`,
  `/**
 * A logo do Publishub em pixel art: o "P" branco com a tela </>, a sombra índigo, a estrela e o cursor.
 * Gerada por scripts/brand-logo.mjs a partir da arte original (grade de blocos); fundo transparente. Não editar à mão:
 * cada item é [x, y, largura, altura, cor] no viewBox LOGO_VIEWBOX.
 */

export const LOGO_COLORS = { white: "${WHITE}", indigo: "${INDIGO}", shadow: "${SHADOW}", screen: "${SCREEN}" } as const;

export const LOGO_VIEWBOX = "${vb.join(" ")}";

/**
 * [início, fim) de cada parte em LOGO_RECTS. No site o corpo do P e o </> usam a cor do texto e a
 * tela usa a cor do fundo: branco/preto/branco no tema escuro, preto/branco/preto no claro (fixos,
 * o P branco sumia no fundo branco e a tela preta sumia no P preto). As imagens geradas (favicon,
 * prévias) ficam sempre sobre o preto e usam as cores fixas.
 */
export const LOGO_PARTS = ${JSON.stringify(parts)} as const;

export const LOGO_RECTS: readonly (readonly [number, number, number, number, string])[] = ${JSON.stringify(rects)};

/** A logo como SVG em texto (favicon, imagens de prévia). pad = margem extra em unidades. */
export function logoSvg(pad = 0): string {
  const [x, y, w, h] = LOGO_VIEWBOX.split(" ").map(Number);
  return \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="\${x - pad} \${y - pad} \${w + pad * 2} \${h + pad * 2}" shape-rendering="crispEdges">\${LOGO_RECTS.map(([rx, ry, rw, rh, c]) => \`<rect x="\${rx}" y="\${ry}" width="\${rw}" height="\${rh}" fill="\${c}"/>\`).join("")}</svg>\`;
}
`,
);
// o favicon: a logo sobre um quadrado preto de cantos arredondados. Transparente, o P branco
// sumia nas abas claras do navegador. A arte fica nítida (crispEdges); só o quadrado é suave.
const favicon = (pad = 1.75) => {
  const [x, y, w, h] = [vb[0] - pad, vb[1] - pad, vb[2] + pad * 2, vb[3] + pad * 2].map((n) => +n.toFixed(2));
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}">` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${+(w * 0.2).toFixed(2)}" fill="${SCREEN}"/>` +
    `<g shape-rendering="crispEdges">${rects.map(([rx, ry, rw, rh, c]) => `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${c}"/>`).join("")}</g>` +
    `</svg>`
  );
};
writeFileSync(`${frontend}/src/app/icon.svg`, favicon());
if (preview) {
  writeFileSync(`${preview}/publishub-logo.svg`, svg(1));
  // a base do favicon.ico (gerado à parte, em 16, 32, 48 e 256 px)
  writeFileSync(`${preview}/publishub-favicon.svg`, favicon());
}
console.log("rects", rects.length, "viewBox", vb.join(" "));
