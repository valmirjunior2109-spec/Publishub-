import { rankEmails } from "@/lib/scanner/emails";
import { adminFromRequest } from "@/lib/server/admin";
import { db } from "@/lib/server/db";
import { errorJson, json } from "@/lib/server/request";
import { AUTO_EXTRACT_SOURCE, scannerMode } from "@/lib/server/scans";

export const runtime = "nodejs";

/**
 * Tudo o que o /admin lista: scans, leads e reservas, os mais recentes primeiro.
 * Cada scan vem com o melhor e-mail de contato da loja (best_email) e os outros (other_emails),
 * achados nas páginas públicas dela em qualquer scan da mesma loja.
 */
export async function GET(request: Request) {
  const admin = await adminFromRequest(request);
  if (!admin) return errorJson("Not allowed.", 403, "FORBIDDEN");
  const [scans, leads, reservations, extracted] = await Promise.all([
    db().from("scans").select("id,url,status,risk_score,is_shopify,source,created_at,error").order("created_at", { ascending: false }).limit(300),
    db().from("leads").select("email,store_url,scan_id,source,source_page,created_at").not("scan_id", "is", null).order("created_at", { ascending: false }).limit(1000),
    db().from("reservations").select("email,store_url,scan_id,status,amount,currency,stripe_session_id,created_at,paid_at").order("created_at", { ascending: false }).limit(1000),
    db().from("leads").select("email,store_url").eq("source", AUTO_EXTRACT_SOURCE).limit(5000),
  ]);
  const failed = [scans, leads, reservations, extracted].find((result) => result.error);
  if (failed?.error) return errorJson(failed.error.message, 500, "DB_ERROR");

  const byStore = new Map<string, string[]>();
  for (const row of extracted.data ?? []) {
    if (!row.store_url) continue;
    const list = byStore.get(row.store_url) ?? [];
    if (!list.includes(row.email)) list.push(row.email);
    byStore.set(row.store_url, list);
  }
  const withEmails = (scans.data ?? []).map((scan) => {
    let host = "";
    try {
      host = new URL(scan.url).hostname;
    } catch {
      // url antiga fora do padrão: sem ordenação por domínio
    }
    const ranked = rankEmails((byStore.get(scan.url) ?? []).map((email) => ({ email })), host).map((item) => item.email);
    return { ...scan, best_email: ranked[0] ?? null, other_emails: ranked.slice(1) };
  });

  return json({ admin, mode: scannerMode(), scans: withEmails, leads: leads.data, reservations: reservations.data });
}
