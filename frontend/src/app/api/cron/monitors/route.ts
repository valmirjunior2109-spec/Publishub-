import { cronAuthorized } from "@/lib/server/cron";
import { startDueMonitors } from "@/lib/server/monitors";
import { errorJson, json } from "@/lib/server/request";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Monitores por execução do agendamento: teto de custo (cada um abre um navegador por ~45 s). */
const MAX_PER_RUN = Number(process.env.MONITOR_MAX_PER_RUN) || 25;

/**
 * GET (o agendamento diário da Vercel, vercel.json → crons) → { started }.
 * Cria um teste para cada monitor vencido e dispara cada um numa função própria (/api/monitors/run), porque um
 * teste leva quase o limite de 60 s de uma função: rodar vários aqui em sequência não caberia.
 */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) return errorJson("Not allowed.", 401, "UNAUTHORIZED");
  try {
    const started = await startDueMonitors(MAX_PER_RUN);
    const runUrl = new URL("/api/monitors/run", request.url);
    const results = await Promise.allSettled(
      started.map((run) =>
        fetch(runUrl, {
          method: "POST",
          headers: { authorization: request.headers.get("authorization") ?? "", "content-type": "application/json" },
          body: JSON.stringify(run),
          signal: AbortSignal.timeout(15000),
        }),
      ),
    );
    const dispatched = results.filter((r) => r.status === "fulfilled" && r.value.ok).length;
    if (dispatched < started.length) console.error("monitor runs not dispatched", started.length - dispatched);
    return json({ started: started.length, dispatched });
  } catch (error) {
    console.error("monitor cron failed (has supabase/migrations/20261128100000_monitors.sql run?)", error);
    return errorJson("Monitor cron failed.", 500, "MONITOR_ERROR");
  }
}
