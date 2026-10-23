import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, ClipboardCheck, FlaskConical, LineChart, MessageSquareQuote } from "lucide-react";
import { Emphasis } from "@/components/landing/Emphasis";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { localePath } from "@/i18n/paths";
import { jsonLd, pageMetadata, toolsIndexLd } from "@/lib/seo";

export function generateMetadata() {
  return pageMetadata("tools", "/tools");
}

const TOOLS = [
  { key: "audit", path: "/tools/video-audit", icon: ClipboardCheck },
  { key: "lab", path: "/tools/hook-lab", icon: FlaskConical },
  { key: "curve", path: "/tools/retention-curve", icon: LineChart },
  { key: "hook", path: "/tools/hook-score", icon: MessageSquareQuote },
] as const;

/** As ferramentas grátis, sem conta: cada uma resolve uma dúvida e termina no teste do vídeo inteiro. */
export default async function ToolsPage() {
  const t = await getTranslations("Tools");
  const locale = await getLocale();
  const structured = await toolsIndexLd();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <SiteHeader />
      <main className="container-page pb-24 pt-12 lg:pt-16">
        <p className="chip">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-caramel" />
          {t("chip")}
        </p>
        <h1 className="t-h2 mt-5 max-w-[20ch] text-balance">
          <Emphasis text={t("title")} />
        </h1>
        <p className="mt-4 max-w-[56ch] text-[15.5px] leading-relaxed text-ink-muted">{t("lead")}</p>

        <ul className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map(({ key, path, icon: Icon }) => (
            <li key={key}>
              <Link href={localePath(locale, path)} className="group flex h-full flex-col rounded-[28px] border border-line bg-paper-raised p-7 hover:no-underline hover:border-[rgba(var(--accent-rgb),0.45)] sm:p-8">
                <Icon size={26} strokeWidth={1.5} className="text-accent" aria-hidden="true" />
                <h2 className="mt-5 font-display text-[24px] font-medium tracking-[-0.01em] text-ink">{t(`${key}.name`)}</h2>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-muted">{t(`${key}.summary`)}</p>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-[14px] font-semibold text-accent">
                  {t("open")}
                  <ArrowRight size={15} strokeWidth={2} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </>
  );
}
