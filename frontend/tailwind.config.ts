import type { Config } from "tailwindcss";

/**
 * Os valores vivem como CSS variables em src/app/globals.css (o design system
 * está descrito no topo daquele arquivo). Aqui só expomos os nomes para as
 * classes utilitárias (bg-paper, text-ink, border-line, text-accent…).
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      // fixos, para os blocos que não mudam com o tema (o vídeo, a janela escura)
      black: "#000000",
      white: "#ffffff",
      paper: "var(--paper)",
      "paper-raised": "var(--paper-raised)",
      surface: "var(--surface)",
      ink: "var(--ink)",
      "ink-muted": "var(--ink-muted)",
      line: "var(--line)",
      accent: "var(--accent)",
      "accent-strong": "var(--accent-strong)",
      "accent-soft": "var(--accent-soft)",
      "accent-bright": "var(--accent-bright)",
      "on-accent": "var(--on-accent)",
      confirmed: "var(--confirmed)",
      pending: "var(--pending)",
      refuted: "var(--refuted)",
    },
    borderRadius: {
      none: "0",
      sm: "6px",
      DEFAULT: "8px",
      md: "10px", // botões e campos
      lg: "12px",
      xl: "16px", // cartões
      "2xl": "20px",
      "3xl": "24px", // janelas do produto
      full: "9999px",
    },
    boxShadow: {
      // o que flutua sobre a página: menus, popovers
      float: "0 1px 2px rgba(var(--shadow-rgb), 0.06), 0 8px 24px -6px rgba(var(--shadow-rgb), 0.12)",
      // um cartão que precisa se separar do fundo, sem peso
      card: "0 1px 2px rgba(var(--shadow-rgb), 0.04), 0 1px 1px rgba(var(--shadow-rgb), 0.02)",
      // as janelas do produto na landing
      window: "0 1px 2px rgba(var(--shadow-rgb), 0.04), 0 24px 48px -24px rgba(var(--shadow-rgb), 0.18)",
      none: "none",
    },
    extend: {
      // Geist no texto e nos títulos; Geist Mono nos tempos, rótulos e números
      fontFamily: {
        display: ["var(--font-sans)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      maxWidth: {
        page: "1200px",
      },
    },
  },
  plugins: [],
};

export default config;
