import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && publicKey);
export const VIDEOS_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "videos";
export const INSIGHTS_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_INSIGHTS_BUCKET || "insights";

let client: SupabaseClient | null = null;
let carregando: Promise<SupabaseClient | null> | null = null;

/**
 * Cliente do navegador (só a chave pública). Null quando as variáveis faltam.
 *
 * A biblioteca é buscada sob demanda: ela pesa mais de 200 KB e nenhuma primeira
 * tela depende dela para aparecer. Assim a página pinta e hidrata primeiro, e a
 * sessão chega logo em seguida.
 */
export async function getSupabase(): Promise<SupabaseClient | null> {
  if (!supabaseConfigured) return null;
  if (client) return client;
  if (!carregando) {
    carregando = import("@supabase/supabase-js").then(({ createClient }) => {
      client = createClient(url as string, publicKey as string);
      return client;
    });
  }
  return carregando;
}

/** Sair da conta, sem que quem chama precise saber do carregamento. */
export async function signOut(): Promise<void> {
  await (await getSupabase())?.auth.signOut();
}

export function supabaseUrl(): string {
  return url ?? "";
}

export function supabasePublicKey(): string {
  return publicKey ?? "";
}
