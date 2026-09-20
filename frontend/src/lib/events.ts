"use client";

import { useEffect, useRef } from "react";
import { apiFetch } from "./api";

/** Os seis eventos do funil. A lista igual existe no backend e no check da tabela. */
export type EventName =
  | "prediction_shown"
  | "prediction_confirmed"
  | "full_analysis_viewed"
  | "paywall_viewed"
  | "purchased"
  | "real_result_submitted";

type EventProps = Record<string, string | number | boolean | null>;

/**
 * Registra um evento no próprio backend. Nunca atrapalha a tela: se falhar (ou
 * se quem está olhando nem tem sessão), o erro morre aqui.
 */
export function track(name: EventName, analysisId?: string | null, props?: EventProps): void {
  apiFetch("/api/events", { method: "POST", body: { name, analysis_id: analysisId ?? null, props: props ?? {} } }).catch(() => {});
}

/**
 * Dispara uma única vez, no momento em que `when` fica verdadeiro — o padrão de
 * "esta tela apareceu para esta pessoa". Um poll a cada 3 s não pode virar um
 * evento a cada 3 s.
 */
export function useTrackOnce(name: EventName, when: boolean, analysisId?: string | null): void {
  const fired = useRef(false);
  useEffect(() => {
    if (!when || fired.current) return;
    fired.current = true;
    track(name, analysisId);
  }, [when, name, analysisId]);
}
