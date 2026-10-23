import Link from "next/link";
import { FileText } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { AuditUpload } from "@/components/tools/AuditUpload";
import { ShareTool } from "@/components/tools/ShareTool";
import { ToolPageExtras, toolFaq } from "@/components/tools/ToolPageExtras";
import { TrackedLink } from "@/components/TrackedLink";
import { buttonClasses } from "@/components/ui/Button";
import { localePath } from "@/i18n/paths";
import { faqLd, jsonLd, pageMetadata, toolLd } from "@/lib/seo";

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
  const tSample = await getTranslations("AuditSample");
  const locale = await getLocale();
  const checks = t.raw("checks") as string[];
  const steps = t.raw("steps") as string[];
  const faq = await toolFaq("audit");
  // o aplicativo, a trilha e as perguntas que estão na tela
  const structured = [...(await toolLd("toolAudit", "/tools/video-audit", t("name"))), faqLd(faq)];
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <SiteHeader />
      <main className="container-page pb-12 pt-6 lg:pt-8">
        <div className="mx-auto max-w-[720px]">
          <Link href={localePath(locale, "/tools")} className="text-[13px] font-medium text-ink-muted hover:text-ink">
            ← {tTools("back")}
          </Link>
          <h1 className="t-h2 mt-4 text-balance">{t("title")}</h1>
          <p className="mt-4 max-w-[58ch] text-[15.5px] leading-relaxed text-ink-muted">{t("lead")}</p>
          <ShareTool tool="video_audit" className="mt-3" />
          {/* o exemplo, antes do envio: o formato do relatório sem precisar mandar um vídeo */}
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[18px] border border-line bg-paper-raised px-5 py-4">
            <TrackedLink where="audit_sample" href={localePath(locale, "/tools/video-audit/sample")} className={buttonClasses("secondary", "sm")}>
              <FileText size={15} strokeWidth={1.75} aria-hidden="true" />
              {tSample("open")}
            </TrackedLink>
            <span className="text-[13.5px] text-ink-muted">{tSample("openNote")}</span>
          </div>
          <div id="upload" className="mt-5 scroll-mt-24">
            <AuditUpload />
          </div>

          <section className="mt-10 border-t border-line pt-6">
            <h2 className="eyebrow">{t("checksTitle")}</h2>
            <ul className="mt-4 grid gap-x-6 sm:grid-cols-2">
              {checks.map((check) => (
                <li key={check} className="flex gap-3 border-b border-line py-3 text-[15px] leading-relaxed">
                  <span aria-hidden="true" className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{check}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="eyebrow">{t("howTitle")}</h2>
            <ol className="mt-4 flex flex-col gap-3">
              {steps.map((step, index) => (
                <li key={step} className="flex gap-3 text-[15px] leading-relaxed">
                  <span className="font-mono text-[13px] text-accent">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-[13px] leading-relaxed text-ink-muted">{t("privacy")}</p>
          </section>

          <ToolPageExtras tool="audit" faq={faq} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
