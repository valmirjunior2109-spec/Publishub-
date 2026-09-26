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
  /** Centralizado, como seção de destaque (a landing). */
  centered?: boolean;
}

/**
 * O plano: um só, o Vitalício Fundador. O card mostra o preço, o que vem nele e
 * quantas vagas restam (contadas no backend). Esgotou, o botão vira "Vagas esgotadas".
 *
 * Cada linha da lista corresponde a algo que o backend faz hoje.
 */
export async function PricingCards({ className, heading = true, centered = false }: PricingCardsProps) {
  const t = await getTranslations("Pricing");
  const itens = t.raw("plan.items") as string[];

  return (
    <div className={className}>
      {heading && (
        <Reveal className={cn(centered && "mx-auto max-w-[640px] text-center")}>
          <h2 className="font-display text-[30px] font-bold leading-[1.12] tracking-[-0.022em] text-balance sm:text-[40px]">{t("title")}</h2>
          <p className={cn("mt-4 max-w-[60ch] text-[16.5px] leading-relaxed text-ink-muted", centered && "mx-auto")}>{t("lead")}</p>
        </Reveal>
      )}

      <Reveal
        delay={120}
        className={cn(
          "mt-10 flex max-w-[560px] flex-col rounded-2xl border border-[rgba(var(--accent-rgb),0.35)] bg-paper-raised p-7 shadow-lift sm:p-9",
          centered && "mx-auto",
        )}
      >
        <p className="inline-flex w-fit items-center rounded-full bg-accent-soft px-3 py-1 text-[12.5px] font-semibold text-accent">{t("planName")}</p>
        <p className="mt-5 font-display text-[56px] font-extrabold leading-none tracking-[-0.045em] sm:text-[64px]">{OFFER.display}</p>
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

      <p className={cn("mt-4 max-w-[560px] text-[12.5px] leading-relaxed text-ink-muted", centered && "mx-auto text-center")}>{t("note")}</p>
    </div>
  );
}
