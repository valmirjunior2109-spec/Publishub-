import { SITE_URL } from "@/lib/site";

/**
 * A lista de espera do Publishub para verificação de código gerado por IA (a home, getpublishub.com).
 * Constantes que o navegador e o servidor dividem: nada de segredo aqui.
 */

export const WAITLIST_PATH = "/";
export const WAITLIST_URL = SITE_URL;

export const WAITLIST_TAGLINE = "Your AI writes the code. Who verifies it actually works?";
export const WAITLIST_DESCRIPTION =
  "Publishub helps developers verify AI-generated code changes, detect application regressions, and catch broken user journeys before they reach production. Join the early-access waitlist.";

/** As opções do campo "Primary AI coding tool" (o servidor recusa o que não estiver aqui). */
export const AI_TOOLS = ["Claude Code", "Cursor", "Codex", "GitHub Copilot", "Windsurf", "Lovable", "Bolt", "Other"] as const;
export type AiTool = (typeof AI_TOOLS)[number];

/** A mesma regra do servidor (lib/server/request.ts), para avisar antes de enviar. */
export const WAITLIST_EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

// "check": o formulário do relatório do teste grátis (/check/[id])
export const WAITLIST_FORMS = ["hero", "early_access", "check"] as const;
export type WaitlistForm = (typeof WAITLIST_FORMS)[number];

export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;
export type Utm = Partial<Record<(typeof UTM_KEYS)[number], string>>;

export const SHARE_MESSAGE =
  "I'm joining the early-access waitlist for Publishub — a new way to verify AI-generated code and catch application regressions before shipping.";

/** Cada amigo que entra pelo link pessoal sobe a pessoa este número de posições (o mesmo da função waitlist_position). */
export const REFERRAL_BONUS = 10;

/** O código de indicação: 8 caracteres hexadecimais (o banco gera). */
export const REF_CODE_RE = /^[a-f0-9]{8}$/;

/**
 * O link compartilhado leva a própria UTM: assim a lista mostra quantas inscrições vieram de cada rede.
 * Com o código da pessoa (?ref=), cada inscrição pelo link conta como indicação dela.
 */
export function shareUrl(network: "x" | "linkedin" | "copy", refCode?: string | null): string {
  // o ref primeiro: é o que a pessoa vê no fim do link colado
  const params = new URLSearchParams(refCode && REF_CODE_RE.test(refCode) ? { ref: refCode } : {});
  params.set("utm_source", network === "copy" ? "share" : network);
  params.set("utm_medium", "social");
  params.set("utm_campaign", refCode ? "waitlist_referral" : "waitlist_share");
  return `${WAITLIST_URL}/?${params}`;
}

export function shareLinks(refCode?: string | null) {
  const xUrl = shareUrl("x", refCode);
  const linkedinUrl = shareUrl("linkedin", refCode);
  return {
    x: `https://twitter.com/intent/tweet?${new URLSearchParams({ text: SHARE_MESSAGE, url: xUrl })}`,
    // o compartilhamento do feed aceita o texto pronto; o share-offsite oficial só aceita a URL
    linkedin: `https://www.linkedin.com/feed/?${new URLSearchParams({ shareActive: "true", text: `${SHARE_MESSAGE} ${linkedinUrl}` })}`,
    copy: `${SHARE_MESSAGE} ${shareUrl("copy", refCode)}`,
    link: shareUrl("copy", refCode),
  };
}
