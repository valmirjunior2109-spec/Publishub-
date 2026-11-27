"use client";

import { PixelIcon } from "@/components/ui/Pixel";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { ISSUE_TEXT, issueText, type CheckIssue, type IssueKind } from "@/lib/check/issues";
import type { Locale } from "@/lib/i18n";
import { CopyButton } from "./CopyButton";

const COPY = {
  en: {
    page: "Page or route",
    what: "What failed",
    evidence: "Evidence",
    next: "Where to start",
    copy: "Copy details",
    copied: "Details copied",
    failed: "Couldn't copy automatically. Select the text below and copy it:",
    severity: { fail: "Problem", warn: "Warning" },
  },
  pt: {
    page: "Página ou rota",
    what: "O que falhou",
    evidence: "Evidência",
    next: "Por onde começar",
    copy: "Copiar detalhes",
    copied: "Detalhes copiados",
    failed: "Não deu para copiar automaticamente. Selecione o texto abaixo e copie:",
    severity: { fail: "Problema", warn: "Aviso" },
  },
} satisfies Record<Locale, unknown>;

const KINDS: IssueKind[] = ["crash", "request", "page", "other"];

function IssueCard({ issue, locale }: { issue: CheckIssue; locale: Locale }) {
  const t = COPY[locale];
  const fail = issue.severity === "fail";
  return (
    <li className={cn("rounded-md border p-4 sm:p-5", fail ? "border-critical bg-critical-soft" : "border-warning bg-warning-soft")}>
      <div className="flex items-start gap-3">
        <PixelIcon name={fail ? "fail" : "inconclusive"} size={16} className={cn("mt-1 shrink-0", fail ? "text-critical" : "text-warning")} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-semibold">{issue.title}</span>
            <span className={cn("font-pixel text-sm", fail ? "text-critical" : "text-warning")}>{t.severity[issue.severity]}</span>
          </p>
          <dl className="mt-2 grid gap-1.5 text-[15px]">
            {issue.route && (
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-muted">{t.page}:</dt>
                <dd className="min-w-0 break-all font-mono text-[14px]">{issue.route}</dd>
              </div>
            )}
            <div>
              <dt className="sr-only">{t.what}</dt>
              <dd>{issue.description}</dd>
            </div>
            {issue.evidence.length > 0 && (
              <div>
                <dt className="text-muted">{t.evidence}:</dt>
                <dd>
                  <ul className="mt-1 space-y-1">
                    {issue.evidence.map((line) => (
                      <li key={line} className="break-all rounded-sm bg-card px-2 py-1 font-mono text-[13px] text-ink">
                        {line}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-muted">{t.next}:</dt>
              <dd>{issue.step}</dd>
            </div>
          </dl>
          <CopyButton
            className="mt-3"
            text={() => issueText(issue, locale)}
            label={t.copy}
            copiedLabel={t.copied}
            failedLabel={t.failed}
            variant="ghost"
            onCopy={(ok) => track("app_check_issue_copied", { kind: issue.kind, source: issue.source, ok })}
          />
        </div>
      </div>
    </li>
  );
}

/** Os problemas do relatório, agrupados por tipo: crashes, requisições, páginas e os demais avisos. */
export function CheckIssues({ issues, locale }: { issues: CheckIssue[]; locale: Locale }) {
  const kinds = ISSUE_TEXT[locale].kinds;
  return (
    <div className="space-y-8">
      {KINDS.map((kind) => {
        const group = issues.filter((issue) => issue.kind === kind);
        if (!group.length) return null;
        return (
          <section key={kind} aria-labelledby={`issues-${kind}`}>
            <h3 id={`issues-${kind}`} className="flex items-baseline gap-2 text-xl font-bold">
              {kinds[kind]} <span className="font-pixel text-base text-muted">({group.length})</span>
            </h3>
            <ul className="mt-3 space-y-3">
              {group.map((issue) => (
                <IssueCard key={issue.key} issue={issue} locale={locale} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
