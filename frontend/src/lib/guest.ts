"use client";

/**
 * O token da sessão de convidado — quem está testando a previsão cega antes de
 * criar conta. Fica no localStorage do navegador; no banco existe só o hash dele.
 *
 * Só armazenamento aqui: quem abre a sessão é a página, com `apiFetch`. Assim o
 * `lib/api.ts` pode ler o token sem importar ninguém de volta.
 */

const KEY = "publishub.guest";

/** Navegador em modo privado (ou com site data bloqueado) faz o localStorage lançar. */
function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readGuestToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return storage()?.getItem(KEY) || null;
  } catch {
    return null;
  }
}

export function saveGuestToken(token: string): void {
  try {
    storage()?.setItem(KEY, token);
  } catch {
    // sem localStorage o teste ainda funciona nesta aba; só não sobrevive ao recarregar
  }
}

export function clearGuestToken(): void {
  try {
    storage()?.removeItem(KEY);
  } catch {
    // nada a fazer: o token some com a aba
  }
}
