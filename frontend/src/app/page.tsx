import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BellRing, Bug, Check, Clock3, EyeOff, FileWarning, FlaskConical, GitCompareArrows, GitPullRequest, ListChecks, Minus, Plug, Route, ScanEye, ShieldQuestion, Tag, UserX, Waypoints, type LucideIcon } from "lucide-react";
import { CheckStatsLine } from "@/components/check/CheckStatsLine";
import { FaqList, type FaqItem } from "@/components/FaqList";
import { FeedbackForm } from "@/components/FeedbackForm";
import { StillworksBanner } from "@/components/waitlist/StillworksBanner";
import { Reveal } from "@/components/Reveal";
import { buttonClasses } from "@/components/ui/Button";
import { PixelIcon } from "@/components/ui/Pixel";
import { FoundingCheckoutButton } from "@/components/waitlist/FoundingCheckoutButton";
import { FoundingPriceAmount, FoundingPriceText } from "@/components/waitlist/FoundingPrice";
import { TerminalPreview } from "@/components/waitlist/TerminalPreview";
import { WaitlistCount } from "@/components/waitlist/WaitlistCount";
import { WaitlistForm } from "@/components/waitlist/WaitlistForm";
import { WaitlistTracker } from "@/components/waitlist/WaitlistTracker";
import { FOUNDING_PERKS, FOUNDING_TERMS, FOUNDING_TERMS_ANCHOR, PRICING_ANCHOR, STILLWORKS_URL } from "@/lib/founding";
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
  { icon: Plug, title: "Pick the 5 flows that make you money", text: "Point Publishub at your preview deploy or live app and choose what must never break: sign-up, login, checkout, your core action." },
  { icon: ScanEye, title: "Check after every change, and every hour", text: "Publishub walks those flows in a real browser on each deploy and keeps checking your live app hourly, read-only by default." },
  { icon: Waypoints, title: "Identify failures and regressions", text: "Each result is compared with the last version that worked, so you see what this change broke." },
  { icon: FileWarning, title: "Get actionable evidence", text: "What passed, what failed and what it didn't check, with the failing step, a screenshot and a bug report for your coding agent." },
];

/** O que os comentários do post mostraram: o difícil é rodar no app real com segurança. */
const SAFETY: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: EyeOff, title: "Read-only on your live app by default", text: "It walks each flow and stops right before the final submit. Writing to production is opt-in, flow by flow." },
  { icon: FlaskConical, title: "Side effects run as a dry run", text: "During setup you mark the flows that send email, fire webhooks or touch payments. Those never fire for real unless you say so." },
  { icon: Tag, title: "Test data tagged by what your app already stores", text: "Test accounts use a non-deliverable email domain, so they're easy to filter out. No schema changes, no test-flag column." },
  { icon: ListChecks, title: "A log of every write", text: "If a flow does write, you see every row it created, and cleanup only ever touches rows that same run created." },
  { icon: UserX, title: "Checks who can see what", text: "A second test user tries to open the first one's records. If it can, that's a failure, not a pass." },
  { icon: GitPullRequest, title: "Runs on preview deploys too", text: "No staging? Point it at your Vercel or Netlify preview and it can block a pull request when a key flow breaks." },
];

/** Uma noite que quem constrói sozinho conhece: o cenário, não um caso real. */
const NIGHT: { time: string; text: string }[] = [
  { time: "11:48 PM", text: "You ask the AI for one small change. It replies: \"Done. Everything works.\"" },
  { time: "11:52 PM", text: "You deploy. It looks fine on your screen. You finally go to sleep." },
  { time: "8:15 AM", text: "An email from a user: \"I tried to sign up three times. Nothing happens.\"" },
  { time: "8:16 AM", text: "You don't know how long it's been broken, or how many people quietly left." },
];

const AGENT_CHECK = [
  "The same agent that wrote the change decides if it works",
  "Runs when you remember to ask for it",
  "Usually only inside one editor or tool",
  "One run, with nothing to compare it to",
];

