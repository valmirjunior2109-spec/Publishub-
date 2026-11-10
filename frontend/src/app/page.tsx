import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowRight, Bug, Check, Clock3, FileWarning, GitCompareArrows, Plug, Route, ScanEye, ShieldQuestion, Waypoints, type LucideIcon } from "lucide-react";
import { FaqList, type FaqItem } from "@/components/FaqList";
import { Reveal } from "@/components/Reveal";
import { PixelIcon } from "@/components/ui/Pixel";
import { FoundingCheckoutButton } from "@/components/waitlist/FoundingCheckoutButton";
import { FoundingPriceAmount, FoundingRenewal } from "@/components/waitlist/FoundingPrice";
import { TerminalPreview } from "@/components/waitlist/TerminalPreview";
import { WaitlistForm } from "@/components/waitlist/WaitlistForm";
import { WaitlistTracker } from "@/components/waitlist/WaitlistTracker";
import { PRICING_ANCHOR } from "@/lib/founding";
import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";
import { WAITLIST_DESCRIPTION, WAITLIST_PATH, WAITLIST_TAGLINE } from "@/lib/waitlist";

export const metadata: Metadata = {
  title: { absolute: `${WAITLIST_TAGLINE} · ${SITE_NAME}` },
  description: WAITLIST_DESCRIPTION,
  alternates: { canonical: WAITLIST_PATH },
  openGraph: { siteName: SITE_NAME, type: "website", url: WAITLIST_PATH, title: WAITLIST_TAGLINE, description: WAITLIST_DESCRIPTION },
  twitter: { card: "summary_large_image", title: WAITLIST_TAGLINE, description: WAITLIST_DESCRIPTION },
};

const PROBLEMS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Bug, title: "Broken functionality", text: "A change can compile, pass lint and still break a button, a form or an API call." },
  { icon: GitCompareArrows, title: "Regressions you didn't ask for", text: "Agents touch more than the task. A fix in one file quietly breaks a flow somewhere else." },
  { icon: Route, title: "Broken user journeys", text: "Sign-up, checkout and onboarding fail at step four, where unit tests rarely look." },
  { icon: Clock3, title: "Manual testing overhead", text: "Clicking through the app after every AI change eats the time the agent saved you." },
  { icon: ShieldQuestion, title: "Uncertainty before deploying", text: "Without evidence, every deploy is a guess: ship and hope, or hold back." },
];

const STEPS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Plug, title: "Connect your project", text: "Point Publishub at your app, such as a preview deployment, and pick the user journeys that matter." },
  { icon: ScanEye, title: "Verify application behavior", text: "Publishub runs those journeys in a real browser after a change, the way a user would." },
  { icon: Waypoints, title: "Identify failures and regressions", text: "Each result is compared with the last version that worked, so you see what this change broke." },
  { icon: FileWarning, title: "Get actionable evidence", text: "The failing step, a screenshot and a bug report you can hand straight back to your coding agent." },
];

const BENEFITS = ["Early access to the first version", "Direct product updates from the founder", "A say in the roadmap: tell us what to verify first", "Access to the first public release"];

const FAQ: FaqItem[] = [
  {
    q: "What is Publishub?",
    a: (
      <>
        <p>
          A verification tool we&apos;re building for software written with AI coding agents. It checks that your application still behaves correctly after a change: it runs real user journeys,
          catches regressions and gives you evidence of what broke.
        </p>
        <p className="mt-3">
          Publishub also runs a free <Link href="/scanner">accessibility scanner for Shopify stores</Link>. This waitlist is for the new verification product.
        </p>
      </>
    ),
  },
  {
    q: "Who is it for?",
    a: "Developers who ship with Claude Code, Cursor, Codex and similar tools: indie hackers, SaaS founders, software engineers and small teams who move fast without a dedicated QA team.",
  },
  {
    q: "How does it work?",
    a: "The plan: you connect your project, choose the user journeys that matter, and Publishub runs them in a real browser after each change. When something fails, you get the failing step, a screenshot and a bug report. We're shaping the details with early-access members, so the workflow may change.",
  },
  {
    q: "Does it support Claude Code and Cursor?",
    a: "Publishub is being designed to work alongside any AI coding tool, including Claude Code, Cursor and Codex, because it verifies the running application rather than the editor. No integrations are available yet. Tell us which tool you use when you join, and we'll prioritize it.",
  },
  {
    q: "When will early access begin?",
    a: "We're building the first version now and will invite waitlist members in small groups as soon as it's ready. We don't have a date to announce yet; you'll hear from us by email first.",
  },
  {
    q: "Is early access free?",
    a: "Yes. Joining the waitlist is free, and so is trying the early-access version. Founding Customers is an optional paid subscription for developers who want access first and a say in the roadmap; you can cancel it anytime.",
  },
];

