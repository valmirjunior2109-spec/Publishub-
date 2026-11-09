"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { downloadCsv } from "@/lib/csv";

/**
 * A lista de espera no /admin: inscrições, visitas, conversão e de onde cada uma veio.
 * Os números vêm de public.waitlist_report (o mesmo que dá para rodar no SQL Editor).
 */

interface Signup {
  email: string;
  name: string | null;
  ai_tool: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  referrer: string | null;
  form: string | null;
  created_at: string;
}
interface Report {
  totals: { signups: number; page_views: number; visitors: number; cta_clicks: number; share_clicks: number };
  sources: { source: string; visitors: number; page_views: number; signups: number }[];
  campaigns: { source: string; medium: string | null; campaign: string | null; content: string | null; signups: number }[];
  ctas: { event: string; detail: string; clicks: number }[];
  tools: { ai_tool: string; signups: number }[];
  signups: Signup[];
}

const WINDOWS = [
  { key: "24h", label: "24 hours" },
  { key: "72h", label: "72 hours" },
  { key: "7d", label: "7 days" },
  { key: "all", label: "All time" },
] as const;

const TH = "border-b border-line-strong px-3 py-2 text-left text-sm font-semibold";
const TD = "border-b border-line px-3 py-2 align-top text-sm";
const when = (iso: string) => new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
const rate = (signups: number, visitors: number) => (visitors ? `${((signups / visitors) * 100).toFixed(1)}%` : "–");

function Table({ label, head, rows, minWidth = 480 }: { label: string; head: string[]; rows: (string | number)[][]; minWidth?: number }) {
  return (
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={label}>
      <table className="w-full border-collapse" style={{ minWidth }}>
        <caption className="mb-2 text-left font-semibold">{label}</caption>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className={TH}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, i) => (
              <tr key={i}>
                {row.map((value, j) => (
                  <td key={j} className={TD}>
                    {value}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className={`${TD} text-muted`} colSpan={head.length}>
                Nothing yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function WaitlistPanel({ token }: { token: string }) {
  const [windowKey, setWindowKey] = useState<(typeof WINDOWS)[number]["key"]>("all");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/waitlist?window=${windowKey}`, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
    const body = (await response.json().catch(() => ({}))) as { report?: Report; error?: { message?: string } };
    // sem acesso de admin: o aviso já aparece no painel principal
    if (response.status === 403) return setHidden(true);
    if (!response.ok || !body.report) {
      setReport(null);
      return setError(body.error?.message ?? "Could not load the waitlist.");
    }
    setError(null);
    setReport(body.report);
  }, [token, windowKey]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  if (hidden) return null;
  const t = report?.totals;

  return (
    <section aria-labelledby="waitlist-heading" className="rounded-xl border border-line p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="waitlist-heading" className="text-xl font-semibold">
          Waitlist{t ? ` (${t.signups})` : ""}
        </h2>
        <div className="flex flex-wrap gap-2">
          {WINDOWS.map((w) => (
            <Button key={w.key} variant={w.key === windowKey ? "primary" : "secondary"} aria-pressed={w.key === windowKey} onClick={() => setWindowKey(w.key)}>
              {w.label}
            </Button>
          ))}
          <Button variant="ghost" onClick={() => void load()}>
            Refresh
          </Button>
        </div>
      </div>
      <p className="mt-1 text-muted">
        Signups to <a href="/verify">/verify</a>. Visitors are unique hashed IPs that loaded the page; the source is utm_source, then the referring site, then direct.
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-critical bg-critical-soft p-4 font-semibold text-critical">
          {error}
        </p>
      )}

      {report && t && (
        <div className="mt-6 space-y-8">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              ["Signups", t.signups],
              ["Unique visitors", t.visitors],
              ["Conversion", rate(t.signups, t.visitors)],
              ["CTA clicks", t.cta_clicks],
              ["Share clicks", t.share_clicks],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-line p-3">
                <dt className="text-sm text-muted">{label}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>

          <Table
            label="Signups by source"
            head={["Source", "Visitors", "Page views", "Signups", "Conversion"]}
            rows={report.sources.map((s) => [s.source, s.visitors, s.page_views, s.signups, rate(s.signups, s.visitors)])}
          />
          <Table
            label="Signups by campaign"
            head={["Source", "Medium", "Campaign", "Content", "Signups"]}
            rows={report.campaigns.map((c) => [c.source, c.medium ?? "", c.campaign ?? "", c.content ?? "", c.signups])}
          />
          <div className="grid gap-8 lg:grid-cols-2">
            <Table label="Clicks" head={["Event", "Which", "Clicks"]} rows={report.ctas.map((c) => [c.event === "share_click" ? "Share" : "CTA", c.detail, c.clicks])} minWidth={320} />
            <Table label="Primary AI coding tool" head={["Tool", "Signups"]} rows={report.tools.map((x) => [x.ai_tool, x.signups])} minWidth={320} />
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold">Signups ({report.signups.length})</h3>
              <Button variant="secondary" onClick={() => downloadCsv("publishub-waitlist.csv", report.signups as unknown as Record<string, unknown>[])} disabled={!report.signups.length}>
                Export waitlist CSV
              </Button>
            </div>
            <div className="mt-3">
              <Table
                label="Waitlist signups"
                head={["Email", "Name", "AI tool", "Source", "Campaign", "Form", "Joined"]}
                rows={report.signups.map((s) => [s.email, s.name ?? "", s.ai_tool ?? "", s.utm_source || s.referrer || "direct", [s.utm_medium, s.utm_campaign, s.utm_content].filter(Boolean).join(" / "), s.form ?? "", when(s.created_at)])}
                minWidth={820}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
