"use client";

import { useEffect, useState } from "react";
import { getSupabase, supabaseConfigured } from "./supabase";

/** Current Supabase session, kept in sync with login/logout/token refresh. */
export function useSession() {
  const [state, setState] = useState({ loading: supabaseConfigured, session: null });

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setState({ loading: false, session: data.session }));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setState({ loading: false, session }));
    return () => data.subscription.unsubscribe();
  }, []);

  return state;
}
