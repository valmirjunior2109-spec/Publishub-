"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/events";

/**
 * Um `page_view` por tela, no layout — assim nenhuma página precisa lembrar de
 * medir a si mesma.
 *
 * Só o caminho vai junto, nunca a query: é lá que moram `session_id` do Stripe,
 * `ref` de indicação e outros valores que não têm por que virar evento.
 */
export function PageViews() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || last.current === pathname) return;
    last.current = pathname;
    // ids nas rotas viram um rótulo só: /results/<uuid> e /results/<outro> são a mesma tela
    const path = pathname.replace(/\/[0-9a-f]{8}-[0-9a-f-]{27}/i, "/:id");
    track("page_view", null, { path });
  }, [pathname]);

  return null;
}
