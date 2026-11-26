"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { downloadCsv } from "@/lib/csv";
import { FEEDBACK_LIVE_APP, FEEDBACK_VERDICTS } from "@/lib/feedback";

/**
 * Os feedbacks sobre a proposta (seção "Tell us what you think" da home), em cartões que leem bem no celular.
 * É a cópia confiável: funciona mesmo sem o encaminhamento por e-mail configurado.
 */

interface Feedback {
  id: string;
  verdict: string;
  live_app: string | null;
  message: string;
  email: string | null;
  emailed: boolean;
  created_at: string;
}

const when = (iso: string) => new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
const verdictLabel = (v: string) => FEEDBACK_VERDICTS.find((o) => o.value === v)?.label ?? v;
const liveLabel = (v: string | null) => (v ? (FEEDBACK_LIVE_APP.find((o) => o.value === v)?.label ?? v) : null);

export function FeedbackPanel({ token }: { token: string }) {
  const [items, setItems] = useState<Feedback[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/feedback", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
    const body = (await response.json().catch(() => ({}))) as { feedback?: Feedback[]; error?: { message?: string } };
    if (response.status === 403) return setHidden(true);
    if (!response.ok || !body.feedback) {
      setItems(null);
      return setError(body.error?.message ?? "Could not load the feedback.");
    }
    setError(null);
    setItems(body.feedback);
  }, [token]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  if (hidden) return null;
  const count = (v: string) => items?.filter((i) => i.verdict === v).length ?? 0;

  return (
    <section aria-labelledby="feedback-admin-heading" className="rounded-xl border border-line p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="feedback-admin-heading" className="text-xl font-semibold">
          Proposal feedback{items ? ` (${items.length})` : ""}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => items && downloadCsv("publishub-feedback.csv", items as unknown as Record<string, unknown>[])} disabled={!items?.length}>
            Export CSV
          </Button>
          <Button variant="ghost" onClick={() => void load()}>
            Refresh
          </Button>
        </div>
      </div>
      <p className="mt-1 text-muted">Responses from the &ldquo;Tell us what you think&rdquo; form on the home page. Tap an email to reply.</p>
      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-critical bg-critical-soft p-4 font-semibold text-critical">
          {error}
        </p>
      )}
      {items && (
        <>
          <dl className="mt-5 grid grid-cols-3 gap-2 sm:max-w-md sm:gap-3">
            {FEEDBACK_VERDICTS.map((o) => (
              <div key={o.value} className="rounded-lg border border-line p-3">
                <dt className="text-sm text-muted">{o.label}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{count(o.value)}</dd>
              </div>
            ))}
          </dl>
          <ul className="mt-5 grid gap-3">
            {items.length ? (
              items.map((item) => (
                <li key={item.id} className="rounded-lg border border-line bg-card p-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className="rounded-sm border border-action px-2 py-0.5 font-semibold">{verdictLabel(item.verdict)}</span>
                    {liveLabel(item.live_app) && <span className="text-muted">{liveLabel(item.live_app)}</span>}
                    <span className="text-muted">{when(item.created_at)}</span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap break-words">{item.message}</p>
                  <p className="mt-3 text-sm">
                    {item.email ? (
                      <a href={`mailto:${item.email}?subject=${encodeURIComponent("Re: your Publishub feedback")}`} className="break-all">
                        {item.email}
                      </a>
                    ) : (
                      <span className="text-muted">Anonymous</span>
                    )}
                  </p>
                </li>
              ))
            ) : (
              <li className="text-muted">No feedback yet.</li>
            )}
          </ul>
        </>
      )}
    </section>
  );
}
