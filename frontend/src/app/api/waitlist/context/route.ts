import { errorJson, json } from "@/lib/server/request";
import { cleanBuilding, cleanFlow, cleanTool, crossSite, readJson } from "@/lib/server/waitlist";
import { addWaitlistContext, validContextToken } from "@/lib/server/waitlist-context";

export const runtime = "nodejs";

/**
 * POST { refCode, token, aiTool?, priorityFlow?, building? } → { saved }.
 * O formulário "ajude a priorizar" do relatório do /check, para quem já está na lista. Tudo é opcional;
 * só preenche o que ainda está vazio. O token vem da resposta da inscrição (só o navegador de quem se
 * inscreveu tem), então o código de indicação público, sozinho, não deixa ninguém mexer no contexto de outra pessoa.
 */
export async function POST(request: Request) {
  if (crossSite(request)) return errorJson("Not allowed.", 403, "FORBIDDEN");
  const body = await readJson(request, 2048);
  if (!body) return errorJson("Send a JSON body.", 400, "BAD_REQUEST");
  if (!validContextToken(body.refCode, body.token)) return errorJson("Not allowed.", 403, "FORBIDDEN");

  const context = { aiTool: cleanTool(body.aiTool), priorityFlow: cleanFlow(body.priorityFlow), building: cleanBuilding(body.building) };
  if (!context.aiTool && !context.priorityFlow && !context.building) return errorJson("Choose at least one answer.", 400, "BAD_REQUEST");

  const saved = await addWaitlistContext(body.refCode, context);
  if (!saved) return errorJson("We couldn't save your answers. Please try again later.", 503, "CONTEXT_ERROR");
  return json({ saved: true });
}
