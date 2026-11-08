/**
 * Roda o scanner sem banco, para testar: npx tsx scripts/scan-cli.ts <url>
 * Precisa de CHROME_EXECUTABLE_PATH apontando para um Chrome ou Edge instalado.
 */
import { scanStore } from "../src/lib/scanner/scan";
import { riskBand } from "../src/lib/scanner/score";
import { assertPublicHost, normalizeStoreUrl } from "../src/lib/scanner/url";

async function main() {
  const url = normalizeStoreUrl(process.argv[2]);
  await assertPublicHost(url);
  const started = Date.now();
  const result = await scanStore(url, {
    deadlineMs: Number(process.env.SCAN_DEADLINE_MS || 55_000),
    onPage: (page, phase) => console.log(`${phase === "start" ? "→" : "✓"} ${page.kind} ${page.url} ${phase === "end" ? `${page.status} (${page.issues.length} exemplos)${page.error ? ` ${page.error}` : ""}` : ""}`),
  });
  console.log(`\nShopify: ${result.isShopify} · risk ${result.riskScore} (${riskBand(result.riskScore)}) · ${((Date.now() - started) / 1000).toFixed(1)} s`);
  for (const rule of result.rules.sort((a, b) => b.occurrences - a.occurrences)) console.log(`  ${rule.impact.padEnd(8)} ${rule.ruleId.padEnd(28)} ${rule.occurrences}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
