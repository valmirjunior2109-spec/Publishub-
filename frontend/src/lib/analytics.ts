"use client";

import type { PostHog } from "posthog-js";

/**
 * PostHog no navegador.
 *
 * Carregado depois da página (import dinâmico): a landing não espera o SDK para
 * aparecer. Sem NEXT_PUBLIC_POSTHOG_KEY nada é carregado e toda chamada vira nada.
 *
 * Só os eventos combinados, com `analysis_id` e `locale`: autocapture de cliques
 * desligado e gravação de sessão desligada (a tela mostra o vídeo e a fala da
 * pessoa, e isso não vai para terceiros).
 *
 * Os eventos que o servidor manda (analysis_completed, purchase_completed) caem
 * na mesma pessoa porque os dois lados usam o mesmo id: o da conta, ou
 * "guest:<id da sessão>" para quem ainda não tem conta (ver `identify`).
 */
export type AnalyticsEvent = "upload_started" | "email_submitted" | "checkout_clicked";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

let client: Promise<PostHog | null> | null = null;

export function loadAnalytics(): Promise<PostHog | null> {
  if (!KEY || typeof window === "undefined") return Promise.resolve(null);
  if (!client) {
    client = import("posthog-js")
      .then(({ default: posthog }) => {
        posthog.init(KEY, {
          api_host: HOST,
          capture_pageview: "history_change",
          autocapture: false,
          disable_session_recording: true,
          // pessoa só existe para quem foi identificado (conta ou sessão de convidado)
          person_profiles: "identified_only",
        });
        return posthog;
      })
      // bloqueador de anúncio ou rede fora: a medição some, o site não
      .catch(() => null);
  }
  return client;
}

/** Um evento do funil. `analysisId` é null quando ainda não existe (o upload está começando). */
export function capture(event: AnalyticsEvent, analysisId: string | null, locale: string, props: Record<string, string | number | boolean | null> = {}): void {
  loadAnalytics().then((posthog) => posthog?.capture(event, { ...props, analysis_id: analysisId, locale }));
}

/** Liga os eventos deste navegador a uma pessoa: o id da conta ou "guest:<sessão>". */
export function identify(distinctId: string): void {
  loadAnalytics().then((posthog) => {
    if (posthog && posthog.get_distinct_id() !== distinctId) posthog.identify(distinctId);
  });
}

/** Saiu da conta: o próximo que usar este navegador não herda a pessoa. */
export function resetIdentity(): void {
  loadAnalytics().then((posthog) => posthog?.reset());
}
