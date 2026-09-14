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
 * TODO: definir o limite de análises por mês. Enquanto não houver número,
 * a tela mostra o placeholder "X análises por mês, para sempre".
 */
export const ANALYSES_PER_MONTH: number | null = null;

export function analysesPerMonthLabel(): string {
  return ANALYSES_PER_MONTH === null ? "X" : String(ANALYSES_PER_MONTH);
}
