"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { AccountProvider } from "@/lib/account";
import { readGuestToken } from "@/lib/guest";
import { useSession } from "@/lib/session";

const SessionContext = createContext<Session | null>(null);

/* O token de convidado vem do localStorage, que não existe no servidor: com
   useSyncExternalStore o servidor renderiza "sem token" e o navegador corrige
   depois da hidratação, sem effect e sem divergência de HTML. */
const noSubscription = () => () => {};
const noTokenOnServer = () => null;

/**
 * A moldura da área logada (app/(app)/layout.tsx): o portão da sessão, o painel
 * lateral e os dados da conta, montados uma vez para todas as páginas dali.
 *
 * Antes cada página montava o próprio RequireAuth e o próprio AppShell: a cada
 * clique no menu o painel inteiro era desfeito e refeito, e a conta era buscada
 * de novo pelo painel e pela página. Agora a navegação entre essas páginas troca
 * só o conteúdo; o painel continua montado.
 *
 * A exceção é o resultado de quem testou sem conta (/results/<id> com o token de
 * convidado): ali não há conta, então a página passa direto e mostra a própria
 * moldura de convidado.
 */
export function AppArea({ children }: { children: ReactNode }) {
  const { loading, session } = useSession();
  const pathname = usePathname();
  const guestToken = useSyncExternalStore(noSubscription, readGuestToken, noTokenOnServer);

  if (!loading && !session && guestToken && pathname.startsWith("/results/")) return <>{children}</>;

  return (
    <RequireAuth>
      {(authed) => (
        <SessionContext.Provider value={authed}>
          <AccountProvider userId={authed.user.id}>
            <AppShell session={authed}>{children}</AppShell>
          </AccountProvider>
        </SessionContext.Provider>
      )}
    </RequireAuth>
  );
}

/** A sessão de quem está na área logada. Só para a interface: quem autoriza é o backend. */
export function useAppSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useAppSession fora da área logada");
  return session;
}

/** Como `useAppSession`, mas null para o convidado vendo o resultado. */
export function useOptionalAppSession(): Session | null {
  return useContext(SessionContext);
}
