import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy policy", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="November 22, 2026">
      <p>This policy explains what {SITE_NAME} collects when you use getpublishub.com and how we use it.</p>
      <h2>What we collect</h2>
      <ul>
        <li>A one-way hash of your IP address, used only to limit sign-ups and prevent abuse. We don&apos;t store your IP address itself.</li>
        <li>
          If you join the early-access waitlist: your email address, the optional name and AI coding tool you give us, the campaign link you arrived from (UTM parameters) and the domain of the site that
          referred you.
        </li>
        <li>If you reserve a Founding Customers spot: your card is collected and stored by Stripe. We receive your email, the reservation and payment status, never your full card number.</li>
        <li>Usage analytics (pages viewed and key actions such as joining the waitlist) through PostHog, without collecting the content of form fields.</li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To send waitlist members early-access invitations and product updates. Every message lets you unsubscribe.</li>
        <li>To manage your Founding Customers reservation and contact you about it, including before any charge.</li>
        <li>To prevent abuse and improve the product.</li>
      </ul>
      <p>We don&apos;t sell your personal information.</p>
      <h2>Sharing</h2>
      <p>
        We use service providers to run {SITE_NAME}: Vercel (hosting), Supabase (database), Stripe (payments) and PostHog (analytics).
      </p>
      <h2>Retention and your rights</h2>
      <p>
        We keep waitlist and reservation data for as long as they&apos;re useful for the service, and payment records as required by law. Data from our discontinued accessibility scanner (scanned store URLs, scan
        results and the emails left to see reports) is no longer collected and is kept only as an archive until it is deleted. You can ask us to access, correct or delete your personal information, or to stop contacting you, by emailing{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. If you&apos;re in the EU or UK, you also have rights under the GDPR, including the right to complain to your local data protection authority.
      </p>
      <h2>Contact</h2>
      <p>
        Questions about this policy: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
