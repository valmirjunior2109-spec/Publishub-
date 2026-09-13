export function formatTimestamp(seconds) {
  if (seconds === null || seconds === undefined) return "";
  const total = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return "—";
  const total = Math.round(Number(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function formatBytes(bytes) {
  if (!bytes) return "—";
  const mb = bytes / 1024 / 1024;
  return mb < 1 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${mb.toFixed(1)} MB`;
}

export function formatDate(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export const STATUS_LABELS = {
  pending: "Na fila",
  processing: "Analisando",
  completed: "Concluída",
  failed: "Falhou",
};

export function isActive(status) {
  return status === "pending" || status === "processing";
}

/** Classe de cor para uma nota: verde a partir de 80%, âmbar a partir de 60%, o resto em tom baixo. */
export function scoreTone(score, max = 10) {
  const ratio = Number(score) / max;
  if (ratio >= 0.8) return "tone-good";
  if (ratio >= 0.6) return "tone-mid";
  return "tone-low";
}
