import { ConfigError, UUID_RE } from "@/lib/server/db";
import { setMonitorStatus, validMonitorToken } from "@/lib/server/monitors";
import { errorJson, json } from "@/lib/server/request";
import { crossSite, readJson } from "@/lib/server/waitlist";

export const runtime = "nodejs";

/**
 * POST { action: "confirm" | "stop", token } → { status, url }.
 * Os botões da página /monitor/[id] (aberta pelos links do e-mail). É um POST, não o próprio GET do link,
 * para que o pré-carregamento de links de alguns e-mails não ligue nem desligue nada sozinho.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (crossSite(request)) return errorJson("Not allowed.", 403, "FORBIDDEN");
  if (!UUID_RE.test(id)) return errorJson("Monitor not found.", 404, "NOT_FOUND");
  const body = await readJson(request, 1024);
  const action = body?.action === "confirm" || body?.action === "stop" ? body.action : null;
  if (!action) return errorJson("Send an action.", 400, "BAD_REQUEST");
  if (!validMonitorToken(id, body?.token)) return errorJson("This link isn't valid anymore.", 403, "FORBIDDEN");
  try {
    const result = await setMonitorStatus(id, action);
    if (!result) return errorJson("Monitor not found.", 404, "NOT_FOUND");
    return json(result);
  } catch (error) {
    if (error instanceof ConfigError) return errorJson("The monitor isn't available right now.", 503, "NOT_CONFIGURED");
    console.error("monitor update failed", error);
    return errorJson("We couldn't update the monitor. Please try again.", 500, "MONITOR_ERROR");
  }
}
