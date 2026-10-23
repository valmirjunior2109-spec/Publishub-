import { API_URL } from "./apiUrl";
import type { Health } from "./types";

let pending: Promise<Health | null> | null = null;

/**
 * O /api/health, uma vez por carregamento de página.
 *
 * Quem chama primeiro é o WarmBackend (acordar o backend que dorme); a nova
 * análise usa a mesma resposta para saber se a IA está configurada. Antes eram
 * duas chamadas iguais ao abrir /new-analysis. A rota é pública: vai sem token.
 *
 * Só a resposta boa é guardada. Se o backend ainda estava acordando, ou a
 * chamada falhou, a próxima tentativa vai ao backend de novo. null = não deu
 * para saber (quem usa segue como se estivesse tudo certo, como antes).
 */
export function checkHealth(): Promise<Health | null> {
  pending ??= fetch(`${API_URL}/api/health`, { cache: "no-store" })
    .then((response) => (response.ok ? (response.json() as Promise<Health>) : null))
    .catch(() => null)
    .then((health) => {
      if (!health) pending = null;
      return health;
    });
  return pending;
}
