"use client";

import type { ReactNode } from "react";
import { track } from "@/lib/events";
import { useSession } from "@/lib/session";
import { checkoutUrl, OFFER, type Offer } from "@/lib/pricing";

/**
 * O botão que leva ao Stripe. Com sessão, o checkout já vai com o e-mail da conta
 * e o id do usuário; ao voltar em /obrigado o acesso libera na hora.
 */
export function CheckoutButton({ className, children, where, analysisId, offer = OFFER }: { className?: string; children: ReactNode; where?: string; analysisId?: string | null; offer?: Offer }) {
  const { session } = useSession();
  return (
    // payment_started é o último passo nosso: daqui em diante quem manda é o Stripe,
    // e quem confirma o pagamento é o webhook, nunca esta tela
    <a
      href={checkoutUrl({ email: session?.user.email, userId: session?.user.id }, offer)}
      className={className}
      onClick={() => {
        // o mesmo clique é as duas coisas: a decisão de comprar e a ida ao Stripe
        track("upgrade_clicked", analysisId ?? null, { where: where ?? "unknown", plan: offer.name });
        track("payment_started", analysisId ?? null, { where: where ?? "unknown", plan: offer.name });
      }}
    >
      {children}
    </a>
  );
}
