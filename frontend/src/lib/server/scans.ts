import { ruleCopy } from "@/lib/scanner/rules";
import { scanStore, type ScannedPage } from "@/lib/scanner/scan";
import { assertPublicHost, InvalidUrlError } from "@/lib/scanner/url";
import { db } from "./db";
import { captureServer } from "./posthog";

/**
 * O ciclo de um scan no banco: queued → running → done | failed.
 * Roda em dois lugares, escolhidos por SCANNER_MODE:
 * - "vercel" (padrão): a própria rota roda o scan logo depois de responder (after()).
 * - "worker": a rota só enfileira; o worker (scripts/scan-worker.ts) consome a fila.
 */

export type ScanStatus = "queued" | "running" | "done" | "failed";

export interface ScanRow {
  id: string;
  url: string;
  is_shopify: boolean | null;
  status: ScanStatus;
  risk_score: number | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
  source: string;
}

export const RATE_LIMIT_PER_HOUR = 5;
/** Um scan parado além disso morreu (a função foi encerrada no meio): vira "failed". */
const STALE_MS = 4 * 60 * 1000;

export function scannerMode(): "vercel" | "worker" {
  return process.env.SCANNER_MODE === "worker" ? "worker" : "vercel";
}

/** Na Vercel o limite é 60 s por função: o scan para em ~50 s e deixa tempo para gravar. */
export function scanDeadlineMs(): number {
  const configured = Number(process.env.SCAN_DEADLINE_MS);
  if (configured > 0) return configured;
  return scannerMode() === "worker" ? 150_000 : 48_000;
}

export async function countRecentScans(ipHash: string): Promise<number> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await db().from("scans").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", since);
  if (error) throw error;
  return count ?? 0;
}

export async function createScan(url: string, ipHash: string | null, source: "web" | "admin"): Promise<string> {
  const { data, error } = await db().from("scans").insert({ url, ip_hash: ipHash, source, status: "queued" }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function getScan(id: string): Promise<ScanRow | null> {
  const { data, error } = await db().from("scans").select("id,url,is_shopify,status,risk_score,created_at,started_at,finished_at,error,source").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as ScanRow | null) ?? null;
}

/** Scan que ficou parado (função encerrada no meio, worker caído): marca como falho. */
export async function expireIfStale(scan: ScanRow): Promise<ScanRow> {
  if (scan.status !== "queued" && scan.status !== "running") return scan;
  const since = new Date(scan.started_at ?? scan.created_at).getTime();
  // na fila do worker, a espera pode ser maior: só expira o que já começou a rodar
  if (scan.status === "queued" && scannerMode() === "worker") return scan;
  if (Date.now() - since < STALE_MS) return scan;
  const failed = { status: "failed" as const, error: "The scan took too long and was stopped. Please try again.", finished_at: new Date().toISOString() };
  await db().from("scans").update(failed).eq("id", scan.id).in("status", ["queued", "running"]);
  return { ...scan, ...failed };
}

/** Passa de queued para running só se ninguém pegou antes (rota, admin ou worker). */
export async function claimScan(id: string): Promise<boolean> {
  const { data, error } = await db()
    .from("scans")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "queued")
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/** Para o worker: o scan mais antigo da fila, já marcado como running. */
export async function claimNextQueued(): Promise<string | null> {
  const { data, error } = await db().from("scans").select("id").eq("status", "queued").order("created_at", { ascending: true }).limit(3);
  if (error) throw error;
  for (const row of data ?? []) if (await claimScan(row.id as string)) return row.id as string;
  return null;
}

async function insertPage(scanId: string, page: ScannedPage, status: string): Promise<string | null> {
  const { data } = await db().from("scan_pages").insert({ scan_id: scanId, url: page.url, kind: page.kind, status }).select("id").single();
  return (data?.id as string) ?? null;
}

/** Roda um scan já marcado como running e grava tudo. Nunca lança: o erro vira status "failed". */
export async function runClaimedScan(id: string): Promise<void> {
  const scan = await getScan(id);
  if (!scan) return;
  const started = Date.now();
  const pageIds = new Map<string, string>();

  try {
    const url = new URL(scan.url);
    // de novo aqui: o DNS pode ter mudado entre o pedido e o scan
    await assertPublicHost(url);

    const result = await scanStore(url, {
      deadlineMs: scanDeadlineMs(),
      pageTimeoutMs: scannerMode() === "worker" ? 30_000 : 18_000,
      onPage: async (page, phase) => {
        if (phase === "start") {
          const pageId = await insertPage(id, page, "running");
          if (pageId) pageIds.set(page.url, pageId);
          return;
        }
        const pageId = pageIds.get(page.url);
        const update = { status: page.status, error: page.error ?? null, issue_count: new Set(page.issues.map((i) => i.ruleId)).size };
        if (pageId) await db().from("scan_pages").update(update).eq("id", pageId);
        else await db().from("scan_pages").insert({ scan_id: id, url: page.url, kind: page.kind, ...update });
        if (page.issues.length) {
          const rows = page.issues.map((issue) => {
            const copy = ruleCopy(issue.ruleId, issue.help);
            return {
              scan_id: id,
              page_url: page.url,
              rule_id: issue.ruleId,
              impact: issue.impact,
              selector: issue.selector,
              html_snippet: issue.htmlSnippet,
              help: issue.help,
              help_url: issue.helpUrl,
              explanation: copy.explanation,
              fix_guidance: copy.fix,
              occurrences: issue.occurrences,
            };
          });
          const { error } = await db().from("issues").insert(rows);
          if (error) throw error;
        }
      },
    });

    // as páginas puladas por tempo não passaram pelo onPage
    for (const page of result.pages.filter((p) => p.status === "skipped")) {
      await db().from("scan_pages").insert({ scan_id: id, url: page.url, kind: page.kind, status: "skipped", error: page.error ?? null });
    }

    const scanned = result.pages.filter((p) => p.status === "done").length;
    if (!scanned) throw new Error(result.pages[0]?.error || "We couldn't load the store's home page.");

    await db()
      .from("scans")
      .update({ status: "done", is_shopify: result.isShopify, risk_score: result.riskScore, summary: { rules: result.rules, pages_scanned: scanned }, finished_at: new Date().toISOString(), error: null })
      .eq("id", id);
    await captureServer("scan_completed", `scan:${id}`, { scan_id: id, risk_score: result.riskScore, is_shopify: result.isShopify, pages_scanned: scanned, rules: result.rules.length, duration_ms: Date.now() - started, source: scan.source });
  } catch (error) {
    const message = error instanceof InvalidUrlError ? error.message : error instanceof Error ? error.message.slice(0, 300) : "The scan failed.";
    await db().from("scans").update({ status: "failed", error: message, finished_at: new Date().toISOString() }).eq("id", id);
    await captureServer("scan_failed", `scan:${id}`, { scan_id: id, error: message, source: scan.source });
  }
}
