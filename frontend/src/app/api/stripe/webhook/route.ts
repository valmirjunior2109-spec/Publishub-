import type Stripe from "stripe";
import { db } from "@/lib/server/db";
import { applyFoundingEvent } from "@/lib/server/founding";
import { captureServer } from "@/lib/server/posthog";
import { FOUNDING_PRODUCT, stripe } from "@/lib/server/stripe";

export const runtime = "nodejs";

/**
 * O webhook do Stripe da Publishub (um endpoint, com o próprio segredo). Dois produtos, separados pelo metadata:
 * - Founding Customers (assinatura): checkout.session.completed, customer.subscription.created/updated/deleted,
 *   invoice.paid e invoice.payment_failed → public.founding_subscriptions (lib/server/founding.ts);
 * - reserva do Founding plan do scanner (pagamento único): checkout.session.completed ou async_payment_succeeded
 *   → reserva "paid"; checkout.session.expired → "expired"; charge.refunded → "refunded".
 * Compras de outros produtos da mesma conta são ignoradas.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_FOUNDING_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return new Response("Webhook not configured", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    // a assinatura Founding Customers primeiro: se o evento for dela, já foi gravado
    if (await applyFoundingEvent(event)) return Response.json({ received: true });

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.product !== FOUNDING_PRODUCT) return Response.json({ ignored: true });
      if (session.payment_status !== "paid") return Response.json({ pending: true });
      const email = session.customer_details?.email?.toLowerCase() ?? session.customer_email ?? null;
      const row = {
        stripe_session_id: session.id,
        stripe_payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null),
        status: "paid",
        email,
        amount: session.amount_total,
        currency: session.currency,
        store_url: session.metadata?.store_url || null,
        scan_id: session.metadata?.scan_id || null,
        paid_at: new Date().toISOString(),
      };
      const { error } = await db().from("reservations").upsert(row, { onConflict: "stripe_session_id" });
      if (error) throw error;
      await captureServer("reservation_paid", email ?? session.id, { amount: session.amount_total, currency: session.currency, scan_id: row.scan_id, store_url: row.store_url });
    } else if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.product === FOUNDING_PRODUCT) {
        await db().from("reservations").update({ status: "expired" }).eq("stripe_session_id", session.id).eq("status", "pending");
      }
    } else if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const intent = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (intent && charge.refunded) await db().from("reservations").update({ status: "refunded" }).eq("stripe_payment_intent", intent);
    }
  } catch (error) {
    console.error("stripe webhook failed", event.type, error);
    // 500: o Stripe tenta de novo mais tarde
    return new Response("Webhook handler failed", { status: 500 });
  }
  return Response.json({ received: true });
}
