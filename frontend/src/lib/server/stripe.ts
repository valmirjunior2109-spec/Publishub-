import Stripe from "stripe";
import { ConfigError } from "./db";

/** O Stripe do Founding plan. A chave secreta só existe no servidor. */

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new ConfigError("STRIPE_SECRET_KEY is not set.");
  client = new Stripe(key);
  return client;
}

/** O produto da reserva: o metadata que separa estas compras de qualquer outra da conta. */
export const FOUNDING_PRODUCT = "founding_plan";
