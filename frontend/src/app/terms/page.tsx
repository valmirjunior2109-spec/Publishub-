import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { AUTOMATED_LIMITS, DISCLAIMER, FOUNDING, SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of service", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service" updated="November 7, 2026">
      <p>By using {SITE_NAME} you agree to these terms.</p>
      <h2>The service</h2>
      <p>
        {SITE_NAME} runs automated accessibility checks on publicly available web pages and reports the issues it finds, with general guidance on how to fix them. {AUTOMATED_LIMITS}
      </p>
      <h2>Not legal advice</h2>
      <p>
        {DISCLAIMER} Reports, risk indicators and guidance are informational. They do not certify that a website meets any law or standard, and they are not a prediction of legal outcomes. Talk to a qualified lawyer about your legal
        obligations.
      </p>
      <h2>Acceptable use</h2>
      <ul>
        <li>Only scan publicly available pages, and don&apos;t use the service to overload or disrupt any website.</li>
        <li>Don&apos;t try to bypass rate limits or use the service to access private networks or systems.</li>
      </ul>
      <h2>Founding plan reservation</h2>
      <ul>
        <li>The reservation is a one-time payment of ${FOUNDING.reservationUsd} (USD).</li>
        <li>
          When automatic fixes launch in our Shopify app, your ${FOUNDING.reservationUsd} is credited toward your first months of the ${FOUNDING.monthlyUsd}/month plan.
        </li>
        <li>If automatic fixes don&apos;t launch within {FOUNDING.refundDays} days of your reservation, we refund the full amount to your original payment method.</li>
      </ul>
      <h2>Limitation of liability</h2>
      <p>
        The service is provided &ldquo;as is&rdquo;. To the extent permitted by law, {SITE_NAME} is not liable for indirect or consequential damages, and our total liability is limited to the amount you paid us in the 12 months before the
        claim.
      </p>
      <h2>Changes and contact</h2>
      <p>
        We may update these terms and will post the new date above. Questions: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
