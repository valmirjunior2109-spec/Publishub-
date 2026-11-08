/** O que o site inteiro precisa saber: nome, endereço, contato e a oferta. */

export const SITE_NAME = "Publishub";
export const TAGLINE = "Fix it before you publish.";
// .trim(): um valor colado com quebra de linha no fim gerava URLs inválidas (o Stripe recusava o success_url)
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://getpublishub.com").replace(/\/+$/, "");
// o mesmo endereço que já recebia o suporte do produto anterior
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ||"copilot@getpublishub.com";

/** O Founding plan: reserva paga uma vez, abatida da mensalidade quando a correção automática lançar. */
export const FOUNDING = {
  reservationUsd: 49,
  monthlyUsd: 79,
  refundDays: 60,
} as const;

/** As regras do axe que o scanner roda (WCAG 2.0, 2.1 e 2.2, níveis A e AA). */
export const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] as const;

export const DISCLAIMER = "This report is not legal advice.";
export const AUTOMATED_LIMITS = "Automated checks catch a portion of WCAG issues; manual review is still recommended.";
