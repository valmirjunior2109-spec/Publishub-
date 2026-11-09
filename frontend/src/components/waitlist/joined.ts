import { useSyncExternalStore } from "react";

/**
 * A inscrição desta visita, dividida pelos dois formulários da página: quem entra pelo do topo
 * vê o "You're on the list!" também no de baixo, em vez de um segundo formulário vazio.
 * Só na memória: recarregar a página mostra o formulário de novo (nada de sucesso fingido).
 */

export type JoinedStatus = "joined" | "duplicate";

let current: JoinedStatus | null = null;
const listeners = new Set<() => void>();

export function setJoined(status: JoinedStatus): void {
  current = status;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useJoined(): JoinedStatus | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}
