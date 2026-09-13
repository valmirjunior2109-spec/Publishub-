"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useSession } from "@/lib/session";
import { getSupabase, supabaseConfigured } from "@/lib/supabase";

type AuthErrorKey =
  | "invalidEmail"
  | "shortPassword"
  | "missingPassword"
  | "invalidCredentials"
  | "emailNotConfirmed"
  | "alreadyRegistered"
  | "providerDisabled"
  | "rateLimit"
  | "network"
  | "generic";

function classify(error: { message?: string } | null): AuthErrorKey {
  const message = (error?.message || "").toLowerCase();
  if (message.includes("invalid login credentials")) return "invalidCredentials";
  if (message.includes("email not confirmed")) return "emailNotConfirmed";
  if (message.includes("already registered") || message.includes("already been registered")) return "alreadyRegistered";
  if (message.includes("provider is not enabled") || message.includes("unsupported provider")) return "providerDisabled";
  if (message.includes("password")) return "shortPassword";
  if (message.includes("rate limit") || message.includes("too many")) return "rateLimit";
  if (message.includes("fetch") || message.includes("network")) return "network";
  return "generic";
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  );
}

interface AuthFormProps {
  mode: "login" | "signup";
}

export function AuthForm({ mode }: AuthFormProps) {
  const t = useTranslations("Auth");
  const tErrors = useTranslations("Errors");
  const router = useRouter();
  const { session } = useSession();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<AuthErrorKey | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const isSignup = mode === "signup";

  useEffect(() => {
    if (session) router.replace("/dashboard");
  }, [session, router]);

  const update = (field: keyof typeof form) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [field]: event.target.value }));

  // O Google devolve para /dashboard com a sessão na URL; o supabase-js lê e o
  // RequireAuth deixa passar. Se der certo, o navegador sai desta página.
  async function google() {
    setError(null);
    setNotice(null);
    setGoogleBusy(true);
    const { error: authError } = await getSupabase()!.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (authError) {
      setGoogleBusy(false);
      setError(classify(authError));
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const email = form.email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("invalidEmail");
    if (isSignup && form.password.length < 8) return setError("shortPassword");
    if (!form.password) return setError("missingPassword");

    setSubmitting(true);
    const supabase = getSupabase()!;
    const { data, error: authError } = isSignup
      ? await supabase.auth.signUp({
          email,
          password: form.password,
          options: { data: { full_name: form.name.trim() || null }, emailRedirectTo: `${window.location.origin}/dashboard` },
        })
      : await supabase.auth.signInWithPassword({ email, password: form.password });
    setSubmitting(false);

    if (authError) return setError(classify(authError));
    if (isSignup && !data.session) return setNotice(t("confirmEmail"));
    router.replace("/dashboard");
  }

  if (!supabaseConfigured) {
    return <p className="rounded-sm border border-refuted bg-paper-raised p-4 text-sm text-refuted">{tErrors("notConfigured")}</p>;
  }

  const busy = submitting || googleBusy;

  return (
    <div className="mx-auto mt-14 flex w-full max-w-[420px] flex-col gap-5 rounded-md border border-line bg-paper-raised p-7 sm:p-8">
      <div>
        <h1 className="font-display text-[30px] font-medium tracking-tight">{isSignup ? t("signUpTitle") : t("signInTitle")}</h1>
        <p className="mt-1.5 text-sm text-ink-muted">{isSignup ? t("signUpLead") : t("signInLead")}</p>
      </div>

      <Button variant="secondary" className="h-11 w-full" onClick={google} disabled={busy}>
        {googleBusy ? <span className="h-3.5 w-3.5 animate-spin rounded-full border border-line border-t-ink" /> : <GoogleMark />}
        {t("google")}
      </Button>

      <div role="separator" className="flex items-center gap-3 text-[12.5px] text-ink-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
        {t("orEmail")}
      </div>

      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {isSignup && (
          <label className="flex flex-col gap-1.5 text-[13px] font-medium">
            {t("name")}
            <Input autoComplete="name" placeholder={t("namePlaceholder")} value={form.name} onChange={update("name")} maxLength={80} />
          </label>
        )}
        <label className="flex flex-col gap-1.5 text-[13px] font-medium">
          {t("email")}
          <Input type="email" autoComplete="email" placeholder={t("emailPlaceholder")} required value={form.email} onChange={update("email")} />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-medium">
          {t("password")}
          <Input
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            placeholder={isSignup ? t("passwordNewPlaceholder") : t("passwordPlaceholder")}
            required
            minLength={isSignup ? 8 : undefined}
            value={form.password}
            onChange={update("password")}
          />
        </label>

        {error && (
          <p role="alert" className="rounded-sm border border-refuted bg-paper p-3 text-sm text-refuted">
            {t(`errors.${error}`)}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-sm border border-confirmed bg-paper p-3 text-sm text-confirmed">
            {notice}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={busy}>
          {submitting && <span className="h-3.5 w-3.5 animate-spin rounded-full border border-paper-raised border-t-transparent" />}
          {isSignup ? t("submitSignUp") : t("submitSignIn")}
        </Button>
      </form>

      <p className="text-center text-[13px] text-ink-muted">
        {isSignup ? t("hasAccount") : t("noAccount")}{" "}
        <Link href={isSignup ? "/login" : "/signup"} className="font-medium text-ink underline-offset-2 hover:underline">
          {isSignup ? t("enter") : t("createAccount")}
        </Link>
      </p>
    </div>
  );
}
