import type { Metadata } from "next";
import Link from "next/link";
import { Bug, EyeOff, FileWarning, Globe, Link2, MonitorSmartphone, MousePointerClick, Route, ShieldCheck, Timer, Trash2, Unplug, Share2 } from "lucide-react";
import { CheckForm } from "@/components/check/CheckForm";
import { CheckStatsLine } from "@/components/check/CheckStatsLine";
import { FaqList, type FaqItem } from "@/components/FaqList";
import { WaitlistTracker } from "@/components/waitlist/WaitlistTracker";
import { buttonClasses } from "@/components/ui/Button";
import { CHECK_LIMIT_PER_HOUR } from "@/lib/check/types";
import { SITE_NAME } from "@/lib/site";

const TITLE = "Free AI app checker: test your app in a real browser";
const DESCRIPTION =
  "Paste the URL of an app you built with Lovable, Bolt, Cursor, Claude Code or v0. Publishub opens it in a real browser and finds JavaScript crashes, failed requests, broken links and pages that don't load. Free, no signup.";

export const metadata: Metadata = {
  title: { absolute: `${TITLE} · ${SITE_NAME}` },
  description: DESCRIPTION,
  alternates: { canonical: "/check" },
  openGraph: { siteName: SITE_NAME, type: "website", url: "/check", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const WHAT: { icon: typeof Bug; title: string; text: string }[] = [
  { icon: Globe, title: "The page loads", text: "No server errors, no blank screen, no \"not found\" page where your app should be." },
  { icon: Bug, title: "No JavaScript crashes", text: "Uncaught errors that silently break buttons, forms and whole screens." },
  { icon: Unplug, title: "No failed requests", text: "API calls, Supabase queries and assets that return errors or never arrive." },
  { icon: Route, title: "Key pages open", text: "We follow your sign-up, login, pricing and dashboard links like a visitor would." },
  { icon: Link2, title: "Internal links work", text: "Every internal link on the page, checked for 404s and server errors." },
  { icon: MonitorSmartphone, title: "Works on a phone", text: "A real mobile viewport: does the page fit, or scroll sideways?" },
  { icon: Timer, title: "Loads quickly", text: "How long the page takes to load in a real browser." },
  { icon: Share2, title: "Link previews", text: "Title, description and share image for X, LinkedIn and Slack." },
  { icon: ShieldCheck, title: "HTTPS", text: "Served securely, with no insecure resources." },
];

const TRUST: { icon: typeof Bug; title: string; text: string }[] = [
  { icon: MousePointerClick, title: "Read-only, like a visitor", text: "We open your public pages the way a visitor would. Nothing is created, changed or deleted in your app." },
  { icon: ShieldCheck, title: "No login, no forms", text: "We never sign in, never submit a form and skip links like log out or delete." },
  { icon: EyeOff, title: "Private by link", text: "Your report has a long random address. It isn't listed anywhere, and search engines don't index it." },
  { icon: Trash2, title: "Delete it anytime", text: "From the browser you used, delete the report and its screenshots with one click." },
];

const FAQ: FaqItem[] = [
  {
    q: "What does the free check actually do?",
    a: "It opens your app's URL in a real Chromium browser on desktop and on a phone-sized screen, records JavaScript errors, console errors and failed network requests, opens up to three of your key pages (sign-up, login, pricing, dashboard), checks your internal links, and takes screenshots. It takes about a minute.",
  },
  {
    q: "Will it change anything in my app?",
    a: "No. It only opens public pages. It never submits forms, never logs in, never creates accounts and skips links that look like they change data, such as log out or delete.",
  },
  {
    q: "Which apps can I check?",
    a: `Any public URL: apps built with Lovable, Bolt, v0, Replit, Cursor or Claude Code, deployed on Vercel, Netlify or anywhere else. Only check apps you own or are allowed to test. Local addresses (localhost) and private networks can't be checked. You can run ${CHECK_LIMIT_PER_HOUR} checks per hour.`,
  },
  {
    q: "Who can see my report?",
    a: "Only people you give the link to. It's a long random address we don't publish, list or let search engines index. From the browser you used to run the check, you can delete the report and its screenshots at any time.",
  },
  {
    q: "How is this different from Publishub?",
    a: "The free check looks at your public pages once. Publishub, which we're building now, will run your real user journeys, including login and checkout, after every deploy, and compare each run with the last version that worked. Join the waitlist for early access.",
  },
];

export default function CheckPage() {
  return (
    <>
      <WaitlistTracker />
      <section aria-labelledby="check-heading" className="relative overflow-hidden">
        <div aria-hidden="true" className="landing-grid" />
        <div aria-hidden="true" className="landing-beam" />
        <div className="container-page relative pb-16 pt-16 text-center sm:pb-20 sm:pt-24">
          <p className="eyebrow justify-center">Free tool · No signup</p>
          <h1 id="check-heading" className="mx-auto mt-4 max-w-3xl text-4xl font-bold leading-[1.08] sm:text-6xl">
            Is your AI-built app actually working?
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted sm:text-xl">
            You built it yourself, maybe late at night, with an AI that said &ldquo;done&rdquo;. Paste your app&apos;s URL and see what your visitors actually see, in about a minute, before one of them
            tells you.
          </p>
          <div className="mx-auto mt-9 max-w-xl">
            <CheckForm source="check_hero" />
          </div>
          <p className="mt-4 text-[15px] text-muted">
            Works with apps built in <span className="font-mono text-[14px] text-ink">Lovable · Bolt · v0 · Cursor · Claude Code</span>
          </p>
          <CheckStatsLine className="mx-auto mt-3 max-w-xl" />
        </div>
      </section>

      <section aria-labelledby="what-heading" className="container-page py-16 sm:py-24">
        <p className="eyebrow">What we check</p>
        <h2 id="what-heading" className="mt-3 max-w-2xl text-3xl font-bold sm:text-[2.5rem] sm:leading-[1.1]">
          The things that break first when AI writes the code
        </h2>
        <ul className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {WHAT.map(({ icon: Icon, title, text }) => (
            <li key={title} className="bg-bg p-6">
              <Icon aria-hidden="true" className="h-6 w-6 text-accent" />
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1.5 text-[15px] text-muted">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="trust-heading" className="border-y border-line bg-surface">
        <div className="container-page py-16 sm:py-20">
          <p className="eyebrow">Your app, your check</p>
          <h2 id="trust-heading" className="mt-3 max-w-2xl text-3xl font-bold sm:text-[2.5rem] sm:leading-[1.1]">
            It looks. It never touches.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-muted">You&apos;re trusting us with something you made. Here&apos;s exactly what the check does, and what it will never do.</p>
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <Icon aria-hidden="true" className="h-6 w-6 text-accent" />
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-1.5 text-[15px] text-muted">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="full-heading" className="container-page pt-16 sm:pt-24">
        <div className="rounded-md border border-line-strong bg-surface p-6 sm:p-10">
          <FileWarning aria-hidden="true" className="h-7 w-7 text-accent" />
          <h2 id="full-heading" className="mt-4 max-w-2xl text-2xl font-bold sm:text-3xl">
            A free check sees your app once. Your next AI change can break it again.
          </h2>
          <p className="mt-3 max-w-2xl text-muted">
            {SITE_NAME} is building the full version: your sign-up, login and checkout journeys, run in a real browser after every deploy, with evidence you can hand back to your coding agent.
          </p>
          <Link href="/#early-access" data-cta="check_join" className={buttonClasses("primary", "lg", "mt-6")}>
            Join the waitlist
          </Link>
        </div>
      </section>

      <section aria-labelledby="faq-heading" className="container-page max-w-3xl py-16 sm:py-24">
        <h2 id="faq-heading" className="text-3xl font-bold">
          Questions
        </h2>
        <div className="mt-6">
          <FaqList items={FAQ} />
        </div>
      </section>
    </>
  );
}
