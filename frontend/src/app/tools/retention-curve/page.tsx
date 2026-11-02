import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { CurveTool } from "@/components/tools/CurveTool";
import { ShareTool } from "@/components/tools/ShareTool";
import { ToolPageExtras, toolFaq } from "@/components/tools/ToolPageExtras";
import { localePath } from "@/i18n/paths";
import { faqLd, jsonLd, pageMetadata, toolLd } from "@/lib/seo";

export function generateMetadata() {
  return pageMetadata("toolCurve", "/tools/retention-curve");
}

/** Ferramenta grátis, sem conta (ver components/tools/CurveTool). */
export default async function Page() {
  const t = await getTranslations("Tools.curve");
  const tTools = await getTranslations("Tools");
  const locale = await getLocale();
  const steps = t.raw("steps") as string[];
  const faq = await toolFaq("curve");
  // o aplicativo, a trilha e as perguntas que estão na tela
  const structured = [...(await toolLd("toolCurve", "/tools/retention-curve", t("name"))), faqLd(faq)];
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
          <ShareTool tool="retention_curve" className="mt-3" />
          <div className="mt-6">
            <CurveTool />
          </div>
          <section className="mt-10 border-t border-line pt-6">
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

          <ToolPageExtras tool="curve" faq={faq} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
