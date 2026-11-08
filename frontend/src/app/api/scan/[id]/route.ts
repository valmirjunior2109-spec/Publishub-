import { cookies } from "next/headers";
import { UUID_RE } from "@/lib/server/db";
import { loadReport } from "@/lib/server/report";
import { errorJson, isUnlocked, json, unlockCookieName } from "@/lib/server/request";

export const runtime = "nodejs";

/** O relatório (ou o progresso, enquanto o scan roda). O completo só com o e-mail deixado neste navegador. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return errorJson("Report not found.", 404, "NOT_FOUND");
  try {
    const store = await cookies();
    const report = await loadReport(id, isUnlocked(id, store.get(unlockCookieName(id))?.value));
    if (!report) return errorJson("Report not found.", 404, "NOT_FOUND");
    return json(report);
  } catch (error) {
    console.error("report load failed", error);
    return errorJson("We couldn't load this report. Please refresh.", 500, "REPORT_ERROR");
  }
}
