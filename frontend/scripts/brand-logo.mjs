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
// </> dentro da tela, em quartos de unidade (32 x 24): traço de 2, ponta única, margens iguais
const quarter = [];
const q = (qx, qy) => quarter.push([4 + qx / 4, 3 + qy / 4]);
for (let r = 0; r <= 12; r++) {
  const d = Math.abs(r - 6);
  const y = 5 + r;
  for (const x of [2 + d, 3 + d]) q(x, y); // <
  const sx = 13 + Math.round(((12 - r) * 4) / 12);
  for (const x of [sx, sx + 1]) q(x, y); // /
  for (const x of [28 - d, 29 - d]) q(x, y); // >
}
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
// o corpo do P: no site ele segue a cor do texto (branco no escuro, preto no claro), ver LOGO_BODY
const bodyStart = rects.length;
runs(bodyCells, WHITE);
const bodyEnd = rects.length;
runs(SCREEN_CELLS, SCREEN);
// meias unidades: agrupa por cor
runs(new Set(quarter.map(([x, y]) => `${x},${y}`)), WHITE, 0.25);
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
 * [início, fim) dos retângulos do corpo do P em LOGO_RECTS. No site o corpo usa a cor do texto
 * (branco no tema escuro, preto no claro): branco fixo some no fundo branco. As imagens geradas
 * (favicon, prévias) ficam sempre sobre o preto e usam o branco.
 */
export const LOGO_BODY = [${bodyStart}, ${bodyEnd}] as const;

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
