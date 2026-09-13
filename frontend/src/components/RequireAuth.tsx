"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { useTranslations } from "next-intl";
import { LogoMark } from "@/components/Logo";
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
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4" aria-busy="true">
        <LogoMark size={40} className="animate-pulse" />
        <span className="h-4 w-4 animate-spin rounded-full border border-line border-t-accent" />
      </div>
    );
  }

  return <>{children(session)}</>;
}
