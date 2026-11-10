import type Stripe from "stripe";
import { FOUNDING_CUSTOMERS_PRODUCT } from "@/lib/founding";
import { db } from "./db";
import { captureServer } from "./posthog";

/**
 * Os eventos do Stripe do Founding Customers. Antes do lançamento, só a reserva (checkout em modo "setup")
 * → public.founding_commitments. Depois, as assinaturas criadas por scripts/founding-activate.mjs. Os eventos de
 * assinatura viram uma chamada a public.founding_subscription_upsert, que ignora eventos mais antigos que o último status gravado.
 * Devolve true quando o evento era desta assinatura (e foi gravado), false quando é de outro produto.
 */

const idOf = (value: string | { id: string } | null | undefined) => (typeof value === "string" ? value : (value?.id ?? null));

async function upsert(p: Record<string, unknown>) {
  const { error } = await db().rpc("founding_subscription_upsert", { p });
  if (error) throw error;
}

export async function applyFoundingEvent(event: Stripe.Event): Promise<boolean> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.product !== FOUNDING_CUSTOMERS_PRODUCT) return false;
      // pré-lançamento: modo "setup" = a reserva (cartão guardado, nada cobrado, sem assinatura)
      if (session.mode === "setup") {
        const email = session.customer_details?.email ?? session.customer_email ?? null;
        const { error } = await db().rpc("founding_commitment_upsert", {
          p: {
            checkout_session_id: session.id,
            customer_id: idOf(session.customer),
            setup_intent_id: idOf(session.setup_intent),
            price_id: session.metadata?.price_id || null,
            email,
            utm_source: session.metadata?.utm_source || null,
            utm_medium: session.metadata?.utm_medium || null,
            utm_campaign: session.metadata?.utm_campaign || null,
            utm_content: session.metadata?.utm_content || null,
          },
        });
        if (error) throw error;
        await captureServer("founding_spot_reserved", email ?? session.id, { utm_source: session.metadata?.utm_source, utm_campaign: session.metadata?.utm_campaign });
        return true;
      }
      // assinaturas (as criadas no lançamento, e qualquer uma feita pelo checkout antigo em modo "subscription")
      if (session.mode !== "subscription") return true;
      const subscriptionId = idOf(session.subscription);
      if (!subscriptionId) return true;
      const email = session.customer_details?.email ?? session.customer_email ?? null;
      await upsert({
        subscription_id: subscriptionId,
        event_created: event.created,
        customer_id: idOf(session.customer),
        checkout_session_id: session.id,
        email,
      });
      await captureServer("founding_subscription_started", email ?? subscriptionId, {
        amount: session.amount_total,
        currency: session.currency,
        utm_source: session.metadata?.utm_source,
        utm_campaign: session.metadata?.utm_campaign,
      });
      return true;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      if (sub.metadata?.product !== FOUNDING_CUSTOMERS_PRODUCT) return false;
      // nesta versão da API o fim do período fica em cada item da assinatura
      const periodEnds = sub.items.data.map((item) => item.current_period_end).filter((n): n is number => typeof n === "number");
      await upsert({
        subscription_id: sub.id,
        event_created: event.created,
        customer_id: idOf(sub.customer),
        price_id: sub.items.data[0]?.price?.id ?? null,
        status: sub.status,
        current_period_end: periodEnds.length ? Math.max(...periodEnds) : null,
        cancel_at_period_end: sub.cancel_at_period_end,
        canceled_at: sub.canceled_at,
      });
      return true;
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const details = invoice.parent?.subscription_details;
      if (details?.metadata?.product !== FOUNDING_CUSTOMERS_PRODUCT) return false;
      const subscriptionId = idOf(details.subscription);
      if (!subscriptionId) return true;
      await upsert({
        subscription_id: subscriptionId,
        event_created: event.created,
        customer_id: idOf(invoice.customer),
        email: invoice.customer_email,
        paid: event.type === "invoice.paid",
        payment_failed: event.type === "invoice.payment_failed",
      });
      return true;
    }
    default:
      return false;
  }
}
