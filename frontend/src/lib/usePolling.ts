"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "./api";
import { useApiErrorHandler } from "./useApiErrorHandler";

interface PollingOptions<T> {
  shouldPoll: (data: T) => boolean;
  intervalMs?: number;
}

/**
 * Busca `path` no backend e continua buscando a cada `intervalMs` enquanto
 * `shouldPoll(data)` for verdadeiro (uma análise ainda processando, por exemplo).
 */
export function usePolling<T>(path: string, { shouldPoll, intervalMs = 3000 }: PollingOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [tick, setTick] = useState(0);
  const handleApiError = useApiErrorHandler();

  useEffect(() => {
    let cancelled = false;
    apiFetch<T>(path)
      .then((payload) => {
        if (cancelled) return;
        setData(payload);
        setError(null);
      })
      .catch(async (err: ApiError) => {
        if (!cancelled && !(await handleApiError(err))) setError(err);
      });
    return () => {
      cancelled = true;
    };
  }, [path, tick, handleApiError]);

  const polling = data !== null && shouldPoll(data);
  useEffect(() => {
    if (!polling) return;
    const timer = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(timer);
  }, [polling, intervalMs]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, reload };
}