const PUBLISHUB_CHECK = [
  "An independent check, outside the agent",
  "Runs after every change and every hour, the same way each time",
  "Works with any AI coding tool, because it tests the running app",
  "Compared with the last version that worked, so you know what this change broke",
];

const BENEFITS = ["Early access to the first version", "Direct product updates from the founder", "A say in the roadmap: tell us what to verify first", "Access to the first public release"];

const FAQ: FaqItem[] = [
  {
    q: "What is Publishub?",
    a: "A verification tool we're building for software written with AI coding agents. It checks that your application still behaves correctly after a change: it runs real user journeys, catches regressions and gives you evidence of what broke.",
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
    q: "How will it handle login and payments?",
    a: "The plan: a dedicated test account for each project, with its credentials stored encrypted, and payments run in your provider's test mode (like Stripe test cards), so nothing real is charged. We'll confirm the details with early-access members.",
  },
  {
    q: "What about false alarms?",
    a: "A check that cries wolf gets ignored, so reliability comes before coverage. A flow has to fail twice in a row before you're alerted, and results we can't trust (a page that didn't load, a timeout) are marked inconclusive instead of failed. Every report also lists what it didn't check, so a green result never hides a gap.",
  },
  {
    q: "Will it touch my production database?",
    a: "Not by default. On your live app it's read-only: it walks each flow and stops before the final submit. You can opt specific flows into writing; those use tagged test accounts, never fire emails, webhooks or payments you've marked as side effects, and every write shows up in a log. If you'd rather keep it off production entirely, point it at a preview deploy.",
  },
  {
    q: "How is this different from my agent testing its own work?",
    a: "Your agent can run tests and even click through your app, and that helps. Publishub is meant to be the independent check: it runs outside the agent, the same way after every change, works with any AI coding tool, and compares each result with the last version that worked.",
  },
  {
    q: "What's the difference between StillWorks and Publishub?",
    a: (
      <>
        <a href={STILLWORKS_URL}>StillWorks</a> is our free, open-source (MIT) CLI and MCP server: you write the journeys and run them yourself, from your terminal, your agent or CI. It stays free.
        Publishub is the hosted service built on it: we set up your flows with you, watch your live app every hour, alert you when something breaks and compare each run with your last working version. No
        terminal or CI needed.
      </>
    ),
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
    q: "Can I try anything today?",
    a: (
      <>
        Yes. The <Link href="/check">free app check</Link> opens your app in a real browser and shows JavaScript crashes, failed requests, broken links and pages that don&apos;t load, in about a minute. It only looks
        at public pages once; the full product will run your real user journeys after every deploy.
      </>
    ),
  },
  {
    q: "Is early access free?",
    a: "Yes. Joining the waitlist is free, and StillWorks, the open-source core, is free forever. Founding Customers is optional: you reserve a spot today for $0, the founder sets up your flows with you, and the founding price is only charged after Publishub launches.",
  },
  {
    q: "Will I be charged as a Founding Customer before launch?",
    a: `No. Reserving stores your card securely with Stripe and charges $0, and no subscription starts. When Publishub launches, we'll email you at least ${FOUNDING_TERMS.noticeDays} days before your first charge, with the exact date. Cancel before then and you pay nothing. After that, the founding price is billed monthly, you can cancel anytime, and your first payment is refundable on request within ${FOUNDING_TERMS.refundDays} days.`,
  },
];

const enter = (delay: number) => ({ "--enter-delay": `${delay}ms` }) as CSSProperties;

