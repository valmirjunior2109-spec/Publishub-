"use client";

import { useCallback, useEffect, useId, useState, type FormEvent } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getSupabase, supabaseConfigured } from "@/lib/supabase-browser";

/**
 * O painel do dono: entra com o login do Supabase (o servidor confere ADMIN_EMAIL),
 * enfileira scans em lote a partir de um CSV e lista scans, leads e reservas.
 */

interface ScanItem {
  id: string;
  url: string;
  status: string;
  risk_score: number | null;
  is_shopify: boolean | null;
  source: string;
  created_at: string;
  error: string | null;
  /** O melhor e-mail de contato achado nas páginas públicas da loja, e os outros (até 3 no total). */
  best_email: string | null;
  other_emails: string[];
}
interface LeadItem {
  email: string;
  store_url: string | null;
  scan_id: string | null;
  source: string | null;
  source_page: string | null;
  created_at: string;
}
interface ReservationItem {
  email: string | null;
  store_url: string | null;
  scan_id: string | null;
  status: string;
  amount: number | null;
  currency: string | null;
  stripe_session_id: string;
  created_at: string;
  paid_at: string | null;
}
interface AdminData {
  admin: string;
  mode: "vercel" | "worker";
  scans: ScanItem[];
  leads: LeadItem[];
  reservations: ReservationItem[];
}

const reportUrl = (id: string) => `${window.location.origin}/scan/${id}`;
/** O CSV de prospecção: uma linha por scan, com o melhor e-mail da loja. */
const scansCsvRows = (scans: ScanItem[]) =>
  scans.map((scan) => ({
    store_url: scan.url,
    best_email: scan.best_email ?? "",
    other_emails: scan.other_emails.join("; "),
    risk_score: scan.risk_score ?? "",
    report_url: reportUrl(scan.id),
  }));
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "");

/** As URLs de um CSV: qualquer célula com cara de domínio, sem repetir; o cabeçalho cai sozinho. */
export function urlsFromCsv(text: string): string[] {
  const found = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    for (const cell of line.split(/[,;\t]/)) {
      const value = cell.trim().replace(/^"|"$/g, "").trim();
      if (/^(https?:\/\/)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(value)) found.add(value);
    }
  }
  return [...found];
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const columns = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [columns.join(","), ...rows.map((row) => columns.map((column) => escape(row[column])).join(","))].join("\n");
}

function download(name: string, rows: Record<string, unknown>[]) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

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
    <section aria-labelledby="login-heading" className="mt-8 max-w-md rounded-xl border border-line p-6">
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

