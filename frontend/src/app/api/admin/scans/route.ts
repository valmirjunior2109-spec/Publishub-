import { InvalidUrlError, normalizeStoreUrl } from "@/lib/scanner/url";
import { adminFromRequest } from "@/lib/server/admin";
import { errorJson, json } from "@/lib/server/request";
import { createScan, scannerMode } from "@/lib/server/scans";

export const runtime = "nodejs";

const MAX_BATCH = 100;

/**
 * POST { urls: string[] }: enfileira um scan por loja, sem o limite por IP.
 * No modo "vercel", o próprio /admin chama /api/scan/[id]/run para cada um; no "worker", a fila anda sozinha.
 */
export async function POST(request: Request) {
  if (!(await adminFromRequest(request))) return errorJson("Not allowed.", 403, "FORBIDDEN");
  let urls: unknown[] = [];
  try {
    const body = (await request.json()) as { urls?: unknown };
    if (Array.isArray(body.urls)) urls = body.urls;
  } catch {
    return errorJson("Send { urls: [...] }.", 400, "BAD_REQUEST");
  }
  if (!urls.length) return errorJson("No URLs found in the file.", 400, "EMPTY");
  if (urls.length > MAX_BATCH) return errorJson(`Up to ${MAX_BATCH} URLs per batch.`, 400, "TOO_MANY");

  const created: { id: string; url: string }[] = [];
  const errors: { input: string; error: string }[] = [];
  const seen = new Set<string>();
  for (const raw of urls) {
    const input = String(raw ?? "").trim();
    if (!input) continue;
    try {
      const url = normalizeStoreUrl(input).origin;
      if (seen.has(url)) continue;
      seen.add(url);
      created.push({ id: await createScan(url, null, "admin"), url });
    } catch (error) {
      errors.push({ input, error: error instanceof InvalidUrlError ? error.message : "Could not queue this URL." });
    }
  }
  return json({ mode: scannerMode(), created, errors }, 201);
}
