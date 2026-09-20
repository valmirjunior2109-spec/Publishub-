"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { clearGuestToken, readGuestToken } from "@/lib/guest";
import { useSession } from "@/lib/session";

/** Onde faz sentido cair direto na análise recém-reivindicada. */
const ENTRY_PAGES = new Set(["/", "/signup", "/login", "/dashboard"]);

/**
 * Fica no layout: assim que existe uma sessão, o teste feito sem cadastro passa
 * para a conta. Vale para o cadastro por e-mail e para o Google, que volta do
 * OAuth direto no /dashboard sem passar pelo formulário.
 */
export function ClaimGuestWork() {
  const { session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const claiming = useRef(false);

  useEffect(() => {
    if (!session || claiming.current) return;
    const token = readGuestToken();
    if (!token) return;
    claiming.current = true;

    apiFetch<{ claimed: number; analysis_ids: string[] }>("/api/guest/claim", { method: "POST", body: { token } })
      .then(({ analysis_ids: ids }) => {
        clearGuestToken();
        // acabou de se cadastrar para ver a análise: é para lá que ela vai
        if (ids[0] && ENTRY_PAGES.has(pathname)) router.replace(`/results/${ids[0]}`);
      })
      .catch(() => {
        // token inválido, de outra conta ou já reivindicado: não serve mais para nada
        clearGuestToken();
      });
  }, [session, pathname, router]);

  return null;
}
