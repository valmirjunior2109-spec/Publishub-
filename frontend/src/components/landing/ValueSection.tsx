import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import { SectionHeader } from "@/components/landing/Section";
import { Reveal } from "@/components/Reveal";
import { cn } from "@/lib/cn";

/**
 * Por que ajuda: quatro ganhos concretos, cada um ligado a algo que o produto faz
 * (o segundo e a frase, o motivo, a análise antes de postar, os cortes só com OK),
 * e embaixo a divisão de papéis: a publishub aponta, quem fez o vídeo decide.
 */
export async function ValueSection({ index, label }: { index: string; label: string }) {
  const t = await getTranslations("Landing.value");
  const w = await getTranslations("Landing.withYou");
  const items = t.raw("items") as { title: string; text: string }[];
  const aiItems = w.raw("aiItems") as string[];
  const youItems = w.raw("youItems") as string[];

  return (
    <>
      <SectionHeader index={index} label={label} title={t("title")} lead={t("lead")} />
      <ol className="mt-12 grid border-t border-line md:grid-cols-2 lg:mt-16">
        {items.map((item, n) => (
          <Reveal
            as="li"
            key={item.title}
            delay={(n % 2) * 60}
            className={cn("grid grid-cols-[36px_minmax(0,1fr)] gap-x-4 border-b border-line py-7 sm:py-9", n % 2 === 1 && "md:border-l md:pl-8", n % 2 === 0 && "md:pr-8")}
          >
            <span className="pt-1.5 font-mono text-[12px] font-medium text-caramel-ink">{String(n + 1).padStart(2, "0")}</span>
            <div>
              <h3 className="t-h3 max-w-[26ch]">{item.title}</h3>
              <p className="mt-2.5 max-w-[46ch] text-[15.5px] leading-relaxed text-ink-muted">{item.text}</p>
            </div>
          </Reveal>
        ))}
      </ol>

      {/* quem faz o quê: a frase do hero ("keep your creative control") em forma de tabela */}
      <div className="mt-20 grid gap-10 lg:mt-28 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center lg:gap-16">
        <Reveal>
          <h3 className="t-h2 max-w-[14ch]">
            {w("line1Start")}
            <span className="text-accent">{w("line1Word")}</span>
            {w("line1End")}
            <span className="block text-ink-muted">{w("line2")}</span>
          </h3>
          <p className="mt-5 max-w-[46ch] text-[16px] leading-relaxed text-ink-muted">{w("lead")}</p>
        </Reveal>
        <Reveal delay={80} className="overflow-hidden rounded-2xl border border-line bg-paper-raised">
          <table className="w-full table-fixed border-collapse text-left">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="px-4 py-3.5 text-[13.5px] font-semibold sm:px-7 sm:text-[14px]">
                  <span className="inline-flex items-center gap-2">
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
                    {w("aiLabel")}
                  </span>
                </th>
                <th scope="col" className="border-l border-line px-4 py-3.5 text-[13.5px] font-semibold sm:px-7 sm:text-[14px]">
                  <span className="inline-flex items-center gap-2">
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-caramel" />
                    {w("youLabel")}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {aiItems.map((item, n) => (
                <tr key={item} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-3.5 align-top text-[14.5px] text-ink-muted sm:px-7 sm:text-[16px]">{item}</td>
                  <td className="border-l border-line px-4 py-3.5 align-top text-[14.5px] font-medium sm:px-7 sm:text-[16px]">{youItems[n]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="flex items-center gap-2 border-t border-line bg-surface px-4 py-3.5 text-[14px] font-medium sm:px-7">
            <Check size={15} strokeWidth={2.5} className="shrink-0 text-accent" aria-hidden="true" />
            {w("note")}
          </p>
        </Reveal>
      </div>
    </>
  );
}
