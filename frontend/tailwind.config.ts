import type { Config } from "tailwindcss";

/**
 * Os valores vivem como CSS variables em src/app/globals.css (a identidade 8-bit). Aqui só os nomes.
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
      // o roxo dos botões principais (Electric Purple), com texto branco
      action: "var(--action)",
      "action-hover": "var(--action-hover)",
      "on-action": "var(--on-action)",
      // a paleta oficial, fixa, para o que não muda com o tema (o terminal, a logo)
      cream: "#F2D7A0",
      purple: "#9147FF",
      midnight: "#0D0B12",
      lavender: "#C18AFF",
      card: "var(--card)",
      pop: "var(--pop)",
      mint: "var(--mint)",
      spot: "var(--spot)",
      prompt: "var(--prompt-bg)",
      // a tinta escura fixa, para texto sobre fundo claro fixo (o botão creme da faixa escura)
      navy: "#0D0B12",
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
    // cantos quase retos: a cara de pixel sem virar videogame
    borderRadius: {
      none: "0",
      sm: "2px",
      DEFAULT: "3px",
      md: "4px",
      lg: "6px",
      xl: "8px",
      "2xl": "10px",
      full: "9999px",
    },
    boxShadow: {
      none: "none",
      card: "0 1px 2px hsl(var(--shadow-color) / 0.06)",
      raised: "0 1px 3px hsl(var(--shadow-color) / 0.08), 0 8px 24px -8px hsl(var(--shadow-color) / 0.14)",
      glow: "0 18px 40px -16px color-mix(in srgb, var(--glow-blue) 55%, transparent)",
      // a sombra "dura" de pixel, deslocada como a da logo
      pixel: "3px 3px 0 0 var(--pixel-shadow)",
      "pixel-lg": "5px 5px 0 0 var(--pixel-shadow)",
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        // a fonte de pixel: só rótulos, selos, a marca e títulos pequenos, nunca parágrafos
        pixel: ["var(--font-pixel)", "var(--font-mono)", "monospace"],
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
