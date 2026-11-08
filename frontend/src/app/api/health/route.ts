import { json } from "@/lib/server/request";
import { scannerMode } from "@/lib/server/scans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Diagnóstico da configuração: diz só SE cada variável chegou ao servidor (sim ou não),
 * nunca o valor. Serve para conferir um deploy novo sem abrir o painel da Vercel.
 */
export function GET() {
  const has = (name: string) => Boolean(process.env[name]?.trim());
  return json({
    status: "ok",
    scannerMode: scannerMode(),
    env: {
      supabaseUrl: has("SUPABASE_URL") || has("NEXT_PUBLIC_SUPABASE_URL"),
      supabaseServiceRoleKey: has("SUPABASE_SERVICE_ROLE_KEY"),
      supabaseAnonKey: has("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      adminEmail: has("ADMIN_EMAIL") || has("ADMIN_EMAILS"),
      stripeSecretKey: has("STRIPE_SECRET_KEY"),
      stripeFoundingPriceId: has("STRIPE_FOUNDING_PRICE_ID"),
      stripeFoundingWebhookSecret: has("STRIPE_FOUNDING_WEBHOOK_SECRET"),
    },
    vercelEnv: process.env.VERCEL_ENV ?? "local",
  });
}
