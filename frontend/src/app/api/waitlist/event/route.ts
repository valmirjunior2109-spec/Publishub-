import { db } from "@/lib/server/db";
import { clientIp, hashIp } from "@/lib/server/request";
import { cleanUtm, crossSite, readJson, referrerHost } from "@/lib/server/waitlist";

export const runtime = "nodejs";

const EVENTS = new Set(["page_view", "cta_click", "share_click"]);

/**
 * POST { event, detail?, utm, referrer } → 204. O funil da página /verify (visitas, cliques, compartilhamentos).
 * A inscrição não passa por aqui: quem grava o evento "signup" é a própria inscrição, no banco.
 * Responde 204 mesmo quando ignora o evento: métrica perdida não atrapalha a página.
 */
export async function POST(request: Request) {
  const done = new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
  if (crossSite(request)) return done;
  const body = await readJson(request, 2048);
  const event = typeof body?.event === "string" ? body.event : "";
  if (!body || !EVENTS.has(event)) return done;

  const detail = typeof body.detail === "string" && /^[a-z0-9_-]{1,40}$/.test(body.detail) ? body.detail : null;
  const utm = cleanUtm(body.utm);
  try {
    const { error } = await db().rpc("waitlist_track", {
      p_event: event,
      p_detail: detail,
      p_utm_source: utm.utm_source ?? null,
      p_utm_medium: utm.utm_medium ?? null,
      p_utm_campaign: utm.utm_campaign ?? null,
      p_utm_content: utm.utm_content ?? null,
      p_referrer: referrerHost(body.referrer, request.headers.get("x-forwarded-host") || request.headers.get("host")),
      p_ip_hash: hashIp(clientIp(request)),
    });
    if (error) console.error("waitlist track failed", error.message);
  } catch (error) {
    console.error("waitlist track failed", error instanceof Error ? error.message : error);
  }
  return done;
}
