"use client";

import { useEffect, useRef } from "react";
import { identify, resetIdentity } from "@/lib/analytics";
import { useSession } from "@/lib/session";

/**
 * Diz ao PostHog de quem são os eventos deste navegador: o id da conta, que é o
 * mesmo que o backend usa nos eventos do servidor. Saiu da conta, esquece.
 * Não desenha nada.
 */
export function AnalyticsIdentity() {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const previous = useRef<string | null>(null);

  useEffect(() => {
    if (userId) identify(userId);
    else if (previous.current) resetIdentity();
    previous.current = userId;
  }, [userId]);

  return null;
}
