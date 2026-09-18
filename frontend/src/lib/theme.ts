export const themes = ["light", "dark", "system"] as const;
export type Theme = (typeof themes)[number];

/** Sem escolha, o site segue o tema do sistema — é o que o `color-scheme` faz sozinho. */
export const defaultTheme: Theme = "system";

/** Cookie da escolha do seletor; lido no servidor para a página já nascer no tema certo. */
export const THEME_COOKIE = "theme";

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (themes as readonly string[]).includes(value);
}
