import { SITE_URL } from "@/lib/site";

/**
 * A lista de espera do Publishub para verificação de código gerado por IA (a página /verify).
 * Constantes que o navegador e o servidor dividem: nada de segredo aqui.
 */

export const WAITLIST_PATH = "/verify";
export const WAITLIST_URL = `${SITE_URL}${WAITLIST_PATH}`;

export const WAITLIST_TAGLINE = "Your AI writes the code. Who verifies it actually works?";
export const WAITLIST_DESCRIPTION =
  "Publishub helps developers verify AI-generated code changes, detect application regressions, and catch broken user journeys before they reach production. Join the early-access waitlist.";

/** As opções do campo "Primary AI coding tool" (o servidor recusa o que não estiver aqui). */
export const AI_TOOLS = ["Claude Code", "Cursor", "Codex", "GitHub Copilot", "Windsurf", "Other"] as const;
export type AiTool = (typeof AI_TOOLS)[number];

/** A mesma regra do servidor (lib/server/request.ts), para avisar antes de enviar. */
export const WAITLIST_EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

export const WAITLIST_FORMS = ["hero", "early_access"] as const;
export type WaitlistForm = (typeof WAITLIST_FORMS)[number];

export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;
export type Utm = Partial<Record<(typeof UTM_KEYS)[number], string>>;

export const SHARE_MESSAGE =
  "I'm joining the early-access waitlist for Publishub — a new way to verify AI-generated code and catch application regressions before shipping.";

/** O link compartilhado leva a própria UTM: assim a lista mostra quantas inscrições vieram de cada rede. */
export function shareUrl(network: "x" | "linkedin" | "copy"): string {
  const params = new URLSearchParams({ utm_source: network === "copy" ? "share" : network, utm_medium: "social", utm_campaign: "waitlist_share" });
  return `${WAITLIST_URL}?${params}`;
}

export function shareLinks() {
  const xUrl = shareUrl("x");
  const linkedinUrl = shareUrl("linkedin");
  return {
    x: `https://twitter.com/intent/tweet?${new URLSearchParams({ text: SHARE_MESSAGE, url: xUrl })}`,
    // o compartilhamento do feed aceita o texto pronto; o share-offsite oficial só aceita a URL
    linkedin: `https://www.linkedin.com/feed/?${new URLSearchParams({ shareActive: "true", text: `${SHARE_MESSAGE} ${linkedinUrl}` })}`,
    copy: `${SHARE_MESSAGE} ${shareUrl("copy")}`,
  };
}
