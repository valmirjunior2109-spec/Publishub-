/** Junta classes ignorando valores falsos. Suficiente aqui; evita depender de clsx/tailwind-merge. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
