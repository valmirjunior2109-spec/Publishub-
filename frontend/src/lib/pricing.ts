/**
 * A oferta: um plano só, o Vitalício Fundador. Pagamento único, sem assinatura,
 * limitado aos primeiros compradores (quantos, e quantas vagas restam, quem diz é
 * o backend: GET /api/billing/founder, contado nas compras pagas).
 *
 * Um link do Stripe, cobrado em dólar; o checkout aceita cartão de qualquer país
 * e o próprio Stripe converte para a moeda da pessoa. Por isso não há preço por idioma.
 *
 * É o link que antes vendia o Creator: conferido abrindo o checkout em 13/09/2026,
 * US$ 12,00, sem "por mês" (pagamento único).
 */

export interface Offer {
  /** Nome fixo, para os eventos do funil; o nome na tela vem das mensagens (Pricing.planName). */
  name: string;
  currency: "USD";
  amount: number;
  /** Como o preço aparece na tela — sem centavos, com o símbolo. */
  display: string;
  checkoutUrl: string;
}

export const OFFER: Offer = {
  name: "Founder",
  currency: "USD",
  amount: 12,
  display: "US$ 12",
  checkoutUrl: "https://buy.stripe.com/7sYfZa5oj7QB4Bj2VTfQI0g",
};

/**
 * O que vai no client_reference_id do Stripe: quem paga e por qual análise.
 * "u-<conta>__a-<análise>", ou só um dos dois. É o formato que o backend lê
 * (billing_service.parse_reference); o Stripe aceita letras, números, - e _.
 */
export function stripeReference(userId?: string | null, analysisId?: string | null): string | null {
  const parts = [userId ? `u-${userId}` : null, analysisId ? `a-${analysisId}` : null].filter(Boolean);
  return parts.length ? parts.join("__") : null;
}

/**
 * O link de pagamento com a conta e a análise já identificadas: `prefilled_email`
 * evita que a pessoa pague com outro e-mail, e `client_reference_id` liga o
 * pagamento à conta e à análise antes mesmo do webhook. É por ele que o webhook
 * sabe qual análise abrir. Sem nada disso, é o link puro.
 */
export function checkoutUrl(account: { email?: string | null; userId?: string | null; analysisId?: string | null } = {}, offer: Offer = OFFER): string {
  const url = new URL(offer.checkoutUrl);
  if (account.email) url.searchParams.set("prefilled_email", account.email);
  const reference = stripeReference(account.userId, account.analysisId);
  if (reference) url.searchParams.set("client_reference_id", reference);
  return url.toString();
}

/** Igual a FREE_UPLOADS no backend (quem conta é o backend; aqui é só para o texto). */
export const FREE_UPLOADS = 5;
