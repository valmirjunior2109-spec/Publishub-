import type { Config } from "tailwindcss";

/**
 * Os valores vivem como CSS variables em src/app/globals.css. Aqui só os nomes.
 * Todas as cores de texto passam de 4.5:1 nos dois temas, claro e escuro (ver o topo do globals.css).
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      white: "#ffffff",
      black: "#000000",
      bg: "var(--bg)",
      surface: "var(--surface)",
      "surface-strong": "var(--surface-strong)",
      ink: "var(--ink)",
      muted: "var(--muted)",
      line: "var(--line)",
      "line-strong": "var(--line-strong)",
      accent: "var(--accent)",
      "accent-hover": "var(--accent-hover)",
      "accent-soft": "var(--accent-soft)",
      "on-accent": "var(--on-accent)",
      card: "var(--card)",
      pop: "var(--pop)",
      mint: "var(--mint)",
      spot: "var(--spot)",
      prompt: "var(--prompt-bg)",
      // a tinta escura fixa, para texto sobre fundo branco fixo (o botão branco da faixa escura)
      navy: "#0a0f1f",
      critical: "var(--critical)",
      "critical-soft": "var(--critical-soft)",
      serious: "var(--serious)",
      "serious-soft": "var(--serious-soft)",
      moderate: "var(--moderate)",
      "moderate-soft": "var(--moderate-soft)",
      minor: "var(--minor)",
      "minor-soft": "var(--minor-soft)",
      success: "var(--success)",
      "success-soft": "var(--success-soft)",
    },
    borderRadius: {
      none: "0",
      sm: "4px",
      DEFAULT: "6px",
      md: "8px",
      lg: "10px",
      xl: "12px",
      "2xl": "16px",
      full: "9999px",
    },
    boxShadow: {
      none: "none",
      card: "0 1px 2px hsl(var(--shadow-color) / 0.06)",
      raised: "0 1px 3px hsl(var(--shadow-color) / 0.08), 0 8px 24px -8px hsl(var(--shadow-color) / 0.14)",
      glow: "0 18px 40px -16px color-mix(in srgb, var(--glow-blue) 55%, transparent)",
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      maxWidth: {
        page: "1120px",
        prose: "68ch",
      },
    },
  },
  plugins: [],
};

export default config;
