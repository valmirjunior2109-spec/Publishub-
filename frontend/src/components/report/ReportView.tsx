"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Disclaimer } from "@/components/Disclaimer";
import { EmailGate } from "@/components/report/EmailGate";
import { IMPACT_LABEL, ImpactBadge, IssueGroupCard } from "@/components/report/IssueGroupCard";
import { RiskScore } from "@/components/report/RiskScore";
import { ReserveButton } from "@/components/ReserveButton";
import { buttonClasses } from "@/components/ui/Button";
import type { IssueGroup, ReportData } from "@/lib/report";
import { IMPACT_ORDER } from "@/lib/scanner/rules";
import { FOUNDING } from "@/lib/site";

const POLL_MS = 2500;
const PAGE_LABEL: Record<string, string> = { home: "Home page", collection: "Collection page", product: "Product page", cart: "Cart page" };

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function Progress({ report }: { report: ReportData | null }) {
  const pages = report?.pages ?? [];
  const current = pages.filter((page) => page.status !== "running").length;
  const message = !report || report.status === "queued" ? "Your scan is in the queue…" : `Scanning your store: ${current} of up to 4 pages checked…`;
  return (
    <section aria-labelledby="progress-heading" className="rounded-xl border border-line bg-card p-6 shadow-card">
      <h2 id="progress-heading" className="text-xl font-semibold">
        Scanning {report ? hostOf(report.url) : "your store"}
      </h2>
      <p className="mt-2 text-[16px]" role="status" aria-live="polite">
        {message}
      </p>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-strong" aria-hidden="true">
        <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${Math.max(8, (current / 4) * 100)}%` }} />
      </div>
      {pages.length > 0 && (
        <ul className="mt-4 space-y-1 text-[15px]">
          {pages.map((page) => (
            <li key={page.url}>
              <span className="font-semibold">{PAGE_LABEL[page.kind ?? ""] ?? page.url}:</span> {page.status === "running" ? "checking…" : page.status === "done" ? "done" : page.status}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-sm text-muted">This usually takes about a minute. You can keep this page open; the report appears here automatically.</p>
    </section>
  );
}

function LockedList({ groups }: { groups: IssueGroup[] }) {
  return (
    <ul className="divide-y divide-line rounded-xl border border-line bg-card">
      {groups.map((group) => (
        <li key={group.ruleId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <span className="font-semibold">{group.title}</span>
          <span className="flex items-center gap-3 text-sm text-muted">
            <ImpactBadge impact={group.impact} />
            {group.occurrences} {group.occurrences === 1 ? "instance" : "instances"}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * O relatório de um scan: acompanha o andamento (polling) e, quando termina, mostra o
 * risk score, os 3 problemas que mais pesam abertos e o resto por gravidade.
 * `sample`: o relatório de exemplo, sem polling nem e-mail.
 */
export function ReportView({ id, initial, sample = false }: { id: string; initial?: ReportData; sample?: boolean }) {
  const [report, setReport] = useState<ReportData | null>(initial ?? null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const wasRunning = useRef(!initial || initial.status === "queued" || initial.status === "running");

  // lê o relatório e, enquanto o scan roda, lê de novo a cada POLL_MS
  useEffect(() => {
    if (sample) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = async () => {
      try {
        const response = await fetch(`/api/scan/${id}`, { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as (ReportData & { error?: { message?: string } }) | null;
        if (!response.ok || !data || !("status" in data)) throw new Error(data?.error?.message || "We couldn't load this report.");
        if (cancelled) return;
        setReport(data);
        setLoadError(null);
        if (data.status === "queued" || data.status === "running") timer = setTimeout(run, POLL_MS);
      } catch (error) {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : "We couldn't load this report.");
        timer = setTimeout(run, POLL_MS * 2);
      }
    };
    timer = setTimeout(run, 0);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id, sample, reloadKey]);

  // quando o scan termina, o foco vai para o título do resultado (quem usa leitor de tela fica sabendo)
  useEffect(() => {
    if (report?.status === "done" && wasRunning.current) {
      wasRunning.current = false;
      resultsHeading.current?.focus();
    }
  }, [report?.status]);

  if (!report) {
    return loadError ? (
      <p role="alert" className="rounded-lg border border-critical bg-critical-soft p-4 font-semibold text-critical">
        {loadError}
      </p>
    ) : (
      <Progress report={null} />
    );
  }

  if (report.status === "queued" || report.status === "running") return <Progress report={report} />;

  if (report.status === "failed") {
    return (
      <section aria-labelledby="failed-heading" className="rounded-xl border border-critical bg-critical-soft p-6">
        <h2 id="failed-heading" className="text-xl font-semibold text-critical">
          We couldn&apos;t finish this scan
        </h2>
        <p className="mt-2">{report.error || "Something went wrong while scanning the store."}</p>
        <p className="mt-2 text-[15px]">Some stores block automated visits or take too long to load. You can try again, or contact us and we&apos;ll run it manually.</p>
        <Link href="/scanner#scan" className={buttonClasses("primary", "md", "mt-4")}>
          Try another scan
        </Link>
      </section>
    );
  }

  const open = report.groups.filter((group) => !group.locked);
  const top = report.groups.slice(0, 3);
  const scanned = report.pages.filter((page) => page.status === "done");
  const skipped = report.pages.filter((page) => page.status !== "done");

  return (
    <div className="space-y-10">
      <div>
        <h2 ref={resultsHeading} tabIndex={-1} className="text-2xl font-bold sm:text-3xl">
          Results for {hostOf(report.url)}
        </h2>
        <p className="mt-2 text-muted">
          {scanned.length} {scanned.length === 1 ? "page" : "pages"} scanned
          {report.finishedAt ? ` on ${new Date(report.finishedAt).toLocaleDateString("en-US", { dateStyle: "medium" })}` : ""} · WCAG 2.2 A and AA automated checks
        </p>
        {report.isShopify === false && (
          <p className="mt-3 rounded-lg border border-moderate bg-moderate-soft p-3 text-[15px]">
            We couldn&apos;t detect Shopify on this site, so we only checked the home page.
          </p>
        )}
        {skipped.length > 0 && (
          <p className="mt-3 text-[15px] text-muted">
            Not checked: {skipped.map((page) => `${PAGE_LABEL[page.kind ?? ""] ?? page.url} (${page.error || page.status})`).join("; ")}.
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        {report.riskScore !== null && report.riskBand && <RiskScore score={report.riskScore} band={report.riskBand} />}
        <section aria-labelledby="summary-heading" className="rounded-xl border border-line bg-card p-6 shadow-card">
          <h2 id="summary-heading" className="text-base font-semibold text-muted">
            Issues found
          </h2>
          <p className="mt-2 text-4xl font-bold tabular-nums">{report.totalOccurrences}</p>
          <p className="text-muted">
            across {report.groups.length} {report.groups.length === 1 ? "issue type" : "issue types"}
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            {IMPACT_ORDER.map((impact) => (
              <div key={impact} className="rounded-lg border border-line p-3">
                <dt className="text-sm font-semibold">{IMPACT_LABEL[impact]}</dt>
                <dd className="text-2xl font-bold tabular-nums">{report.counts[impact]}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <Disclaimer />

      {report.groups.length === 0 ? (
        <section aria-labelledby="none-heading" className="rounded-xl border border-success bg-success-soft p-6">
          <h2 id="none-heading" className="text-xl font-semibold">
            No automated issues found on the scanned pages
          </h2>
          <p className="mt-2">That&apos;s a good sign, but automated checks catch only a portion of WCAG issues. A manual review with a keyboard and a screen reader is still recommended.</p>
        </section>
      ) : (
        <>
          <section aria-labelledby="top-heading">
            <h2 id="top-heading" className="text-2xl font-bold">
              Fix these first
            </h2>
            <p className="mt-1 text-muted">The issues with the most weight in your estimated risk indicator.</p>
            <div className="mt-5 space-y-5">
              {top.map((group) => (
                <IssueGroupCard key={group.ruleId} group={group} />
              ))}
            </div>
          </section>

          {report.groups.length > 3 && (
            <section aria-labelledby="all-heading">
              <h2 id="all-heading" className="text-2xl font-bold">
                All issues by severity
              </h2>
              {!report.unlocked && !sample ? (
                <div className="mt-5 space-y-5">
                  <EmailGate scanId={report.id} lockedCount={report.lockedCount} onUnlocked={() => setReloadKey((key) => key + 1)} />
                  <LockedList groups={report.groups.slice(3)} />
                </div>
              ) : (
                <div className="mt-5 space-y-8">
                  {IMPACT_ORDER.map((impact) => {
                    const groups = open.slice(3).filter((group) => group.impact === impact);
                    if (!groups.length) return null;
                    return (
                      <div key={impact}>
                        <h3 className="text-xl font-semibold">
                          {IMPACT_LABEL[impact]} ({groups.length})
                        </h3>
                        <div className="mt-4 space-y-4">
                          {groups.map((group) => (
                            <details key={group.ruleId} className="rounded-xl border border-line bg-card">
                              <summary className="flex min-h-14 cursor-pointer flex-wrap items-center justify-between gap-3 px-5 py-3 font-semibold">
                                <span>{group.title}</span>
                                <span className="text-sm font-normal text-muted">
                                  {group.categoryLabel} · {group.occurrences} {group.occurrences === 1 ? "instance" : "instances"}
                                </span>
                              </summary>
                              <div className="border-t border-line p-2 sm:p-3">
                                <IssueGroupCard group={group} headingLevel={4} />
                              </div>
                            </details>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </>
      )}

      <section aria-labelledby="cta-heading" className="relative overflow-hidden rounded-2xl bg-spot p-6 text-white sm:p-8">
        <h2 id="cta-heading" className="text-2xl font-bold">
          Get these fixed automatically: reserve your Founding plan
        </h2>
        <p className="mt-2 max-w-prose text-[17px]">
          Our Shopify app will apply real code fixes to your theme, no overlay widget. Reserve today for ${FOUNDING.reservationUsd}, credited toward your first months of the ${FOUNDING.monthlyUsd}/month plan. Full refund if automatic fixes don&apos;t
          launch within {FOUNDING.refundDays} days.
        </p>
        <div className="mt-5 [&_button]:border-cream [&_button]:bg-cream [&_button]:text-midnight [&_button:hover]:bg-lavender [&_button:hover]:text-midnight [&_p[role=alert]]:text-white">
          {sample ? (
            <Link href="/scanner#pricing" className={buttonClasses("secondary", "lg")}>
              See the Founding plan
            </Link>
          ) : (
            <ReserveButton scanId={report.id} source="report" />
          )}
        </div>
      </section>
    </div>
  );
}
