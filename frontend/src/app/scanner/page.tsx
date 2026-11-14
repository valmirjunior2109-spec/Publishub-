import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CodeXml,
  Contrast,
  Cpu,
  FileChartColumn,
  ImageOff,
  Keyboard,
  Layers,
  Link2Off,
  ListChecks,
  MousePointerClick,
  ScanSearch,
  ShieldCheck,
  TextCursorInput,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Disclaimer } from "@/components/Disclaimer";
import { FaqList, type FaqItem } from "@/components/FaqList";
import { ReportPreview } from "@/components/ReportPreview";
import { ReserveButton } from "@/components/ReserveButton";
import { Reveal } from "@/components/Reveal";
import { ScanForm } from "@/components/ScanForm";
import { buttonClasses } from "@/components/ui/Button";
import { sampleReport } from "@/lib/sample-report";
import { AUTOMATED_LIMITS, DISCLAIMER, FOUNDING, SITE_NAME, TAGLINE } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: `Is your Shopify store an ADA lawsuit target? Free accessibility scan · ${SITE_NAME}` },
  alternates: { canonical: "/scanner" },
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

/** A faixa de confiança logo abaixo do hero: fatos do produto, sem números inventados. */
const TRUST: { icon: LucideIcon; text: string }[] = [
  { icon: Cpu, text: "Powered by axe-core" },
  { icon: ShieldCheck, text: "WCAG 2.2 A and AA rules" },
  { icon: Layers, text: "Home, collection, product, cart" },
  { icon: ListChecks, text: "Plain-English fixes" },
];

const STEP_ICONS: LucideIcon[] = [ScanSearch, FileChartColumn, Wrench];
const CHECK_ICONS: LucideIcon[] = [ImageOff, Contrast, MousePointerClick, Link2Off, TextCursorInput, Keyboard, CodeXml];

const OVERLAY_POINTS: [string, string][] = [
  ["Fixes in your theme", "Alt text, labels, button and link names, contrast and focus, changed in the code itself."],
  ["Changes you can review", "See what changed and why, in plain English, before it goes live."],
  ["No extra widget", "Nothing added on top of your storefront for shoppers to load."],
];

const FREE_FEATURES = ["Up to 4 key pages per scan", "Estimated risk indicator", "Top 3 issues with fix guidance", "Full report when you add your email"];

/** Cor de cada cartão (ícone e fundo do ícone), alternando as três cores da marca. */
const TINTS = ["bg-accent-soft text-accent", "bg-serious-soft text-pop", "bg-success-soft text-mint"];

