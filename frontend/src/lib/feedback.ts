/** O feedback sobre a proposta do produto: as opções compartilhadas entre o formulário e a API. */

export const FEEDBACK_VERDICTS = [
  { value: "would_use", label: "I'd use this" },
  { value: "maybe", label: "Maybe, if…" },
  { value: "not_for_me", label: "Not for me" },
] as const;

export const FEEDBACK_LIVE_APP = [
  { value: "preview", label: "Only on preview deploys or staging" },
  { value: "read_only_prod", label: "On my live app, read-only" },
  { value: "prod_with_writes", label: "On my live app, with tagged test data" },
  { value: "never_prod", label: "Never on my live app" },
] as const;

/** Os mesmos valores, com os rótulos em português (o valor gravado no banco é sempre o mesmo). */
export const FEEDBACK_LABELS_PT: Record<string, string> = {
  would_use: "Eu usaria",
  maybe: "Talvez, se…",
  not_for_me: "Não é para mim",
  preview: "Só em preview ou staging",
  read_only_prod: "No app em produção, só leitura",
  prod_with_writes: "Em produção, com dados de teste marcados",
  never_prod: "Nunca no app em produção",
};

export type FeedbackVerdict = (typeof FEEDBACK_VERDICTS)[number]["value"];
export type FeedbackLiveApp = (typeof FEEDBACK_LIVE_APP)[number]["value"];

export const FEEDBACK_MESSAGE_MAX = 4000;
