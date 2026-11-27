import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CheckForm } from "@/components/check/CheckForm";
import { CheckStatsLine } from "@/components/check/CheckStatsLine";
import { buttonClasses } from "@/components/ui/Button";
import { WaitlistTracker } from "@/components/waitlist/WaitlistTracker";
import { shareHeadlineFor, type PublicSummary } from "@/lib/check/issues";
import { parsePublicSummary, parseShareCounts, parseSharedHost, shareHeadline, shareQuery, SHARED_REPORT_UTM, summaryQuery, withUtm } from "@/lib/check/share";
import { localePath, type Locale } from "@/lib/i18n";
import { SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/cn";

/**
 * Onde cai quem clica num resultado compartilhado no X ou no LinkedIn. Mostra só o placar (contagens por
 * tipo; o domínio do app só se quem compartilhou escolheu incluir) e leva para o teste grátis e para a
 * lista de espera, com as UTMs de shared_report. Nada é lido do banco: tudo vem da própria URL, então
 * não há como chegar ao relatório privado de ninguém a partir daqui.
 *
 * Aceita os dois formatos de link: o novo (?c=&r=&pg=&o=, por tipo) e o antigo (?f=&w=&p=).
 * O ?ref= de quem compartilhou é guardado pelo funil (WaitlistTracker): uma inscrição depois conta como indicação.
 */

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const COPY = {
  en: {
    eyebrow: "A shared app check",
    someone: "Someone checked their app's public pages:",
    someoneHost: (host: string) => `Someone checked the public pages of ${host}:`,
    tiles: ["Crashes", "Failed requests", "Broken pages"],
    old: ["Failures", "Warnings", "Passed"],
    scope: "A free /check opens public pages once, in a real browser. It doesn't log in or submit forms.",
    now: "Now check yours. Paste your app's URL: we open it in a real browser, visit your key pages and show JavaScript crashes, failed requests and broken pages, in about a minute.",
    test: "Check my app",
    join: "Join the waitlist",
    how: "How the check works",
  },
  pt: {
    eyebrow: "Um teste compartilhado",
    someone: "Alguém testou as páginas públicas do próprio app:",
    someoneHost: (host: string) => `Alguém testou as páginas públicas de ${host}:`,
    tiles: ["Crashes", "Requisições com falha", "Páginas quebradas"],
    old: ["Falhas", "Avisos", "Ok"],
    scope: "O /check grátis abre as páginas públicas uma vez, num navegador de verdade. Não faz login nem envia formulários.",
    now: "Agora teste o seu. Cole a URL do seu app: abrimos num navegador de verdade, visitamos as páginas importantes e mostramos crashes, requisições com falha e páginas quebradas, em cerca de um minuto.",
    test: "Testar meu app",
    join: "Entrar na waitlist",
    how: "Como o teste funciona",
  },
} satisfies Record<Locale, unknown>;

function localeOf(params: Record<string, string | string[] | undefined>): Locale {
  const value = Array.isArray(params.l) ? params.l[0] : params.l;
  return value === "pt" ? "pt" : "en";
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const params = await searchParams;
  const summary = parsePublicSummary(params);
  const counts = parseShareCounts(params);
  const headline = summary ? shareHeadlineFor(summary, "en") : shareHeadline(counts);
  const title = `${headline}: an app's public pages, checked in a real browser`;
  const description = "Someone checked their app's public pages with Publishub's free /check. Paste your app's URL and see what your visitors see, in about a minute. Free.";
  const image = `/check/shared/og?${summary ? summaryQuery(summary) : shareQuery(counts)}`;
  return {
    title: { absolute: `${title} · ${SITE_NAME}` },
    description,
    alternates: { canonical: "/check" },
    // uma variação de /check por placar: nada para buscadores indexarem nem seguirem
    robots: { index: false, follow: false },
    openGraph: { siteName: SITE_NAME, type: "website", title, description, images: [{ url: image, width: 1200, height: 630, alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

function Tiles({ items }: { items: [string, number, boolean][] }) {
  return (
    <dl className="mx-auto mt-8 grid max-w-lg grid-cols-3 gap-2 sm:gap-3">
      {items.map(([label, value, bad]) => (
        <div key={label} className="rounded-lg border border-line bg-card p-2 sm:p-3">
          <dt className="text-xs text-muted sm:text-sm">{label}</dt>
          <dd className={cn("font-pixel text-2xl", bad ? "text-critical" : "text-success")}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function SharedCheckPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const locale = localeOf(params);
  const t = COPY[locale];
  const summary: PublicSummary | null = parsePublicSummary(params);
  const counts = parseShareCounts(params);
  const appHost = summary ? parseSharedHost(params) : null;

  const problems = summary ? summary.crash + summary.request + summary.page : counts.fail;
  const tone = problems ? "text-critical" : (summary ? summary.other : counts.warn) ? "text-warning" : "text-success";
  const headline = summary ? shareHeadlineFor(summary, locale) : shareHeadline(counts);

  return (
    <>
      <WaitlistTracker />
      <section lang={locale === "pt" ? "pt-BR" : undefined} aria-labelledby="shared-heading" className="relative overflow-hidden">
        <div aria-hidden="true" className="landing-grid" />
        <div aria-hidden="true" className="landing-beam" />
        <div className="container-page relative pb-16 pt-16 text-center sm:pb-20 sm:pt-24">
          <p className="eyebrow justify-center">{t.eyebrow}</p>
          <h1 id="shared-heading" className="mx-auto mt-4 max-w-3xl break-words text-3xl font-bold leading-[1.1] sm:text-5xl">
            {appHost ? t.someoneHost(appHost) : t.someone} <span className={tone}>{headline.toLowerCase()}</span>
          </h1>
          {summary ? (
            <Tiles
              items={[
                [t.tiles[0], summary.crash, summary.crash > 0],
                [t.tiles[1], summary.request, summary.request > 0],
                [t.tiles[2], summary.page, summary.page > 0],
              ]}
            />
          ) : (
            <Tiles
              items={[
                [t.old[0], counts.fail, counts.fail > 0],
                [t.old[1], counts.warn, false],
                [t.old[2], counts.pass, false],
              ]}
            />
          )}
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted">{t.scope}</p>
          <p className="mx-auto mt-8 max-w-2xl text-lg text-muted">{t.now}</p>
          <div className="mx-auto mt-8 max-w-xl">
            <CheckForm source="check_shared" locale={locale} />
          </div>
          <div className="mx-auto mt-6 flex max-w-xl flex-col justify-center gap-2 sm:flex-row">
            <a href={withUtm(localePath(locale, "/check"), SHARED_REPORT_UTM, "test_cta")} data-cta="shared_report_test" className={buttonClasses("secondary", "md")}>
              {t.test}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </a>
            <a href={withUtm(localePath(locale, "/#early-access"), SHARED_REPORT_UTM, "waitlist_cta")} data-cta="shared_report_waitlist" className={buttonClasses("secondary", "md")}>
              {t.join}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </a>
          </div>
          <CheckStatsLine className="mx-auto mt-4 max-w-xl" locale={locale} />
          <p className="mt-4 text-sm text-muted">
            <Link href={localePath(locale, "/check")}>{t.how}</Link>
          </p>
        </div>
      </section>
    </>
  );
}
