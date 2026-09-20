/**
 * O gatilho do lembrete de 72 h.
 *
 * A Vercel só agenda cron para rotas do próprio deploy, e a service_role key
 * mora no backend — então esta rota é só a ponte: confere o segredo do cron e
 * repassa para o FastAPI, que é quem lê a fila e manda os e-mails.
 *
 * Variáveis (server-side, sem NEXT_PUBLIC): CRON_SECRET (o que a Vercel manda no
 * Authorization), INTERNAL_SECRET (o que o backend espera) e API_URL.
 */

export const dynamic = "force-dynamic";

const API_URL = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const internalSecret = process.env.INTERNAL_SECRET;

  if (!cronSecret || !internalSecret) {
    return Response.json({ error: "cron not configured" }, { status: 503 });
  }
  // a Vercel assina a chamada do cron com o CRON_SECRET
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const response = await fetch(`${API_URL}/api/internal/followups`, {
      method: "POST",
      headers: { "X-Internal-Secret": internalSecret },
      cache: "no-store",
    });
    const body = await response.json().catch(() => null);
    return Response.json(body ?? { error: "bad response" }, { status: response.status });
  } catch {
    // o backend pode estar dormindo (free tier): a próxima rodada tenta de novo
    return Response.json({ error: "backend unreachable" }, { status: 502 });
  }
}
