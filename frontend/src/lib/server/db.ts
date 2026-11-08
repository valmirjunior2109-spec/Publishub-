import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * O cliente do Supabase com a service_role: só no servidor (rotas da API e o worker).
 * Ignora o RLS, por isso nunca é importado por componentes do navegador.
 */

let client: SupabaseClient | null = null;

export class ConfigError extends Error {}

export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new ConfigError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
