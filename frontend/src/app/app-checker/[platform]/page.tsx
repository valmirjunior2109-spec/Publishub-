import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, EyeOff, MousePointerClick, ShieldCheck, Trash2 } from "lucide-react";
import { CheckForm } from "@/components/check/CheckForm";
import { CheckStatsLine } from "@/components/check/CheckStatsLine";
import { WaitlistTracker } from "@/components/waitlist/WaitlistTracker";
import { buttonClasses } from "@/components/ui/Button";
import { PLATFORMS, platformBySlug } from "@/lib/platforms";
import { SITE_NAME } from "@/lib/site";

// só as ferramentas da lista existem; qualquer outro endereço é 404
export const dynamicParams = false;

export function generateStaticParams() {
  return PLATFORMS.map((p) => ({ platform: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ platform: string }> }): Promise<Metadata> {
  const platform = platformBySlug((await params).platform);
  if (!platform) return {};
  const title = `Free ${platform.name} app checker: test your app in a real browser`;
  const description = `Built your app with ${platform.name}? Paste its URL and Publishub opens it in a real browser, visits your key pages and shows JavaScript crashes, failed requests and broken pages in about a minute. Free and read-only.`;
  const path = `/app-checker/${platform.slug}`;
  return {
    title: { absolute: `${title} · ${SITE_NAME}` },
    description,
    alternates: { canonical: path },
    openGraph: { siteName: SITE_NAME, type: "website", url: path, title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

const TRUST = [
  { icon: MousePointerClick, text: "Read-only: opens public pages like a visitor" },
  { icon: ShieldCheck, text: "Never logs in or submits a form" },
  { icon: EyeOff, text: "Private report, not indexed" },
  { icon: Trash2, text: "Delete your report anytime" },
];

export default async function PlatformCheckerPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = platformBySlug((await params).platform);
  if (!platform) notFound();
  const others = PLATFORMS.filter((p) => p.slug !== platform.slug);

  return (
    <>
      <WaitlistTracker />
      <section aria-labelledby="checker-heading" className="relative overflow-hidden">
        <div aria-hidden="true" className="landing-grid" />
        <div aria-hidden="true" className="landing-beam" />
        <div className="container-page relative pb-14 pt-16 text-center sm:pb-20 sm:pt-24">
          <p className="eyebrow justify-center">Free tool · Report in about a minute</p>
          <h1 id="checker-heading" className="mx-auto mt-4 max-w-3xl text-4xl font-bold leading-[1.08] sm:text-6xl">
            Free {platform.name} app checker
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted sm:text-xl">
            You built it with {platform.name}. Before your users find what&apos;s broken, paste your app&apos;s URL: we open it in a real browser, visit your key pages and show you what fails, in about a
            minute.
          </p>
          <div className="mx-auto mt-9 max-w-xl">
            <CheckForm source={`platform_${platform.slug}`} />
          </div>
          <CheckStatsLine className="mx-auto mt-4 max-w-xl" />
        </div>
      </section>

      <section aria-labelledby="risks-heading" className="container-page py-14 sm:py-20">
        <p className="eyebrow">What can break</p>
        <h2 id="risks-heading" className="mt-3 max-w-2xl text-3xl font-bold sm:text-[2.5rem] sm:leading-[1.1]">
          What can break in a {platform.name} app after a change
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-muted">{platform.stack} A few things the check looks for:</p>
        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {platform.risks.map((risk) => (
            <li key={risk.title} className="rounded-md border border-line bg-card p-6">
              <AlertTriangle aria-hidden="true" className="h-6 w-6 text-accent" />
              <h3 className="mt-3 font-semibold">{risk.title}</h3>
              <p className="mt-1.5 text-[15px] text-muted">{risk.text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-[15px] text-muted">
          The check also looks at internal links, mobile layout, load time, link previews and HTTPS. <Link href="/check">See everything it checks</Link>.
        </p>
      </section>

      {platform.mcp && (
        <section aria-labelledby="mcp-heading" className="container-page pb-14 sm:pb-20">
          <div className="rounded-md border border-line-strong bg-card p-6 sm:p-8">
            <p className="eyebrow">Let the agent check</p>
            <h2 id="mcp-heading" className="mt-3 text-2xl font-bold">
              Make {platform.name} check the app itself, after every change
            </h2>
            <p className="mt-3 max-w-2xl text-muted">
              stillworks, our free and open-source tool, runs the same kind of check on your machine. Add it as an MCP server and your agent can open the app in a real browser and fix what it finds before saying
              &ldquo;done&rdquo;:
            </p>
            <pre className="terminal mt-4 overflow-x-auto rounded-md p-4 font-mono text-[13px] leading-relaxed">
              <code>{platform.mcp}</code>
            </pre>
            <p className="mt-3 text-[15px] text-muted">
              Run <code className="font-mono text-[14px]">npx stillworks install</code> once first.{" "}
              <a href="https://github.com/valmirjunior2109-spec/stillworks" target="_blank" rel="noopener noreferrer" data-cta={`platform_${platform.slug}_stillworks`}>
                stillworks on GitHub<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </p>
          </div>
        </section>
      )}

      <section aria-labelledby="trust-heading" className="border-y border-line bg-surface">
        <div className="container-page py-12">
          <h2 id="trust-heading" className="sr-only">
            How the check treats your app
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-[15px]">
                <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-accent" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="next-heading" className="container-page py-14 sm:py-20">
        <div className="rounded-md border border-line-strong bg-card p-6 sm:p-10">
          <h2 id="next-heading" className="max-w-2xl text-2xl font-bold sm:text-3xl">
            A free check sees your app once. Your next prompt can break it again.
          </h2>
          <p className="mt-3 max-w-2xl text-muted">
            {SITE_NAME} is building the full version: your sign-up, login and checkout journeys, checked in a real browser after every change, compared with the last version that worked.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/#early-access" data-cta={`platform_${platform.slug}_join`} className={buttonClasses("primary", "lg")}>
              Join the waitlist
            </Link>
            <Link href="/#pricing" data-cta={`platform_${platform.slug}_founding`} className={buttonClasses("secondary", "lg")}>
              Founding Customers: $0 today
            </Link>
          </div>
        </div>
        <nav aria-label="Checkers for other tools" className="mt-10 text-[15px] text-muted">
          Also for:{" "}
          {others.map((p, i) => (
            <span key={p.slug}>
              <Link href={`/app-checker/${p.slug}`}>{p.name}</Link>
              {i < others.length - 1 ? " · " : ""}
            </span>
          ))}
        </nav>
      </section>
    </>
  );
}
