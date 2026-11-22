import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { FOUNDING_TERMS, FOUNDING_TERMS_ANCHOR } from "@/lib/founding";
import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of service", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service" updated="November 22, 2026">
      <p>By using {SITE_NAME} you agree to these terms.</p>
      <h2>The service</h2>
      <p>
        {SITE_NAME} is building a verification product for applications built with AI coding tools: it is planned to run real user journeys in a browser and report broken flows and regressions. The product is in development
        and not available yet. Today getpublishub.com offers an early-access waitlist and the Founding Customers reservation described below.
      </p>
      <h2>Acceptable use</h2>
      <ul>
        <li>Don&apos;t submit false information or sign up other people without their permission.</li>
        <li>Don&apos;t try to bypass rate limits, disrupt the site or access systems you aren&apos;t authorized to use.</li>
      </ul>
      <h2 id={FOUNDING_TERMS_ANCHOR}>Founding Customers (Publishub for AI-generated code)</h2>
      <p>
        {SITE_NAME}&apos;s verification product for AI-generated code is in development and not available yet. Founding Customers is a reservation for it, under these terms:
      </p>
      <ul>
        <li>
          <strong>No charge before launch.</strong> Reserving stores your card with Stripe, our payment processor, and authorizes future charges for the Founding Customers subscription. You are charged $0 when you reserve, and no
          subscription is active while the product is in development.
        </li>
        <li>
          <strong>No immediate access.</strong> A reservation doesn&apos;t give you access to the product now. You get early access when it launches. We haven&apos;t set a launch date.
        </li>
        <li>
          <strong>When billing starts.</strong> When the product launches, we email you at least {FOUNDING_TERMS.noticeDays} days before your first charge, with the exact date and amount. Recurring monthly billing at the founding
          price, shown on our pricing section and in checkout, starts on that date.
        </li>
        <li>
          <strong>Cancel before launch at no cost.</strong> You can cancel your reservation anytime before your first charge by emailing <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We then remove your stored card and you
          pay nothing.
        </li>
        <li>
          <strong>After billing starts.</strong> The subscription renews monthly until you cancel. You can cancel anytime by email; cancellation takes effect at the end of the current billing period. Your first payment is refundable on
          request within {FOUNDING_TERMS.refundDays} days of the charge.
        </li>
        <li>
          <strong>Founding price.</strong> The founding price stays the same for as long as your Founding Customers subscription stays active. If you cancel and come back later, current prices apply.
        </li>
      </ul>
      <h2>Discontinued accessibility scanner and its $49 reservation</h2>
      <p>
        {SITE_NAME} previously offered an accessibility scanner for online stores and a one-time $49 &ldquo;Founding plan&rdquo; reservation for it. That product has been discontinued and the reservation is no longer sold.
        Reservations already purchased remain governed by the terms in effect when they were bought. Questions about an existing reservation: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
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
