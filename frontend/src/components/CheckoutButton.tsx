"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { capture } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { track } from "@/lib/events";
import { useSession } from "@/lib/session";
import { checkoutUrl, OFFER, type Offer } from "@/lib/pricing";
import { useFounderSpots } from "@/lib/useFounderSpots";

/**
 * O botão que leva ao Stripe. Com sessão, o checkout já vai com o e-mail da conta
 * e o id do usuário; ao voltar em /obrigado o acesso libera na hora.
 *
 * É o único botão de compra do site: quando as vagas de fundador acabam, é aqui
 * que ele some e dá lugar a "Vagas esgotadas" — no preço, no paywall e nas reescritas.
 */
export function CheckoutButton({ className, children, where, analysisId, offer = OFFER }: { className?: string; children: ReactNode; where?: string; analysisId?: string | null; offer?: Offer }) {
  const { session } = useSession();
  const spots = useFounderSpots();
  const t = useTranslations("Pricing.spots");
  const locale = useLocale();

  if (spots?.sold_out) {
    return (
      <span role="status" className={cn(className, "pointer-events-none opacity-60")}>
        {t("soldOut")}
      </span>
    );
  }

  return (
    // payment_started é o último passo nosso: daqui em diante quem manda é o Stripe,
    // e quem confirma o pagamento é o webhook, nunca esta tela
    <a
      href={checkoutUrl({ email: session?.user.email, userId: session?.user.id, analysisId }, offer)}
      className={className}
      onClick={() => {
        // o mesmo clique é as duas coisas: a decisão de comprar e a ida ao Stripe
        track("upgrade_clicked", analysisId ?? null, { where: where ?? "unknown", plan: offer.name });
        track("payment_started", analysisId ?? null, { where: where ?? "unknown", plan: offer.name });
        capture("checkout_clicked", analysisId ?? null, locale, { where: where ?? "unknown", plan: offer.name });
      }}
    >
      {children}
    </a>
  );
}
