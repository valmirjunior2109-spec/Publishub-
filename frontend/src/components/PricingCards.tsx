import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import { CheckoutButton } from "@/components/CheckoutButton";
import { FounderSpotsCounter } from "@/components/FounderSpotsCounter";
import { Reveal } from "@/components/Reveal";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { OFFER } from "@/lib/pricing";

interface PricingCardsProps {
  className?: string;
  /** false em telas que já têm o próprio título (a /planos): dois cabeçalhos seguidos dizem a mesma coisa duas vezes. */
  heading?: boolean;
  /** O rótulo acima do título (a landing numera as seções). Sem ele, o nome do plano. */
  eyebrow?: ReactNode;
}

/**
 * O plano: um só, o Vitalício Fundador. Um painel em duas metades: à esquerda o
 * preço, as vagas que restam (contadas no backend) e o botão; à direita o que
 * vem nele. Esgotou, o botão vira "Vagas esgotadas".
 *
 * Cada linha da lista corresponde a algo que o backend faz hoje.
 */
export async function PricingCards({ className, heading = true, eyebrow }: PricingCardsProps) {
  const t = await getTranslations("Pricing");
  const itens = t.raw("plan.items") as string[];

  return (
    <div className={className}>
      {heading && (
        <Reveal className="max-w-[720px]">
          {eyebrow ?? <p className="eyebrow">{t("planName")}</p>}
          <h2 className="t-h2 mt-4 text-balance">{t("title")}</h2>
          <p className="t-lead mt-5 max-w-[58ch]">{t("lead")}</p>
        </Reveal>
      )}

      <Reveal delay={80} className={cn("grid overflow-hidden rounded-2xl border border-line bg-paper-raised lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]", heading && "mt-12 lg:mt-16")}>
        <div className="flex flex-col p-7 sm:p-10">
          <p className="inline-flex w-fit items-center gap-2 text-[14px] font-medium text-ink">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
            {t("planName")}
          </p>
          <p className="mt-6 font-display text-[64px] font-semibold leading-none tracking-[-0.05em] tabular-nums sm:text-[76px]">{OFFER.display}</p>
          <p className="mt-3 text-[14.5px] text-ink-muted">{t("terms")}</p>
          <FounderSpotsCounter className="mt-8" />
          <div className="mt-auto pt-8">
            <CheckoutButton where="pricing" className={buttonClasses("primary", "md", "w-full")}>
              {t("plan.cta")}
            </CheckoutButton>
          </div>
        </div>
        <div className="border-t border-line bg-surface p-7 sm:p-10 lg:border-l lg:border-t-0">
          <p className="max-w-[48ch] text-[15px] leading-relaxed text-ink-muted">{t("plan.lead")}</p>
          <ul className="mt-6 flex flex-col">
            {itens.map((item) => (
              <li key={item} className="flex gap-3 border-t border-line py-3.5 text-[15px] leading-snug first:border-t-0 first:pt-0">
                <Check size={17} strokeWidth={2.25} className="mt-px shrink-0 text-accent" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>

      <p className="mt-5 max-w-[640px] text-[13px] leading-relaxed text-ink-muted">{t("note")}</p>
    </div>
  );
}
