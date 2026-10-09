"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useSession } from "@/lib/session";
import { getSupabase, supabaseConfigured } from "@/lib/supabase";

type ResetErrorKey = "invalidEmail" | "shortPassword" | "samePassword" | "rateLimit" | "network" | "generic";

function classify(error: { message?: string } | null): ResetErrorKey {
  const message = (error?.message || "").toLowerCase();
  if (message.includes("different from the old")) return "samePassword";
  if (message.includes("rate limit") || message.includes("too many") || message.includes("security purposes")) return "rateLimit";
  if (message.includes("fetch") || message.includes("network")) return "network";
  return "generic";
}

/* O Supabase devolve o link vencido (ou já usado) com o erro na URL, em vez da sessão. */
function linkExpired(): boolean {
  return typeof window !== "undefined" && /error_code=|error=access_denied/.test(window.location.hash + window.location.search);
}

/**
 * Esqueci a senha, numa página só.
 *
 * Sem sessão: pede o e-mail e o Supabase manda o link. O link volta para esta
 * mesma página já com a sessão (o supabase-js lê da URL), e aí ela pede a senha
 * nova. Quem já está logado e abre a página troca a senha do mesmo jeito.
 *
 * A resposta do pedido é sempre a mesma, exista a conta ou não: a tela não
 * pode servir para descobrir quem tem conta aqui.
 */
export function PasswordReset() {
  const t = useTranslations("Auth.reset");
  const tAuth = useTranslations("Auth");
  const tErrors = useTranslations("Errors");
  const router = useRouter();
  const { loading, session } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<ResetErrorKey | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  // esta tela só pinta depois que a sessão carrega no navegador: sem HTML do servidor para divergir
  const [expired] = useState(linkExpired);

  async function requestLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const address = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(address)) return setError("invalidEmail");
    setBusy(true);
    const supabase = (await getSupabase())!;
    const { error: authError } = await supabase.auth.resetPasswordForEmail(address, { redirectTo: `${window.location.origin}/redefinir-senha` });
    setBusy(false);
    if (authError) return setError(classify(authError));
    setDone(true);
  }

  async function saveNew(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) return setError("shortPassword");
    setBusy(true);
    const supabase = (await getSupabase())!;
    const { error: authError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (authError) return setError(classify(authError));
    setDone(true);
    window.setTimeout(() => router.replace("/dashboard"), 1500);
  }

  if (!supabaseConfigured) {
    return <p className="rounded-lg border border-refuted bg-paper-raised p-4 text-sm text-refuted">{tErrors("notConfigured")}</p>;
  }

  if (loading) {
    return (
      <div className="flex w-full max-w-[540px] justify-center py-16" aria-busy="true">
        <span className="h-5 w-5 animate-spin rounded-full border border-line border-t-accent" />
      </div>
    );
  }

  const setting = Boolean(session);
  const errorText = error ? (error === "samePassword" ? t("samePassword") : tAuth(`errors.${error}`)) : null;

  return (
    <div className="mx-auto flex w-full max-w-[540px] flex-col gap-6 rounded-xl border border-line bg-paper-raised p-7 sm:p-10 lg:mx-0 [&_button]:h-12 [&_button]:text-base [&_input]:h-12 [&_input]:text-base">
      <div>
        <h1 className="font-display font-semibold text-[40px] leading-[1.05] sm:text-[46px] tracking-[-0.045em]">{setting ? t("newTitle") : t("requestTitle")}</h1>
        <p className="mt-2 text-[15.5px] text-ink-muted">{setting ? t("newLead", { email: session?.user.email ?? "" }) : t("requestLead")}</p>
      </div>

      {!setting && expired && !done && (
        <p role="alert" className="rounded-lg border border-pending bg-paper p-3 text-sm text-pending">
          {t("expired")}
        </p>
      )}

      {done ? (
        <p role="status" className="rounded-lg border border-confirmed bg-paper p-3 text-sm text-confirmed">
          {setting ? t("saved") : t("sent")}
        </p>
      ) : (
        <form onSubmit={setting ? saveNew : requestLink} noValidate className="flex flex-col gap-5">
          {setting ? (
            <label className="flex flex-col gap-2 text-[14px] font-medium">
              {t("newPassword")}
              <Input type="password" autoComplete="new-password" placeholder={tAuth("passwordNewPlaceholder")} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
          ) : (
            <label className="flex flex-col gap-2 text-[14px] font-medium">
              {tAuth("email")}
              <Input type="email" autoComplete="email" placeholder={tAuth("emailPlaceholder")} required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
          )}

          {errorText && (
            <p role="alert" className="rounded-lg border border-refuted bg-paper p-3 text-sm text-refuted">
              {errorText}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <span className="h-3.5 w-3.5 animate-spin rounded-full border border-paper-raised border-t-transparent" />}
            {setting ? t("submitNew") : t("submitRequest")}
          </Button>
        </form>
      )}

      {!setting && (
        <p className="text-center text-[14px] text-ink-muted">
          <Link href="/login" className="font-medium text-ink underline-offset-2 hover:underline">
            {t("backToLogin")}
          </Link>
        </p>
      )}
    </div>
  );
}
