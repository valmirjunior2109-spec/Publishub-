import type { AnalysisStatus } from "./types";

/** Uma análise ainda em andamento (a página continua consultando o backend). */
export function isActive(status: AnalysisStatus | null | undefined): boolean {
  return status === "pending" || status === "processing";
}

/** 4 → "0:04", 71 → "1:11" */
export function formatTimestamp(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

/** Nome do idioma falado no vídeo ("pt" → "Português"), escrito no idioma do site. */
export function languageName(code: string, locale: string): string {
  try {
    const name = new Intl.DisplayNames([locale], { type: "language" }).of(code) ?? code;
    return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
  } catch {
    return code;
  }
}
