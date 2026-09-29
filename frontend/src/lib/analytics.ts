"use client";

import type { CaptureResult, PostHog } from "posthog-js";

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
export type AnalyticsEvent =
  | "upload_started"
  | "email_submitted"
  | "checkout_clicked"
  // os passos do funil que chegam pelo track() de lib/events.ts
  | "signup_started"
  | "signup_completed"
  | "video_uploaded"
  | "result_viewed"
  | "next_analysis_clicked"
  | "pricing_cta_clicked"
  | "video_shared"
  | "suggestion_viewed"
  | "suggestion_previewed"
  | "accept_all_clicked"
  | "reject_all_clicked"
  | "suggestion_accepted"
  | "suggestion_rejected"
  | "suggestion_edited"
  | "video_exported";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

let client: Promise<PostHog | null> | null = null;

/*
 * O que nunca pode sair do navegador dentro de uma URL. O login do Supabase volta
 * com a sessão inteira no endereço (#access_token=…&refresh_token=…), o Stripe
 * volta com session_id, o OAuth com code. O PostHog guarda o endereço de cada
 * visita: sem esta limpeza, o token de acesso da pessoa ia junto.
 */
const SECRET_PARAM = /token|code|session|secret|key|password|email/i;
const URL_PROPERTIES = ["$current_url", "$referrer", "$initial_current_url", "$initial_referrer", "$session_entry_url", "$prev_pageview_pathname"];

/** O endereço sem o que vem depois do # e sem parâmetros com cara de segredo. */
export function cleanUrl(raw: unknown): unknown {
  if (typeof raw !== "string" || !raw) return raw;
  try {
    const url = new URL(raw);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) if (SECRET_PARAM.test(key)) url.searchParams.delete(key);
    return url.toString();
  } catch {
    // não é uma URL completa (um caminho, por exemplo): corta o # e a query inteira
    return raw.split("#")[0].split("?")[0];
  }
}

function cleanProperties(properties: Record<string, unknown> | undefined): void {
  if (!properties) return;
  for (const key of URL_PROPERTIES) if (key in properties) properties[key] = cleanUrl(properties[key]);
}

/** Passa em todo evento antes de ele sair: as URLs do evento e as do perfil da pessoa. */
function beforeSend(event: CaptureResult | null): CaptureResult | null {
  if (!event) return event;
  cleanProperties(event.properties);
  cleanProperties(event.$set as Record<string, unknown> | undefined);
  cleanProperties(event.$set_once as Record<string, unknown> | undefined);
  return event;
}

export function loadAnalytics(): Promise<PostHog | null> {
  if (!KEY || typeof window === "undefined") return Promise.resolve(null);
  if (!client) {
    client = import("posthog-js")
      .then(({ default: posthog }) => {
        posthog.init(KEY, {
          api_host: HOST,
          capture_pageview: "history_change",
          autocapture: false,
          // nenhuma URL sai com a sessão do Supabase, o session_id do Stripe ou o code do OAuth
          before_send: beforeSend,
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
