import type { Config } from "tailwindcss";

/**
 * Os valores vivem como CSS variables em src/app/globals.css.
 * Aqui só expomos os nomes para as classes utilitárias (bg-paper, text-ink…).
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      paper: "var(--paper)",
      "paper-raised": "var(--paper-raised)",
      ink: "var(--ink)",
      "ink-muted": "var(--ink-muted)",
      line: "var(--line)",
      accent: "var(--accent)",
      "accent-strong": "var(--accent-strong)",
      "accent-soft": "var(--accent-soft)",
      confirmed: "var(--confirmed)",
      pending: "var(--pending)",
      refuted: "var(--refuted)",
      // tarja de vídeo: escura nos dois temas
      mat: "var(--mat)",
      "mat-ink": "var(--mat-ink)",
    },
    borderRadius: {
      none: "0",
      sm: "4px",
      DEFAULT: "4px",
      md: "8px",
      lg: "8px",
      full: "9999px",
    },
    boxShadow: {
      // única sombra permitida: quase imperceptível, só para elementos flutuantes
      float: "0 1px 2px rgba(30, 27, 22, 0.06)",
      none: "none",
    },
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        brand: ["var(--font-brand)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      maxWidth: {
        page: "1180px",
      },
    },
  },
  plugins: [],
};

export default config;
