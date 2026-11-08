"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { forgetKept } from "./responseCache";
import { getSupabase, supabaseConfigured } from "./supabase";

interface SessionState {
  loading: boolean;
  session: Session | null;
}

/**
 * A última sessão que o Supabase confirmou nesta aba (undefined: ainda nenhuma).
 * Cada página logada monta o RequireAuth de novo; com isto, a partir da segunda
 * tela ela já nasce com a sessão, em vez de piscar o carregando e redesenhar o
 * painel inteiro a cada clique no menu. O Supabase continua sendo consultado e
 * corrige na hora se a sessão tiver mudado. Só é gravada no navegador.
 */
let known: Session | null | undefined;

function remember(session: Session | null) {
  // outra conta (ou nenhuma): o que o painel guardou da anterior vai embora
  if (known !== undefined && known?.user.id !== session?.user.id) forgetKept();
  known = session;
}

/** A sessão atual do Supabase, acompanhando login, logout e renovação de token. */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>(() => ({ loading: supabaseConfigured && known === undefined, session: known ?? null }));

  useEffect(() => {
    if (!supabaseConfigured) return;
    let ativo = true;
    let desinscrever: (() => void) | undefined;

    // a biblioteca chega depois da primeira pintura: a tela mostra o estado de
    // carregando que já mostrava, e a sessão preenche quando ela responde
    getSupabase().then((supabase) => {
      if (!supabase || !ativo) return;
      supabase.auth.getSession().then(({ data }) => {
        remember(data.session);
        if (ativo) setState({ loading: false, session: data.session });
      });
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        remember(session);
        if (ativo) setState({ loading: false, session });
      });
      desinscrever = () => data.subscription.unsubscribe();
    });

    return () => {
      ativo = false;
      desinscrever?.();
    };
  }, []);

  return state;
}
