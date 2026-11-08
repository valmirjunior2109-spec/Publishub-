import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy policy", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="November 7, 2026">
      <p>This policy explains what {SITE_NAME} collects when you use getpublishub.com and how we use it.</p>
      <h2>What we collect</h2>
      <ul>
        <li>The store URL you scan and the results of the scan, including code snippets from the public pages we checked.</li>
        <li>A one-way hash of your IP address, used only to limit the number of scans per hour. We don&apos;t store your IP address itself.</li>
        <li>Your email address, if you enter it to see the full report or reserve a plan.</li>
        <li>Payment details are collected and processed by Stripe. We receive your email, the amount and the payment status, never your full card number.</li>
        <li>Usage analytics (pages viewed and key actions such as starting a scan) through PostHog, without collecting the content of form fields.</li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To run scans, show reports and let you share report links.</li>
        <li>To contact you about your report, your reservation and the launch of automatic fixes.</li>
        <li>To prevent abuse and improve the product.</li>
      </ul>
      <p>We don&apos;t sell your personal information.</p>
      <h2>Sharing</h2>
      <p>
        We use service providers to run {SITE_NAME}: Vercel (hosting), Supabase (database), Stripe (payments) and PostHog (analytics). Anyone with a report&apos;s link can view the parts of that report that aren&apos;t gated by email.
      </p>
      <h2>Retention and your rights</h2>
      <p>
        We keep scan results and leads for as long as they&apos;re useful for the service, and payment records as required by law. You can ask us to access, correct or delete your personal information, or to stop contacting you, by emailing{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. If you&apos;re in the EU or UK, you also have rights under the GDPR, including the right to complain to your local data protection authority.
      </p>
      <h2>Contact</h2>
      <p>
        Questions about this policy: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
