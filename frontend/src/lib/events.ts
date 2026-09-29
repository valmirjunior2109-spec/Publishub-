"use client";

import { useEffect, useRef } from "react";
import { capture, type AnalyticsEvent } from "./analytics";
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
  // depois do resultado: foi útil? e o próximo vídeo
  | "analysis_feedback"
  | "next_analysis_clicked"
  // o vídeo editado saiu do Publishub: para o Instagram, o TikTok, o WhatsApp…
  | "video_shared"
  // a revisão dos cortes: a IA sugere, o criador decide
  | "suggestion_viewed"
  | "suggestion_previewed"
  | "accept_all_clicked"
  | "reject_all_clicked"
  | "suggestion_accepted"
  | "suggestion_rejected"
  | "suggestion_edited"
  // baixou ou compartilhou o vídeo editado: o fim do funil
  | "video_exported"
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
 * Os passos do funil que o PostHog não recebia por outro caminho, com o nome que
 * eles têm lá. Os que ele já recebe ficam de fora, para não contar duas vezes:
 * upload_started e checkout_clicked (do navegador), analysis_completed,
 * second_video_uploaded, cuts_applied, edit_ready e purchase_completed (do servidor).
 *
 * Pelo PostHog o funil fecha também para quem ainda não tem conta: o /api/events
 * recusa quem não tem sessão, e signup_started acontece antes de ela existir.
 */
const POSTHOG_NAMES: Partial<Record<EventName, AnalyticsEvent>> = {
  signup_started: "signup_started",
  signup_completed: "signup_completed",
  video_upload_completed: "video_uploaded",
  // a análise pronta na tela (results_viewed dispara até com ela ainda na fila)
  full_analysis_viewed: "result_viewed",
  next_analysis_clicked: "next_analysis_clicked",
  video_shared: "video_shared",
  suggestion_viewed: "suggestion_viewed",
  suggestion_previewed: "suggestion_previewed",
  accept_all_clicked: "accept_all_clicked",
  reject_all_clicked: "reject_all_clicked",
  suggestion_accepted: "suggestion_accepted",
  suggestion_rejected: "suggestion_rejected",
  suggestion_edited: "suggestion_edited",
  video_exported: "video_exported",
  // qualquer botão que leva ao preço; a ida ao Stripe é o checkout_clicked
  upgrade_clicked: "pricing_cta_clicked",
};

/**
 * Registra um evento no próprio backend. Nunca atrapalha a tela: se falhar (ou
 * se quem está olhando nem tem sessão), o erro morre aqui.
 *
 * O que não se manda: senha, dado de pagamento e conteúdo do vídeo. O backend
 * derruba isso de novo, mas a primeira linha de defesa é não enviar.
 */
export function track(name: EventName, analysisId?: string | null, props?: EventProps): void {
  apiFetch("/api/events", { method: "POST", body: { name, analysis_id: analysisId ?? null, props: props ?? {} } }).catch(() => {});
  const mirrored = POSTHOG_NAMES[name];
  if (mirrored && typeof document !== "undefined") capture(mirrored, analysisId ?? null, document.documentElement.lang, props);
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
