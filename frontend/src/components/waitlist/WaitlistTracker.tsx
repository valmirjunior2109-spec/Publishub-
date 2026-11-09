"use client";

import { useEffect, useRef } from "react";
import { sendFunnelEvent } from "@/lib/funnel";

/**
 * Conta a visita (uma vez por carregamento) e os cliques em qualquer elemento com data-cta,
 * assim os links da página continuam sendo HTML do servidor.
 */
export function WaitlistTracker() {
  const sent = useRef(false);
  useEffect(() => {
    if (!sent.current) {
      sent.current = true;
      sendFunnelEvent("page_view");
    }
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("[data-cta]") : null;
      const cta = target?.getAttribute("data-cta");
      if (cta) sendFunnelEvent("cta_click", cta);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
