"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "./api";
import { useSession } from "./session";
import type { Partners } from "./types";

/**
 * O código de indicação da conta e o bônus do indique e ganhe, para os botões de
 * compartilhar. Sem conta, ou com o Partners fora do ar, é null: o link sai sem ?ref=.
 */
export function usePartners(): Partners | null {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const [partners, setPartners] = useState<Partners | null>(null);
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    apiFetch<Partners>("/api/partners")
      .then((value) => alive && setPartners(value.available ? value : null))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [userId]);
  return userId ? partners : null;
}
