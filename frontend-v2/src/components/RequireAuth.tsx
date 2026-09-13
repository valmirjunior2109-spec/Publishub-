"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { useTranslations } from "next-intl";
import { useSession } from "@/lib/session";
import { supabaseConfigured } from "@/lib/supabase";

interface RequireAuthProps {
  children: (session: Session) => ReactNode;
}

/**
 * Portão de páginas privadas no cliente (manda para /login). A proteção de
 * verdade está no backend e no RLS — isto só melhora a experiência.
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const { loading, session } = useSession();
  const router = useRouter();
  const t = useTranslations("Errors");

  useEffect(() => {
    if (supabaseConfigured && !loading && !session) router.replace("/login");
  }, [loading, session, router]);

  if (!supabaseConfigured) {
    return (
      <main className="mx-auto max-w-page px-5 py-16">
        <p className="rounded-sm border border-refuted bg-paper-raised p-4 text-sm text-refuted">{t("notConfigured")}</p>
      </main>
    );
  }

  if (loading || !session) {
    return (
      <div className="flex justify-center py-24" aria-busy="true">
        <span className="h-5 w-5 animate-spin rounded-full border border-line border-t-ink" />
      </div>
    );
  }

  return <>{children(session)}</>;
}
