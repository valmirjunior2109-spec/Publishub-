import { ConfigError } from "@/lib/server/db";
import { EMAIL_RE, errorJson, json } from "@/lib/server/request";
import { foundingCustomersPriceId, stripe } from "@/lib/server/stripe";
import { cleanUtm, crossSite, readJson } from "@/lib/server/waitlist";
import { FOUNDING_CUSTOMERS_PRODUCT, PAYMENT_SUCCESS_PATH, PRICING_ANCHOR } from "@/lib/founding";
import { SITE_URL } from "@/lib/site";

export const runtime = "nodejs";

/**
 * POST { email?, utm? } → { url } do Stripe Checkout da assinatura Founding Customers.
 * Assinatura recorrente (mode "subscription"): o preço é conferido no Stripe antes de abrir o Checkout.
 * Quem grava a assinatura e o status é o webhook (/api/stripe/webhook), nunca esta rota.
 */
export async function POST(request: Request) {
  if (crossSite(request)) return errorJson("Not allowed.", 403, "FORBIDDEN");
  const body = (await readJson(request)) ?? {};
  const email = typeof body.email === "string" && EMAIL_RE.test(body.email.trim()) ? body.email.trim().toLowerCase() : undefined;
  const utm = cleanUtm(body.utm);
  const priceId = foundingCustomersPriceId();

  try {
    // um preço único aqui viraria cobrança única: recusa antes de abrir o Checkout
    const price = await stripe().prices.retrieve(priceId);
    if (price.type !== "recurring" || !price.active) {
      console.error("founding price is not an active recurring price", priceId, price.type, price.active);
      return errorJson("Checkout is unavailable right now.", 500, "PRICE_NOT_RECURRING");
    }

    const metadata = { product: FOUNDING_CUSTOMERS_PRODUCT, ...utm };
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      metadata,
      subscription_data: { metadata },
      allow_promotion_codes: false,
      custom_text: { submit: { message: "Publishub is in development. Your subscription renews every billing period until you cancel." } },
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
