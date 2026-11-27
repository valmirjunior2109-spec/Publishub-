import { useSyncExternalStore } from "react";

/**
 * A inscrição desta visita, dividida pelos dois formulários da página: quem entra pelo do topo
 * vê o "You're on the list!" também no de baixo, em vez de um segundo formulário vazio.
 * Só na memória: recarregar a página mostra o formulário de novo (nada de sucesso fingido).
 */

export type JoinedStatus = "joined" | "duplicate";

export interface Joined {
  status: JoinedStatus;
  /** O código do link de indicação desta pessoa. */
  refCode: string | null;
  position: number | null;
  referrals: number;
  /** Permite completar o contexto (fluxo, o que está construindo) depois de entrar. Só na memória. */
  contextToken?: string | null;
}

let current: Joined | null = null;
const listeners = new Set<() => void>();

export function setJoined(joined: Joined): void {
  current = joined;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useJoined(): Joined | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}
