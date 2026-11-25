import type { Metadata } from "next";
import Link from "next/link";
import { CheckForm } from "@/components/check/CheckForm";
import { CheckStatsLine } from "@/components/check/CheckStatsLine";
import { WaitlistTracker } from "@/components/waitlist/WaitlistTracker";
import { parseShareCounts, shareHeadline, shareQuery } from "@/lib/check/share";
import { SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/cn";

/**
 * Onde cai quem clica num resultado compartilhado no X ou no LinkedIn. Mostra o placar (só contagens,
 * nunca de quem é o app) e leva direto para o teste grátis. O ?ref= de quem compartilhou é guardado
 * pelo funil (WaitlistTracker), então uma inscrição depois conta como indicação dessa pessoa.
 */

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const counts = parseShareCounts(await searchParams);
  const title = `${shareHeadline(counts)}: an AI-built app, checked in a real browser`;
  const description = "Someone checked their AI-built app with Publishub's free real-browser check. Paste your app's URL and see what your visitors see, in about a minute. Free.";
  const image = `/check/shared/og?${shareQuery(counts)}`;
  return {
    title: { absolute: `${title} · ${SITE_NAME}` },
    description,
    alternates: { canonical: "/check" },
    // uma variação de /check por placar: nada para o Google indexar
    robots: { index: false, follow: true },
    openGraph: { siteName: SITE_NAME, type: "website", title, description, images: [{ url: image, width: 1200, height: 630, alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function SharedCheckPage({ searchParams }: { searchParams: SearchParams }) {
  const counts = parseShareCounts(await searchParams);
  const tone = counts.fail ? "text-critical" : counts.warn ? "text-warning" : "text-success";

  return (
    <>
      <WaitlistTracker />
      <section aria-labelledby="shared-heading" className="relative overflow-hidden">
        <div aria-hidden="true" className="landing-grid" />
        <div aria-hidden="true" className="landing-beam" />
        <div className="container-page relative pb-16 pt-16 text-center sm:pb-20 sm:pt-24">
          <p className="eyebrow justify-center">A shared app check</p>
          <h1 id="shared-heading" className="mx-auto mt-4 max-w-3xl text-4xl font-bold leading-[1.08] sm:text-5xl">
            Someone checked their AI-built app: <span className={tone}>{shareHeadline(counts).toLowerCase()}</span>
          </h1>
          <dl className="mx-auto mt-8 grid max-w-md grid-cols-3 gap-3">
            {(
              [
                ["Failures", counts.fail, "text-critical"],
                ["Warnings", counts.warn, "text-warning"],
                ["Passed", counts.pass, "text-success"],
              ] as const
            ).map(([label, value, color]) => (
              <div key={label} className="rounded-lg border border-line bg-card p-3">
                <dt className="text-sm text-muted">{label}</dt>
                <dd className={cn("font-pixel text-2xl", color)}>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mx-auto mt-8 max-w-2xl text-lg text-muted">
            Now check yours. Paste your app&apos;s URL: we open it in a real browser, visit your key pages and show JavaScript crashes, failed requests and broken pages, in about a minute.
          </p>
          <div className="mx-auto mt-8 max-w-xl">
            <CheckForm source="check_shared" />
          </div>
          <CheckStatsLine className="mx-auto mt-4 max-w-xl" />
          <p className="mt-4 text-sm text-muted">
            <Link href="/check">How the check works</Link>
          </p>
        </div>
      </section>
    </>
  );
}
