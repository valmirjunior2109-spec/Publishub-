import { getTranslations } from "next-intl/server";
import { CheckoutButton } from "@/components/CheckoutButton";
import { FounderSpotsCounter } from "@/components/FounderSpotsCounter";
import { HandNote, PenCheck } from "@/components/hand/Pen";
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
  /** A nota à mão ao lado do preço ("uma vez só →"), na landing. */
  onceNote?: string;
}

/**
 * O plano: um só, o Vitalício Fundador. O card mostra o preço, o que vem nele e
 * quantas vagas restam (contadas no backend). Esgotou, o botão vira "Vagas esgotadas".
 *
 * Cada linha da lista corresponde a algo que o backend faz hoje.
 */
export async function PricingCards({ className, heading = true, centered = false, onceNote }: PricingCardsProps) {
  const t = await getTranslations("Pricing");
  const itens = t.raw("plan.items") as string[];

  return (
    <div className={className}>
      {heading && (
        <Reveal className={cn(centered && "mx-auto max-w-[760px] text-center")}>
          <p className="eyebrow">{t("planName")}</p>
          <h2 className="mt-3 font-display text-[40px] font-extrabold leading-[1.02] tracking-[-0.045em] text-balance sm:text-[56px]">{t("title")}</h2>
          <p className={cn("mt-5 max-w-[60ch] text-[17px] leading-relaxed text-ink-muted sm:text-[19px]", centered && "mx-auto")}>{t("lead")}</p>
        </Reveal>
      )}

      <Reveal delay={120} className={cn("relative mt-14 max-w-[560px]", centered && "mx-auto")}>
        <div className="relative flex flex-col rounded-[28px] border-2 border-ink bg-paper-raised p-8 shadow-[8px_8px_0_var(--ink)] sm:p-10">
          <p className="inline-flex w-fit items-center rounded-full border-2 border-ink bg-marker px-3.5 py-1 text-[13.5px] font-bold text-[#1e1b18]">{t("planName")}</p>
          <div className="mt-6 flex flex-wrap items-end gap-x-4">
            <p className="font-display text-[72px] font-extrabold leading-none tracking-[-0.055em] sm:text-[84px]">{OFFER.display}</p>
            {onceNote && <HandNote className="mb-3 text-[28px]">{onceNote}</HandNote>}
          </div>
          <p className="mt-2 text-[14.5px] text-ink-muted">{t("terms")}</p>
          <FounderSpotsCounter className="mt-6" />
          <p className="mt-6 max-w-[48ch] text-[15.5px] leading-relaxed text-ink-muted">{t("plan.lead")}</p>

          <ul className="mt-6 flex flex-col gap-3">
            {itens.map((item) => (
              <li key={item} className="flex gap-3 text-[15.5px] leading-snug">
                <PenCheck className="h-6 w-6" />
                <span className="pt-0.5">{item}</span>
              </li>
            ))}
          </ul>

          <CheckoutButton where="pricing" className={buttonClasses("primary", "md", "mt-8 min-h-14 w-full px-6 text-[16.5px]")}>
            {t("plan.cta")}
          </CheckoutButton>
        </div>
      </Reveal>

      <p className={cn("mt-6 max-w-[560px] text-[13px] leading-relaxed text-ink-muted", centered && "mx-auto text-center")}>{t("note")}</p>
    </div>
  );
}
