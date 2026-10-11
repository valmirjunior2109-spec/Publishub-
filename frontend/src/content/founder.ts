/* Quem está construindo a publishub: os dados da faixa do fundador na landing.
   Mudou algo (foto, perfil, um X novo)? É só aqui; a faixa se ajusta sozinha. */

export const FOUNDER = {
  name: "Valmir",
  role: "Solo founder · UGC creator",
  location: "Salvador, Brazil",
  photo: "/founder/valmir.jpg", // se o arquivo não existir em /public, a faixa sai sem foto
  instagram: { handle: "@valmir.pdf", url: "https://www.instagram.com/valmir.pdf/", note: "in Portuguese" },
  x: null as { handle: string; url: string } | null, // PLACEHOLDER: preencher depois; se null, não renderiza
};

/** Os links para fora levam UTM, para saber quantas visitas o perfil recebe pelo site. */
export function withFounderUtm(url: string): string {
  const u = new URL(url);
  u.searchParams.set("utm_source", "publishub");
  u.searchParams.set("utm_medium", "site");
  u.searchParams.set("utm_campaign", "founder");
  return u.toString();
}
