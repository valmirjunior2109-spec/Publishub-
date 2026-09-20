"use client";

import { useEffect, useRef } from "react";
import { apiFetch } from "./api";

/**
 * Os eventos do funil. A lista é a mesma do backend (events_service.NAMES) —
 * nome fora dela é recusado com 422, de propósito: evento sem nome combinado é
 * evento que ninguém analisa.
 */
export type EventName =
  // entrada
  | "page_view"
  | "signup_started"
  | "signup_completed"
  | "onboarding_completed"
  // análise
  | "video_upload_started"
  | "video_upload_completed"
  | "analysis_started"
  | "analysis_completed"
  | "analysis_failed"
  | "results_viewed"
  | "action_plan_viewed"
  | "full_analysis_viewed"
  // dinheiro
  | "paywall_viewed"
  | "upgrade_clicked"
  | "payment_started"
  | "payment_completed"
  | "payment_failed"
  // loop de previsão
  | "prediction_shown"
  | "prediction_confirmed"
  | "real_result_submitted";

type EventProps = Record<string, string | number | boolean | null>;

/**
 * Registra um evento no próprio backend. Nunca atrapalha a tela: se falhar (ou
 * se quem está olhando nem tem sessão), o erro morre aqui.
 *
 * O que não se manda: senha, dado de pagamento e conteúdo do vídeo. O backend
 * derruba isso de novo, mas a primeira linha de defesa é não enviar.
 */
export function track(name: EventName, analysisId?: string | null, props?: EventProps): void {
  apiFetch("/api/events", { method: "POST", body: { name, analysis_id: analysisId ?? null, props: props ?? {} } }).catch(() => {});
}

/**
 * Dispara uma única vez, no momento em que `when` fica verdadeiro — o padrão de
 * "esta tela apareceu para esta pessoa". Um poll a cada 3 s não pode virar um
 * evento a cada 3 s.
 */
export function useTrackOnce(name: EventName, when: boolean, analysisId?: string | null, props?: EventProps): void {
  const fired = useRef(false);
  // as props viram texto: o efeito depende do valor, não da identidade do objeto,
  // que muda a cada render e dispararia o evento de novo
  const payload = JSON.stringify(props ?? {});

  useEffect(() => {
    if (!when || fired.current) return;
    fired.current = true;
    track(name, analysisId, JSON.parse(payload) as EventProps);
  }, [when, name, analysisId, payload]);
}
