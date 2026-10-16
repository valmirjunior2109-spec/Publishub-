/**
 * As fontes das imagens geradas no servidor (a prévia /og e o cartão do resultado
 * compartilhado): Geist do Google Fonts, só com os caracteres que a imagem usa.
 */

/**
 * Uma fonte do Google, só com os caracteres desta imagem. Sem User-Agent o Google
 * devolve TTF, que é o que o gerador lê. Se a busca falhar, a imagem sai na fonte
 * padrão: fica menos bonita, mas sai.
 */
async function googleFont(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(text)}`)).text();
    const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/);
    if (!src) return null;
    const font = await fetch(src[1]);
    return font.ok ? await font.arrayBuffer() : null;
  } catch {
    return null;
  }
}

/** A Geist só tem as escritas latinas: devanágari, japonês e coreano vêm da Noto, usada onde a Geist não tem o caractere. */
const SCRIPT_FONTS: [RegExp, string][] = [
  [/[\u0900-\u097F]/, "Noto+Sans+Devanagari"],
  [/[\u3040-\u30FF\u4E00-\u9FFF]/, "Noto+Sans+JP"],
  [/[\uAC00-\uD7AF\u1100-\u11FF]/, "Noto+Sans+KR"],
];

/** Geist (semibold e regular) e Geist Mono, só com os caracteres que a imagem usa, mais a Noto da escrita, se precisar. */
export async function loadFonts(text: string) {
  const extra = SCRIPT_FONTS.filter(([script]) => script.test(text)).map(([, family]) => family);
  const [semibold, regular, mono, ...scripts] = await Promise.all([
    googleFont("Geist", 600, text),
    googleFont("Geist", 400, text),
    googleFont("Geist+Mono", 500, text),
    ...extra.flatMap((family) => [googleFont(family, 600, text), googleFont(family, 400, text)]),
  ]);
  const fonts = [
    ...(semibold ? [{ name: "Geist", data: semibold, weight: 600 as const, style: "normal" as const }] : []),
    ...(regular ? [{ name: "Geist", data: regular, weight: 400 as const, style: "normal" as const }] : []),
    ...(mono ? [{ name: "Geist Mono", data: mono, weight: 500 as const, style: "normal" as const }] : []),
    ...scripts.flatMap((data, index) => (data ? [{ name: "Noto Sans", data, weight: (index % 2 === 0 ? 600 : 400) as 600 | 400, style: "normal" as const }] : [])),
  ];
  return { fonts: fonts.length ? fonts : undefined, sans: semibold || regular ? "Geist" : undefined, mono: mono ? "Geist Mono" : undefined };
}

