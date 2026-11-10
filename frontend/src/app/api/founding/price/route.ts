import { foundingCustomersPrice } from "@/lib/server/stripe";

export const runtime = "nodejs";

/**
 * GET → { price } da assinatura Founding Customers, lido do Stripe (ou null se não der para ler).
 * Cacheado por 1 hora na CDN: o card da home busca daqui, e a home continua estática.
 */
export async function GET() {
  const price = await foundingCustomersPrice();
  return Response.json(
    { price },
    { headers: { "cache-control": price ? "public, s-maxage=3600, stale-while-revalidate=86400" : "no-store" } },
  );
}
