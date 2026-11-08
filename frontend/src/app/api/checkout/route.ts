import { db, UUID_RE } from "@/lib/server/db";
import { EMAIL_RE, errorJson, json } from "@/lib/server/request";
import { FOUNDING_PRODUCT, stripe } from "@/lib/server/stripe";
import { FOUNDING, SITE_URL } from "@/lib/site";

export const runtime = "nodejs";

/**
 * POST { email?, scanId?, storeUrl? } → { url } do Stripe Checkout.
 * Pagamento único da reserva do Founding plan; a reserva nasce "pending" e o webhook a marca "paid".
 * Sem STRIPE_FOUNDING_PRICE_ID, cria o preço de US$ 49 na hora (útil em teste).
 */
export async function POST(request: Request) {
  let body: { email?: unknown; scanId?: unknown; storeUrl?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // sem corpo: o próprio Checkout pede o e-mail
  }
  const email = typeof body.email === "string" && EMAIL_RE.test(body.email.trim()) ? body.email.trim().toLowerCase() : undefined;
  const scanId = typeof body.scanId === "string" && UUID_RE.test(body.scanId) ? body.scanId : undefined;
  let storeUrl = typeof body.storeUrl === "string" ? body.storeUrl.slice(0, 300) : undefined;

  try {
    if (scanId && !storeUrl) {
      const { data } = await db().from("scans").select("url").eq("id", scanId).maybeSingle();
      storeUrl = (data?.url as string | undefined) ?? undefined;
    }

    const price = process.env.STRIPE_FOUNDING_PRICE_ID;
    const metadata = { product: FOUNDING_PRODUCT, scan_id: scanId ?? "", store_url: storeUrl ?? "" };
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: price
        ? [{ price, quantity: 1 }]
        : [
            {
              quantity: 1,
              price_data: {
                currency: "usd",
                unit_amount: FOUNDING.reservationUsd * 100,
                product_data: {
                  name: "Publishub Founding plan reservation",
                  description: `Credited toward your first months of the $${FOUNDING.monthlyUsd}/month plan when automatic fixes launch.`,
                },
              },
            },
          ],
      customer_email: email,
      metadata,
      payment_intent_data: { metadata },
      custom_text: { submit: { message: `Full refund if automatic fixes don't launch within ${FOUNDING.refundDays} days.` } },
      success_url: `${SITE_URL}/reserve/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: scanId ? `${SITE_URL}/scan/${scanId}` : `${SITE_URL}/#pricing`,
    });

    const { error } = await db()
      .from("reservations")
      .insert({ email: email ?? null, store_url: storeUrl ?? null, scan_id: scanId ?? null, stripe_session_id: session.id, status: "pending" });
    if (error) console.error("reservation insert failed", error);
    if (!session.url) return errorJson("Checkout is unavailable right now.", 502, "CHECKOUT_ERROR");
    return json({ url: session.url });
  } catch (error) {
    console.error("checkout failed", error);
    // Só o tipo, o código e o campo do erro do Stripe (nunca a mensagem, que pode trazer ids):
    // dá para saber se é permissão da chave, preço inexistente ou modo errado sem abrir o log.
    const e = error as { type?: unknown; code?: unknown; param?: unknown };
    const detail = typeof e?.type === "string" && e.type.startsWith("Stripe")
      ? { type: e.type, code: typeof e.code === "string" ? e.code : undefined, param: typeof e.param === "string" ? e.param : undefined }
      : undefined;
    return json(
      { error: { message: "Checkout is unavailable right now. Please try again in a moment.", code: "CHECKOUT_ERROR", stripe: detail } },
      502,
    );
  }
}
