/**
 * Founding Customers: a assinatura paga da Publishub. Constantes que o navegador e o servidor dividem
 * (nada de segredo: o id de um preço do Stripe é público, ele aparece no próprio Checkout).
 */

/** O metadata que separa estas assinaturas de qualquer outra compra da mesma conta do Stripe. */
export const FOUNDING_CUSTOMERS_PRODUCT = "founding_customers";

/** O preço recorrente do Stripe. STRIPE_FOUNDING_CUSTOMERS_PRICE_ID troca sem mexer no código (ex.: modo de teste). */
export const DEFAULT_FOUNDING_CUSTOMERS_PRICE_ID = "price_1UaLsA2cdYlX3v8aM3XWVcLT";

/**
 * Os termos do modelo pré-lançamento, num lugar só (o card, o Checkout, a página de sucesso e /terms leem daqui).
 * Hoje nada é cobrado: o cartão fica guardado no Stripe. No lançamento, avisamos por e-mail pelo menos
 * NOTICE_DAYS dias antes da primeira cobrança; quem desistir antes não paga nada. Depois disso, a primeira
 * mensalidade pode ser reembolsada a pedido em até REFUND_DAYS dias.
 */
export const FOUNDING_TERMS = { noticeDays: 7, refundDays: 14 } as const;
export const FOUNDING_TERMS_ANCHOR = "founding-customers";

export const PAYMENT_SUCCESS_PATH = "/payment/success";
export const PRICING_ANCHOR = "pricing";

export interface FoundingPrice {
  /** em centavos */
  amount: number;
  currency: string;
  // day, week, month ou year (o Stripe pode acrescentar outros no futuro)
  interval: string;
  intervalCount: number;
}

/** "$29" e "/month" (ou "/3 months"), no formato de quem lê em inglês. */
export function formatFoundingPrice(price: FoundingPrice): { amount: string; per: string } {
  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: price.currency.toUpperCase(),
    minimumFractionDigits: price.amount % 100 === 0 ? 0 : 2,
  }).format(price.amount / 100);
  const per = price.intervalCount === 1 ? `/${price.interval}` : `/${price.intervalCount} ${price.interval}s`;
  return { amount, per };
}
