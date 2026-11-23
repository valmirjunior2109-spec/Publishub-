/**
 * O teste grátis em lote, para conferir os SEUS próprios apps (vários projetos ou deploys de uma vez).
 * Não use em apps de terceiros: o Publishub não testa o software de ninguém sem a pessoa pedir.
 * Lê URLs (uma por linha; linhas vazias e com # são ignoradas), roda o mesmo teste do /check em cada uma,
 * uma de cada vez, e escreve um CSV. No fim, mostra o resumo no terminal. Não grava nada no banco.
 *
 *   npm run check:batch -- urls.txt > resultado.csv
 *   npm run check:batch -- myapp.vercel.app outroapp.lovable.app
 *
 * Precisa de um Chrome: CHROME_EXECUTABLE_PATH, ou o @sparticuz/chromium (Linux x64).
 * Só apps públicos que são seus: o script espera 2 s entre um e outro.
 */
import { existsSync, readFileSync } from "node:fs";
import { runCheck } from "../src/lib/check/run";
import type { CheckId } from "../src/lib/check/types";
import { assertPublicHost, normalizeAppUrl } from "../src/lib/check/url";

const COLUMNS: CheckId[] = ["loads", "https", "js_errors", "console", "network", "links", "pages", "mobile", "speed", "preview"];
const csv = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function inputs(args: string[]): string[] {
  return args.flatMap((arg) =>
    existsSync(arg)
      ? readFileSync(arg, "utf8")
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith("#"))
      : [arg],
  );
}

async function main() {
  const urls = [...new Set(inputs(process.argv.slice(2)))];
  if (!urls.length) {
    console.error("Usage: npm run check:batch -- <urls.txt | url ...>");
    process.exit(1);
  }

  console.log(["input", "final_url", "fail", "warn", "pass", ...COLUMNS, "first_js_error", "first_failed_request", "duration_ms", "error"].map(csv).join(","));
  const totals = { checked: 0, errored: 0, anyFail: 0, byCheck: Object.fromEntries(COLUMNS.map((id) => [id, 0])) as Record<CheckId, number> };

  for (const [index, input] of urls.entries()) {
    console.error(`[${index + 1}/${urls.length}] ${input}`);
    try {
      const url = normalizeAppUrl(input);
      await assertPublicHost(url);
      const { result } = await runCheck(url, { deadlineMs: 60000 });
      const verdict = Object.fromEntries(result.checks.map((c) => [c.id, c.verdict])) as Record<CheckId, string>;
      totals.checked += 1;
      if (result.summary.fail) totals.anyFail += 1;
      for (const id of COLUMNS) if (verdict[id] === "fail") totals.byCheck[id] += 1;
      const first = (id: CheckId) => result.checks.find((c) => c.id === id)?.items?.[0] ?? "";
      console.log(
        [input, result.finalUrl, result.summary.fail, result.summary.warn, result.summary.pass, ...COLUMNS.map((id) => verdict[id] ?? ""), first("js_errors"), first("network"), result.meta.durationMs, ""].map(csv).join(","),
      );
    } catch (error) {
      totals.errored += 1;
      console.log([input, "", "", "", "", ...COLUMNS.map(() => ""), "", "", "", error instanceof Error ? error.message : String(error)].map(csv).join(","));
    }
    if (index < urls.length - 1) await sleep(2000);
  }

  const pct = (n: number) => (totals.checked ? `${((n / totals.checked) * 100).toFixed(0)}%` : "–");
  console.error(`\nChecked ${totals.checked} app(s) (${totals.errored} couldn't be checked).`);
  console.error(`At least one failure: ${totals.anyFail} (${pct(totals.anyFail)})`);
  for (const id of COLUMNS) if (totals.byCheck[id]) console.error(`  ${id.padEnd(10)} failed in ${totals.byCheck[id]} (${pct(totals.byCheck[id])})`);
}

void main();
