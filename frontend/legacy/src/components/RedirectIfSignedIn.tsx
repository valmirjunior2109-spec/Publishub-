"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";

/**
 * Quem já está logado não fica na landing: vai direto para o painel.
 * Cobre também a volta do Google, que pode cair na raiz quando a URL de
 * redirecionamento não está na lista do Supabase (a sessão vem no #hash da URL
 * e o supabase-js a lê no carregamento; o onAuthStateChange dispara e caímos aqui).
 */
export function RedirectIfSignedIn({ to = "/dashboard" }: { to?: string }) {
  const { loading, session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading && session) router.replace(to);
  }, [loading, session, router, to]);

  return null;
}
