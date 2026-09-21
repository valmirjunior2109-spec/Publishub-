/**
 * Claro ou escuro. O padrão é o que o sistema da pessoa pede; escolher no botão
 * passa a valer só para este navegador, e fica guardado.
 *
 * O `data-theme` no <html> é a única coisa que o CSS olha. Quem aplica ele antes
 * da primeira pintura é o script inline do layout — aqui só mudamos depois do
 * clique.
 */

export type Theme = "light" | "dark";

export const THEME_KEY = "publishub.theme";

/** O tema que está valendo agora: o escolhido ou, sem escolha, o do sistema. */
export function currentTheme(): Theme {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === "light" || chosen === "dark") return chosen;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Troca o tema e guarda a escolha. Sem localStorage, vale enquanto a aba viver. */
export function toggleTheme(): Theme {
  const next: Theme = currentTheme() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try {
    window.localStorage.setItem(THEME_KEY, next);
  } catch {
    // navegação privada ou armazenamento bloqueado: a escolha dura a sessão
  }
  return next;
}

/**
 * O script que roda antes de tudo, no <head>: se a pessoa já escolheu, aplica
 * antes da primeira pintura. Sem isso a tela pisca clara antes de escurecer.
 */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;
