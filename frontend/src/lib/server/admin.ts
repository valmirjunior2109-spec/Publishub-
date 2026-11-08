import { db } from "./db";

/**
 * O /admin é só do dono: o navegador manda o token da sessão do Supabase e o
 * servidor confere se o e-mail dela está em ADMIN_EMAIL (aceita vários, separados por vírgula).
 */

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAIL || process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function adminFromRequest(request: Request): Promise<string | null> {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  const allowed = adminEmails();
  if (!allowed.length) return null;
  const { data, error } = await db().auth.getUser(token);
  const email = data.user?.email?.toLowerCase();
  if (error || !email || !allowed.includes(email)) return null;
  return email;
}
