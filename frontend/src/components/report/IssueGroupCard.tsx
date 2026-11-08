import type { IssueGroup } from "@/lib/report";
import type { Impact } from "@/lib/scanner/rules";
import { cn } from "@/lib/cn";

export const IMPACT_LABEL: Record<Impact, string> = { critical: "Critical", serious: "Serious", moderate: "Moderate", minor: "Minor" };

const IMPACT_STYLE: Record<Impact, string> = {
  critical: "border-critical bg-critical-soft text-critical",
  serious: "border-serious bg-serious-soft text-serious",
  moderate: "border-moderate bg-moderate-soft text-moderate",
  minor: "border-minor bg-minor-soft text-minor",
};

export function ImpactBadge({ impact }: { impact: Impact }) {
  return <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-sm font-semibold", IMPACT_STYLE[impact])}>{IMPACT_LABEL[impact]}</span>;
}

function pathOf(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname === "/" ? "Home page" : parsed.pathname;
  } catch {
    return url;
  }
}

/** Um problema por inteiro: o que é, onde está (página, seletor e trecho do HTML) e como corrigir. */
export function IssueGroupCard({ group, headingLevel = 3 }: { group: IssueGroup; headingLevel?: 3 | 4 }) {
  const Heading = headingLevel === 3 ? "h3" : "h4";
  return (
    <article className="rounded-xl border border-line bg-white p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <ImpactBadge impact={group.impact} />
        <span className="inline-flex rounded-full border border-line-strong px-2.5 py-0.5 text-sm font-medium text-ink">{group.categoryLabel}</span>
        <span className="text-sm text-muted">
          {group.occurrences} {group.occurrences === 1 ? "instance" : "instances"} on {group.pages.length} {group.pages.length === 1 ? "page" : "pages"}
        </span>
      </div>
      <Heading className="mt-3 text-xl font-semibold">{group.title}</Heading>
      {group.explanation && <p className="mt-2 text-[16px]">{group.explanation}</p>}
      {group.fix && (
        <div className="mt-4 rounded-lg bg-accent-soft p-4">
          <p className="font-semibold">How to fix it</p>
          <p className="mt-1 text-[15px]">{group.fix}</p>
        </div>
      )}
      {group.examples && group.examples.length > 0 && (
        <div className="mt-4">
          <p className="font-semibold">Where we found it</p>
          <ul className="mt-2 space-y-3">
            {group.examples.slice(0, 3).map((example, index) => (
              <li key={`${example.pageUrl}-${index}`} className="rounded-lg border border-line p-3">
                <p className="text-sm">
                  <span className="font-semibold">Page:</span> {pathOf(example.pageUrl)}
                </p>
                {example.selector && (
                  <p className="mt-1 break-all text-sm">
                    <span className="font-semibold">Element:</span> <code className="font-mono text-[13px]">{example.selector}</code>
                  </p>
                )}
                {example.html && (
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-surface p-3 font-mono text-[13px] text-ink" tabIndex={0} aria-label="HTML snippet">
                    <code>{example.html}</code>
                  </pre>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {group.helpUrl && (
        <p className="mt-4 text-[15px]">
          <a href={group.helpUrl} target="_blank" rel="noopener noreferrer">
            Technical reference for this rule<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
      )}
    </article>
  );
}
