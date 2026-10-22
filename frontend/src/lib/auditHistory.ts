"use client";

/**
 * O último relatório da auditoria aberto por um convidado neste navegador: é o
 * caminho de volta para ele a partir de /tools/video-audit. Só o id da análise,
 * que sozinho não abre nada (a API exige o token de convidado do mesmo navegador).
 */
const KEY = "publishub:last_audit";

export function rememberLastAudit(analysisId: string): void {
  try {
    window.localStorage.setItem(KEY, analysisId);
  } catch {
    // armazenamento bloqueado: o relatório continua no link, só não aparece no atalho
  }
}

export function readLastAudit(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
