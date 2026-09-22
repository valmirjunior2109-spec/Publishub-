"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, supabaseConfigured } from "./supabase";

interface SessionState {
  loading: boolean;
  session: Session | null;
}

/** A sessão atual do Supabase, acompanhando login, logout e renovação de token. */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ loading: supabaseConfigured, session: null });

  useEffect(() => {
    if (!supabaseConfigured) return;
    let ativo = true;
    let desinscrever: (() => void) | undefined;

    // a biblioteca chega depois da primeira pintura: a tela mostra o estado de
    // carregando que já mostrava, e a sessão preenche quando ela responde
    getSupabase().then((supabase) => {
      if (!supabase || !ativo) return;
      supabase.auth.getSession().then(({ data }) => {
        if (ativo) setState({ loading: false, session: data.session });
      });
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
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
