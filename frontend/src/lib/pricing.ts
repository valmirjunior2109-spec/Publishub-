import type { AppLocale } from "@/i18n/config";

/**
 * A oferta: pagamento único, acesso vitalício. Um preço por moeda, nunca duas
 * moedas na mesma tela. Este é o único lugar que sabe o mapeamento
 * locale → preço → link de checkout.
 */

export type Currency = "BRL" | "USD";

export interface Offer {
  currency: Currency;
  amount: number;
  /** Como o preço aparece na tela — sem centavos, com o símbolo local. */
  display: string;
  checkoutUrl: string;
}

/*
 * Conferido abrindo os checkouts em 13/09/2026:
 *   eVq14gg2X1sd6JrfIFfQI0e → R$ 49,00   (a lista original tinha os dois trocados)
 *   bJe14g03Z1sd6Jr0NLfQI0f → US$ 12,00
 *
 * TODO (bloqueante para publicar /planos): os DOIS links cobram "por mês"
 * (produto "Assinar Early Access" no Stripe). A oferta é pagamento único com
 * acesso vitalício — crie dois payment links de pagamento único no Stripe e
 * troque as URLs abaixo antes de publicar a página.
 */
const OFFERS: Record<Currency, Offer> = {
  BRL: {
    currency: "BRL",
    amount: 49,
    display: "R$ 49",
    checkoutUrl: "https://buy.stripe.com/eVq14gg2X1sd6JrfIFfQI0e",
  },
  USD: {
    currency: "USD",
    amount: 12,
    display: "US$ 12",
    checkoutUrl: "https://buy.stripe.com/bJe14g03Z1sd6Jr0NLfQI0f",
  },
};

export function offerFor(locale: AppLocale): Offer {
  return locale === "pt-BR" ? OFFERS.BRL : OFFERS.USD;
}

/**
 * TODO: definir o limite de análises por mês. Enquanto não houver número,
 * a tela mostra o placeholder "X análises por mês, para sempre".
 */
export const ANALYSES_PER_MONTH: number | null = null;

export function analysesPerMonthLabel(): string {
  return ANALYSES_PER_MONTH === null ? "X" : String(ANALYSES_PER_MONTH);
}
