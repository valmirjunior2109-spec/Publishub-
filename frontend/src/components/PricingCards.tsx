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
        <Reveal className={cn(centered && "mx-auto max-w-[680px] text-center")}>
          <p className="eyebrow">{t("planName")}</p>
          <h2 className="mt-4 font-serif text-[40px] font-normal leading-[1.02] tracking-[-0.015em] text-balance sm:text-[56px]">{t("title")}</h2>
          <p className={cn("mt-5 max-w-[60ch] text-[16.5px] leading-relaxed text-ink-muted", centered && "mx-auto")}>{t("lead")}</p>
        </Reveal>
      )}

      {/* o plano como um caderno: a capa com o preço, a página com o que vem nele */}
      <Reveal delay={120} className={cn("relative mt-12 max-w-[600px] overflow-hidden rounded-[28px] border border-line bg-paper-raised shadow-lift", centered && "mx-auto")}>
        <div className="relative bg-[#c9824a] px-7 pb-8 pt-7 text-[#1e1b18] sm:px-9">
          <span aria-hidden="true" className="absolute inset-y-0 right-10 w-5 bg-[#1e1b18]" />
          <p className="relative font-mono text-[12px] font-medium uppercase tracking-[0.12em]">{t("planName")}</p>
          <p className="relative mt-4 font-serif text-[76px] leading-none tracking-[-0.01em] sm:text-[92px]">{OFFER.display}</p>
          <p className="relative mt-3 max-w-[40ch] text-[13.5px] leading-snug">{t("terms")}</p>
        </div>
        <span aria-hidden="true" className="block h-2.5 bg-[#fbf3e6]" />

        <div className="flex flex-col p-7 sm:p-9">
          <FounderSpotsCounter />
          <p className="mt-5 max-w-[48ch] text-[15px] leading-relaxed text-ink-muted">{t("plan.lead")}</p>

          <ul className="mt-6 border-b border-line">
            {itens.map((item) => (
              <li key={item} className="flex gap-3 border-t border-line py-3 text-[14.5px] leading-snug">
                <Check size={16} strokeWidth={2.25} aria-hidden="true" className="mt-[2px] shrink-0 text-accent" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <CheckoutButton where="pricing" className={buttonClasses("primary", "md", "mt-7 min-h-12 w-full px-6 text-[15px]")}>
            {t("plan.cta")}
          </CheckoutButton>
        </div>
      </Reveal>

      <p className={cn("mt-4 max-w-[600px] text-[12.5px] leading-relaxed text-ink-muted", centered && "mx-auto text-center")}>{t("note")}</p>
    </div>
  );
}
