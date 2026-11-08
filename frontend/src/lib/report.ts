import { CATEGORY_LABEL, IMPACT_ORDER, ruleCopy, type Impact, type RuleCategory } from "@/lib/scanner/rules";
import { riskBand, rulePoints, type RiskBand } from "@/lib/scanner/score";

/**
 * O relatório como o navegador recebe: os problemas agrupados por regra, na ordem do
 * que mais pesa no risk score. Os 3 primeiros vêm abertos; os outros só com o título
 * e a contagem até o e-mail ser deixado (o servidor nem envia o resto).
 */

export const OPEN_GROUPS = 3;

export interface IssueRow {
  page_url: string;
  rule_id: string;
  impact: Impact;
  selector: string | null;
  html_snippet: string | null;
  help: string | null;
  help_url: string | null;
  explanation: string | null;
  fix_guidance: string | null;
  occurrences: number;
}

export interface PageRow {
  url: string;
  kind: string | null;
  status: "running" | "done" | "failed" | "skipped";
  error: string | null;
  issue_count: number;
}

export interface IssueExample {
  pageUrl: string;
  selector: string;
  html: string;
}

export interface IssueGroup {
  ruleId: string;
  title: string;
  impact: Impact;
  category: RuleCategory;
  categoryLabel: string;
  occurrences: number;
  pages: string[];
  locked: boolean;
  explanation?: string;
  fix?: string;
  helpUrl?: string;
  examples?: IssueExample[];
}

export interface ReportData {
  id: string;
  url: string;
  status: "queued" | "running" | "done" | "failed";
  isShopify: boolean | null;
  riskScore: number | null;
  riskBand: RiskBand | null;
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
  pages: PageRow[];
  counts: Record<Impact, number>;
  totalOccurrences: number;
  groups: IssueGroup[];
  unlocked: boolean;
  lockedCount: number;
}

export function buildGroups(rows: IssueRow[], unlocked: boolean): IssueGroup[] {
  const byRule = new Map<string, { rows: IssueRow[]; perPage: Map<string, number> }>();
  for (const row of rows) {
    const entry = byRule.get(row.rule_id) ?? { rows: [], perPage: new Map<string, number>() };
    entry.rows.push(row);
    // cada exemplo repete o total da página: conta uma vez por página
    entry.perPage.set(row.page_url, Math.max(entry.perPage.get(row.page_url) ?? 0, row.occurrences));
    byRule.set(row.rule_id, entry);
  }

  const groups = [...byRule.entries()].map(([ruleId, { rows: items, perPage }]) => {
    const first = items[0];
    const copy = ruleCopy(ruleId, first.help ?? ruleId);
    const occurrences = [...perPage.values()].reduce((a, b) => a + b, 0);
    return {
      points: rulePoints({ ruleId, help: first.help ?? ruleId, impact: first.impact, occurrences }),
      group: {
        ruleId,
        title: copy.title,
        impact: first.impact,
        category: copy.category,
        categoryLabel: CATEGORY_LABEL[copy.category],
        occurrences,
        pages: [...perPage.keys()],
        locked: false,
        explanation: first.explanation ?? copy.explanation,
        fix: first.fix_guidance ?? copy.fix,
        helpUrl: first.help_url ?? undefined,
        examples: items.slice(0, 6).map((item) => ({ pageUrl: item.page_url, selector: item.selector ?? "", html: item.html_snippet ?? "" })),
      } satisfies IssueGroup,
    };
  });

  groups.sort((a, b) => b.points - a.points || IMPACT_ORDER.indexOf(a.group.impact) - IMPACT_ORDER.indexOf(b.group.impact));
  return groups.map(({ group }, index) => {
    if (unlocked || index < OPEN_GROUPS) return group;
    return { ruleId: group.ruleId, title: group.title, impact: group.impact, category: group.category, categoryLabel: group.categoryLabel, occurrences: group.occurrences, pages: group.pages, locked: true };
  });
}

export function countByImpact(groups: IssueGroup[]): Record<Impact, number> {
  const counts: Record<Impact, number> = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  for (const group of groups) counts[group.impact] += group.occurrences;
  return counts;
}

export function riskBandOf(score: number | null): RiskBand | null {
  return score === null ? null : riskBand(score);
}
