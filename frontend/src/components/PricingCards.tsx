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
        <Reveal className={cn(centered && "mx-auto max-w-[780px] text-center")}>
          <p className="eyebrow">{t("planName")}</p>
          <h2 className="mt-3 font-display text-[40px] font-semibold leading-[1.05] tracking-[-0.045em] text-balance sm:text-[56px]">{t("title")}</h2>
          <p className={cn("mt-5 max-w-[60ch] text-[17px] leading-relaxed text-ink-muted sm:text-[19px]", centered && "mx-auto")}>{t("lead")}</p>
        </Reveal>
      )}

      <Reveal delay={120} className={cn("relative mt-14 max-w-[560px]", centered && "mx-auto")}>
        <div aria-hidden="true" className="bg-glow pointer-events-none absolute -inset-10 opacity-70" />
        <div className="relative flex flex-col rounded-[32px] border border-line bg-paper-raised p-8 shadow-lift sm:p-10">
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-accent-soft px-3.5 py-1.5 text-[13px] font-semibold text-accent">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
            {t("planName")}
          </p>
          <p className="mt-6 font-display text-[64px] font-semibold leading-none tracking-[-0.055em] sm:text-[76px]">{OFFER.display}</p>
          <p className="mt-2 text-[14px] text-ink-muted">{t("terms")}</p>
          <FounderSpotsCounter className="mt-6" />
          <p className="mt-6 max-w-[48ch] text-[15.5px] leading-relaxed text-ink-muted">{t("plan.lead")}</p>

          <ul className="mt-6 flex flex-col gap-3">
            {itens.map((item) => (
              <li key={item} className="flex gap-3 text-[15px] leading-snug">
                <span aria-hidden="true" className="mt-[1px] grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-paper-raised">
                  <Check size={12} strokeWidth={3} />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <CheckoutButton where="pricing" className={buttonClasses("primary", "md", "mt-8 min-h-12 w-full px-6 text-[15.5px]")}>
            {t("plan.cta")}
          </CheckoutButton>
        </div>
      </Reveal>

      <p className={cn("mt-5 max-w-[560px] text-[12.5px] leading-relaxed text-ink-muted", centered && "mx-auto text-center")}>{t("note")}</p>
    </div>
  );
}
