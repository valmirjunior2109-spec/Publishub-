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
    const supabase = getSupabase();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setState({ loading: false, session: data.session }));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setState({ loading: false, session }));
    return () => data.subscription.unsubscribe();
  }, []);

  return state;
}
