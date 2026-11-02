"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { capture } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { track } from "@/lib/events";
import { useSession } from "@/lib/session";
import { toolOrigin } from "@/lib/toolAnalytics";
import { checkoutUrl, type PaidPlan } from "@/lib/pricing";
import { useFounderSpots } from "@/lib/useFounderSpots";

/**
 * O botão que leva ao Stripe, sempre de um plano dito explicitamente (nunca um
 * padrão: o link errado cobraria o plano errado). Com sessão, o checkout já vai
 * com o e-mail da conta e o id do usuário; ao voltar em /success o acesso libera na hora.
 *
 * É o único botão de compra do site. As vagas do Founder Lifetime só valem para
 * ele: quando acabam, só o botão do Founder vira "Vagas esgotadas".
 */
export function CheckoutButton({ plan, className, children, where, analysisId }: { plan: PaidPlan; className?: string; children: ReactNode; where?: string; analysisId?: string | null }) {
  const { session } = useSession();
  const spots = useFounderSpots();
  const t = useTranslations("Pricing.spots");
  const locale = useLocale();

  if (plan.id === "founder" && spots?.sold_out) {
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
      href={checkoutUrl(plan, { email: session?.user.email, userId: session?.user.id, analysisId })}
      className={className}
      data-plan={plan.id}
      onClick={() => {
        // o mesmo clique é as duas coisas: a decisão de comprar e a ida ao Stripe
        // from_tool: a ferramenta grátis de onde a pessoa saiu, quando ela veio de uma
        const props = { where: where ?? "unknown", plan: plan.name, billing: plan.billing, from_tool: toolOrigin() };
        track("upgrade_clicked", analysisId ?? null, props);
        track("payment_started", analysisId ?? null, props);
        capture("checkout_clicked", analysisId ?? null, locale, props);
      }}
    >
      {children}
    </a>
  );
}
