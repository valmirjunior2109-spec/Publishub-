import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { CurveTool } from "@/components/tools/CurveTool";
import { localePath } from "@/i18n/paths";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata() {
  return pageMetadata("toolCurve", "/tools/retention-curve");
}

/** Ferramenta grátis, sem conta (ver components/tools/CurveTool). */
export default async function Page() {
  const t = await getTranslations("Tools.curve");
  const tTools = await getTranslations("Tools");
  const locale = await getLocale();
  const steps = t.raw("steps") as string[];
  return (
    <>
      <SiteHeader />
      <main className="container-page pb-24 pt-12 lg:pt-16">
        <div className="mx-auto max-w-[720px]">
          <Link href={localePath(locale, "/tools")} className="text-[13px] font-medium text-ink-muted hover:text-ink">
            ← {tTools("back")}
          </Link>
          <h1 className="t-h2 mt-4 text-balance">{t("title")}</h1>
          <p className="mt-4 max-w-[58ch] text-[15.5px] leading-relaxed text-ink-muted">{t("lead")}</p>
          <div className="mt-8">
            <CurveTool />
          </div>
          <section className="mt-14 border-t border-line pt-8">
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
