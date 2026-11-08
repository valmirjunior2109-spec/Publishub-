import type { CaptureResult, PostHog } from "posthog-js";

/**
 * Os eventos do funil no PostHog (o projeto já usava). Sem NEXT_PUBLIC_POSTHOG_KEY nada é
 * carregado e toda chamada vira nada. scan_completed e reservation_paid saem do servidor
 * (lib/server/posthog.ts), que é quem sabe com certeza quando acontecem.
 */

export type EventName = "scan_started" | "email_captured" | "checkout_started" | "sample_report_viewed";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

let client: Promise<PostHog | null> | null = null;

/* Nada com cara de segredo sai dentro de uma URL: o retorno do login traz o token no
   endereço, e o do Stripe traz o session_id. */
const SECRET_PARAM = /token|code|session|secret|key|password|email/i;
const URL_PROPERTIES = ["$current_url", "$referrer", "$initial_current_url", "$initial_referrer", "$session_entry_url"];

function cleanUrl(raw: unknown): unknown {
  if (typeof raw !== "string" || !raw) return raw;
  try {
    const url = new URL(raw);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) if (SECRET_PARAM.test(key)) url.searchParams.delete(key);
    return url.toString();
  } catch {
    return raw.split("#")[0].split("?")[0];
  }
}

function beforeSend(event: CaptureResult | null): CaptureResult | null {
  if (!event?.properties) return event;
  for (const key of URL_PROPERTIES) if (key in event.properties) event.properties[key] = cleanUrl(event.properties[key]);
  return event;
}

function load(): Promise<PostHog | null> {
  if (!KEY || typeof window === "undefined") return Promise.resolve(null);
  client ??= import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(KEY, {
        api_host: HOST,
        capture_pageview: "history_change",
        autocapture: false,
        person_profiles: "identified_only",
        before_send: beforeSend,
      });
      return posthog;
    })
    .catch(() => null);
  return client;
}

export function initAnalytics(): void {
  void load();
}

export function track(event: EventName, properties: Record<string, unknown> = {}): void {
  void load().then((posthog) => posthog?.capture(event, properties));
}
