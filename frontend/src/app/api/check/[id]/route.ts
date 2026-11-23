import { deleteCheck, getCheck } from "@/lib/server/checks";
import { ConfigError, UUID_RE } from "@/lib/server/db";
import { errorJson, json } from "@/lib/server/request";
import { crossSite, readJson } from "@/lib/server/waitlist";

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

/** DELETE { token } → 204. Apaga o relatório (e as capturas de tela) de vez; só com o token de quem criou o teste. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (crossSite(request)) return errorJson("Not allowed.", 403, "FORBIDDEN");
  if (!UUID_RE.test(id)) return errorJson("Check not found.", 404, "NOT_FOUND");
  const body = await readJson(request, 1024);
  const token = typeof body?.token === "string" ? body.token : "";
  if (!token) return errorJson("This report can only be deleted from the browser that created it.", 403, "FORBIDDEN");
  try {
    if (!(await deleteCheck(id, token))) return errorJson("This report can only be deleted from the browser that created it.", 403, "FORBIDDEN");
    return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof ConfigError) return errorJson("Free checks aren't available right now.", 503, "NOT_CONFIGURED");
    console.error("app check delete failed", error);
    return errorJson("We couldn't delete this report. Please try again.", 500, "CHECK_ERROR");
  }
}
