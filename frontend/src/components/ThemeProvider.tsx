"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { defaultTheme, THEME_COOKIE, type Theme } from "@/lib/theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: defaultTheme, setTheme: () => {} });

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/**
 * O tema escolhido vive em cookie: o layout lê no servidor e já entrega o
 * `data-theme` no <html>, então a página nunca pisca no tema errado. Aqui só
 * se troca — na hora, sem recarregar — e se guarda a escolha para a próxima visita.
 */
export function ThemeProvider({ initial, children }: { initial: Theme; children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(initial);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    // "system" não é um valor de CSS: sem o atributo, quem manda é o prefers-color-scheme.
    if (next === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", next);
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
