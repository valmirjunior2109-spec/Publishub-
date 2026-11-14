/**
 * A logo do Publishub em pixel art: o "P" branco com a tela </>, a sombra índigo, a estrela e o cursor.
 * Gerada por scripts/brand-logo.mjs a partir da arte original (grade de blocos); fundo transparente. Não editar à mão:
 * cada item é [x, y, largura, altura, cor] no viewBox LOGO_VIEWBOX.
 */

export const LOGO_COLORS = { white: "#FFFFFF", indigo: "#6E74F7", shadow: "#4A50D9", screen: "#020002" } as const;

export const LOGO_VIEWBOX = "-4 -3.5 20.5 20.5";

/**
 * [início, fim) dos retângulos do corpo do P em LOGO_RECTS. No site o corpo usa a cor do texto
 * (branco no tema escuro, preto no claro): branco fixo some no fundo branco. As imagens geradas
 * (favicon, prévias) ficam sempre sobre o preto e usam o branco.
 */
export const LOGO_BODY = [13, 35] as const;

export const LOGO_RECTS: readonly (readonly [number, number, number, number, string])[] = [[15,4,1,1,"#4A50D9"],[15,5,1,1,"#4A50D9"],[15,6,1,1,"#4A50D9"],[15,7,1,1,"#4A50D9"],[15,8,1,1,"#4A50D9"],[14,9,2,1,"#4A50D9"],[13,10,2,1,"#4A50D9"],[12,11,2,1,"#4A50D9"],[4,12,9,1,"#4A50D9"],[4,13,1,1,"#4A50D9"],[4,14,1,1,"#4A50D9"],[4,15,1,1,"#4A50D9"],[1,16,4,1,"#4A50D9"],[2,0,10,1,"#FFFFFF"],[1,1,12,1,"#FFFFFF"],[0,2,14,1,"#FFFFFF"],[0,3,4,1,"#FFFFFF"],[12,3,3,1,"#FFFFFF"],[0,4,4,1,"#FFFFFF"],[12,4,3,1,"#FFFFFF"],[0,5,4,1,"#FFFFFF"],[12,5,3,1,"#FFFFFF"],[0,6,4,1,"#FFFFFF"],[12,6,3,1,"#FFFFFF"],[0,7,4,1,"#FFFFFF"],[12,7,3,1,"#FFFFFF"],[0,8,4,1,"#FFFFFF"],[12,8,3,1,"#FFFFFF"],[0,9,14,1,"#FFFFFF"],[0,10,13,1,"#FFFFFF"],[0,11,12,1,"#FFFFFF"],[0,12,4,1,"#FFFFFF"],[0,13,4,1,"#FFFFFF"],[0,14,4,1,"#FFFFFF"],[0,15,4,1,"#FFFFFF"],[4,3,8,1,"#020002"],[4,4,8,1,"#020002"],[4,5,8,1,"#020002"],[4,6,8,1,"#020002"],[4,7,8,1,"#020002"],[4,8,8,1,"#020002"],[6,4.25,0.5,0.25,"#FFFFFF"],[8.25,4.25,0.5,0.25,"#FFFFFF"],[9.5,4.25,0.5,0.25,"#FFFFFF"],[5.75,4.5,0.5,0.25,"#FFFFFF"],[8.25,4.5,0.5,0.25,"#FFFFFF"],[9.75,4.5,0.5,0.25,"#FFFFFF"],[5.5,4.75,0.5,0.25,"#FFFFFF"],[8,4.75,0.5,0.25,"#FFFFFF"],[10,4.75,0.5,0.25,"#FFFFFF"],[5.25,5,0.5,0.25,"#FFFFFF"],[8,5,0.5,0.25,"#FFFFFF"],[10.25,5,0.5,0.25,"#FFFFFF"],[5,5.25,0.5,0.25,"#FFFFFF"],[8,5.25,0.5,0.25,"#FFFFFF"],[10.5,5.25,0.5,0.25,"#FFFFFF"],[4.75,5.5,0.5,0.25,"#FFFFFF"],[7.75,5.5,0.5,0.25,"#FFFFFF"],[10.75,5.5,0.5,0.25,"#FFFFFF"],[4.5,5.75,0.5,0.25,"#FFFFFF"],[7.75,5.75,0.5,0.25,"#FFFFFF"],[11,5.75,0.5,0.25,"#FFFFFF"],[4.75,6,0.5,0.25,"#FFFFFF"],[7.75,6,0.5,0.25,"#FFFFFF"],[10.75,6,0.5,0.25,"#FFFFFF"],[5,6.25,0.5,0.25,"#FFFFFF"],[7.5,6.25,0.5,0.25,"#FFFFFF"],[10.5,6.25,0.5,0.25,"#FFFFFF"],[5.25,6.5,0.5,0.25,"#FFFFFF"],[7.5,6.5,0.5,0.25,"#FFFFFF"],[10.25,6.5,0.5,0.25,"#FFFFFF"],[5.5,6.75,0.5,0.25,"#FFFFFF"],[7.5,6.75,0.5,0.25,"#FFFFFF"],[10,6.75,0.5,0.25,"#FFFFFF"],[5.75,7,0.5,0.25,"#FFFFFF"],[7.25,7,0.5,0.25,"#FFFFFF"],[9.75,7,0.5,0.25,"#FFFFFF"],[6,7.25,0.5,0.25,"#FFFFFF"],[7.25,7.25,0.5,0.25,"#FFFFFF"],[9.5,7.25,0.5,0.25,"#FFFFFF"],[-1,-3.5,0.5,0.5,"#6E74F7"],[-1,-2.5,0.5,0.5,"#6E74F7"],[-1,-2,0.5,0.5,"#6E74F7"],[-1.5,-1.5,1.5,0.5,"#6E74F7"],[-3.5,-1,0.5,0.5,"#6E74F7"],[-2.5,-1,3.5,0.5,"#6E74F7"],[-1.5,-0.5,1.5,0.5,"#6E74F7"],[-1,0,0.5,0.5,"#6E74F7"],[-1,0.5,0.5,0.5,"#6E74F7"],[7,15,3,1,"#6E74F7"]];

/** A logo como SVG em texto (favicon, imagens de prévia). pad = margem extra em unidades. */
export function logoSvg(pad = 0): string {
  const [x, y, w, h] = LOGO_VIEWBOX.split(" ").map(Number);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x - pad} ${y - pad} ${w + pad * 2} ${h + pad * 2}" shape-rendering="crispEdges">${LOGO_RECTS.map(([rx, ry, rw, rh, c]) => `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${c}"/>`).join("")}</svg>`;
}
