import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && publicKey);
export const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "videos";

let client = null;

/** Browser Supabase client (public key only). Null when env vars are missing. */
export function getSupabase() {
  if (!supabaseConfigured) return null;
  if (!client) client = createClient(url, publicKey);
  return client;
}

export function supabaseUrl() {
  return url;
}

export function supabasePublicKey() {
  return publicKey;
}
