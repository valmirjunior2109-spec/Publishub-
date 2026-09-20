"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { track } from "@/lib/events";
import { usePolling } from "@/lib/usePolling";
import type { Me } from "@/lib/types";

/**
 * Quem nunca viu as boas-vindas cai nelas ao chegar no painel.
 *
 * Fica só no /dashboard, que é onde todo mundo entra depois do login (inclusive
 * quem volta do Google). Em qualquer outra tela o produto não interrompe: quem
 * já sabe o que veio fazer não é empurrado para um tutorial.
 *
 * `onboarded_at` vem do servidor, então a tela não volta a aparecer nem em
 * outro navegador.
 */
export function OnboardingGate() {
  const { data: me } = usePolling<Me>("/api/me", { shouldPoll: () => false });
  const router = useRouter();

  useEffect(() => {
    if (!me || me.onboarded_at !== null) return;
    // o cadastro pelo Google não passa pelo formulário: a conta recém-criada
    // chegando aqui é o sinal de que ele deu certo
    const idade = me.created_at ? Date.now() - new Date(me.created_at).getTime() : Number.POSITIVE_INFINITY;
    if (idade < 5 * 60 * 1000) track("signup_completed", null, { method: "oauth", confirmed: true });
    router.replace("/bem-vindo");
  }, [me, router]);

  return null;
}
