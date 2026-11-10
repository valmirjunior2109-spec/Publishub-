import { unstable_cache } from "next/cache";
import Stripe from "stripe";
import { DEFAULT_FOUNDING_CUSTOMERS_PRICE_ID, type FoundingPrice } from "@/lib/founding";
import { ConfigError } from "./db";

/** O Stripe da Publishub. A chave secreta só existe no servidor. */

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new ConfigError("STRIPE_SECRET_KEY is not set.");
  // STRIPE_API_BASE só em teste local (o stripe-mock, ex.: http://localhost:12111). Em produção, vazio.
  const base = process.env.STRIPE_API_BASE ? new URL(process.env.STRIPE_API_BASE) : null;
  client = new Stripe(
    key,
    base ? { host: base.hostname, port: Number(base.port) || undefined, protocol: base.protocol.replace(":", "") as "http" | "https" } : undefined,
  );
  return client;
}

/** O produto da reserva do scanner (pagamento único): o metadata que separa estas compras de qualquer outra da conta. */
export const FOUNDING_PRODUCT = "founding_plan";

export function foundingCustomersPriceId(): string {
  return process.env.STRIPE_FOUNDING_CUSTOMERS_PRICE_ID?.trim() || DEFAULT_FOUNDING_CUSTOMERS_PRICE_ID;
}

/**
 * O preço da assinatura Founding Customers, lido do próprio Stripe (o valor nunca é escrito à mão no site).
 * null quando não dá para ler (sem chave, sem permissão de leitura de preços) ou quando o preço não é recorrente.
 *
 * Em cache por 1 hora com unstable_cache: o SDK do Stripe não usa fetch, e sem cache o Next 16 trata a leitura
 * como dado dinâmico, "adia" a home (x-nextjs-postponed) e o prefetch dela fica aberto sem terminar.
 */
export const foundingCustomersPrice = unstable_cache(
  async (): Promise<FoundingPrice | null> => {
    try {
      const price = await stripe().prices.retrieve(foundingCustomersPriceId());
      if (!price.active || price.type !== "recurring" || !price.recurring || price.unit_amount === null) return null;
      return { amount: price.unit_amount, currency: price.currency, interval: price.recurring.interval, intervalCount: price.recurring.interval_count };
    } catch (error) {
      console.error("founding price unavailable", error instanceof Error ? error.message : error);
      return null;
    }
  },
  ["founding-customers-price"],
  { revalidate: 3600, tags: ["founding-price"] },
);
