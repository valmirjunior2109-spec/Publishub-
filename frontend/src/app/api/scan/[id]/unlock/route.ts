import { db, UUID_RE } from "@/lib/server/db";
import { EMAIL_RE, errorJson, json, unlockCookieName, unlockToken } from "@/lib/server/request";
import { getScan } from "@/lib/server/scans";

export const runtime = "nodejs";

/** POST { email }: guarda o lead e abre o relatório completo neste navegador. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return errorJson("Report not found.", 404, "NOT_FOUND");

  let email = "";
  try {
    email = String(((await request.json()) as { email?: unknown }).email ?? "").trim().toLowerCase();
  } catch {
    // corpo inválido: cai na validação abaixo
  }
  if (!EMAIL_RE.test(email) || email.length > 320) return errorJson("Enter a valid email address.", 400, "INVALID_EMAIL");

  const scan = await getScan(id);
  if (!scan) return errorJson("Report not found.", 404, "NOT_FOUND");

  const { error } = await db().from("leads").upsert({ email, store_url: scan.url, scan_id: id, source: "report" }, { onConflict: "email,scan_id", ignoreDuplicates: true });
  if (error) {
    console.error("lead insert failed", error);
    return errorJson("We couldn't save your email. Please try again.", 500, "LEAD_ERROR");
  }

  const response = json({ ok: true });
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.headers.append("set-cookie", `${unlockCookieName(id)}=${unlockToken(id)}; Path=/; Max-Age=${60 * 60 * 24 * 365}; HttpOnly; SameSite=Lax${secure}`);
  return response;
}
