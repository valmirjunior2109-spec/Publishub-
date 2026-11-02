"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "./api";
import { keep as keepResponse, readKept } from "./responseCache";
import { useApiErrorHandler } from "./useApiErrorHandler";

interface PollingOptions<T> {
  shouldPoll: (data: T) => boolean;
  intervalMs?: number;
  /**
   * Por padrão, um 401 leva para /login. Nas telas de convidado isso é errado:
   * não há sessão para expirar, então o erro volta para quem chamou decidir.
   */
  redirectWhenExpired?: boolean;
  /** false não chama o backend (ex.: o placar da conta, numa tela de convidado). */
  enabled?: boolean;
  /**
   * true: a última resposta fica na memória da aba e aparece na hora na próxima
   * tela, enquanto a busca nova acontece (o painel lateral). Ver lib/responseCache.ts.
   */
  keep?: boolean;
}

/**
 * Busca `path` no backend e continua buscando a cada `intervalMs` enquanto
 * `shouldPoll(data)` for verdadeiro (uma análise ainda processando, por exemplo).
 */
export function usePolling<T>(path: string, { shouldPoll, intervalMs = 3000, redirectWhenExpired = true, enabled = true, keep = false }: PollingOptions<T>) {
  const [data, setData] = useState<T | null>(() => (keep ? readKept<T>(path) : null));
  const [error, setError] = useState<ApiError | null>(null);
  const [tick, setTick] = useState(0);
  const handleApiError = useApiErrorHandler();

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    apiFetch<T>(path)
      .then((payload) => {
        if (cancelled) return;
        if (keep) keepResponse(path, payload);
        setData(payload);
        setError(null);
      })
      .catch(async (err: ApiError) => {
        if (cancelled) return;
        if (redirectWhenExpired && (await handleApiError(err))) return;
        setError(err);
      });
    return () => {
      cancelled = true;
    };
  }, [path, tick, handleApiError, redirectWhenExpired, enabled, keep]);

  const polling = enabled && data !== null && shouldPoll(data);
  useEffect(() => {
    if (!polling) return;
    const timer = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(timer);
  }, [polling, intervalMs]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, reload };
}
