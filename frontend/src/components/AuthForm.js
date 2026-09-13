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
  if (message.includes("password")) return "A senha precisa ter pelo menos 8 caracteres.";
  if (message.includes("rate limit") || message.includes("too many")) return "Muitas tentativas. Aguarde um pouco e tente novamente.";
  if (message.includes("fetch") || message.includes("network")) return "Não foi possível conectar. Verifique sua internet.";
  return "Não foi possível continuar. Tente novamente.";
}

export default function AuthForm({ mode }) {
  const router = useRouter();
  const { session } = useSession();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const isSignup = mode === "signup";

  useEffect(() => {
    if (session) router.replace("/dashboard");
  }, [session, router]);

  function update(field) {
    return (event) => setForm((f) => ({ ...f, [field]: event.target.value }));
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

  return (
    <form className={`card ${styles.form}`} onSubmit={submit} noValidate>
      <div>
        <h1 className={styles.title}>{isSignup ? "Criar conta" : "Entrar"}</h1>
        <p className="muted small">{isSignup ? "Leva menos de um minuto." : "Continue de onde parou."}</p>
      </div>

      {isSignup && (
        <div className="field">
          <label htmlFor="name">Nome (opcional)</label>
          <input id="name" className="input" autoComplete="name" value={form.name} onChange={update("name")} maxLength={80} />
        </div>
      )}
      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input id="email" className="input" type="email" autoComplete="email" required value={form.email} onChange={update("email")} />
      </div>
      <div className="field">
        <label htmlFor="password">Senha</label>
        <input
          id="password"
          className="input"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          required
          minLength={isSignup ? 8 : undefined}
          value={form.password}
          onChange={update("password")}
        />
        {isSignup && <span className="muted small">Mínimo de 8 caracteres.</span>}
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

      <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
        {submitting && <span className="spinner spinner-small" />}
        {isSignup ? "Criar conta" : "Entrar"}
      </button>

      <p className="muted small">
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
    </form>
  );
}
