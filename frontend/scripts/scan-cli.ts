/**
 * Roda o scanner sem banco, para testar: npx tsx scripts/scan-cli.ts <url>
 * Também mostra os e-mails de contato que a loja publica (o que iria para leads).
 * Precisa de CHROME_EXECUTABLE_PATH apontando para um Chrome ou Edge instalado.
 */
import { fetchContactPages } from "../src/lib/scanner/contact";
import { bestEmails } from "../src/lib/scanner/emails";
import { scanStore } from "../src/lib/scanner/scan";
import { riskBand } from "../src/lib/scanner/score";
import { assertPublicHost, normalizeStoreUrl } from "../src/lib/scanner/url";

async function main() {
  const url = normalizeStoreUrl(process.argv[2]);
  await assertPublicHost(url);
  const started = Date.now();
  const deadlineMs = Number(process.env.SCAN_DEADLINE_MS || 55_000);
  const contactPages = fetchContactPages(url.origin, { deadlineMs: deadlineMs - 3_000 }).catch(() => []);
  const result = await scanStore(url, {
    deadlineMs,
    onPage: (page, phase) => console.log(`${phase === "start" ? "→" : "✓"} ${page.kind} ${page.url} ${phase === "end" ? `${page.status} (${page.issues.length} exemplos)${page.error ? ` ${page.error}` : ""}` : ""}`),
  });
  console.log(`\nShopify: ${result.isShopify} · risk ${result.riskScore} (${riskBand(result.riskScore)}) · ${((Date.now() - started) / 1000).toFixed(1)} s`);
  for (const rule of result.rules.sort((a, b) => b.occurrences - a.occurrences)) console.log(`  ${rule.impact.padEnd(8)} ${rule.ruleId.padEnd(28)} ${rule.occurrences}`);
  const pages = [...(await contactPages), ...(result.home ? [{ url: result.home.url, html: result.home.footerHtml }] : [])];
  console.log(`\nE-mails (${pages.length} páginas lidas):`);
  for (const item of bestEmails(pages, url.hostname)) console.log(`  ${item.email}  ← ${item.sourcePage}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
