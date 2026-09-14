/**
 * A oferta: um único plano, "Lifetime": pagamento único, acesso vitalício, uploads ilimitados.
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
  name: "Lifetime",
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

/** Igual a FREE_UPLOADS no backend (quem conta é o backend; aqui é só para o texto). */
export const FREE_UPLOADS = 5;
