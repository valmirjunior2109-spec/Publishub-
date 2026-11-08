import { timingSafeEqual } from "node:crypto";
import { adminFromRequest } from "@/lib/server/admin";
import { UUID_RE } from "@/lib/server/db";
import { errorJson, json } from "@/lib/server/request";
import { claimScan, getScan, runClaimedScan } from "@/lib/server/scans";

export const runtime = "nodejs";
export const maxDuration = 60;

function internalCall(request: Request): boolean {
  const secret = process.env.INTERNAL_SECRET;
  const given = request.headers.get("x-internal-secret");
  if (!secret || !given || secret.length !== given.length) return false;
  return timingSafeEqual(Buffer.from(secret), Buffer.from(given));
}

/**
 * Roda um scan da fila numa função própria: é como o /admin processa o lote no modo
 * "vercel" (um scan por chamada, para cada um ter os 60 s inteiros).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return errorJson("Scan not found.", 404, "NOT_FOUND");
  if (!internalCall(request) && !(await adminFromRequest(request))) return errorJson("Not allowed.", 403, "FORBIDDEN");

  if (!(await claimScan(id))) {
    const scan = await getScan(id);
    return json({ id, status: scan?.status ?? "missing", ran: false });
  }
  await runClaimedScan(id);
  const scan = await getScan(id);
  return json({ id, status: scan?.status, riskScore: scan?.risk_score, ran: true });
}
