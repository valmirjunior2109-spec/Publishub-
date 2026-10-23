import Link from "next/link";
import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { HookLab } from "@/components/tools/HookLab";
import { ShareTool } from "@/components/tools/ShareTool";
import { ToolPageExtras, toolFaq } from "@/components/tools/ToolPageExtras";
import { localePath } from "@/i18n/paths";
import { faqLd, jsonLd, pageMetadata, toolLd } from "@/lib/seo";

export function generateMetadata() {
  return pageMetadata("toolLab", "/tools/hook-lab");
}

/** Hook Lab: cinco aberturas novas a partir da abertura do vídeo (ver components/tools/HookLab). */
export default async function Page() {
  const t = await getTranslations("Tools.lab");
  const tTools = await getTranslations("Tools");
  const locale = await getLocale();
  const steps = t.raw("steps") as string[];
  const faq = await toolFaq("lab");
  const structured = [...(await toolLd("toolLab", "/tools/hook-lab", t("name"))), faqLd(faq)];
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <SiteHeader />
      <main className="container-page pb-12 pt-6 lg:pt-8">
        <div className="mx-auto max-w-[760px]">
          <Link href={localePath(locale, "/tools")} className="text-[13px] font-medium text-ink-muted hover:text-ink">
            ← {tTools("back")}
          </Link>
          <h1 className="t-h2 mt-4 text-balance">{t("title")}</h1>
          <p className="mt-4 max-w-[58ch] text-[15.5px] leading-relaxed text-ink-muted">{t("lead")}</p>
          <ShareTool tool="hook_lab" className="mt-3" />
          <div className="mt-6">
            {/* useSearchParams (?analysis, ?line) precisa de um Suspense em volta */}
            <Suspense fallback={null}>
              <HookLab />
            </Suspense>
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

          <ToolPageExtras tool="lab" faq={faq} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
