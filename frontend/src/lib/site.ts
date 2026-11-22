/** O que o site inteiro precisa saber: nome, endereço, contato e a descrição do produto. */

export const SITE_NAME = "Publishub";
// .trim(): um valor colado com quebra de linha no fim gerava URLs inválidas (o Stripe recusava o success_url)
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://getpublishub.com").replace(/\/+$/, "");
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "copilot@getpublishub.com";

/** A descrição padrão (metadata, Open Graph e X) das páginas que não têm a própria. */
export const SITE_DESCRIPTION = "Verify AI-built applications with real browser-based user journeys. Detect broken flows and regressions before your users do.";
