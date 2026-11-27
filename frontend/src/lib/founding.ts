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

/**
 * O que um Founding Customer recebe, em linguagem de resultado. O card da home e a oferta do /check leem daqui.
 * É o que o StillWorks grátis não faz: setup feito pelo founder, monitoramento de hora em hora em produção,
 * alertas, comparação com a última versão boa e funcionar sem terminal.
 */
export const FOUNDING_PERKS = [
  "Your 5 must-never-break flows set up with you, 1:1, by the founder",
  "Hourly checks on your live app, read-only by default",
  "An alert when a flow breaks, only after it fails twice in a row",
  "Each run compared with your last working version",
  "No terminal or CI needed: works for Lovable, Bolt and v0 apps too",
  "The founding price, locked for as long as you stay",
] as const;

export const FOUNDING_PERKS_PT = [
  "Seus 5 fluxos que nunca podem quebrar, configurados com você, 1:1, pelo fundador",
  "Verificação de hora em hora no app em produção, só leitura por padrão",
  "Um alerta quando um fluxo quebra, só depois de falhar duas vezes seguidas",
  "Cada execução comparada com a última versão que funcionava",
  "Sem terminal nem CI: funciona também para apps feitos no Lovable, Bolt e v0",
  "O preço de fundador, travado enquanto você continuar",
] as const;

/** Onde mora o núcleo open source. */
export const STILLWORKS_URL = "https://github.com/valmirjunior2109-spec/stillworks";

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
const INTERVAL_PT: Record<string, [string, string]> = { day: ["dia", "dias"], week: ["semana", "semanas"], month: ["mês", "meses"], year: ["ano", "anos"] };

export function formatFoundingPrice(price: FoundingPrice, locale: "en" | "pt" = "en"): { amount: string; per: string } {
  const amount = new Intl.NumberFormat(locale === "pt" ? "pt-BR" : "en-US", {
    style: "currency",
    currency: price.currency.toUpperCase(),
    minimumFractionDigits: price.amount % 100 === 0 ? 0 : 2,
  }).format(price.amount / 100);
  if (locale === "pt") {
    const [one, many] = INTERVAL_PT[price.interval] ?? [price.interval, price.interval];
    return { amount, per: price.intervalCount === 1 ? `/${one}` : `/${price.intervalCount} ${many}` };
  }
  const per = price.intervalCount === 1 ? `/${price.interval}` : `/${price.intervalCount} ${price.interval}s`;
  return { amount, per };
}
