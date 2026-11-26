"use client";

import { useCallback, useEffect, useId, useState, type FormEvent } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PixelLoader } from "@/components/ui/Pixel";
import { downloadCsv as download } from "@/lib/csv";
import { getSupabase, supabaseConfigured } from "@/lib/supabase-browser";
import { FeedbackPanel } from "./FeedbackPanel";
import { FoundingPanel } from "./FoundingPanel";
import { WaitlistPanel } from "./WaitlistPanel";

/**
 * O painel do dono: entra com o login do Supabase (o servidor confere ADMIN_EMAIL) e mostra a lista de espera,
 * o Founding Customers e o registro histórico das reservas de US$ 49 do produto descontinuado.
 */

interface ReservationItem {
  email: string | null;
  store_url: string | null;
  status: string;
  amount: number | null;
  currency: string | null;
  stripe_session_id: string;
  created_at: string;
  paid_at: string | null;
}
interface AdminData {
  admin: string;
  reservations: ReservationItem[];
}

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "");

function Login({ supabase }: { supabase: SupabaseClient }) {
  const emailId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function withPassword(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message);
    setBusy(false);
  }

  async function withLink() {
    if (!email) return setMessage("Enter your email first.");
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/admin`, shouldCreateUser: false } });
    setMessage(error ? error.message : "Check your inbox for the sign-in link.");
    setBusy(false);
  }

  return (
    <section aria-labelledby="login-heading" className="mt-8 max-w-md rounded-md border border-line-strong bg-card p-6 shadow-[5px_5px_0_0_var(--line)]">
      <h2 id="login-heading" className="text-xl font-semibold">
        Sign in
      </h2>
      <form onSubmit={withPassword} className="mt-4 space-y-4">
        <div>
          <label htmlFor={emailId} className="block font-semibold">
            Email
          </label>
          <Input id={emailId} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1" />
        </div>
        <div>
          <label htmlFor={passwordId} className="block font-semibold">
            Password
          </label>
          <Input id={passwordId} type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1" />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={busy}>
            Sign in
          </Button>
          <Button variant="secondary" onClick={withLink} disabled={busy}>
            Email me a sign-in link
          </Button>
        </div>
        <p role="status" className="text-[15px]">
          {message ?? ""}
        </p>
      </form>
    </section>
  );
}

const TH = "border-b border-line-strong px-3 py-2 text-left text-sm font-semibold";
const TD = "border-b border-line px-3 py-2 align-top text-sm";

export function AdminApp() {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const pending = getSupabase();
    if (!pending) return;
    let unsubscribe: (() => void) | undefined;
    void pending.then(async (client) => {
      setSupabase(client);
      const { data: current } = await client.auth.getSession();
      setSession(current.session);
      setReady(true);
      unsubscribe = client.auth.onAuthStateChange((_event, next) => setSession(next)).data.subscription.unsubscribe;
    });
    return () => unsubscribe?.();
  }, []);

  const load = useCallback(async () => {
    if (!session) return;
    const response = await fetch("/api/admin/data", { headers: { authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
    const body = (await response.json().catch(() => ({}))) as AdminData & { error?: { message?: string } };
    if (!response.ok) {
      setData(null);
      setError(response.status === 403 ? "This account doesn't have admin access." : (body.error?.message ?? "Could not load the admin data."));
      return;
    }
    setError(null);
    setData(body);
  }, [session]);

  useEffect(() => {
    // a primeira leitura depois do login; as seguintes, pelo botão Refresh e ao fim de um lote
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  if (!supabaseConfigured) return <p className="mt-6">Supabase isn&apos;t configured in this environment.</p>;
  if (!ready || !supabase)
    return (
      <p role="status" className="mt-6 flex items-center gap-3 font-pixel text-lg text-accent">
        <PixelLoader />
        Loading…
      </p>
    );
  if (!session) return <Login supabase={supabase} />;

  return (
    <div className="mt-6 space-y-10">
      <div className="flex flex-wrap items-center gap-3">
        <p>Signed in as {session.user.email}.</p>
        <Button variant="secondary" onClick={() => void load()}>
          Refresh
        </Button>
        <Button variant="ghost" onClick={() => void supabase.auth.signOut()}>
          Sign out
        </Button>
      </div>
      {error && (
        <p role="alert" className="rounded-lg border border-critical bg-critical-soft p-4 font-semibold text-critical">
          {error}
        </p>
      )}
      {/* cada painel carrega sozinho: um erro num não esconde os outros */}
      <FeedbackPanel token={session.access_token} />
      <WaitlistPanel token={session.access_token} />
      <FoundingPanel token={session.access_token} />
      {data && (
        <>
          <section aria-labelledby="reservations-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="reservations-heading" className="text-xl font-semibold">
                Legacy reservations ({data.reservations.length})
              </h2>
              <Button variant="secondary" onClick={() => download("publishub-legacy-reservations.csv", data.reservations as unknown as Record<string, unknown>[])} disabled={!data.reservations.length}>
                Export reservations CSV
              </Button>
            </div>
            <p className="mt-1 text-muted">One-time $49 reservations from the discontinued product. No longer sold; kept as a payment record for refunds.</p>
            <div className="mt-3 overflow-x-auto" tabIndex={0} role="region" aria-label="Legacy reservations table">
              <table className="w-full min-w-[700px] border-collapse">
                <thead>
                  <tr>
                    <th scope="col" className={TH}>Email</th>
                    <th scope="col" className={TH}>Store</th>
                    <th scope="col" className={TH}>Status</th>
                    <th scope="col" className={TH}>Amount</th>
                    <th scope="col" className={TH}>Created</th>
                    <th scope="col" className={TH}>Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {data.reservations.map((reservation) => (
                    <tr key={reservation.stripe_session_id}>
                      <td className={TD}>{reservation.email}</td>
                      <td className={TD}>{reservation.store_url}</td>
                      <td className={TD}>{reservation.status}</td>
                      <td className={TD}>{reservation.amount !== null ? `${(reservation.amount / 100).toFixed(2)} ${(reservation.currency ?? "").toUpperCase()}` : ""}</td>
                      <td className={TD}>{when(reservation.created_at)}</td>
                      <td className={TD}>{when(reservation.paid_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
