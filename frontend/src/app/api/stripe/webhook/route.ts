import type Stripe from "stripe";
import { applyFoundingEvent } from "@/lib/server/founding";
import { applyLegacyReservationEvent } from "@/lib/server/legacy-reservations";
import { stripe } from "@/lib/server/stripe";

export const runtime = "nodejs";

/**
 * O webhook do Stripe da Publishub (um endpoint, com o próprio segredo). Separado pelo metadata:
 * - Founding Customers (assinatura): checkout.session.completed, customer.subscription.created/updated/deleted,
 *   invoice.paid e invoice.payment_failed → public.founding_subscriptions (lib/server/founding.ts);
 * - registro histórico da reserva de US$ 49 do produto descontinuado (lib/server/legacy-reservations.ts):
 *   só conclusões atrasadas, expirações e reembolsos → public.reservations.
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
    if (await applyLegacyReservationEvent(event)) return Response.json({ received: true });
  } catch (error) {
    console.error("stripe webhook failed", event.type, error);
    // 500: o Stripe tenta de novo mais tarde
    return new Response("Webhook handler failed", { status: 500 });
  }
  return Response.json({ ignored: true });
}
