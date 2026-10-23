/**
 * O que a área logada já buscou da conta (o plano, o placar), guardado na
 * memória da aba. Ao sair da área logada (para os planos, por exemplo) e voltar,
 * o painel lateral aparece na hora com o que já sabia, enquanto a busca nova chega.
 *
 * Cada resposta fica marcada com o id da conta que a recebeu e só volta para essa
 * mesma conta: mesmo que um aviso de troca de conta se perca, uma conta nunca vê
 * o dado de outra. Tudo é apagado também quando a conta muda ou sai
 * (lib/session.ts, lib/supabase.ts). No servidor nada é gravado: as buscas só
 * acontecem no navegador.
 */
const kept = new Map<string, { user: string; payload: unknown }>();

export function readKept<T>(user: string, path: string): T | null {
  const entry = kept.get(path);
  return entry && entry.user === user ? (entry.payload as T) : null;
}

export function keep(user: string, path: string, payload: unknown): void {
  kept.set(path, { user, payload });
}

export function forgetKept(): void {
  kept.clear();
}
