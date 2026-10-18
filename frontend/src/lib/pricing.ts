/**
 * Os planos pagos, num lugar só: nenhum outro arquivo escreve um link do Stripe.
 *
 *  - Creator: US$ 12 por mês (assinatura).
 *  - Pro: US$ 24 por mês (assinatura), com a análise mais profunda.
 *  - Founder Lifetime: US$ 49 uma vez (pagamento único, sem assinatura), com a
 *    análise do Pro, limitado aos primeiros compradores (quantos, e quantas vagas
 *    restam, quem diz é o backend: GET /api/billing/founder, contado nas compras pagas).
 *
 * Cobrados em dólar; o checkout aceita cartão de qualquer país e o próprio Stripe
 * converte para a moeda da pessoa. Por isso não há preço por idioma.
 *
 * Os links foram conferidos abrindo o checkout: Creator "Creator Plan - Publishub"
 * US$ 12,00/mês e Pro "Pro Plan - Publishub" US$ 24,00/mês (15/10/2026); Founder
 * "Founder Lifetime - Publishub" US$ 49,00 pagamento único (16/10/2026, o link
 * novo: o de US$ 12 saiu do site e precisa ser desativado no Stripe). O que cada
 * plano libera não vem daqui: o backend lê o preço que o Stripe cobrou (webhook).
 */

export type PlanId = "creator" | "pro" | "founder";

export interface PaidPlan {
  id: PlanId;
  /** Nome fixo, para os eventos do funil; o nome na tela vem das mensagens (Pricing.plans.<id>.name). */
  name: string;
  currency: "USD";
  amount: number;
  /** Como o preço aparece na tela — sem centavos, com o símbolo. */
  display: string;
  /** "monthly": assinatura que renova todo mês; "once": pagamento único. */
  billing: "monthly" | "once";
  checkoutUrl: string;
}

export const PLANS: Record<PlanId, PaidPlan> = {
  creator: {
    id: "creator",
    name: "Creator",
    currency: "USD",
    amount: 12,
    display: "US$ 12",
    billing: "monthly",
    checkoutUrl: "https://buy.stripe.com/3cIeV6bMH1sd3xfdAxfQI0k",
  },
  pro: {
    id: "pro",
    name: "Pro",
    currency: "USD",
    amount: 24,
    display: "US$ 24",
    billing: "monthly",
    checkoutUrl: "https://buy.stripe.com/dRm00c3gb9YJc3L685fQI0i",
  },
  founder: {
    id: "founder",
    name: "Founder",
    currency: "USD",
    amount: 49,
    display: "US$ 49",
    billing: "once",
    checkoutUrl: "https://buy.stripe.com/4gM9AM7wrgn75Fn541fQI0l",
  },
};

/**
 * Os planos à venda no site: só as assinaturas. O Founder Lifetime saiu de venda
 * quando o deal do AppSumo entrou no ar (o vitalício agora é só por lá); ele
 * continua em PLANS porque quem já comprou segue com acesso e a conta o mostra.
 */
export const PAID_PLANS: PaidPlan[] = [PLANS.creator, PLANS.pro];

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
 * pagamento à conta e à análise antes mesmo do webhook. Sem nada disso, é o link puro.
 *
 * Nada aqui libera acesso: quem decide é o backend, depois que o Stripe confirma.
 */
export function checkoutUrl(plan: PaidPlan, account: { email?: string | null; userId?: string | null; analysisId?: string | null } = {}): string {
  const url = new URL(plan.checkoutUrl);
  if (account.email) url.searchParams.set("prefilled_email", account.email);
  const reference = stripeReference(account.userId, account.analysisId);
  if (reference) url.searchParams.set("client_reference_id", reference);
  return url.toString();
}

/** O padrão de FREE_UPLOADS no backend. Só um reserva: a tela usa o `uploads_limit` que o backend manda. */
export const FREE_UPLOADS = 20;
