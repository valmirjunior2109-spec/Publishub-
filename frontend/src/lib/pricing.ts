/**
 * A oferta: dois planos vitalícios, os dois de pagamento único. Nenhum é
 * assinatura, e o que separa um do outro é profundidade de análise, não uma
 * etiqueta — o backend decide pelo valor pago (billing_service.tier).
 *
 * Um link do Stripe por plano, cobrados em dólar; o checkout aceita cartão de
 * qualquer país e o Stripe converte para a moeda da pessoa.
 *
 * Conferido abrindo o checkout em 13/09/2026: "PublisHub Creator Plan — US$ 12,00",
 * sem "por mês" (pagamento único).
 */

export type PlanId = "creator" | "pro";

export interface Offer {
  id: PlanId;
  name: string;
  currency: "USD";
  amount: number;
  /** Como o preço aparece na tela — sem centavos, com o símbolo. */
  display: string;
  checkoutUrl: string;
}

export const CREATOR: Offer = {
  id: "creator",
  name: "Creator",
  currency: "USD",
  amount: 12,
  display: "US$ 12",
  checkoutUrl: "https://buy.stripe.com/7sYfZa5oj7QB4Bj2VTfQI0g",
};

export const PRO: Offer = {
  id: "pro",
  name: "Pro",
  currency: "USD",
  amount: 29,
  display: "US$ 29",
  checkoutUrl: "https://buy.stripe.com/8x2eV6eYTgn7gk1cwtfQI0h",
};

export const OFFERS: Offer[] = [CREATOR, PRO];

/** O plano em destaque nas telas que mostram um só (o paywall de uma análise). */
export const OFFER = CREATOR;

/** O mesmo preço em todos os idiomas: a moeda é resolvida pelo Stripe, não pelo site. */
export function offerFor(id: PlanId = "creator"): Offer {
  return id === "pro" ? PRO : CREATOR;
}

/**
 * O link de pagamento com a conta já identificada: `prefilled_email` evita que a
 * pessoa pague com outro e-mail, e `client_reference_id` liga o pagamento ao
 * usuário antes mesmo do webhook. Sem sessão, é o link puro.
 */
export function checkoutUrl(account: { email?: string | null; userId?: string | null } = {}, offer: Offer = OFFER): string {
  const url = new URL(offer.checkoutUrl);
  if (account.email) url.searchParams.set("prefilled_email", account.email);
  if (account.userId) url.searchParams.set("client_reference_id", account.userId);
  return url.toString();
}

/** Igual a FREE_UPLOADS no backend (quem conta é o backend; aqui é só para o texto). */
export const FREE_UPLOADS = 5;
