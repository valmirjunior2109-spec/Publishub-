import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { FOUNDING_CUSTOMERS_PRODUCT, FOUNDING_TERMS, FOUNDING_TERMS_ANCHOR } from "@/lib/founding";
import { stripe } from "@/lib/server/stripe";
import { SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Your founding spot is reserved",
  robots: { index: false, follow: false },
};

/**
 * Depois do Stripe Checkout do Founding Customers. Lê a sessão no Stripe só para mostrar o status;
 * quem grava a reserva é o webhook. Modo "setup" = a reserva pré-lançamento (nada cobrado);
 * modo "subscription" = assinaturas antigas, do checkout anterior a este modelo.
 */
async function sessionSummary(sessionId: string | undefined) {
  if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return null;
  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId);
    if (session.metadata?.product !== FOUNDING_CUSTOMERS_PRODUCT) return null;
    return { mode: session.mode, complete: session.status === "complete", email: session.customer_details?.email ?? null };
  } catch {
    return null;
  }
}

export default async function PaymentSuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  const summary = await sessionSummary(session_id);
  const reserved = summary?.complete && summary.mode === "setup";
  const legacySubscription = summary?.complete && summary.mode === "subscription";

  return (
    <div className="container-page max-w-3xl py-14 sm:py-20">
      <LogoMark size={64} />
      <h1 className="mt-6 text-3xl font-bold sm:text-5xl">
        {reserved ? "Your founding spot is reserved." : legacySubscription ? "Welcome, founding customer." : summary ? "We're confirming your reservation" : "Founding Customers"}
      </h1>
      <p className="mt-4 text-lg">
        {reserved
          ? `Thank you for backing Publishub. You haven't been charged${summary?.email ? `, and a confirmation is on its way to ${summary.email}` : ""}.`
          : legacySubscription
            ? "Thank you for backing Publishub from day one. Your subscription is active."
            : summary
              ? "Your reservation is still being confirmed. Refresh this page in a minute, or email us if it doesn't update."
              : "If you just reserved your spot, thank you. You haven't been charged."}
      </p>

      {!legacySubscription && (
        <>
          <h2 className="mt-10 text-xl font-semibold">What happens next</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-6 text-[17px]">
            <li>
              <strong>Until launch:</strong> nothing is charged and no subscription is running. Publishub isn&apos;t available yet, and we haven&apos;t set a launch date.
            </li>
            <li>
              <strong>At launch:</strong> we email you at least {FOUNDING_TERMS.noticeDays} days before your first charge, with the exact date. Changed your mind? Tell us before then and you pay nothing.
            </li>
            <li>
              <strong>After that:</strong> the founding price is billed monthly. Cancel anytime; your first payment is refundable on request within {FOUNDING_TERMS.refundDays} days.
            </li>
          </ol>
        </>
      )}
      <p className="mt-8">
        To cancel your reservation or ask anything, email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. <Link href={`/terms#${FOUNDING_TERMS_ANCHOR}`}>Full terms</Link>.
      </p>
      <p className="mt-6">
        <Link href="/">Back to Publishub</Link>
      </p>
    </div>
  );
}
