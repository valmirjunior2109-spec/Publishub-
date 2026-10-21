import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { AuditUpload } from "@/components/tools/AuditUpload";
import { localePath } from "@/i18n/paths";
import { jsonLd, pageMetadata, toolLd } from "@/lib/seo";

export function generateMetadata() {
  return pageMetadata("toolAudit", "/tools/video-audit");
}

/**
 * A auditoria grátis do vídeo: a mesma análise do teste sem cadastro (/try),
 * apresentada como relatório (components/tools/AuditReport). Sem conta, dentro
 * do limite de vídeos por visitante do backend.
 */
export default async function Page() {
  const t = await getTranslations("Tools.audit");
  const tTools = await getTranslations("Tools");
  const locale = await getLocale();
  const checks = t.raw("checks") as string[];
  const steps = t.raw("steps") as string[];
  const structured = await toolLd("toolAudit", "/tools/video-audit", t("name"));
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <SiteHeader />
      <main className="container-page pb-24 pt-12 lg:pt-16">
        <div className="mx-auto max-w-[720px]">
          <Link href={localePath(locale, "/tools")} className="text-[13px] font-medium text-ink-muted hover:text-ink">
            ← {tTools("back")}
          </Link>
          <h1 className="t-h2 mt-4 text-balance">{t("title")}</h1>
          <p className="mt-4 max-w-[58ch] text-[15.5px] leading-relaxed text-ink-muted">{t("lead")}</p>
          <div className="mt-8">
            <AuditUpload />
          </div>

          <section className="mt-14 border-t border-line pt-8">
            <h2 className="eyebrow">{t("checksTitle")}</h2>
            <ul className="mt-4 grid gap-x-8 sm:grid-cols-2">
              {checks.map((check) => (
                <li key={check} className="flex gap-3 border-b border-line py-3 text-[15px] leading-relaxed">
                  <span aria-hidden="true" className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{check}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-10">
            <h2 className="eyebrow">{t("howTitle")}</h2>
            <ol className="mt-4 flex flex-col gap-3">
              {steps.map((step, index) => (
                <li key={step} className="flex gap-3 text-[15px] leading-relaxed">
                  <span className="font-mono text-[13px] text-accent">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-[13px] leading-relaxed text-ink-muted">{t("privacy")}</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