function BatchScan({ token, mode, onDone }: { token: string; mode: AdminData["mode"]; onDone: () => void }) {
  const fileId = useId();
  const [urls, setUrls] = useState<string[]>([]);
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function readFile(file: File | undefined) {
    if (!file) return setUrls([]);
    const found = urlsFromCsv(await file.text());
    setUrls(found);
    setStatus(found.length ? `${found.length} store URLs found in the file.` : "No URLs found in that file.");
  }

  async function run() {
    setBusy(true);
    setStatus("Queuing scans…");
    const response = await fetch("/api/admin/scans", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ urls }) });
    const data = (await response.json().catch(() => ({}))) as { created?: { id: string }[]; errors?: { input: string; error: string }[]; error?: { message?: string } };
    if (!response.ok) {
      setStatus(data.error?.message ?? "Could not queue the scans.");
      setBusy(false);
      return;
    }
    const created = data.created ?? [];
    const skipped = data.errors?.length ? ` ${data.errors.length} skipped (invalid URL).` : "";
    if (mode === "worker") {
      setStatus(`${created.length} scans queued. The worker will process them.${skipped}`);
    } else {
      // um scan por chamada, dois de cada vez: cada um tem os 60 s da função
      let finished = 0;
      const queue = [...created];
      const worker = async () => {
        for (let item = queue.shift(); item; item = queue.shift()) {
          await fetch(`/api/scan/${item.id}/run`, { method: "POST", headers: { authorization: `Bearer ${token}` } }).catch(() => undefined);
          finished += 1;
          setStatus(`Scanning: ${finished} of ${created.length} done.${skipped}`);
        }
      };
      setStatus(`Scanning: 0 of ${created.length} done. Keep this page open.${skipped}`);
      await Promise.all([worker(), worker()]);
      setStatus(`Finished ${created.length} scans.${skipped}`);
    }
    setBusy(false);
    onDone();
  }

  return (
    <section aria-labelledby="batch-heading" className="rounded-xl border border-line p-6">
      <h2 id="batch-heading" className="text-xl font-semibold">
        Batch scan from CSV
      </h2>
      <p className="mt-1 text-muted">One store URL per row (any column). Up to 100 per batch. Mode: {mode}.</p>
      <label htmlFor={fileId} className="mt-4 block font-semibold">
        CSV file
      </label>
      <input id={fileId} type="file" accept=".csv,text/csv,text/plain" onChange={(event) => readFile(event.target.files?.[0])} className="mt-1 block min-h-11" disabled={busy} />
      <Button className="mt-4" onClick={run} disabled={busy || !urls.length}>
        {busy ? "Working…" : `Scan ${urls.length || ""} stores`.trim()}
      </Button>
      <p role="status" aria-live="polite" className="mt-3 text-[15px]">
        {status}
      </p>
    </section>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="min-h-9 rounded-md border border-line-strong px-2 text-sm font-semibold"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? "Copied" : "Copy link"}
    </button>
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
  if (!ready || !supabase) return <p className="mt-6">Loading…</p>;
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
      {data && (
        <>
          <BatchScan token={session.access_token} mode={data.mode} onDone={() => void load()} />

          <section aria-labelledby="scans-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="scans-heading" className="text-xl font-semibold">
                Scans ({data.scans.length})
              </h2>
              <Button variant="secondary" onClick={() => download("publishub-scans.csv", scansCsvRows(data.scans))} disabled={!data.scans.length}>
                Export scans CSV
              </Button>
            </div>
            <div className="mt-3 overflow-x-auto" tabIndex={0} role="region" aria-label="Scans table">
              <table className="w-full min-w-[880px] border-collapse">
                <thead>
                  <tr>
                    <th scope="col" className={TH}>Store</th>
                    <th scope="col" className={TH}>Best email</th>
                    <th scope="col" className={TH}>Status</th>
                    <th scope="col" className={TH}>Risk</th>
                    <th scope="col" className={TH}>Shopify</th>
                    <th scope="col" className={TH}>Source</th>
                    <th scope="col" className={TH}>Created</th>
                    <th scope="col" className={TH}>Report</th>
                  </tr>
                </thead>
                <tbody>
                  {data.scans.map((scan) => (
                    <tr key={scan.id}>
                      <td className={TD}>{scan.url}</td>
                      <td className={TD}>
                        {scan.best_email ? (
                          <>
                            <a href={`mailto:${scan.best_email}`}>{scan.best_email}</a>
                            {scan.other_emails.length ? <span className="block text-muted">{scan.other_emails.join(", ")}</span> : null}
                          </>
                        ) : (
                          <span className="text-muted">None found</span>
                        )}
                      </td>
                      <td className={TD}>
                        {scan.status}
                        {scan.error ? <span className="block text-muted">{scan.error}</span> : null}
                      </td>
                      <td className={TD}>{scan.risk_score ?? ""}</td>
                      <td className={TD}>{scan.is_shopify === null ? "" : scan.is_shopify ? "Yes" : "No"}</td>
                      <td className={TD}>{scan.source}</td>
                      <td className={TD}>{when(scan.created_at)}</td>
                      <td className={TD}>
                        <span className="flex flex-wrap items-center gap-2">
                          <a href={`/scan/${scan.id}`}>Open</a>
                          <CopyButton text={reportUrl(scan.id)} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="leads-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="leads-heading" className="text-xl font-semibold">
                Leads ({data.leads.length})
              </h2>
              <Button variant="secondary" onClick={() => download("publishub-leads.csv", data.leads as unknown as Record<string, unknown>[])} disabled={!data.leads.length}>
                Export leads CSV
              </Button>
            </div>
            <div className="mt-3 overflow-x-auto" tabIndex={0} role="region" aria-label="Leads table">
              <table className="w-full min-w-[600px] border-collapse">
                <thead>
                  <tr>
                    <th scope="col" className={TH}>Email</th>
                    <th scope="col" className={TH}>Store</th>
                    <th scope="col" className={TH}>Source</th>
                    <th scope="col" className={TH}>Found on</th>
                    <th scope="col" className={TH}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {data.leads.map((lead) => (
                    <tr key={`${lead.email}-${lead.scan_id}`}>
                      <td className={TD}>{lead.email}</td>
                      <td className={TD}>{lead.store_url}</td>
                      <td className={TD}>{lead.source === "auto_extract" ? "Found on store site" : lead.source}</td>
                      <td className={TD}>{lead.source_page ?? ""}</td>
                      <td className={TD}>{when(lead.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="reservations-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="reservations-heading" className="text-xl font-semibold">
                Reservations ({data.reservations.length})
              </h2>
              <Button variant="secondary" onClick={() => download("publishub-reservations.csv", data.reservations as unknown as Record<string, unknown>[])} disabled={!data.reservations.length}>
                Export reservations CSV
              </Button>
            </div>
            <div className="mt-3 overflow-x-auto" tabIndex={0} role="region" aria-label="Reservations table">
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
