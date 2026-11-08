/**
 * O que o painel lateral já buscou (o plano, o placar), guardado na memória da
 * aba. Cada página monta o AppShell de novo: sem isto, a barra lateral piscava
 * vazia a cada navegação, esperando o backend responder outra vez.
 *
 * Só vale para quem pede (`usePolling(..., { keep: true })`) e é apagado quando
 * a conta muda ou sai (lib/session.ts): uma conta nunca vê o dado de outra.
 * No servidor nada é gravado: as buscas só acontecem no navegador.
 */
const kept = new Map<string, unknown>();

export function readKept<T>(path: string): T | null {
  return (kept.get(path) as T | undefined) ?? null;
}

export function keep(path: string, payload: unknown): void {
  kept.set(path, payload);
}

export function forgetKept(): void {
  kept.clear();
}
