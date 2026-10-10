import { getTranslations } from "next-intl/server";
import { ArrowRight, Brain, Check } from "lucide-react";
import { AppWindow, SectionHeader } from "@/components/landing/Section";
import { Reveal } from "@/components/Reveal";
import { TrackedLink } from "@/components/TrackedLink";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";

interface MockRow {
  kind: string;
  verdict: string;
  accept: boolean;
}

/**
 * A memória do criador na landing: o que a Publishub aprende com cada pessoa e
 * como isso aparece na análise seguinte. É o que um chat de IA não tem. O
 * quadro da direita é um exemplo rotulado, desenhado como a página /memoria.
 */
export async function MemoryShowcase({ index, label, tryHref }: { index: string; label: string; tryHref: string }) {
  const t = await getTranslations("Landing.memory");
  const tLanding = await getTranslations("Landing");
  const items = t.raw("items") as { title: string; text: string }[];
  const rows = t.raw("mock.rows") as MockRow[];

  return (
    <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-20">
      <div>
        <SectionHeader index={index} label={label} title={t("title")} lead={t("lead")} />
        <ol className="mt-10 border-t border-line">
          {items.map((item, n) => (
            <Reveal as="li" key={item.title} delay={n * 50} className="grid grid-cols-[40px_minmax(0,1fr)] gap-x-4 border-b border-line py-5">
              <span className="pt-1 font-mono text-[12px] text-accent">{String(n + 1).padStart(2, "0")}</span>
              <div>
                <h3 className="text-[18px] font-semibold tracking-[-0.02em]">{item.title}</h3>
                <p className="mt-1.5 max-w-[52ch] text-[15px] leading-relaxed text-ink-muted">{item.text}</p>
              </div>
            </Reveal>
          ))}
        </ol>
        <Reveal delay={120}>
          <p className="mt-6 max-w-[56ch] text-[15px] leading-relaxed text-ink-muted">{t("control")}</p>
          <p className="mt-4 flex max-w-[56ch] items-start gap-2.5 text-[16px] font-semibold leading-snug">
            <Brain size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
            {t("vsChat")}
          </p>
          <TrackedLink where="memory" href={tryHref} className={buttonClasses("primary", "md", "mt-8 h-12 px-6 text-[15.5px]")}>
            {tLanding("hero.cta")}
            <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" />
          </TrackedLink>
        </Reveal>
      </div>

      {/* o que a pessoa vê: a memória e, embaixo, como ela muda a próxima análise */}
      <Reveal delay={80} className="lg:sticky lg:top-28">
        <AppWindow title={t("mock.window")} meta={<Badge>{t("mock.example")}</Badge>} className="bg-paper">
          <div className="flex flex-col gap-6 p-5 sm:p-7">
            <div>
              <p className="t-label">{t("mock.cutsLabel")}</p>
              <ul className="mt-3 divide-y divide-line border-y border-line">
                {rows.map((row) => (
                  <li key={row.kind} className="flex items-center justify-between gap-3 py-3">
                    <span className="text-[15px] font-medium">{row.kind}</span>
                    <Badge tone={row.accept ? "accent" : "ink"}>{row.verdict}</Badge>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="t-label">{t("mock.noteLabel")}</p>
              <p className="mt-3 rounded-lg border border-[rgba(var(--accent-rgb),0.25)] bg-accent-soft px-3.5 py-2.5 text-[14.5px]">{t("mock.note")}</p>
            </div>
            <div className="rounded-xl border border-line bg-paper-raised p-4">
              <p className="t-label">{t("mock.nextLabel")}</p>
              <p className="mt-2 flex items-start gap-2 text-[14.5px] leading-relaxed text-accent">
                <Check size={15} strokeWidth={2.5} className="mt-[3px] shrink-0" aria-hidden="true" />
                {t("mock.next")}
              </p>
            </div>
          </div>
        </AppWindow>
      </Reveal>
    </div>
  );
}
