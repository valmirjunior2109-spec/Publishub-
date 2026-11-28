/** O que o site inteiro precisa saber: nome, endereço, contato e a descrição do produto. */

export const SITE_NAME = "Publishub";
// .trim(): um valor colado com quebra de linha no fim gerava URLs inválidas (o Stripe recusava o success_url)
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://getpublishub.com").replace(/\/+$/, "");
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "copilot@getpublishub.com";

/** A descrição padrão (metadata, Open Graph e X) das páginas que não têm a própria. */
export const SITE_DESCRIPTION = "Publishub checks that your AI-built app still works, before your users find out it doesn't. Free check and daily monitor of your public pages; checks of login flows in development.";

/**
 * A frase que acompanha o nome. "Publishub" sozinho não diz o que o produto faz (lembra "publicar conteúdo"),
 * então o nome aparece com esta frase onde a pessoa ainda não conhece a marca: rodapé, prévias de link, llms.txt.
 */
export const SITE_TAGLINE = {
  en: "Check that your AI-built app still works, before your users do.",
  pt: "Verifique se o seu app feito com IA continua funcionando, antes dos seus usuários.",
} as const;

/**
 * A família de nomes: um nome por coisa que a pessoa usa. O motor open source é o stillworks, sempre em minúsculas
 * (é o nome do pacote no npm e do repositório).
 */
export const PRODUCT_NAMES = {
  check: "Publishub Check",
  monitor: "Publishub Monitor",
  engine: "stillworks",
} as const;