const enter = (delay: number) => ({ "--enter-delay": `${delay}ms` }) as CSSProperties;

const WAITLIST_FEATURES = ["Early-access invitation by email", "Product updates while we build", "Free, no card required"];
const FOUNDING_FEATURES = [
  "First in line: access before the waitlist",
  "A direct line to the founder",
  "A real say in what Publishub verifies first",
  "Back an independent dev tool from day one",
];

export default function VerifyPage() {

  return (
    <>
      <WaitlistTracker />

      {/* ---------- hero: a promessa, a inscrição e o produto logo abaixo ---------- */}
      <section aria-labelledby="hero-heading" className="relative overflow-hidden border-b border-line">
        <div className="landing-grid" aria-hidden="true" />
        <div className="landing-beam" aria-hidden="true" />
        <div className="container-page relative pt-14 text-center sm:pt-20">
          <a href="#early-access" data-cta="hero_pill" className="enter pill min-h-8 font-pixel text-[15px] no-underline hover:border-accent hover:text-ink" style={enter(0)}>
            <span aria-hidden="true" className="h-2 w-2 bg-action" />
            Early access is open
            <span aria-hidden="true" className="hidden text-muted min-[380px]:inline">
              ·
            </span>
            <span className="hidden text-muted min-[380px]:inline">In development</span>
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 text-muted" />
          </a>
          <h1 id="hero-heading" className="enter mx-auto mt-6 max-w-5xl text-[2.5rem] font-bold leading-[1.05] tracking-[-0.04em] sm:text-[3.5rem] lg:text-[4rem]" style={enter(80)}>
            {/* uma frase por linha no desktop; no celular, quebra onde couber */}
            <span className="text-muted sm:block">Your AI writes the code.</span> <span className="sm:block">
              Who verifies it actually works?
              <span aria-hidden="true" className="term-cursor ml-[0.15em]" style={{ "--d": "900ms" } as CSSProperties} />
            </span>
          </h1>
          <p className="enter mx-auto mt-6 max-w-[58ch] text-lg text-muted sm:text-xl" style={enter(160)}>
            Verify AI-generated code changes, catch regressions, and ship software with confidence.
          </p>
          <div className="enter mx-auto mt-9 max-w-xl" style={enter(240)}>
            <WaitlistForm form="hero" submitLabel="Join the waitlist" layout="inline" />
          </div>
          <div className="enter mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[15px] text-muted" style={enter(320)}>
            <p>
              Built for developers shipping with <span className="font-mono text-[14px] text-ink">Claude Code · Cursor · Codex</span>
            </p>
            <a href="#how-it-works" data-cta="hero_how" className="inline-flex min-h-11 items-center gap-1.5 font-medium text-ink no-underline hover:text-accent">
              Learn how it works
              <ArrowDown aria-hidden="true" className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* o produto, logo abaixo da inscrição: entra inclinado e assenta (uma vez) */}
        <div id="preview" className="container-page relative mt-10 pb-16 sm:mt-12 sm:pb-24">
          <div className="preview-stage">
            <div className="preview-tilt">
              <TerminalPreview />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- o problema ---------- */}
      <section aria-labelledby="problem-heading" className="container-page py-20 sm:py-28">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">The problem</p>
          <h2 id="problem-heading" className="mt-3 text-3xl font-bold sm:text-[2.75rem] sm:leading-[1.1]">
            Generated code isn&apos;t verified code
          </h2>
          <p className="mt-4 text-lg text-muted">AI can write a feature in minutes. Whether your app still works afterwards is a different question, and today the answer is usually you, clicking around.</p>
        </Reveal>
        <ul className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {PROBLEMS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="bg-card p-6">
              <Icon aria-hidden="true" className="h-5 w-5 text-accent" />
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-muted">{text}</p>
            </li>
          ))}
          <li className="flex flex-col justify-center bg-card p-6">
            <p className="text-lg font-semibold">Writing code got faster. Knowing it works didn&apos;t.</p>
            <a href="#early-access" data-cta="problem_join" className="mt-3 inline-flex min-h-11 items-center font-semibold">
              Join the waitlist
            </a>
          </li>
        </ul>
      </section>

      {/* ---------- como vai funcionar ---------- */}
      <section id="how-it-works" aria-labelledby="how-heading" className="border-y border-line bg-surface">
        <div className="container-page py-20 sm:py-28">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">How it will work</p>
            <h2 id="how-heading" className="mt-3 text-3xl font-bold sm:text-[2.75rem] sm:leading-[1.1]">
              From AI change to evidence in four steps
            </h2>
          </Reveal>
          <ol className="relative mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, text }, index) => (
              <Reveal as="li" key={title} delay={index * 90} className="relative rounded-2xl border border-line bg-card p-6">
                <div className="flex items-center justify-between">
                  <span aria-hidden="true" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface">
                    <Icon className="h-5 w-5 text-accent" />
                  </span>
                  <span className="font-pixel text-base text-accent">0{index + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-1 text-muted">{text}</p>
              </Reveal>
            ))}
          </ol>
          <p className="mt-8 max-w-prose text-[15px] text-muted">
            This is the workflow we&apos;re building. Supported setups and integrations aren&apos;t available yet; we&apos;ll confirm them with early-access members first.
          </p>
        </div>
      </section>

      {/* ---------- preços: a lista de espera grátis e a assinatura Founding Customers ---------- */}
      <section id={PRICING_ANCHOR} aria-labelledby="pricing-heading" className="container-page py-20 sm:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Pricing</p>
          <h2 id="pricing-heading" className="mt-3 text-3xl font-bold sm:text-[2.75rem] sm:leading-[1.1]">
            Join free, or back {SITE_NAME} from day one
          </h2>
        </Reveal>
        <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
          <div className="flex flex-col rounded-md border border-line-strong bg-card p-7 shadow-[6px_6px_0_0_var(--line)]">
            <h3 className="font-pixel text-2xl font-medium">Waitlist</h3>
            <p className="mt-4 flex items-baseline gap-2">
              <span className="text-5xl font-extrabold tracking-[-0.04em]">Free</span>
            </p>
            <p className="mt-3 text-muted">Get notified when early access opens.</p>
            <ul className="mt-6 grid gap-3">
              {WAITLIST_FEATURES.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-accent" />
                  {item}
                </li>
              ))}
            </ul>
            <a href="#early-access" data-cta="pricing_waitlist" className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-md border border-line-strong bg-card px-6 font-semibold text-ink no-underline transition-colors hover:border-accent hover:bg-surface hover:text-ink">
              Join the waitlist
            </a>
          </div>

          <div className="relative flex flex-col rounded-md border-2 border-action bg-card p-7 shadow-pixel-lg">
            <p className="absolute -top-4 left-6 border-2 border-action bg-bg px-3 py-0.5 font-pixel text-sm uppercase tracking-[0.06em] text-accent">For early supporters</p>
            <h3 className="font-pixel text-2xl font-medium">Founding Customers</h3>
            {/* o preço vem do Stripe (/api/founding/price): a home continua estática */}
            <p className="mt-4 flex min-h-12 items-baseline gap-2">
              <FoundingPriceAmount />
            </p>
            <p className="mt-3 text-muted">For developers who want Publishub first and want to shape it.</p>
            <ul className="mt-6 grid gap-3">
              {FOUNDING_FEATURES.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span aria-hidden="true" className="mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center text-accent">
                    <PixelIcon name="star" size={14} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <FoundingCheckoutButton />
            </div>
            <p className="mt-4 text-sm text-muted">
              Publishub is in development. Your subscription starts at checkout and renews <FoundingRenewal /> until you cancel. Cancel anytime by emailing{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. Secure payment by Stripe.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- acesso antecipado ---------- */}
      <section id="early-access" aria-labelledby="early-heading" className="container-page py-20 sm:py-28">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-16">
          <div>
            <p className="eyebrow">Early access</p>
            <h2 id="early-heading" className="mt-3 text-3xl font-bold sm:text-[2.75rem] sm:leading-[1.1]">
              Be among the first to experience {SITE_NAME}.
            </h2>
            <p className="mt-4 max-w-prose text-lg text-muted">
              We&apos;re building a better way to verify software created with AI coding agents. Join the early-access waitlist and be notified when {SITE_NAME} is ready.
            </p>
            <ul className="mt-8 grid gap-3">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3 text-[17px]">
                  <span aria-hidden="true" className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center border border-line bg-accent-soft text-accent">
                    <PixelIcon name="star" size={12} />
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-md border border-line-strong bg-card p-6 shadow-[6px_6px_0_0_var(--line)] sm:p-8">
            <WaitlistForm form="early_access" submitLabel="Get Early Access" layout="stacked" />
          </div>
        </div>
      </section>

      {/* ---------- perguntas ---------- */}
      <section id="faq" aria-labelledby="faq-heading" className="container-page pb-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-16">
          <h2 id="faq-heading" className="text-3xl font-bold sm:text-[2.75rem] sm:leading-[1.1]">
            Questions
          </h2>
          <FaqList items={FAQ} />
        </div>
      </section>
    </>
  );
}
