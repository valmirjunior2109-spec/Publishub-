/**
 * O worker do scanner, para quando os 60 s da Vercel não bastarem (SCANNER_MODE=worker).
 * Consome a fila da tabela scans: pega o mais antigo em "queued", roda e grava.
 *
 *   npm run worker
 *
 * Roda em qualquer Linux x64 (Railway, Fly.io): usa o mesmo Chromium do @sparticuz/chromium
 * da Vercel, ou um Chrome próprio em CHROME_EXECUTABLE_PATH. Variáveis: SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY e, para métricas, NEXT_PUBLIC_POSTHOG_KEY.
 */
process.env.SCANNER_MODE ??= "worker";

const IDLE_MS = Number(process.env.WORKER_IDLE_MS || 3000);
let stopping = false;

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    console.log(`[worker] ${signal}: finishing the current scan, then stopping`);
    stopping = true;
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const { claimNextQueued, runClaimedScan } = await import("../src/lib/server/scans");
  console.log("[worker] waiting for scans");
  while (!stopping) {
    let id: string | null = null;
    try {
      id = await claimNextQueued();
    } catch (error) {
      console.error("[worker] could not read the queue", error);
    }
    if (!id) {
      await sleep(IDLE_MS);
      continue;
    }
    const started = Date.now();
    console.log(`[worker] scan ${id} started`);
    await runClaimedScan(id);
    console.log(`[worker] scan ${id} finished in ${((Date.now() - started) / 1000).toFixed(1)} s`);
  }
}

main().catch((error) => {
  console.error("[worker] fatal", error);
  process.exit(1);
});
