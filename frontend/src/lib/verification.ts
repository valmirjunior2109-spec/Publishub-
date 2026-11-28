import type { PriorityFlow } from "@/lib/waitlist";

/**
 * O pedido de verificação manual (o serviço feito à mão pelo fundador com os primeiros clientes): as opções
 * divididas entre o formulário do relatório, a API e o /admin.
 */

/** "Seu app já tem usuários pagantes?" O valor vai para o banco; o rótulo, para a tela. */
export const PAYING_OPTIONS = ["yes", "users_no_revenue", "no_users"] as const;
export type Paying = (typeof PAYING_OPTIONS)[number];

export const PAYING_LABELS: Record<Paying, { en: string; pt: string }> = {
  yes: { en: "Yes, it has paying users", pt: "Sim, tem usuários pagantes" },
  users_no_revenue: { en: "It has users, but they don't pay yet", pt: "Tem usuários, mas ainda não pagam" },
  no_users: { en: "No users yet", pt: "Ainda não tem usuários" },
};

export const VERIFICATION_NOTE_MAX = 1000;

export interface VerificationRequestInput {
  email: string;
  appUrl?: string;
  flow: PriorityFlow;
  paying?: Paying;
  note?: string;
  checkId?: string;
}
