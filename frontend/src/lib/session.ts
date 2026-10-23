"use client";

import { useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";
import { forgetKept } from "./responseCache";
import { getSupabase, supabaseConfigured } from "./supabase";

interface SessionState {
  loading: boolean;
  session: Session | null;
}

/**
 * A sessão do Supabase nesta aba, num lugar só.
 *
 * Antes, cada componente que pedia a sessão abria a própria inscrição no
 * Supabase (e fechava ao desmontar): eram vinte inscrições, e numa tela sem
 * nenhuma delas uma troca de conta feita em outra aba passava despercebida até a
 * próxima consulta. Agora há uma inscrição só, aberta no primeiro uso e mantida
 * enquanto a aba existir. O Supabase manda a sessão inicial (INITIAL_SESSION) e
 * cada mudança depois: login, logout, token renovado, conta trocada em outra aba.
 *
 * Isto é só o que a tela mostra. Quem autoriza é o backend, que valida o token a
 * cada chamada (apiFetch pede o token ao Supabase na hora, não daqui).
 */
const SERVER: SessionState = { loading: supabaseConfigured, session: null };
let current: SessionState = SERVER;
const listeners = new Set<() => void>();
let started = false;

function update(session: Session | null) {
  const before = current.loading ? undefined : (current.session?.user.id ?? null);
  // outra conta (ou nenhuma): o que foi guardado da anterior vai embora antes de qualquer tela redesenhar
  if (before !== undefined && before !== (session?.user.id ?? null)) forgetKept();
  if (!current.loading && current.session?.access_token === session?.access_token && current.session?.user.id === session?.user.id) return;
  current = { loading: false, session };
  listeners.forEach((listener) => listener());
}

function start() {
  if (started || !supabaseConfigured) return;
  started = true;
  // a biblioteca chega depois da primeira pintura: a tela mostra o carregando que
  // já mostrava, e a sessão preenche quando ela responde
  getSupabase().then((supabase) => {
    supabase?.auth.onAuthStateChange((_event, session) => update(session));
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  start();
  return () => listeners.delete(listener);
}

/**
 * A sessão atual do Supabase, acompanhando login, logout e renovação de token.
 * Na hidratação vale o mesmo que o servidor desenhou (carregando); depois da
 * primeira resposta, uma tela nova já nasce com a sessão, sem piscar.
 */
export function useSession(): SessionState {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => SERVER,
  );
}
