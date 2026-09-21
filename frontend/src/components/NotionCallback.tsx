"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { buttonClasses } from "@/components/ui/Button";
import { RETURN_KEY } from "@/components/NotionSend";
import { apiFetch, ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useErrorText } from "@/lib/useErrorText";

/** O que deu errado do nosso lado; o resto (autorização negada, sessão vencida) se lê da URL e da sessão. */
type Failure = { message: string } | null;

/** Para onde voltar depois de conectar: a análise de onde a pessoa saiu. */
function returnPath(): string {
  try {
    const saved = window.localStorage.getItem(RETURN_KEY);
    window.localStorage.removeItem(RETURN_KEY);
    // só caminhos internos: o valor vem do navegador de quem clicou
    if (saved && saved.startsWith("/") && !saved.startsWith("//")) return saved;
  } catch {
    // sem localStorage a volta cai no painel
  }
  return "/dashboard";
}

/**
 * O Notion manda a pessoa de volta para cá com um código (?code=…&state=…). O
 * código é trocado pelo token no backend — a tela nunca vê token nenhum — e a
 * pessoa volta para a análise de onde saiu.
 */
export function NotionCallback() {
  const t = useTranslations("Analysis.notion.callback");
  const params = useSearchParams();
  const router = useRouter();
  const { loading, session } = useSession();
  const describe = useErrorText();
  const code = params.get("code");
  const state = params.get("state");
  const denied = params.get("error");
  const [failure, setFailure] = useState<Failure>(null);

  // a autorização não voltou completa (a pessoa cancelou no Notion, ou o link foi aberto na mão)
  const incomplete = Boolean(denied) || !code || !state;
  // a sessão venceu enquanto ela estava no Notion: o código não serve mais para nós
  const signedOut = !incomplete && !loading && !session;

  useEffect(() => {
    if (loading || incomplete || !session) return;
    let cancelled = false;
    (async () => {
      try {
        await apiFetch("/api/notion/connect", { method: "POST", body: { code, state } });
        if (!cancelled) router.replace(returnPath());
      } catch (err) {
        if (!cancelled) setFailure({ message: describe(err as ApiError) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, state, incomplete, loading, session, router, describe]);

  return (
    <main className="mx-auto max-w-page px-5 py-20 lg:px-16">
      <div className="mx-auto max-w-[520px]">
        {!incomplete && !signedOut && !failure ? (
          <div className="flex items-center gap-3" aria-busy="true">
            <span className="h-4 w-4 animate-spin rounded-full border border-line border-t-ink" />
            <p className="text-[15px]">{t("connecting")}</p>
          </div>
        ) : (
          <>
            <h1 className="font-display text-[26px] font-medium tracking-[-0.01em]">{t("failedTitle")}</h1>
            <p className="mt-3 text-[14.5px] leading-relaxed text-ink-muted">{incomplete ? t("denied") : signedOut ? t("signedOut") : failure?.message}</p>
            <Link href={signedOut ? "/login" : "/dashboard"} className={buttonClasses("secondary", "md", "mt-6 min-h-11")}>
              {signedOut ? t("signIn") : t("back")}
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
