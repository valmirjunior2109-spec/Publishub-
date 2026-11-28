import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy policy", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="November 23, 2026">
      <p>This policy explains what {SITE_NAME} collects when you use getpublishub.com and how we use it.</p>
      <h2>What we collect</h2>
      <ul>
        <li>A one-way hash of your IP address, used only to limit sign-ups and free checks and to prevent abuse. We don&apos;t store your IP address itself.</li>
        <li>
          If you join the early-access waitlist: your email address, the optional name, AI coding tool, app URL, the flow you&apos;d like checked first and the one-sentence description of what you&apos;re
          building that you give us, the campaign link you arrived from (UTM parameters), the domain of the site that referred you, the page where you joined and, if you joined through a friend&apos;s
          referral link, that you were referred by them.
        </li>
        <li>
          If you ask us to check one of your app&apos;s flows from the free check report: your email, the flow you chose, whether your app has paying users, the app URL, your optional note and a link
          to the report. It&apos;s forwarded to the founder by email so he can reply to you.
        </li>
        <li>
          A first-party cookie, <code>publishub_attribution</code>, that remembers how you first found us (the campaign link and the domain of the referring site, never the full address you came from) and
          the first page you opened, for up to 90 days. It&apos;s used only to see which channels bring people to Publishub, and it&apos;s only stored with your waitlist entry if you join.
        </li>
        <li>
          If you run a free app check: the URL you enter, the results of the check (errors, failed requests and the addresses of the pages we opened) and screenshots of the public pages we opened. Anyone with
          the report&apos;s link can view it, and you can delete it, with its screenshots, from the browser you used to run the check.
        </li>
        <li>If you reserve a Founding Customers spot: your card is collected and stored by Stripe. We receive your email, the reservation and payment status, never your full card number.</li>
        <li>Usage analytics (pages viewed and key actions such as joining the waitlist) through PostHog, without collecting the content of form fields.</li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To send waitlist members early-access invitations and product updates. Every message lets you unsubscribe.</li>
        <li>To manage your Founding Customers reservation and contact you about it, including before any charge.</li>
        <li>To run free app checks and show their reports.</li>
        <li>To place you on the waitlist and credit referrals to the person who referred you.</li>
        <li>To prevent abuse and improve the product.</li>
      </ul>
      <p>We don&apos;t sell your personal information.</p>
      <h2>Sharing</h2>
      <p>
        We use service providers to run {SITE_NAME}: Vercel (hosting), Supabase (database), Stripe (payments) and PostHog (analytics).
      </p>
      <h2>Retention and your rights</h2>
      <p>
        We keep waitlist, reservation and free check data for as long as they&apos;re useful for the service, and payment records as required by law. Data from our discontinued accessibility scanner (scanned store URLs, scan
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
