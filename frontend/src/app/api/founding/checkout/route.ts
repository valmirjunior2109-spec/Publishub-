import { ConfigError } from "@/lib/server/db";
import { EMAIL_RE, errorJson, json } from "@/lib/server/request";
import { foundingCustomersPriceId, stripe } from "@/lib/server/stripe";
import { cleanUtm, crossSite, readJson } from "@/lib/server/waitlist";
import { FOUNDING_CUSTOMERS_PRODUCT, FOUNDING_TERMS, formatFoundingPrice, PAYMENT_SUCCESS_PATH, PRICING_ANCHOR } from "@/lib/founding";
import { SITE_URL } from "@/lib/site";

export const runtime = "nodejs";

/**
 * POST { email?, utm? } → { url } do Stripe Checkout da RESERVA Founding Customers (modelo pré-lançamento).
 *
 * Modo "setup": o Stripe guarda o cartão, com autorização para cobranças futuras, e cria o cliente.
 * Nada é cobrado e nenhuma assinatura é criada agora. No lançamento, scripts/founding-activate.mjs cria a
 * assinatura com o preço recorrente (o mesmo Price ID), com a primeira cobrança no mínimo
 * FOUNDING_TERMS.noticeDays dias depois do aviso por e-mail.
 * Quem grava a reserva é o webhook (/api/stripe/webhook), nunca esta rota.
 */
export async function POST(request: Request) {
  if (crossSite(request)) return errorJson("Not allowed.", 403, "FORBIDDEN");
  const body = (await readJson(request)) ?? {};
  const email = typeof body.email === "string" && EMAIL_RE.test(body.email.trim()) ? body.email.trim().toLowerCase() : undefined;
  const utm = cleanUtm(body.utm);
  const priceId = foundingCustomersPriceId();

  try {
    // o preço que vai valer no lançamento: precisa ser recorrente e ativo (e o Checkout mostra o valor certo)
    const price = await stripe().prices.retrieve(priceId);
    if (price.type !== "recurring" || !price.active || !price.recurring || price.unit_amount === null) {
      console.error("founding price is not an active recurring price", priceId, price.type, price.active);
      return errorJson("Checkout is unavailable right now.", 500, "PRICE_NOT_RECURRING");
    }
    const { amount, per } = formatFoundingPrice({ amount: price.unit_amount, currency: price.currency, interval: price.recurring.interval, intervalCount: price.recurring.interval_count });

    const metadata = { product: FOUNDING_CUSTOMERS_PRODUCT, price_id: priceId, ...utm };
    const session = await stripe().checkout.sessions.create({
      mode: "setup",
      // só cartão: é o meio que aceita cobranças futuras sem a pessoa presente (a assinatura no lançamento).
      // Nesta versão da API o campo se chama allowed_payment_method_types (antes, payment_method_types).
      allowed_payment_method_types: ["card"],
      customer_creation: "always",
      customer_email: email,
      metadata,
      setup_intent_data: { metadata, description: `Publishub Founding Customers reservation: ${amount}${per} after launch` },
      custom_text: {
        submit: {
          message: `You won't be charged today. Publishub isn't available yet. When it launches, we'll email you at least ${FOUNDING_TERMS.noticeDays} days before your first ${amount}${per} charge, and you can cancel before then at no cost.`,
        },
      },
      success_url: `${SITE_URL}${PAYMENT_SUCCESS_PATH}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/#${PRICING_ANCHOR}`,
    });
    if (!session.url) return errorJson("Checkout is unavailable right now.", 502, "CHECKOUT_ERROR");
    return json({ url: session.url });
  } catch (error) {
    if (error instanceof ConfigError) return errorJson("Checkout isn't configured yet.", 503, "NOT_CONFIGURED");
    console.error("founding checkout failed", error);
    // só o tipo, o código e o campo do erro do Stripe (nunca a mensagem, que pode trazer ids)
    const e = error as { type?: unknown; code?: unknown; param?: unknown };
    const detail =
      typeof e?.type === "string" && e.type.startsWith("Stripe")
        ? { type: e.type, code: typeof e.code === "string" ? e.code : undefined, param: typeof e.param === "string" ? e.param : undefined }
        : undefined;
    return json({ error: { message: "Checkout is unavailable right now. Please try again in a moment.", code: "CHECKOUT_ERROR", stripe: detail } }, 502);
  }
}