const WAITLIST_FEATURES = ["Join for free", "Receive product updates", "Get notified when Publishub launches", "No payment required"];
/** StillWorks (grátis, open source) vs. Publishub (pago): o que cada um faz, sem um parecer ruim. */
const OPEN_CORE: { label: string; stillworks: string; publishub: string }[] = [
  { label: "Setup", stillworks: "You write and maintain the journeys", publishub: "Set up with you, 1:1, by the founder" },
  { label: "When it runs", stillworks: "When you, your agent or CI run it", publishub: "Every deploy, plus every hour on your live app" },
  { label: "When something breaks", stillworks: "A report in your terminal or CI log", publishub: "An alert, only after two failures in a row" },
  { label: "History", stillworks: "One run at a time", publishub: "Each run compared with your last working version" },
  { label: "Production safety", stillworks: "Read-only checks; you decide the rest", publishub: "Read-only by default, dry-run side effects, a log of every write" },
  { label: "Who it's for", stillworks: "Developers with a terminal and CI", publishub: "Anyone with real users, including Lovable, Bolt and v0 apps" },
];

export default function VerifyPage() {

  return (
    <>
      <WaitlistTracker />
      <StillworksBanner />

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
            The build passes, but checkout quietly broke. Publishub will walk the flows that make you money in a real browser, after every AI change and every hour, and
            show you what broke, without putting your real data at risk.
          </p>
          <div className="enter mx-auto mt-9 max-w-xl" style={enter(240)}>
            <WaitlistForm form="hero" submitLabel="Join the waitlist" layout="inline" />
          </div>
          {/* quem está por trás e quantos já entraram, no momento da decisão */}
          <div className="enter mx-auto mt-5 flex max-w-xl items-center justify-center gap-3 text-left" style={enter(280)}>
            <Image src="/founder/valmir.jpg" alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-sm border border-line-strong object-cover" />
            <p className="text-[15px] text-muted">
              Built in public by{" "}
              <a href="#founder-heading" data-cta="hero_founder" className="font-semibold text-ink">
                Valmir
              </a>
              , a solo founder who reads every reply. <WaitlistCount as="span" />
            </p>
          </div>
          <div className="enter mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[15px] text-muted" style={enter(320)}>
            <p>
              Built for anyone shipping with <span className="font-mono text-[14px] text-ink">Claude Code · Cursor · Codex · Lovable</span>
            </p>
            <a href={STILLWORKS_URL} data-cta="hero_stillworks" className="inline-flex min-h-11 items-center gap-1.5 font-medium text-accent no-underline hover:text-ink">
              Built on StillWorks, our open-source core
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </a>
            <Link href="/check" data-cta="hero_check" className="inline-flex min-h-11 items-center gap-1.5 font-medium text-accent no-underline hover:text-ink">
              Or check your app free right now
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
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

      {/* ---------- a noite de quem constrói sozinho ---------- */}
      <section aria-labelledby="night-heading" className="border-y border-line bg-surface">
        <div className="container-page grid gap-12 py-20 sm:py-28 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <Reveal>
            <p className="eyebrow">If you build alone</p>
            <h2 id="night-heading" className="mt-3 text-3xl font-bold sm:text-[2.75rem] sm:leading-[1.1]">
              You shouldn&apos;t have to find out from your users.
            </h2>
            <p className="mt-4 text-lg text-muted">
              No QA team. No one to ask &ldquo;does this still work?&rdquo; Just you, an AI that sounds sure of itself, and the people who trusted your app enough to try it.
            </p>
            <p className="mt-4 text-lg">Publishub exists for that moment, so it stops happening. You can start today: check your own app, for free, in about a minute.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/check" data-cta="night_check" className={buttonClasses("primary", "lg")}>
                Check my app free
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <a href="#early-access" data-cta="night_join" className={buttonClasses("secondary", "lg")}>
                Join the waitlist
              </a>
            </div>
            <CheckStatsLine className="mt-5" />
          </Reveal>
          <Reveal>
            <ol aria-label="A night you might recognize" className="relative space-y-6 border-l-2 border-line-strong pl-6">
              {NIGHT.map(({ time, text }, index) => (
                <li key={time} className="relative">
                  <span aria-hidden="true" className={`absolute -left-[33px] top-1.5 h-4 w-4 rounded-sm ${index >= 2 ? "bg-critical" : "bg-action"}`} />
                  <p className="font-pixel text-sm text-muted">{time}</p>
                  <p className={`mt-1 text-lg ${index >= 2 ? "font-semibold" : ""}`}>{text}</p>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      {/* ---------- a objeção: "por que não pedir para o agente testar?" ---------- */}
      <section aria-labelledby="why-heading" className="container-page pb-20 sm:pb-28">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">Why not just ask the agent?</p>
          <h2 id="why-heading" className="mt-3 text-3xl font-bold sm:text-[2.75rem] sm:leading-[1.1]">
            The agent&apos;s report is a claim, not a result
          </h2>
          <p className="mt-4 text-lg text-muted">
            Asking your agent to test its own work helps. But the same system that wrote the change is grading it, and agents sometimes report passing tests they never ran, or
            rewrite a failing test so it passes.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-line bg-card p-6 sm:p-7">
            <h3 className="text-lg font-semibold">The agent checking its own work</h3>
            <ul className="mt-5 grid gap-3">
              {AGENT_CHECK.map((item) => (
                <li key={item} className="flex items-start gap-3 text-muted">
                  <Minus aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border-2 border-action bg-card p-6 sm:p-7">
            <h3 className="text-lg font-semibold">Publishub (what we&apos;re building)</h3>
            <ul className="mt-5 grid gap-3">
              {PUBLISHUB_CHECK.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------- seguro no app real: o que mudou depois do feedback da comunidade ---------- */}
      <section id="safe-on-live" aria-labelledby="safe-heading" className="container-page pb-20 sm:pb-28">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">Safe on your live app</p>
          <h2 id="safe-heading" className="mt-3 text-3xl font-bold sm:text-[2.75rem] sm:leading-[1.1]">
            Read freely. Write only what you approved.
          </h2>
          <p className="mt-4 text-lg text-muted">
            We asked builders whether they&apos;d let a bot touch their production app. The answer was clear: the real question is write access, not the environment. So that&apos;s how
            we&apos;re building it.
          </p>
        </Reveal>
        <ul className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {SAFETY.map(({ icon: Icon, title, text }) => (
            <li key={title} className="bg-card p-6">
              <Icon aria-hidden="true" className="h-5 w-5 text-accent" />
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-muted">{text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 flex items-start gap-3 text-[15px] text-muted">
          <BellRing aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          You&apos;re only alerted when a flow fails twice in a row, so a slow page at 3 AM doesn&apos;t wake you up.
        </p>
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

      {/* ---------- quem está construindo: uma pessoa, não uma marca sem rosto ---------- */}
      <section aria-labelledby="founder-heading" className="container-page pt-20 sm:pt-28">
        <Reveal className="mx-auto grid max-w-3xl gap-8 rounded-md border border-line-strong bg-card p-6 shadow-[5px_5px_0_0_var(--line)] sm:grid-cols-[auto_1fr] sm:p-10">
          <Image src="/founder/valmir.jpg" alt="Valmir, founder of Publishub" width={112} height={112} className="h-24 w-24 rounded-md border border-line-strong object-cover sm:h-28 sm:w-28" />
          <div>
            <p className="eyebrow">A note from the founder</p>
            <h2 id="founder-heading" className="mt-3 text-2xl font-bold sm:text-3xl">
              Hi, I&apos;m Valmir.
            </h2>
            <div className="mt-4 space-y-4 text-lg text-muted">
              <p>
                I&apos;m a solo founder in Salvador, Brazil, and I build with the same AI tools you do. They made me faster than I ever imagined. They also taught me that &ldquo;done&rdquo; doesn&apos;t always mean
                &ldquo;working&rdquo;.
              </p>
              <p className="text-ink">
                I&apos;m building Publishub so that people who build alone get the safety net big teams take for granted: something that checks, every time, before your users do.
              </p>
              <p>
                Every email to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> reaches me. Tell me what broke in your app, and what you&apos;d want Publishub to check first.
              </p>
            </div>
            <p className="mt-5 font-semibold">Valmir, founder of {SITE_NAME}</p>
          </div>
        </Reveal>
      </section>

      {/* ---------- open core: StillWorks grátis, Publishub faz por você ---------- */}
      <section id="open-source" aria-labelledby="open-heading" className="border-y border-line bg-surface">
        <div className="container-page py-20 sm:py-28">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">Open source core</p>
            <h2 id="open-heading" className="mt-3 text-3xl font-bold sm:text-[2.75rem] sm:leading-[1.1]">
              StillWorks checks when you ask. Publishub watches for you.
            </h2>
            <p className="mt-4 text-lg text-muted">
              The engine is free and open source, and it stays that way. Publishub is for when you&apos;d rather not maintain it yourself, or don&apos;t have a terminal at all.
            </p>
          </Reveal>
          <div className="mt-12 overflow-hidden rounded-2xl border border-line bg-card">
            <div className="hidden grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)] border-b border-line-strong text-sm font-semibold sm:grid">
              <p className="p-4">&nbsp;</p>
              <p className="p-4">StillWorks · free, MIT</p>
              <p className="border-l-2 border-action p-4 text-accent">Publishub · Founding Customers</p>
            </div>
            <dl>
              {OPEN_CORE.map(({ label, stillworks, publishub }) => (
                <div key={label} className="grid gap-1 border-b border-line p-4 last:border-b-0 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)] sm:gap-0 sm:p-0">
                  <dt className="font-semibold sm:p-4">{label}</dt>
                  <dd className="text-muted sm:p-4">
                    <span className="font-semibold text-ink sm:hidden">StillWorks: </span>
                    {stillworks}
                  </dd>
                  <dd className="sm:border-l-2 sm:border-action sm:p-4">
                    <span className="font-semibold text-accent sm:hidden">Publishub: </span>
                    {publishub}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={`#${PRICING_ANCHOR}`} data-cta="open_core_founding" className={buttonClasses("primary", "lg")}>
              Reserve a founding spot · $0 today
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </a>
            <a href={STILLWORKS_URL} data-cta="open_core_github" className={buttonClasses("secondary", "lg")}>
              Use StillWorks free on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* ---------- preços: a lista de espera grátis e a reserva Founding Customers (pré-lançamento, nada cobrado hoje) ---------- */}
      <section id={PRICING_ANCHOR} aria-labelledby="pricing-heading" className="container-page py-20 sm:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Pricing</p>
          <h2 id="pricing-heading" className="mt-3 text-3xl font-bold sm:text-[2.75rem] sm:leading-[1.1]">
            Join free, or become a Founding Customer
          </h2>
          <p className="mt-4 text-lg text-muted">{SITE_NAME} is in development. Both options put you in line for early access; neither charges you today.</p>
        </Reveal>
        <div className="mx-auto mt-12 grid max-w-5xl grid-cols-[minmax(0,1fr)] items-start gap-6 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="flex flex-col rounded-md border border-line-strong bg-card p-7 shadow-[6px_6px_0_0_var(--line)]">
            <h3 className="font-pixel text-2xl font-medium">Free Waitlist</h3>
            <p className="mt-4 text-5xl font-extrabold tracking-[-0.04em]">Free</p>
            <p className="mt-3 text-muted">Get notified when {SITE_NAME} launches.</p>
            <ul className="mt-6 grid gap-3">
              {WAITLIST_FEATURES.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-accent" />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/#early-access" data-cta="pricing_waitlist" className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-md border border-line-strong bg-card px-6 font-semibold text-ink no-underline transition-colors hover:border-accent hover:bg-surface hover:text-ink">
              Join the waitlist
            </Link>
          </div>

          <div className="relative flex flex-col rounded-md border-2 border-action bg-card p-7 shadow-pixel-lg sm:p-8">
            <p className="absolute -top-4 left-6 inline-flex items-center gap-2 border-2 border-action bg-bg px-3 py-0.5 font-pixel text-sm uppercase tracking-[0.06em] text-accent">
              <span aria-hidden="true" className="h-2 w-2 bg-action" />
              Early access · Coming soon
            </p>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="font-pixel text-2xl font-medium">Founding Customers</h3>
              <span className="border-2 border-success px-2.5 py-0.5 font-pixel text-base text-success">$0 today</span>
            </div>
            {/* o preço vem do Stripe (/api/founding/price): a home continua estática */}
            <p className="mt-4 flex min-h-12 flex-wrap items-baseline gap-x-2">
              <FoundingPriceAmount />
              <span className="text-[15px] text-muted">after launch</span>
            </p>
            <p className="mt-3 text-muted">
              For builders whose app already has real users. You don&apos;t configure anything: we set up your critical flows together, and {SITE_NAME} watches them for you.
            </p>
            <ul className="mt-6 grid gap-3">
              {FOUNDING_PERKS.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span aria-hidden="true" className="mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center text-accent">
                    <PixelIcon name="star" size={14} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-6 border-l-4 border-action bg-accent-soft px-4 py-3 text-[15px]">
              <p className="font-semibold">{SITE_NAME} isn&apos;t available yet.</p>
              <p className="mt-1">Reserving doesn&apos;t give you immediate access. You get access when the product launches, and we haven&apos;t set a launch date yet.</p>
            </div>

            <h4 className="mt-6 font-semibold">How the reservation works</h4>
            <ol className="mt-3 grid gap-3 text-[15px]">
              <li className="flex gap-3">
                <span className="font-pixel text-base text-accent">01</span>
                <span>
                  <strong>Today:</strong> reserve your spot with your card. Stripe stores it securely and <strong>you&apos;re charged $0</strong>. No subscription starts.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-pixel text-base text-accent">02</span>
                <span>
                  <strong>At launch:</strong> we email you at least {FOUNDING_TERMS.noticeDays} days before your first charge, with the exact date. Cancel before then and you pay nothing.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-pixel text-base text-accent">03</span>
                <span>
                  <strong>After that:</strong> <FoundingPriceText />, billed monthly at the founding price. Cancel anytime; your first payment is refundable on request within {FOUNDING_TERMS.refundDays} days.
                </span>
              </li>
            </ol>

            <div className="mt-7">
              <FoundingCheckoutButton label="Reserve my founding spot · $0 today" />
            </div>
            <p className="mt-3 text-sm text-muted">
              Secure card storage by Stripe. Cancel anytime by emailing <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.{" "}
              <Link href={`/terms#${FOUNDING_TERMS_ANCHOR}`}>Full terms</Link>.
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
            <WaitlistCount className="mb-4" />
            <WaitlistForm form="early_access" submitLabel="Get Early Access" layout="stacked" />
          </div>
        </div>
      </section>

      {/* ---------- feedback sobre a proposta: vai para copilot@getpublishub.com ---------- */}
      <section id="feedback" aria-labelledby="feedback-heading" className="border-y border-line bg-surface">
        <div className="container-page grid items-start gap-10 py-20 sm:py-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:gap-16">
          <Reveal>
            <p className="eyebrow">Tell us what you think</p>
            <h2 id="feedback-heading" className="mt-3 text-3xl font-bold sm:text-[2.75rem] sm:leading-[1.1]">
              Would you trust this with your app?
            </h2>
            <p className="mt-4 text-lg text-muted">
              Everything on this page came from builders telling us what they&apos;d need. Read-only by default, dry-run side effects and the &ldquo;who can see what&rdquo; check all started as
              someone&apos;s comment.
            </p>
            <p className="mt-4 text-lg">Tell us what&apos;s missing, what you&apos;d change, or why it&apos;s not for you. It goes straight to the founder, and it shapes what we build next.</p>
          </Reveal>
          <FeedbackForm />
        </div>
      </section>

      {/* ---------- perguntas ---------- */}
      <section id="faq" aria-labelledby="faq-heading" className="container-page pb-8 pt-20 sm:pt-28">
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
