"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseConfigured } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";

/**
 * Client-side gate for private pages (redirects to /login). The real
 * protection is on the backend and in RLS — this only improves UX.
 */
export default function RequireAuth({ children }) {
  const { loading, session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (supabaseConfigured && !loading && !session) router.replace("/login");
  }, [loading, session, router]);

  if (!supabaseConfigured) {
    return (
      <div className="container page">
        <p className="alert alert-error">
          O frontend não está configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no arquivo
          .env.local.
        </p>
      </div>
    );
  }

  if (loading || !session) {
    return (
      <div className="center-loader" aria-label="Carregando">
        <div className="spinner" />
      </div>
    );
  }

  return children(session);
}
