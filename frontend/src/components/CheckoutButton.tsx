"use client";

import type { ReactNode } from "react";
import { useSession } from "@/lib/session";
import { checkoutUrl } from "@/lib/pricing";

/**
 * O botão que leva ao Stripe. Com sessão, o checkout já vai com o e-mail da conta
 * e o id do usuário; ao voltar em /obrigado o acesso libera na hora.
 */
export function CheckoutButton({ className, children }: { className?: string; children: ReactNode }) {
  const { session } = useSession();
  return (
    <a href={checkoutUrl({ email: session?.user.email, userId: session?.user.id })} className={className}>
      {children}
    </a>
  );
}
