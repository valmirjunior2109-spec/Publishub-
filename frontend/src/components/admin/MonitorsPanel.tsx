"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { downloadCsv } from "@/lib/csv";

/** Os monitores diários (public.monitors): quem liga, quem confirmou, quando rodou e quantos alertas saíram. */

interface Monitor {
  id: string;
  url: string;
  email: string;
  locale: string;
  status: string;
  baseline_check_id: string | null;
  last_run_at: string | null;
  last_alert_at: string | null;
  alerts_sent: number;
  created_at: string;
  confirmed_at: string | null;
  stopped_at: string | null;
}

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "–");
const TONE: Record<string, string> = { active: "border-success text-success", pending: "border-warning text-warning", stopped: "border-line text-muted" };

export function MonitorsPanel({ token }: { token: string }) {
  const [items, setItems] = useState<Monitor[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/monitors", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
    const body = (await response.json().catch(() => ({}))) as { monitors?: Monitor[]; error?: { message?: string } };
    if (response.status === 403) return setHidden(true);
    if (!response.ok || !body.monitors) {
      setItems(null);
      return setError(body.error?.message ?? "Could not load the monitors.");
    }
    setError(null);
    setItems(body.monitors);
  }, [token]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  if (hidden) return null;
  const count = (status: string) => items?.filter((m) => m.status === status).length ?? 0;

  return (
    <section aria-labelledby="monitors-admin-heading" className="rounded-xl border border-line p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="monitors-admin-heading" className="text-xl font-semibold">
          Daily monitors{items ? ` (${items.length})` : ""}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => items && downloadCsv("publishub-monitors.csv", items as unknown as Record<string, unknown>[])} disabled={!items?.length}>
            Export CSV
          </Button>
          <Button variant="ghost" onClick={() => void load()}>
            Refresh
          </Button>
        </div>
      </div>
      <p className="mt-1 text-muted">Apps whose public pages are checked every day. An alert goes out only when a new problem shows up.</p>
      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-critical bg-critical-soft p-4 font-semibold text-critical">
          {error}
        </p>
      )}
      {items && (
        <>
          <dl className="mt-5 grid grid-cols-3 gap-2 sm:max-w-md sm:gap-3">
            {["active", "pending", "stopped"].map((status) => (
              <div key={status} className="rounded-lg border border-line p-3">
                <dt className="text-sm capitalize text-muted">{status}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{count(status)}</dd>
              </div>
            ))}
          </dl>
          <ul className="mt-5 grid gap-3">
            {items.length ? (
              items.map((m) => (
                <li key={m.id} className="rounded-lg border border-line bg-card p-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className={`rounded-sm border px-2 py-0.5 font-semibold ${TONE[m.status] ?? ""}`}>{m.status}</span>
                    <span className="text-muted">since {when(m.created_at)}</span>
                  </div>
                  <p className="mt-2 break-all font-mono text-sm">{m.url}</p>
                  <p className="mt-1 text-sm">
                    <a href={`mailto:${m.email}`} className="break-all">
                      {m.email}
                    </a>
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    Last run {when(m.last_run_at)} · {m.alerts_sent} {m.alerts_sent === 1 ? "alert" : "alerts"}
                    {m.last_alert_at ? ` (last ${when(m.last_alert_at)})` : ""}
                    {m.baseline_check_id && (
                      <>
                        {" · "}
                        <a href={`${m.locale === "pt" ? "/pt" : ""}/check/${m.baseline_check_id}`} target="_blank" rel="noopener noreferrer">
                          Latest report
                        </a>
                      </>
                    )}
                  </p>
                </li>
              ))
            ) : (
              <li className="text-muted">No monitors yet.</li>
            )}
          </ul>
        </>
      )}
    </section>
  );
}
