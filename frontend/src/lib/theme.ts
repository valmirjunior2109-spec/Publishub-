/** Onde a escolha de tema fica salva no navegador. */
export const THEME_KEY = "pu-theme";

/**
 * Roda no <head>, antes do primeiro quadro: aplica o tema salvo (sem "piscar" claro no escuro)
 * e marca o <html> com "js", que liga as animações de entrada ao rolar.
 */
export const THEME_SCRIPT = `(function(){try{var d=document.documentElement;d.classList.add("js");var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")d.dataset.theme=t;}catch(e){}})();`;
