"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { apiFetch, type ApiError } from "./api";
import { keep, readKept } from "./responseCache";
import { useApiErrorHandler } from "./useApiErrorHandler";
import type { Accuracy, Me } from "./types";

interface Resource<T> {
  data: T | null;
  error: ApiError | null;
  /** Buscado depois da última navegação: quem decide algo com o dado (bloquear o upload, mandar para as boas-vindas) espera por isto. */
  fresh: boolean;
  reload: () => void;
}

interface Account {
  me: Resource<Me>;
  accuracy: Resource<Accuracy>;
}

const nothing = () => {};
const EMPTY: Resource<never> = { data: null, error: null, fresh: false, reload: nothing };
const AccountContext = createContext<Account | null>(null);

interface Entry<T> {
  user: string;
  /** a navegação em que a resposta chegou ("" = veio da memória da aba) */
  at: string;
  data: T | null;
  error: ApiError | null;
}

/**
 * Um recurso da conta, buscado uma vez por navegação e dividido por todos na
 * tela. Respostas de outra conta, ou de uma busca que já foi substituída, são
 * descartadas: a troca de conta e o recarregar depois de salvar nunca são
 * sobrescritos por uma resposta antiga.
 */
function useAccountResource<T>(path: string, userId: string, pathname: string, belongsTo: (data: T, userId: string) => boolean): Resource<T> {
  const handleApiError = useApiErrorHandler();
  const [tick, setTick] = useState(0);
  const [entry, setEntry] = useState<Entry<T>>(() => ({ user: userId, at: "", data: readKept<T>(userId, path), error: null }));

  useEffect(() => {
    let cancelled = false;
    apiFetch<T>(path)
      .then((data) => {
        if (cancelled || !belongsTo(data, userId)) return;
        keep(userId, path, data);
        setEntry({ user: userId, at: pathname, data, error: null });
      })
      .catch(async (err: ApiError) => {
        if (cancelled || (await handleApiError(err))) return;
        setEntry((previous) => ({ user: userId, at: pathname, data: previous.user === userId ? previous.data : null, error: err }));
      });
    return () => {
      cancelled = true;
    };
  }, [path, userId, pathname, tick, handleApiError, belongsTo]);

  const reload = useCallback(() => setTick((value) => value + 1), []);
  const mine = entry.user === userId;
  const fresh = mine && entry.at === pathname;
  return useMemo(() => ({ data: mine ? entry.data : null, error: mine ? entry.error : null, fresh, reload }), [mine, entry, fresh, reload]);
}

// a resposta do /api/me diz de quem é: uma que não for da conta atual não entra
const isOwnMe = (me: Me, userId: string) => me.id === userId;
const always = () => true;

/**
 * O que toda a área logada mostra da conta: o plano (/api/me) e o placar das
 * previsões (/api/accuracy). Antes, o painel lateral, a página e os cartões de
 * cada página buscavam cada um o seu (três /api/me na tela do resultado); agora
 * é uma busca de cada por navegação, e um `reload` atualiza todos de uma vez.
 */
export function AccountProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const pathname = usePathname();
  const me = useAccountResource<Me>("/api/me", userId, pathname, isOwnMe);
  const accuracy = useAccountResource<Accuracy>("/api/accuracy", userId, pathname, always);
  const value = useMemo(() => ({ me, accuracy }), [me, accuracy]);
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

/** Plano e placar da conta. Fora da área logada (o convidado vendo o resultado) volta vazio. */
export function useAccount(): Account {
  return useContext(AccountContext) ?? { me: EMPTY, accuracy: EMPTY };
}
