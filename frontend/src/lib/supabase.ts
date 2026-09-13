import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && publicKey);
export const VIDEOS_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "videos";
export const INSIGHTS_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_INSIGHTS_BUCKET || "insights";

let client: SupabaseClient | null = null;

/** Cliente do navegador (só a chave pública). Null quando as variáveis faltam. */
export function getSupabase(): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  if (!client) client = createClient(url as string, publicKey as string);
  return client;
}

export function supabaseUrl(): string {
  return url ?? "";
}

export function supabasePublicKey(): string {
  return publicKey ?? "";
}
