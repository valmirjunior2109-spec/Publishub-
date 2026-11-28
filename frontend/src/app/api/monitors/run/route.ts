import { after } from "next/server";
import { cronAuthorized } from "@/lib/server/cron";
import { UUID_RE } from "@/lib/server/db";
import { runMonitorCheck } from "@/lib/server/monitors";
import { errorJson, json } from "@/lib/server/request";
import { readJson } from "@/lib/server/waitlist";

export const runtime = "nodejs";
// o teste roda depois da resposta (after), dentro do mesmo limite da função
export const maxDuration = 60;

/** POST { monitorId, checkId, locale } (só do agendamento) → 202. Roda o teste do monitor e manda o alerta se precisar. */
export async function POST(request: Request) {
  if (!cronAuthorized(request)) return errorJson("Not allowed.", 401, "UNAUTHORIZED");
  const body = await readJson(request, 1024);
  const monitorId = typeof body?.monitorId === "string" && UUID_RE.test(body.monitorId) ? body.monitorId : null;
  const checkId = typeof body?.checkId === "string" && UUID_RE.test(body.checkId) ? body.checkId : null;
  if (!monitorId || !checkId) return errorJson("Send monitorId and checkId.", 400, "BAD_REQUEST");
  const locale = body?.locale === "pt" ? "pt" : "en";
  after(() => runMonitorCheck(monitorId, checkId, locale).catch((error) => console.error("monitor run failed", monitorId, error)));
  return json({ status: "running" }, 202);
}
