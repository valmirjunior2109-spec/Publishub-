import type { Metadata } from "next";
import Link from "next/link";
import { stripe } from "@/lib/server/stripe";
import { FOUNDING, SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Your Founding plan is reserved",
  robots: { index: false, follow: false },
};

/** Lê a sessão no Stripe só para mostrar o e-mail e confirmar o pagamento; quem grava a reserva é o webhook. */
async function sessionSummary(sessionId: string | undefined): Promise<{ email: string | null; paid: boolean } | null> {
  if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return null;
  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId);
    return { email: session.customer_details?.email ?? null, paid: session.payment_status === "paid" };
  } catch {
    return null;
  }
}

export default async function ReserveSuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  const summary = await sessionSummary(session_id);

  return (
    <div className="container-page max-w-3xl py-14 sm:py-20">
      <h1 className="text-3xl font-bold sm:text-4xl">
        {!summary ? "Founding plan reservation" : summary.paid ? "Your Founding plan is reserved" : "We're confirming your payment"}
      </h1>
      <p className="mt-4 text-lg">
        {!summary
          ? "If you just completed checkout, thank you. Questions about your reservation? Email us anytime."
          : summary.paid
            ? `Thank you. We've received your $${FOUNDING.reservationUsd} reservation${summary.email ? ` for ${summary.email}` : ""}.`
            : "Your payment is still processing. Refresh this page in a minute, or email us if it doesn't update."}
      </p>
      <h2 className="mt-10 text-xl font-semibold">What happens next</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-[17px]">
        <li>We&apos;ll contact you when automatic fixes are ready in our Shopify app.</li>
        <li>
          Your ${FOUNDING.reservationUsd} is credited toward your first months of the ${FOUNDING.monthlyUsd}/month plan.
        </li>
        <li>If automatic fixes don&apos;t launch within {FOUNDING.refundDays} days, we refund your reservation in full.</li>
      </ul>
      <p className="mt-8">
        Questions? Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
      <p className="mt-4">
        <Link href="/">Back to the home page</Link>
      </p>
    </div>
  );
}
