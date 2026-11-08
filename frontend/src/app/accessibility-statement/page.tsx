import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "Accessibility statement", alternates: { canonical: "/accessibility-statement" } };

export default function AccessibilityStatementPage() {
  return (
    <LegalPage title="Accessibility statement" updated="November 7, 2026">
      <p>
        {SITE_NAME} helps online stores find and fix accessibility issues, so we hold our own website to the same standard. We aim for this site to conform to the Web Content Accessibility Guidelines (WCAG) 2.2 at Level AA.
      </p>
      <h2>What we do</h2>
      <ul>
        <li>Use semantic HTML, labels on every form field and a &ldquo;Skip to content&rdquo; link.</li>
        <li>Keep text contrast at 4.5:1 or higher and keep keyboard focus visible on every interactive element.</li>
        <li>Make every feature usable with a keyboard alone.</li>
        <li>Run automated axe-core checks on our own pages, and test key flows with a keyboard.</li>
        <li>Respect the &ldquo;reduce motion&rdquo; setting in your operating system.</li>
      </ul>
      <h2>Known limitations</h2>
      <p>
        Accessibility reports include code snippets from the scanned stores. Those snippets are shown as text and may describe content we don&apos;t control. Payments are processed on Stripe&apos;s checkout page, which is governed by
        Stripe&apos;s own accessibility practices.
      </p>
      <h2>Feedback</h2>
      <p>
        If you run into a barrier on this site, email us at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. Tell us the page and what happened, and we&apos;ll work on a fix.
      </p>
    </LegalPage>
  );
}
