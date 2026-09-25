import { loadAnalytics } from "@/lib/analytics";

// Começa a carregar o PostHog antes da página ficar interativa (sem bloquear: o
// import é dinâmico). Sem a chave configurada, não faz nada.
loadAnalytics();
