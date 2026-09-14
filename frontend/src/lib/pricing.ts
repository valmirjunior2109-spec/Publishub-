/**
 * A oferta: um único plano, "Creator" — pagamento único, acesso vitalício.
 * Um link só no Stripe, cobrado em dólar; o checkout aceita cartão de qualquer
 * país e o Stripe converte para a moeda da pessoa.
 *
 * Conferido abrindo o checkout em 13/09/2026: "PublisHub Creator Plan — US$ 12,00",
 * sem "por mês" (pagamento único).
 */

export interface Offer {
  name: string;
  currency: "USD";
  amount: number;
  /** Como o preço aparece na tela — sem centavos, com o símbolo. */
  display: string;
  checkoutUrl: string;
}

export const OFFER: Offer = {
  name: "Creator",
  currency: "USD",
  amount: 12,
  display: "US$ 12",
  checkoutUrl: "https://buy.stripe.com/7sYfZa5oj7QB4Bj2VTfQI0g",
};

/** O mesmo plano em todos os idiomas: a moeda é resolvida pelo Stripe, não pelo site. */
export function offerFor(): Offer {
  return OFFER;
}

/**
 * O link de pagamento com a conta já identificada: `prefilled_email` evita que a
 * pessoa pague com outro e-mail, e `client_reference_id` liga o pagamento ao
 * usuário antes mesmo do webhook. Sem sessão, é o link puro.
 */
export function checkoutUrl(account: { email?: string | null; userId?: string | null } = {}): string {
  const url = new URL(OFFER.checkoutUrl);
  if (account.email) url.searchParams.set("prefilled_email", account.email);
  if (account.userId) url.searchParams.set("client_reference_id", account.userId);
  return url.toString();
}

/** Iguais a CREATOR_ANALYSES_PER_MONTH e FREE_ANALYSES no backend (quem manda é o backend). */
export const ANALYSES_PER_MONTH = 30;
export const FREE_ANALYSES = 1;

export function analysesPerMonthLabel(): string {
  return String(ANALYSES_PER_MONTH);
}
