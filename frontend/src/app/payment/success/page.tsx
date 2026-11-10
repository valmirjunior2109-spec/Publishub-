import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { FOUNDING_CUSTOMERS_PRODUCT } from "@/lib/founding";
import { stripe } from "@/lib/server/stripe";
import { SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Welcome, founding customer",
  robots: { index: false, follow: false },
};

/**
 * Depois do Stripe Checkout da assinatura Founding Customers. Lê a sessão no Stripe só para mostrar
 * o e-mail e confirmar o pagamento; quem grava a assinatura é o webhook.
 */
async function sessionSummary(sessionId: string | undefined): Promise<{ email: string | null; paid: boolean } | null> {
  if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return null;
  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId);
    if (session.metadata?.product !== FOUNDING_CUSTOMERS_PRODUCT) return null;
    const paid = session.status === "complete" && (session.payment_status === "paid" || session.payment_status === "no_payment_required");
    return { email: session.customer_details?.email ?? null, paid };
  } catch {
    return null;
  }
}

export default async function PaymentSuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  const summary = await sessionSummary(session_id);

  return (
    <div className="container-page max-w-3xl py-14 sm:py-20">
      <LogoMark size={64} />
      <h1 className="mt-6 text-3xl font-bold sm:text-5xl">
        {!summary ? "Founding Customers" : summary.paid ? "Welcome, founding customer." : "We're confirming your payment"}
      </h1>
      <p className="mt-4 text-lg">
        {!summary
          ? "If you just completed checkout, thank you. Your receipt is on its way from Stripe."
          : summary.paid
            ? `Thank you for backing Publishub from day one. Your subscription is active${summary.email ? `, and your receipt is on its way to ${summary.email}` : ""}.`
            : "Your payment is still processing. Refresh this page in a minute, or email us if it doesn't update."}
      </p>
      <h2 className="mt-10 text-xl font-semibold">What happens next</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-[17px]">
        <li>You&apos;re first in line: we&apos;ll email you before the waitlist when early access opens.</li>
        <li>Reply to any of our emails to reach the founder directly and tell us what Publishub should verify first.</li>
        <li>
          Your subscription renews automatically. To cancel or change it, email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </li>
      </ul>
      <p className="mt-10">
        <Link href="/">Back to Publishub</Link>
      </p>
    </div>
  );
}
