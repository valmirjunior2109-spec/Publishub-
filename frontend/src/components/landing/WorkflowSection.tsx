import { getTranslations } from "next-intl/server";
import { ArrowRight, Check } from "lucide-react";
import { SectionHeader } from "@/components/landing/Section";
import { Reveal } from "@/components/Reveal";

/**
 * Onde a publishub entra no trabalho de quem edita: o arquivo exportado entra, as
 * notas saem, e o acabamento volta para o editor que a pessoa já usa.
 *
 * Não existe integração com editor nenhum (nem plugin): a compatibilidade é a do
 * arquivo (MP4, MOV ou WEBM, até 50 MB). Os nomes dos editores aparecem só como
 * origem do arquivo, nunca como parceria.
 */
export async function WorkflowSection({ index, label }: { index: string; label: string }) {
  const t = await getTranslations("Landing.workflow");
  const outItems = t.raw("out.items") as string[];
  const head = "flex items-center gap-2.5 font-mono text-[12px] font-medium uppercase tracking-[0.08em]";

  return (
    <>
      <SectionHeader index={index} label={label} title={t("title")} lead={t("lead")} />
      <Reveal delay={80} className="mt-12 grid overflow-hidden rounded-[28px] border border-line lg:mt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* 1 · o arquivo de sempre */}
        <div className="flex flex-col p-6 sm:p-8">
          <p className={`${head} text-ink-muted`}>
            <span className="text-caramel-ink">01</span>
            {t("in.label")}
          </p>
          <h3 className="t-h3 mt-5">{t("in.title")}</h3>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">{t("in.text")}</p>
          <p className="mt-auto border-t border-dashed border-line pt-4 text-[13.5px] leading-relaxed text-ink-muted max-lg:mt-6">{t("in.note")}</p>
        </div>

        {/* 2 · o que a publishub devolve: o centro, em destaque */}
        <div className="relative flex flex-col border-t border-line bg-paper-raised p-6 sm:p-8 lg:border-l lg:border-t-0">
          <ArrowRight aria-hidden="true" size={18} strokeWidth={2} className="absolute -left-[9px] top-9 hidden bg-paper text-ink-muted lg:block" />
          <p className={`${head} text-accent`}>
            <span>02</span>
            {t("out.label")}
          </p>
          <h3 className="t-h3 mt-5">{t("out.title")}</h3>
          <ul className="mt-4 flex flex-col">
            {outItems.map((item) => (
              <li key={item} className="flex gap-3 border-t border-line py-3 text-[15px] leading-snug first:border-t-0 first:pt-1">
                <Check size={16} strokeWidth={2.5} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-auto border-t border-dashed border-line pt-4 text-[13.5px] leading-relaxed text-ink-muted max-lg:mt-4">{t("out.note")}</p>
        </div>

        {/* 3 · o acabamento continua no editor da pessoa */}
        <div className="relative flex flex-col border-t border-line p-6 sm:p-8 lg:border-l lg:border-t-0">
          <ArrowRight aria-hidden="true" size={18} strokeWidth={2} className="absolute -left-[9px] top-9 hidden bg-paper-raised text-ink-muted lg:block" />
          <p className={`${head} text-ink-muted`}>
            <span className="text-caramel-ink">03</span>
            {t("back.label")}
          </p>
          <h3 className="t-h3 mt-5">{t("back.title")}</h3>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">{t("back.text")}</p>
        </div>
      </Reveal>
    </>
  );
}
