import type Stripe from "stripe";
import { db } from "./db";

/**
 * Registro histórico da reserva de US$ 49 do produto descontinuado (o antigo "Founding plan", pagamento único).
 * O site não vende mais essa reserva: a rota de Checkout dela foi removida. Este handler só existe para manter
 * public.reservations correta enquanto houver eventos dessas compras antigas na conta do Stripe:
 * - uma sessão aberta antes do deploy que ainda termine (checkout.session.completed / async_payment_succeeded);
 * - sessões que expiram (checkout.session.expired);
 * - reembolsos feitos pelo painel do Stripe (charge.refunded).
 * Pode sair quando todas as reservas antigas estiverem reembolsadas ou resolvidas.
 */

/** O metadata que separa essas compras antigas de qualquer outra da conta. */
export const LEGACY_RESERVATION_PRODUCT = "founding_plan";

/** true quando o evento era de uma reserva antiga (e foi tratado); false quando não é dela. */
export async function applyLegacyReservationEvent(event: Stripe.Event): Promise<boolean> {
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.product !== LEGACY_RESERVATION_PRODUCT) return false;
    if (session.payment_status !== "paid") return true;
    const row = {
      stripe_session_id: session.id,
      stripe_payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null),
      status: "paid",
      email: session.customer_details?.email?.toLowerCase() ?? session.customer_email ?? null,
      amount: session.amount_total,
      currency: session.currency,
      store_url: session.metadata?.store_url || null,
      scan_id: session.metadata?.scan_id || null,
      paid_at: new Date().toISOString(),
    };
    const { error } = await db().from("reservations").upsert(row, { onConflict: "stripe_session_id" });
    if (error) throw error;
    return true;
  }
  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.product !== LEGACY_RESERVATION_PRODUCT) return false;
    const { error } = await db().from("reservations").update({ status: "expired" }).eq("stripe_session_id", session.id).eq("status", "pending");
    if (error) throw error;
    return true;
  }
  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const intent = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
    if (!intent || !charge.refunded) return false;
    // só atualiza se o pagamento for de uma reserva antiga (as outras compras da conta não estão nesta tabela)
    const { error } = await db().from("reservations").update({ status: "refunded" }).eq("stripe_payment_intent", intent);
    if (error) throw error;
    return true;
  }
  return false;
}
