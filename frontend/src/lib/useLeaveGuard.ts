"use client";

import { useEffect } from "react";

/**
 * Enquanto o vídeo sobe, fechar a aba ou recarregar perde o envio: o navegador
 * pergunta antes. Depois que o envio termina a análise roda no servidor, e a
 * página pode ser fechada à vontade.
 */
export function useLeaveGuard(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // navegadores antigos só perguntam com returnValue preenchido
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);
}
