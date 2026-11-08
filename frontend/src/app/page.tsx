import type { Metadata } from "next";
import Link from "next/link";
import { Disclaimer } from "@/components/Disclaimer";
import { FaqList, type FaqItem } from "@/components/FaqList";
import { ReserveButton } from "@/components/ReserveButton";
import { ScanForm } from "@/components/ScanForm";
import { AUTOMATED_LIMITS, DISCLAIMER, FOUNDING, SITE_NAME, TAGLINE } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: `Is your Shopify store an ADA lawsuit target? Free accessibility scan · ${SITE_NAME}` },
  alternates: { canonical: "/" },
};

const STEPS = [
  {
    title: "Scan",
    text: "Paste your store URL. We load your home, a collection, a product and the cart page like a shopper would, and run automated WCAG 2.2 AA checks.",
  },
  {
    title: "Report",
    text: "Get an estimated risk indicator, the issues grouped by severity and type, the exact page and element affected, and what each problem means for shoppers.",
  },
  {
    title: "Fix",
    text: "Follow the plain-English fix guidance in your theme, or reserve the Founding plan to get fixes applied automatically when our Shopify app launches.",
  },
];

const CHECKS = [
  { title: "Missing alt text", text: "Product photos and banners that screen readers can't describe." },
  { title: "Low color contrast", text: "Text that's hard to read for shoppers with low vision." },
  { title: "Buttons without names", text: "Icon buttons like cart, search and menu that are announced only as \"button\"." },
  { title: "Links without names", text: "Social icons and image links that don't say where they go." },
  { title: "Form fields without labels", text: "Newsletter, search and variant fields shoppers can't identify." },
  { title: "Keyboard and focus problems", text: "Menus, drawers and popups that trap or lose keyboard focus." },
  { title: "ARIA errors", text: "Hidden or mislabeled elements that confuse assistive technology." },
];

const FAQ: FaqItem[] = [
  {
    q: "Does this guarantee my store meets ADA requirements?",
    a: (
      <p>
        No scanner or tool can guarantee that, and we never will. {AUTOMATED_LIMITS} {SITE_NAME} helps you find and fix accessibility issues, which helps reduce risk. {DISCLAIMER}
      </p>
    ),
  },
  {
    q: "What exactly does the free scan check?",
    a: (
      <p>
        The WCAG 2.0, 2.1 and 2.2 Level A and AA rules that can be tested automatically, using the open-source axe-core engine. We check up to four pages: your home page, a collection, a product and the cart.
      </p>
    ),
  },
  {
    q: "What is the risk score?",
    a: (
      <p>
        An estimated risk indicator from 0 to 100, based on how many issues we find and how severe they are, with more weight on issue types commonly cited in accessibility lawsuits. It is not a legal assessment and not a prediction of
        whether you will be sued.
      </p>
    ),
  },
  {
    q: "Will the scan affect my store?",
    a: (
      <p>
        We load up to four public pages, the same way a visitor would. Our scanner identifies itself as PublishubScanner/1.0. We don&apos;t log in, place orders or change anything on your store.
      </p>
    ),
  },
  {
    q: "What do I get with the Founding plan?",
    a: (
      <p>
        You reserve access to automatic code fixes in our upcoming Shopify app. You pay ${FOUNDING.reservationUsd} once today, and it&apos;s credited toward your first months of the ${FOUNDING.monthlyUsd}/month plan when automatic fixes
        launch. If automatic fixes don&apos;t launch within {FOUNDING.refundDays} days of your reservation, we refund the full ${FOUNDING.reservationUsd}.
      </p>
    ),
  },
  {
    q: "Why not use an accessibility overlay widget?",
    a: (
      <p>
        Overlay widgets add a toolbar or script on top of your theme. They don&apos;t change the underlying code that screen readers and keyboards use, and many accessibility experts advise against relying on them. We focus on finding and
        fixing issues in your theme&apos;s code.
      </p>
    ),
  },
  {
    q: "Does it work if my site isn't on Shopify?",
    a: <p>The scan runs on any public website, but if we can&apos;t detect Shopify, we only check the home page.</p>,
  },
  {
    q: "What happens to my data?",
    a: (
      <p>
        We store the store URL, the scan results and, if you give it to us, your email. Payments are handled by Stripe; we never see your card number. Read the <Link href="/privacy">privacy policy</Link>.
      </p>
    ),
  },
];

