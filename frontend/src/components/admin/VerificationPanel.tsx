"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { downloadCsv } from "@/lib/csv";
import { PAYING_LABELS, type Paying } from "@/lib/verification";
import { PRIORITY_FLOW_LABELS, type PriorityFlow } from "@/lib/waitlist";

/**
 * Os pedidos de verificação manual ("Quero que o Valmir verifique meu fluxo", no fim do relatório do /check).
 * Quem já tem usuários pagantes aparece primeiro: são os primeiros clientes possíveis do serviço feito à mão.
 */

interface VerificationRequest {
  id: string;
  email: string;
  app_url: string | null;
  flow: string;
  paying: string | null;
  note: string | null;
  check_id: string | null;
  locale: string | null;
  emailed: boolean;
  status: string;
  created_at: string;
}

const when = (iso: string) => new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
const flowLabel = (v: string) => PRIORITY_FLOW_LABELS[v as PriorityFlow]?.en ?? v;
const payingLabel = (v: string | null) => (v ? (PAYING_LABELS[v as Paying]?.en ?? v) : "Not answered");
const rank = (r: VerificationRequest) => (r.paying === "yes" ? 0 : r.paying === "users_no_revenue" ? 1 : 2);

export function VerificationPanel({ token }: { token: string }) {
  const [items, setItems] = useState<VerificationRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/verification-requests", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
    const body = (await response.json().catch(() => ({}))) as { requests?: VerificationRequest[]; error?: { message?: string } };
    if (response.status === 403) return setHidden(true);
    if (!response.ok || !body.requests) {
      setItems(null);
      return setError(body.error?.message ?? "Could not load the verification requests.");
    }
    setError(null);
    setItems([...body.requests].sort((a, b) => rank(a) - rank(b) || b.created_at.localeCompare(a.created_at)));
  }, [token]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  if (hidden) return null;
  const paying = items?.filter((i) => i.paying === "yes").length ?? 0;

  return (
    <section aria-labelledby="verification-admin-heading" className="rounded-xl border-2 border-action p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="verification-admin-heading" className="text-xl font-semibold">
          Verification requests{items ? ` (${items.length})` : ""}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => items && downloadCsv("publishub-verification-requests.csv", items as unknown as Record<string, unknown>[])} disabled={!items?.length}>
            Export CSV
          </Button>
          <Button variant="ghost" onClick={() => void load()}>
            Refresh
          </Button>
        </div>
      </div>
      <p className="mt-1 text-muted">
        People asking you to check a flow the free check can&apos;t open. Apps with paying users come first: those are your first customers. Tap an email to reply.
      </p>
      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-critical bg-critical-soft p-4 font-semibold text-critical">
          {error}
        </p>
      )}
      {items && (
        <>
          <p className="mt-4 text-lg">
            <strong className="tabular-nums">{paying}</strong> with paying users · <strong className="tabular-nums">{items.length}</strong> in total
          </p>
          <ul className="mt-4 grid gap-3">
            {items.length ? (
              items.map((item) => (
                <li key={item.id} className="rounded-lg border border-line bg-card p-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className="rounded-sm border border-action px-2 py-0.5 font-semibold">{flowLabel(item.flow)}</span>
                    <span className={item.paying === "yes" ? "font-semibold text-success" : "text-muted"}>{payingLabel(item.paying)}</span>
                    <span className="text-muted">{when(item.created_at)}</span>
                  </div>
                  {item.app_url && <p className="mt-2 break-all font-mono text-sm">{item.app_url}</p>}
                  {item.note && <p className="mt-2 whitespace-pre-wrap break-words">{item.note}</p>}
                  <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <a href={`mailto:${item.email}?subject=${encodeURIComponent(item.locale === "pt" ? "Sobre a verificação do seu app" : "About checking your app")}`} className="break-all">
                      {item.email}
                    </a>
                    {item.check_id && (
                      <a href={`${item.locale === "pt" ? "/pt" : ""}/check/${item.check_id}`} target="_blank" rel="noopener noreferrer">
                        Open their report
                      </a>
                    )}
                  </p>
                </li>
              ))
            ) : (
              <li className="text-muted">No requests yet.</li>
            )}
          </ul>
        </>
      )}
    </section>
  );
}