export default function HomePage() {
  const sample = sampleReport();
  const previewGroups = sample.groups.slice(0, 4);

  return (
    <>
      {/* ---------- hero: a pergunta, o campo animado e a prévia do relatório ---------- */}
      <section id="scan" className="relative overflow-hidden border-b border-line bg-surface" aria-labelledby="hero-heading">
        <div className="hero-canvas" aria-hidden="true">
          <div className="hero-glow" style={{ background: "var(--glow-blue)", width: 560, height: 560, left: "-10%", top: "-22%" }} />
          <div className="hero-glow" style={{ background: "var(--glow-orange)", width: 460, height: 460, right: "-8%", top: "-6%", animationDelay: "150ms" }} />
          <div className="hero-glow" style={{ background: "var(--glow-mint)", width: 460, height: 460, left: "33%", bottom: "-12%", animationDelay: "300ms" }} />
        </div>


        <div className="container-page relative z-10 pb-16 pt-14 text-center sm:pb-20 sm:pt-20">
          <p className="enter pill" style={{ "--enter-delay": "0ms" } as CSSProperties}>
            <span aria-hidden="true" className="h-2 w-2 bg-action" />
            {TAGLINE}
          </p>
          <h1
            id="hero-heading"
            className="enter mx-auto mt-6 max-w-[20ch] text-[2.6rem] font-bold leading-[1.05] tracking-[-0.035em] sm:text-6xl"
            style={{ "--enter-delay": "80ms" } as CSSProperties}
          >
            Is your Shopify store an <span className="text-gradient">ADA lawsuit target?</span> Scan it free in 60 seconds.
          </h1>
          <p className="enter mx-auto mt-6 max-w-[60ch] text-lg text-muted sm:text-xl" style={{ "--enter-delay": "160ms" } as CSSProperties}>
            {SITE_NAME} checks your store against WCAG 2.2 AA and shows the accessibility issues most often cited in ADA lawsuits, with the exact element and a plain-English fix for each one.
          </p>
          <div className="enter" style={{ "--enter-delay": "240ms" } as CSSProperties}>
            <ScanForm source="home_hero" align="center" className="mt-10 max-w-2xl" />
          </div>
          <p className="mt-2 text-sm font-semibold">{DISCLAIMER}</p>

          <Reveal className="mt-16 sm:mt-20">
            <ReportPreview store="example-store.com" score={sample.riskScore ?? 0} band={sample.riskBand ?? "high"} groups={previewGroups} total={sample.totalOccurrences} />
          </Reveal>
        </div>
      </section>

      {/* ---------- faixa de confiança ---------- */}
      <section aria-label="What powers the scan" className="border-b border-line bg-bg">
        <ul className="container-page grid grid-cols-2 gap-x-6 gap-y-4 py-8 text-[15px] font-medium md:grid-cols-4">
          {TRUST.map(({ icon: Icon, text }, index) => (
            <li key={text} className="flex items-center gap-3">
              <span aria-hidden="true" className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TINTS[index % 3]}`}>
                <Icon className="h-[18px] w-[18px]" />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- como funciona ---------- */}
      <section id="how-it-works" aria-labelledby="how-heading" className="container-page py-20 sm:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">How it works</p>
          <h2 id="how-heading" className="mt-3 text-3xl font-bold sm:text-5xl">
            From URL to fix list in <span className="text-gradient">three steps</span>
          </h2>
        </Reveal>
        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => {
            const Icon = STEP_ICONS[index];
            return (
              <Reveal as="li" key={step.title} delay={index * 120} className="card-lift relative rounded-2xl border border-line bg-card p-7 shadow-card">
                <div className="flex items-center justify-between">
                  <span aria-hidden="true" className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${TINTS[index % 3]}`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="font-mono text-sm font-semibold text-muted">Step {index + 1}</span>
                </div>
                <h3 className="mt-6 text-2xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-muted">{step.text}</p>
              </Reveal>
            );
          })}
        </ol>
      </section>

      {/* ---------- o que verificamos ---------- */}
      <section id="what-we-check" aria-labelledby="checks-heading" className="border-y border-line bg-surface">
        <div className="container-page py-20 sm:py-28">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">What we check</p>
            <h2 id="checks-heading" className="mt-3 text-3xl font-bold sm:text-5xl">
              The issues that show up in lawsuits
            </h2>
            <p className="mt-4 text-lg text-muted">The issue types most often cited in web accessibility lawsuits and demand letters, checked on the pages shoppers use most.</p>
          </Reveal>
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CHECKS.map((check, index) => {
              const Icon = CHECK_ICONS[index % CHECK_ICONS.length];
              return (
                <Reveal as="li" key={check.title} delay={(index % 3) * 90} className="card-lift rounded-2xl border border-line bg-card p-6">
                  <span aria-hidden="true" className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${TINTS[index % 3]}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{check.title}</h3>
                  <p className="mt-1 text-muted">{check.text}</p>
                </Reveal>
              );
            })}
          </ul>
          <p className="mt-8 text-[15px] text-muted">{AUTOMATED_LIMITS}</p>
        </div>
      </section>

      {/* ---------- código de verdade, sem overlay ---------- */}
      <section aria-labelledby="overlay-heading" className="container-page py-20 sm:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="eyebrow">No overlay widgets</p>
            <h2 id="overlay-heading" className="mt-3 text-3xl font-bold sm:text-5xl">
              Real code fixes, <span className="text-gradient">where the problem lives</span>
            </h2>
            <p className="mt-5 text-lg text-muted">
              Overlay widgets put a toolbar on top of your store. The code underneath stays the same, so screen readers and keyboards still run into the same problems.
            </p>
            <ul className="mt-6 space-y-3">
              {OVERLAY_POINTS.map(([title, text]) => (
                <li key={title} className="flex gap-3">
                  <span aria-hidden="true" className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                    <Check className="h-4 w-4" />
                  </span>
                  <p>
                    <strong className="font-semibold">{title}.</strong> <span className="text-muted">{text}</span>
                  </p>
                </li>
              ))}
            </ul>
          </Reveal>

          {/* o "diff": o mesmo botão antes e depois da correção */}
          <Reveal delay={120}>
            <figure className="overflow-hidden rounded-2xl border border-line bg-card shadow-raised">
              <figcaption className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 text-sm">
                <span className="font-mono font-medium">sections/header.liquid</span>
                <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-semibold text-success">Example fix</span>
              </figcaption>
              <pre className="overflow-x-auto p-0 font-mono text-[13px] leading-6">
                <code>
                  <span className="block bg-critical-soft px-4 py-1 text-critical">
                    <span aria-hidden="true">- </span>
                    <span className="sr-only">Before: </span>
                    {'<button class="cart-toggle">'}
                  </span>
                  <span className="block bg-success-soft px-4 py-1 text-success">
                    <span aria-hidden="true">+ </span>
                    <span className="sr-only">After: </span>
                    {'<button class="cart-toggle" aria-label="Open cart">'}
                  </span>
                  <span className="block px-4 py-1 text-ink">{'    <svg aria-hidden="true" focusable="false">…</svg>'}</span>
                  <span className="block px-4 py-1 text-ink">{"</button>"}</span>
                </code>
              </pre>
              <p className="border-t border-line px-4 py-3 text-sm text-muted">
                Screen readers now announce <strong className="font-semibold text-ink">&ldquo;Open cart, button&rdquo;</strong> instead of just &ldquo;button&rdquo;.
              </p>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* ---------- preço ---------- */}
      <section id="pricing" aria-labelledby="pricing-heading" className="relative overflow-hidden border-y border-line bg-surface">
        <div className="hero-canvas" aria-hidden="true">
          <div className="hero-glow" style={{ background: "var(--glow-blue)", width: 420, height: 420, right: "5%", top: "10%", opacity: 0.18 }} />
        </div>
        <div className="container-page relative py-20 sm:py-28">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Pricing</p>
            <h2 id="pricing-heading" className="mt-3 text-3xl font-bold sm:text-5xl">
              Start free. Reserve fixes when you&apos;re ready.
            </h2>
          </Reveal>
          <div className="mx-auto mt-14 grid max-w-4xl gap-6 lg:grid-cols-2">
            <Reveal className="card-lift flex flex-col rounded-2xl border border-line bg-card p-8">
              <h3 className="text-xl font-semibold">Free scan</h3>
              <p className="mt-3 text-5xl font-bold tracking-[-0.03em]">$0</p>
              <ul className="mt-6 flex-1 space-y-2.5">
                {FREE_FEATURES.map((feature) => (
                  <li key={feature} className="flex gap-2.5">
                    <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-success" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/scanner#scan" className={buttonClasses("secondary", "lg", "mt-8 w-full")}>
                Scan your store
              </Link>
            </Reveal>

            <Reveal delay={120} className="prompt-shell !rounded-2xl">
              <div className="flex h-full flex-col rounded-[15px] bg-card p-8">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xl font-semibold">Founding plan</h3>
                  <span className="rounded-full bg-serious-soft px-3 py-1 text-xs font-semibold text-pop">Early access</span>
                </div>
                <p className="mt-3">
                  <span className="text-5xl font-bold tracking-[-0.03em]">${FOUNDING.reservationUsd}</span> <span className="text-muted">one-time reservation</span>
                </p>
                <ul className="mt-6 flex-1 space-y-2.5">
                  <li className="flex gap-2.5">
                    <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-success" />
                    Automatic code fixes when our Shopify app launches
                  </li>
                  <li className="flex gap-2.5">
                    <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-success" />
                    <span>
                      ${FOUNDING.reservationUsd} credited toward your first months of the ${FOUNDING.monthlyUsd}/month plan
                    </span>
                  </li>
                  <li className="flex gap-2.5">
                    <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-success" />
                    Full refund if automatic fixes don&apos;t launch within {FOUNDING.refundDays} days
                  </li>
                </ul>
                <div className="mt-8">
                  <ReserveButton source="pricing" />
                </div>
                <p className="mt-3 text-sm text-muted">Secure payment by Stripe. {DISCLAIMER}</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- perguntas ---------- */}
      <section id="faq" aria-labelledby="faq-heading" className="container-page py-20 sm:py-28">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <Reveal>
            <p className="eyebrow">FAQ</p>
            <h2 id="faq-heading" className="mt-3 text-3xl font-bold sm:text-5xl">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-muted">
              Still unsure? Run a free scan and see your own report, or <Link href="/scan/sample">open the sample report</Link>.
            </p>
          </Reveal>
          <div>
            <FaqList items={FAQ} />
          </div>
        </div>
        <Disclaimer className="mt-12" />
      </section>

      {/* ---------- chamada final ---------- */}
      <section aria-labelledby="final-heading" className="container-page pb-4">
        <Reveal className="relative overflow-hidden rounded-3xl bg-spot px-6 py-14 text-center text-white sm:px-12 sm:py-20">
          <div className="hero-canvas" aria-hidden="true">
            <div className="hero-glow" style={{ background: "var(--glow-blue)", width: 420, height: 420, left: "-6%", top: "-40%", opacity: 0.55 }} />
            <div className="hero-glow" style={{ background: "var(--glow-orange)", width: 380, height: 380, right: "-6%", bottom: "-50%", opacity: 0.45 }} />
          </div>
          <div className="relative">
            <h2 id="final-heading" className="mx-auto max-w-[22ch] text-3xl font-bold sm:text-5xl">
              Find out where your store stands, before someone else does.
            </h2>
            <p className="mx-auto mt-4 max-w-[52ch] text-lg text-haze">Free scan, about a minute, no account. Plain-English fixes for every issue we find.</p>
            <Link href="/scanner#scan" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-md bg-white px-6 font-semibold text-night no-underline shadow-[4px_4px_0_0_#6E74F7] transition-colors hover:bg-indigo-light hover:text-night focus-visible:outline-white">
              Scan my store free
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
