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
}

/**
 * O plano: um só, o Vitalício Fundador. O card mostra o preço, o que vem nele e
 * quantas vagas restam (contadas no backend). Esgotou, o botão vira "Vagas esgotadas".
 *
 * Cada linha da lista corresponde a algo que o backend faz hoje.
 */
export async function PricingCards({ className, heading = true }: PricingCardsProps) {
  const t = await getTranslations("Pricing");
  const itens = t.raw("plan.items") as string[];

  return (
    <div className={className}>
      {heading && (
        <Reveal>
          <h2 className="font-display text-[30px] font-medium leading-tight tracking-tight sm:text-[38px]">{t("title")}</h2>
          <p className="mt-3 max-w-[60ch] text-[15.5px] leading-relaxed text-ink-muted">{t("lead")}</p>
        </Reveal>
      )}

      <Reveal
        delay={120}
        className={cn("mt-8 flex max-w-[620px] flex-col rounded-md border border-accent bg-paper-raised p-6 shadow-[0_0_0_3px_rgba(var(--accent-rgb),0.1)] sm:p-8")}
      >
        <p className="t-label tracking-[0.08em]">{t("planName")}</p>
        <p className="mt-3 font-display text-[52px] font-bold leading-none tracking-[-0.03em] sm:text-[60px]">{OFFER.display}</p>
        <p className="mt-2 text-[13px] text-ink-muted">{t("terms")}</p>
        <FounderSpotsCounter className="mt-5" />
        <p className="mt-5 max-w-[48ch] text-[14.5px] leading-relaxed text-ink-muted">{t("plan.lead")}</p>

        <ul className="mt-6 flex flex-col gap-2.5">
          {itens.map((item) => (
            <li key={item} className="flex gap-2.5 text-[14.5px] leading-snug">
              <Check size={16} strokeWidth={2} aria-hidden="true" className="mt-[3px] shrink-0 text-accent" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <CheckoutButton where="pricing" className={buttonClasses("primary", "md", "mt-7 min-h-12 w-full px-6 text-[15px]")}>
          {t("plan.cta")}
        </CheckoutButton>
      </Reveal>

      <p className="mt-4 max-w-[620px] text-[12.5px] text-ink-muted">{t("note")}</p>
    </div>
  );
}
