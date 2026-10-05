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
      // fixos, para as seções escuras da landing (pretas nos dois temas)
      black: "#000000",
      white: "#ffffff",
      paper: "var(--paper)",
      "paper-raised": "var(--paper-raised)",
      ink: "var(--ink)",
      "ink-muted": "var(--ink-muted)",
      line: "var(--line)",
      accent: "var(--accent)",
      "accent-strong": "var(--accent-strong)",
      "accent-soft": "var(--accent-soft)",
      "accent-bright": "var(--accent-bright)",
      kraft: "var(--kraft)",
      "kraft-soft": "var(--kraft-soft)",
      "kraft-ink": "var(--kraft-ink)",
      confirmed: "var(--confirmed)",
      pending: "var(--pending)",
      refuted: "var(--refuted)",
    },
    borderRadius: {
      none: "0",
      sm: "6px",
      DEFAULT: "8px",
      md: "12px",
      lg: "16px",
      xl: "20px",
      "2xl": "28px",
      full: "9999px",
    },
    boxShadow: {
      // flutuante discreto (menus, popovers)
      float: "0 1px 2px rgba(var(--shadow-rgb), 0.06), 0 4px 12px -2px rgba(var(--shadow-rgb), 0.08)",
      // cartões: profundidade suave, sem contorno pesado
      card: "0 1px 2px rgba(var(--shadow-rgb), 0.04), 0 12px 32px -12px rgba(var(--shadow-rgb), 0.14)",
      // o que está em destaque (a janela do produto, o plano)
      lift: "0 2px 4px rgba(var(--shadow-rgb), 0.05), 0 30px 60px -20px rgba(var(--shadow-rgb), 0.28)",
      // brilho azul da marca, para o botão principal e o card do preço
      glow: "0 10px 30px -10px rgba(var(--accent-rgb), 0.55)",
      none: "none",
    },
    extend: {
      // Geist no texto e nos títulos; Geist Mono nos timecodes (0:04 → 0:07)
      fontFamily: {
        display: ["var(--font-sans)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      maxWidth: {
        page: "1180px",
      },
    },
  },
  plugins: [],
};

export default config;