export default function HomePage() {
  return (
    <>
      {/* ---------- hero: a pergunta, o campo e o aviso ---------- */}
      <section id="scan" className="border-b border-line bg-surface" aria-labelledby="hero-heading">
        <div className="container-page py-16 sm:py-20">
          <p className="eyebrow">{TAGLINE}</p>
          <h1 id="hero-heading" className="mt-4 max-w-[22ch] text-4xl font-bold leading-[1.1] sm:text-5xl">
            Is your Shopify store an ADA lawsuit target? Scan it free in 60 seconds.
          </h1>
          <p className="mt-5 max-w-prose text-lg text-ink">
            {SITE_NAME} checks your store against WCAG 2.2 AA and shows the accessibility issues most often cited in ADA lawsuits, with the exact element and a plain-English fix for each one.
          </p>
          <ScanForm source="home_hero" className="mt-8 max-w-2xl" />
          <p className="mt-4 text-sm font-semibold">{DISCLAIMER}</p>
          <p className="mt-6 text-[15px]">
            Want to see it first? <Link href="/scan/sample">View a sample report</Link>.
          </p>
        </div>
      </section>

      {/* ---------- como funciona ---------- */}
      <section id="how-it-works" aria-labelledby="how-heading" className="container-page py-16 sm:py-20">
        <h2 id="how-heading" className="text-3xl font-bold">
          How it works
        </h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="rounded-xl border border-line p-6">
              <p className="text-sm font-semibold text-accent">Step {index + 1}</p>
              <h3 className="mt-1 text-xl font-semibold">{step.title}</h3>
              <p className="mt-2">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- o que verificamos ---------- */}
      <section id="what-we-check" aria-labelledby="checks-heading" className="border-y border-line bg-surface">
        <div className="container-page py-16 sm:py-20">
          <h2 id="checks-heading" className="text-3xl font-bold">
            What we check
          </h2>
          <p className="mt-3 max-w-prose text-lg">The issue types most often cited in web accessibility lawsuits and demand letters, checked on the pages shoppers use most.</p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CHECKS.map((check) => (
              <li key={check.title} className="rounded-xl border border-line bg-white p-5">
                <h3 className="text-lg font-semibold">{check.title}</h3>
                <p className="mt-1 text-muted">{check.text}</p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[15px] text-muted">{AUTOMATED_LIMITS}</p>
        </div>
      </section>

      {/* ---------- código de verdade, sem overlay ---------- */}
      <section aria-labelledby="overlay-heading" className="container-page py-16 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 id="overlay-heading" className="text-3xl font-bold">
              Real code fixes, no overlay widgets
            </h2>
            <p className="mt-4 text-lg">
              Overlay widgets put a toolbar on top of your store. The code underneath stays the same, so screen readers and keyboards still run into the same problems.
            </p>
            <p className="mt-4 text-lg">We&apos;re building {SITE_NAME} to fix the issues where they live: in your theme&apos;s code.</p>
          </div>
          <ul className="space-y-4">
            {[
              ["Fixes in your theme", "Alt text, labels, button and link names, contrast and focus, changed in the code itself."],
              ["Changes you can review", "See what changed and why, in plain English, before it goes live."],
              ["No extra widget", "Nothing added on top of your storefront for shoppers to load."],
            ].map(([title, text]) => (
              <li key={title} className="rounded-xl border border-line p-5">
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-1 text-muted">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- preço ---------- */}
      <section id="pricing" aria-labelledby="pricing-heading" className="border-y border-line bg-surface">
        <div className="container-page py-16 sm:py-20">
          <h2 id="pricing-heading" className="text-3xl font-bold">
            Pricing
          </h2>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-line bg-white p-6">
              <h3 className="text-xl font-semibold">Free scan</h3>
              <p className="mt-2 text-4xl font-bold">$0</p>
              <ul className="mt-4 list-disc space-y-1 pl-5">
                <li>Up to 4 key pages per scan</li>
                <li>Estimated risk indicator</li>
                <li>Top 3 issues with fix guidance</li>
                <li>Full report when you add your email</li>
              </ul>
              <Link href="/#scan" className="mt-6 inline-flex min-h-11 items-center font-semibold">
                Scan your store
              </Link>
            </div>
            <div className="rounded-xl border-2 border-accent bg-white p-6">
              <h3 className="text-xl font-semibold">Founding plan</h3>
              <p className="mt-2">
                <span className="text-4xl font-bold">${FOUNDING.reservationUsd}</span> <span className="text-muted">one-time reservation</span>
              </p>
              <ul className="mt-4 list-disc space-y-1 pl-5">
                <li>Automatic code fixes when our Shopify app launches</li>
                <li>
                  ${FOUNDING.reservationUsd} credited toward your first months of the ${FOUNDING.monthlyUsd}/month plan
                </li>
                <li>Full refund if automatic fixes don&apos;t launch within {FOUNDING.refundDays} days</li>
              </ul>
              <div className="mt-6">
                <ReserveButton source="pricing" />
              </div>
              <p className="mt-3 text-sm text-muted">Secure payment by Stripe. {DISCLAIMER}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- perguntas ---------- */}
      <section id="faq" aria-labelledby="faq-heading" className="container-page py-16 sm:py-20">
        <h2 id="faq-heading" className="text-3xl font-bold">
          Frequently asked questions
        </h2>
        <div className="mt-8">
          <FaqList items={FAQ} />
        </div>
        <Disclaimer className="mt-10" />
      </section>
    </>
  );
}
