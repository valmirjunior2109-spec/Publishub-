"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { downloadCsv } from "@/lib/csv";

/**
 * As reservas Founding Customers no /admin: quem reservou (nada cobrado ainda), quem já foi ativado no
 * lançamento e quem cancelou. A ativação é feita por scripts/founding-activate.mjs, não por aqui.
 */

interface Commitment {
  email: string | null;
  status: "reserved" | "activated" | "canceled";
  utm_source: string | null;
  utm_campaign: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  first_charge_at: string | null;
  created_at: string;
}
interface Report {
  totals: { reserved: number; activated: number; canceled: number };
  commitments: Commitment[];
}

const TH = "border-b border-line-strong px-3 py-2 text-left text-sm font-semibold";
const TD = "border-b border-line px-3 py-2 align-top text-sm";
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "");

export function FoundingPanel({ token }: { token: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/founding", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
    const body = (await response.json().catch(() => ({}))) as { report?: Report; error?: { message?: string } };
    if (response.status === 403) return setHidden(true);
    if (!response.ok || !body.report) {
      setReport(null);
      return setError(body.error?.message ?? "Could not load the Founding Customers reservations.");
    }
    setError(null);
    setReport(body.report);
  }, [token]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  if (hidden) return null;
  return (
    <section aria-labelledby="founding-heading" className="rounded-xl border border-line p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="founding-heading" className="text-xl font-semibold">
          Founding Customers{report ? ` (${report.totals.reserved} reserved)` : ""}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => report && downloadCsv("publishub-founding.csv", report.commitments as unknown as Record<string, unknown>[])} disabled={!report?.commitments.length}>
            Export CSV
          </Button>
          <Button variant="ghost" onClick={() => void load()}>
            Refresh
          </Button>
        </div>
      </div>
      <p className="mt-1 text-muted">Reservations: card saved with Stripe, $0 charged. They become subscriptions only when you run the launch script.</p>
      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-critical bg-critical-soft p-4 font-semibold text-critical">
          {error}
        </p>
      )}
      {report && (
        <>
          <dl className="mt-5 grid grid-cols-3 gap-3 sm:max-w-md">
            {(["reserved", "activated", "canceled"] as const).map((k) => (
              <div key={k} className="rounded-lg border border-line p-3">
                <dt className="text-sm capitalize text-muted">{k}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{report.totals[k]}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 overflow-x-auto" tabIndex={0} role="region" aria-label="Founding Customers reservations">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr>
                  {["Email", "Status", "Source", "Reserved", "First charge", "Subscription"].map((h) => (
                    <th key={h} scope="col" className={TH}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.commitments.length ? (
                  report.commitments.map((c, i) => (
                    <tr key={`${c.email}-${i}`}>
                      <td className={TD}>{c.email}</td>
                      <td className={TD}>{c.status}</td>
                      <td className={TD}>{[c.utm_source, c.utm_campaign].filter(Boolean).join(" / ") || "direct"}</td>
                      <td className={TD}>{when(c.created_at)}</td>
                      <td className={TD}>{when(c.first_charge_at)}</td>
                      <td className={TD}>{c.stripe_subscription_id ?? ""}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className={`${TD} text-muted`} colSpan={6}>
                      No reservations yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
