import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { localePath } from "@/i18n/paths";
import { guidePath, guidesIn } from "@/lib/guides";

export type ToolKey = "audit" | "curve" | "hook" | "lab";

export const TOOL_PATHS: Record<ToolKey, string> = {
  audit: "/tools/video-audit",
  curve: "/tools/retention-curve",
  hook: "/tools/hook-score",
  lab: "/tools/hook-lab",
};

/** Os guias que respondem a dúvida de quem usa cada ferramenta (pelo `topic`, que é igual em todo idioma). */
const GUIDE_TOPICS: Record<ToolKey, string[]> = {
  audit: ["ai-editing", "retention", "short-platforms-retention"],
  curve: ["retention-graph", "short-platforms-retention", "retention"],
  hook: ["hook", "retention"],
  lab: ["hook", "retention"],
};

export type Faq = { q: string; a: string };

/** As perguntas da ferramenta, no idioma da página: as mesmas da tela e do JSON-LD (faqLd). */
export async function toolFaq(tool: ToolKey): Promise<Faq[]> {
  const t = await getTranslations(`Tools.${tool}`);
  return t.raw("faq") as Faq[];
}

/**
 * O fim de cada página de ferramenta: as perguntas frequentes (de verdade, sobre
 * o que a ferramenta faz), as outras ferramentas e os guias do mesmo
 * assunto no idioma da página (só os idiomas que têm guias mostram a lista).
 */
export async function ToolPageExtras({ tool, faq }: { tool: ToolKey; faq: Faq[] }) {
  const t = await getTranslations("Tools");
  const locale = await getLocale();
  const others = (Object.keys(TOOL_PATHS) as ToolKey[]).filter((key) => key !== tool);
  const guides = GUIDE_TOPICS[tool].flatMap((topic) => guidesIn(locale).filter((guide) => guide.topic === topic)).slice(0, 3);

  return (
    <>
      <section aria-labelledby="tool-faq" className="mt-12 border-t border-line pt-8">
        <h2 id="tool-faq" className="eyebrow">
          {t("faqTitle")}
        </h2>
        <div className="mt-4 flex flex-col">
          {faq.map((item) => (
            <details key={item.q} className="group border-b border-line py-1">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-2 text-[15.5px] font-medium [&::-webkit-details-marker]:hidden">
                <h3 className="text-[15.5px] font-medium">{item.q}</h3>
                <span aria-hidden="true" className="shrink-0 text-[20px] leading-none text-ink-muted transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="pb-4 pr-8 text-[14.5px] leading-relaxed text-ink-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section aria-labelledby="tool-related" className="mt-12">
        <h2 id="tool-related" className="eyebrow">
          {t("relatedTitle")}
        </h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {others.map((key) => (
            <li key={key}>
              <Link
                href={localePath(locale, TOOL_PATHS[key])}
                className="group flex h-full flex-col rounded-[22px] border border-line bg-paper-raised p-5 hover:no-underline hover:border-[rgba(var(--accent-rgb),0.45)]"
              >
                <span className="text-[16px] font-semibold text-ink">{t(`${key}.name`)}</span>
                <span className="mt-1.5 text-[14px] leading-relaxed text-ink-muted">{t(`${key}.summary`)}</span>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[13.5px] font-semibold text-accent">
                  {t("open")}
                  <ArrowRight size={14} strokeWidth={2} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {guides.length > 0 && (
        <section aria-labelledby="tool-guides" className="mt-12">
          <h2 id="tool-guides" className="eyebrow">
            {t("guidesTitle")}
          </h2>
          <ul className="mt-4 flex flex-col">
            {guides.map((guide) => (
              <li key={guide.slug} className="border-b border-line">
                <Link href={localePath(locale, guidePath(guide.slug))} className="flex min-h-12 items-center justify-between gap-4 py-3 text-[15px] text-ink hover:no-underline hover:text-accent">
                  <span>{guide.title}</span>
                  <span className="shrink-0 font-mono text-[12px] text-ink-muted">{t("guideMinutes", { minutes: guide.minutes })}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
