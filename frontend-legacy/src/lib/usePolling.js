"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "./api";
import { useApiErrorHandler } from "./useApiErrorHandler";

/**
 * Fetches `path` from the backend, and keeps re-fetching every `intervalMs`
 * while `shouldPoll(data)` is true (e.g. an analysis still processing).
 */
export function usePolling(path, { shouldPoll, intervalMs = 3000 }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);
  const handleApiError = useApiErrorHandler();

  useEffect(() => {
    let cancelled = false;
    apiFetch(path)
      .then((payload) => {
        if (cancelled) return;
        setData(payload);
        setError(null);
      })
      .catch(async (err) => {
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
