"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase, supabaseConfigured } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import styles from "./AuthForm.module.css";

function friendlyAuthError(error) {
  const message = (error?.message || "").toLowerCase();
  if (message.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (message.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.";
  if (message.includes("already registered") || message.includes("already been registered")) {
    return "Já existe uma conta com este e-mail. Entre em vez de criar outra.";
  }
  if (message.includes("provider is not enabled") || message.includes("unsupported provider")) {
    return "O login com Google ainda não foi ativado neste projeto. Use e-mail e senha por enquanto.";
  }
  if (message.includes("password")) return "A senha precisa ter pelo menos 8 caracteres.";
  if (message.includes("rate limit") || message.includes("too many")) return "Muitas tentativas. Aguarde um pouco e tente novamente.";
  if (message.includes("fetch") || message.includes("network")) return "Não foi possível conectar. Verifique sua internet.";
  return "Não foi possível continuar. Tente novamente.";
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

export default function AuthForm({ mode }) {
  const router = useRouter();
  const { session } = useSession();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const isSignup = mode === "signup";

  useEffect(() => {
    if (session) router.replace("/dashboard");
  }, [session, router]);

  function update(field) {
    return (event) => setForm((f) => ({ ...f, [field]: event.target.value }));
  }

  // O Google devolve para /dashboard com a sessão na URL; o supabase-js lê e o
  // RequireAuth deixa passar. Se der certo, o navegador sai desta página.
  async function google() {
    setError(null);
    setNotice(null);
    setGoogleBusy(true);
    const { error: authError } = await getSupabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (authError) {
      setGoogleBusy(false);
      setError(friendlyAuthError(authError));
    }
  }

  async function submit(event) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const email = form.email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Informe um e-mail válido.");
    if (isSignup && form.password.length < 8) return setError("A senha precisa ter pelo menos 8 caracteres.");
    if (!form.password) return setError("Informe sua senha.");

    setSubmitting(true);
    const supabase = getSupabase();
    const { data, error: authError } = isSignup
      ? await supabase.auth.signUp({
          email,
          password: form.password,
          options: {
            data: { full_name: form.name.trim() || null },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        })
      : await supabase.auth.signInWithPassword({ email, password: form.password });
    setSubmitting(false);

    if (authError) return setError(friendlyAuthError(authError));
    if (isSignup && !data.session) {
      return setNotice("Conta criada! Enviamos um link de confirmação para o seu e-mail. Confirme e depois entre.");
    }
    router.replace("/dashboard");
  }

  if (!supabaseConfigured) {
    return (
      <p className="alert alert-error">
        O frontend não está configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local.
      </p>
    );
  }

  const busy = submitting || googleBusy;

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <h1 className={styles.title}>{isSignup ? "Crie sua conta" : "Bem-vindo de volta"}</h1>
        <p className="muted">{isSignup ? "Leva menos de um minuto. Sem cartão." : "Continue de onde parou."}</p>
      </div>

      <button type="button" className={`btn btn-secondary btn-block ${styles.google}`} onClick={google} disabled={busy}>
        {googleBusy ? <span className="spinner spinner-small" /> : <GoogleMark />}
        Continuar com Google
      </button>

      <div className={styles.divider} role="separator">
        <span>ou com e-mail</span>
      </div>

      <form className={styles.form} onSubmit={submit} noValidate>
        {isSignup && (
          <div className="field">
            <label htmlFor="name">Nome</label>
            <input
              id="name"
              className="input"
              autoComplete="name"
              placeholder="Como você quer ser chamado"
              value={form.name}
              onChange={update("name")}
              maxLength={80}
            />
          </div>
        )}
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="email"
            placeholder="voce@exemplo.com"
            required
            value={form.email}
            onChange={update("email")}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            placeholder={isSignup ? "Mínimo de 8 caracteres" : "Sua senha"}
            required
            minLength={isSignup ? 8 : undefined}
            value={form.password}
            onChange={update("password")}
          />
        </div>

        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="alert alert-success" role="status">
            {notice}
          </p>
        )}

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {submitting && <span className="spinner spinner-small" />}
          {isSignup ? "Criar conta" : "Entrar"}
        </button>
      </form>

      <p className={`muted small ${styles.footer}`}>
        {isSignup ? (
          <>
            Já tem conta? <Link href="/login">Entrar</Link>
          </>
        ) : (
          <>
            Não tem conta? <Link href="/signup">Criar conta</Link>
          </>
        )}
      </p>
    </div>
  );
}
