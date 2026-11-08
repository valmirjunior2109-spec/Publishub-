import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * O cliente do Supabase no navegador (chave pública). Hoje só o /admin usa: é o login
 * do dono. O pacote é carregado sob demanda, para as páginas públicas não pagarem por ele.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && publicKey);

let client: Promise<SupabaseClient> | null = null;

export function getSupabase(): Promise<SupabaseClient> | null {
  if (!supabaseConfigured) return null;
  client ??= import("@supabase/supabase-js").then(({ createClient }) => createClient(url as string, publicKey as string));
  return client;
}
