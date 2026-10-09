import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import { CheckoutButton } from "@/components/CheckoutButton";
import { FounderSpotsCounter } from "@/components/FounderSpotsCounter";
import { Reveal } from "@/components/Reveal";
import { TrackedLink } from "@/components/TrackedLink";
import { TrackInView } from "@/components/TrackInView";
import { buttonClasses } from "@/components/ui/Button";
import { localePath } from "@/i18n/paths";
import { cn } from "@/lib/cn";
import { OFFER } from "@/lib/pricing";

interface PricingCardsProps {
  className?: string;
  /** false em telas que já têm o próprio título (a /planos): dois cabeçalhos seguidos dizem a mesma coisa duas vezes. */
  heading?: boolean;
  /** O rótulo acima do título (a landing numera as seções). Sem ele, o nome do plano. */
  eyebrow?: ReactNode;
  /** Onde o preço aparece, para o `pricing_viewed` e os cliques: "landing" ou "plans". */
  where: string;
}

/**
 * Os dois jeitos de usar o Publishub, lado a lado: o grátis (o teste sem conta e
 * as primeiras análises completas da conta) e o Vitalício Fundador, pagamento
 * único, com as vagas que restam (contadas no backend). Esgotou, o botão vira
 * "Vagas esgotadas".
 *
 * Cada linha das duas listas corresponde a algo que o backend faz hoje. O grátis
 * não diz quantas análises saem completas: o número é do backend (FREE_FULL_ANALYSES).
 */
export async function PricingCards({ className, heading = true, eyebrow, where }: PricingCardsProps) {
  const t = await getTranslations("Pricing");
  const locale = await getLocale();
  const itens = t.raw("plan.items") as string[];
  const free = t.raw("free.items") as string[];

  return (
    <div className={className}>
      <TrackInView event="pricing_viewed" where={where} />
      {heading && (
        <Reveal className="max-w-[720px]">
          {eyebrow ?? <p className="eyebrow">{t("planName")}</p>}
          <h2 className="t-h2 mt-4 text-balance">{t("title")}</h2>
          <p className="t-lead mt-5 max-w-[58ch]">{t("lead")}</p>
        </Reveal>
      )}

      <div className={cn("grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]", heading && "mt-12 lg:mt-16")}>
        {/* grátis: começa aqui, sem cartão */}
        <Reveal delay={80} className="flex flex-col rounded-2xl border border-line bg-paper p-7 sm:p-10">
          <p className="text-[14px] font-medium text-ink">{t("free.name")}</p>
          <p className="mt-6 font-display text-[48px] font-semibold leading-none tracking-[-0.05em] tabular-nums sm:text-[56px]">{t("free.price")}</p>
          <p className="mt-3 text-[14.5px] text-ink-muted">{t("free.terms")}</p>
          <p className="mt-6 max-w-[44ch] text-[15px] leading-relaxed text-ink-muted">{t("free.lead")}</p>
          <ul className="mt-6 flex flex-col">
            {free.map((item) => (
              <li key={item} className="flex gap-3 border-t border-line py-3.5 text-[15px] leading-snug first:border-t-0 first:pt-0">
                <Check size={17} strokeWidth={2.25} className="mt-px shrink-0 text-ink-muted" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-8">
            <TrackedLink where={`${where}_pricing_free`} href={localePath(locale, "/experimentar")} className={buttonClasses("secondary", "md", "w-full")}>
              {t("free.cta")}
            </TrackedLink>
          </div>
        </Reveal>

        {/* o Vitalício Fundador: o preço, as vagas, o botão e o que vem nele */}
        <Reveal delay={140} className="flex flex-col rounded-2xl border border-accent bg-paper-raised p-7 shadow-[0_0_0_1px_var(--accent)] sm:p-10">
          <p className="inline-flex w-fit items-center gap-2 text-[14px] font-medium text-ink">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
            {t("planName")}
          </p>
          <p className="mt-6 font-display text-[64px] font-semibold leading-none tracking-[-0.05em] tabular-nums sm:text-[76px]">{OFFER.display}</p>
          <p className="mt-3 text-[14.5px] text-ink-muted">{t("terms")}</p>
          <FounderSpotsCounter className="mt-6" />
          <p className="mt-6 max-w-[48ch] text-[15px] leading-relaxed text-ink-muted">{t("plan.lead")}</p>
          <ul className="mt-6 flex flex-col">
            {itens.map((item) => (
              <li key={item} className="flex gap-3 border-t border-line py-3.5 text-[15px] leading-snug first:border-t-0 first:pt-0">
                <Check size={17} strokeWidth={2.25} className="mt-px shrink-0 text-accent" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-8">
            <CheckoutButton where="pricing" className={buttonClasses("primary", "md", "w-full")}>
              {t("plan.cta")}
            </CheckoutButton>
          </div>
        </Reveal>
      </div>

      <p className="mt-5 max-w-[640px] text-[13px] leading-relaxed text-ink-muted">{t("note")}</p>
    </div>
  );
}
