import { buildGroups, countByImpact, riskBandOf, type IssueRow, type PageRow, type ReportData } from "@/lib/report";
import { db } from "./db";
import { expireIfStale, getScan } from "./scans";

/** O relatório de um scan, lido pelo servidor com a service_role a partir do id. */
export async function loadReport(id: string, unlocked: boolean): Promise<ReportData | null> {
  const found = await getScan(id);
  if (!found) return null;
  const scan = await expireIfStale(found);

  const [{ data: pages }, { data: issues }] = await Promise.all([
    db().from("scan_pages").select("url,kind,status,error,issue_count").eq("scan_id", id).order("created_at", { ascending: true }),
    scan.status === "done"
      ? db().from("issues").select("page_url,rule_id,impact,selector,html_snippet,help,help_url,explanation,fix_guidance,occurrences").eq("scan_id", id).limit(2000)
      : Promise.resolve({ data: [] as IssueRow[] }),
  ]);

  const groups = buildGroups((issues ?? []) as IssueRow[], unlocked);
  return {
    id: scan.id,
    url: scan.url,
    status: scan.status,
    isShopify: scan.is_shopify,
    riskScore: scan.risk_score,
    riskBand: riskBandOf(scan.risk_score),
    error: scan.error,
    createdAt: scan.created_at,
    finishedAt: scan.finished_at,
    pages: (pages ?? []) as PageRow[],
    counts: countByImpact(groups),
    totalOccurrences: groups.reduce((sum, group) => sum + group.occurrences, 0),
    groups,
    unlocked,
    lockedCount: groups.filter((group) => group.locked).length,
  };
}
