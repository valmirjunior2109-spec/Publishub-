import { getCheck } from "@/lib/server/checks";
import { ConfigError, UUID_RE } from "@/lib/server/db";
import { errorJson, json } from "@/lib/server/request";

export const runtime = "nodejs";

/** GET → o relatório do teste (o navegador consulta a cada poucos segundos até "done" ou "failed"). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return errorJson("Check not found.", 404, "NOT_FOUND");
  try {
    const report = await getCheck(id);
    if (!report) return errorJson("Check not found.", 404, "NOT_FOUND");
    return json(report);
  } catch (error) {
    if (error instanceof ConfigError) return errorJson("Free checks aren't available right now.", 503, "NOT_CONFIGURED");
    console.error("app check read failed", error);
    return errorJson("We couldn't load this check. Please refresh.", 500, "CHECK_ERROR");
  }
}
