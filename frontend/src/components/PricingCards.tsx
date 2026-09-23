import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import { CheckoutButton } from "@/components/CheckoutButton";
import { Reveal } from "@/components/Reveal";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { CREATOR, PRO, type Offer } from "@/lib/pricing";

interface Plano {
  offer: Offer;
  chave: "creator" | "pro";
  destaque: boolean;
}

const PLANOS: Plano[] = [
  { offer: CREATOR, chave: "creator", destaque: false },
  // o Pro é o que a maioria leva: fica em destaque, mas o Creator continua inteiro ao lado
  { offer: PRO, chave: "pro", destaque: true },
];

interface PricingCardsProps {
  className?: string;
  /** false em telas que já têm o próprio título (a /planos): dois cabeçalhos seguidos dizem a mesma coisa duas vezes. */
  heading?: boolean;
}

/**
 * Os dois planos vitalícios, lado a lado. Um card por plano, o Pro destacado, e
 * embaixo a comparação do que muda de um para o outro.
 *
 * Cada linha da lista corresponde a algo que o backend faz hoje: a profundidade
 * do Pro é real (mais frames do vídeo e um plano maior), não uma etiqueta.
 */
export async function PricingCards({ className, heading = true }: PricingCardsProps) {
  const t = await getTranslations("Pricing");

  return (
    <div className={className}>
      {heading && (
        <Reveal>
          <h2 className="font-display text-[30px] font-medium leading-tight tracking-tight sm:text-[38px]">{t("title")}</h2>
          <p className="mt-3 max-w-[60ch] text-[15.5px] leading-relaxed text-ink-muted">{t("lead")}</p>
        </Reveal>
      )}

      <div className="mt-8 grid items-start gap-5 lg:grid-cols-2 lg:gap-6">
        {PLANOS.map(({ offer, chave, destaque }, index) => {
          const itens = t.raw(`plans.${chave}.items`) as string[];
          return (
            <Reveal
              key={chave}
              delay={index * 120}
              className={cn(
                "flex h-full flex-col rounded-md border bg-paper-raised p-6 sm:p-7",
                destaque ? "border-accent shadow-[0_0_0_3px_rgba(var(--accent-rgb),0.1)]" : "border-line",
              )}
            >
              <div className="flex min-h-[26px] flex-wrap items-center justify-between gap-3">
                <p className="t-label tracking-[0.08em]">{offer.name}</p>
                {destaque && <Badge tone="accent">{t("mostPopular")}</Badge>}
              </div>
              <p className="mt-3 font-display text-[52px] font-bold leading-none tracking-[-0.03em] sm:text-[60px]">{offer.display}</p>
              <p className="mt-2 text-[13px] text-ink-muted">{t("terms")}</p>
              <p className="mt-4 max-w-[44ch] text-[14.5px] leading-relaxed text-ink-muted">{t(`plans.${chave}.lead`)}</p>

              <ul className="mt-6 flex flex-1 flex-col gap-2.5">
                {itens.map((item) => (
                  <li key={item} className="flex gap-2.5 text-[14.5px] leading-snug">
                    <Check size={16} strokeWidth={2} aria-hidden="true" className="mt-[3px] shrink-0 text-accent" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <CheckoutButton
                offer={offer}
                where={`pricing-${chave}`}
                className={buttonClasses(destaque ? "primary" : "secondary", "md", "mt-7 min-h-12 w-full px-6 text-[15px]")}
              >
                {t(`plans.${chave}.cta`)}
              </CheckoutButton>
            </Reveal>
          );
        })}
      </div>

      {/* a comparação: só as linhas em que os dois planos diferem */}
      <Reveal delay={240} className="mt-10 overflow-hidden rounded-md border border-line">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{t("compare.caption")}</caption>
          <thead>
            <tr className="bg-paper-raised">
              <th scope="col" className="w-[46%] px-4 py-3 text-[12px] font-medium uppercase tracking-[0.06em] text-ink-muted sm:px-5">
                {t("compare.caption")}
              </th>
              <th scope="col" className="px-4 py-3 text-[12px] font-medium uppercase tracking-[0.06em] text-ink-muted sm:px-5">
                {CREATOR.name}
              </th>
              <th scope="col" className="px-4 py-3 text-[12px] font-medium uppercase tracking-[0.06em] text-accent sm:px-5">
                {PRO.name}
              </th>
            </tr>
          </thead>
          <tbody>
            {(t.raw("compare.rows") as { label: string; creator: string; pro: string }[]).map((linha) => (
              <tr key={linha.label} className="border-t border-line align-top">
                <th scope="row" className="px-4 py-3 text-[14px] font-normal leading-snug sm:px-5">
                  {linha.label}
                </th>
                <td className="px-4 py-3 text-[14px] leading-snug text-ink-muted sm:px-5">{linha.creator}</td>
                <td className="px-4 py-3 text-[14px] font-medium leading-snug sm:px-5">{linha.pro}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Reveal>

      <p className="mt-4 text-[12.5px] text-ink-muted">{t("note")}</p>
    </div>
  );
}
