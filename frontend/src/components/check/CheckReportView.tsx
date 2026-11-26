"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Copy, Lock, RotateCcw, Share2, Trash2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { PixelIcon, PixelLoader, type PixelIconName } from "@/components/ui/Pixel";
import { FoundingCheckoutButton } from "@/components/waitlist/FoundingCheckoutButton";
import { WaitlistForm } from "@/components/waitlist/WaitlistForm";
import { useJoined } from "@/components/waitlist/joined";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { sendFunnelEvent } from "@/lib/funnel";
import { deleteTokenKey, type CheckItem, type CheckReport, type Verdict } from "@/lib/check/types";
import { FOUNDING_PERKS, FOUNDING_TERMS, FOUNDING_TERMS_ANCHOR, PRICING_ANCHOR } from "@/lib/founding";
import { sharedUrl, shareText, type ShareCounts } from "@/lib/check/share";
import { SITE_URL } from "@/lib/site";

/**
 * O relatório do teste grátis: consulta /api/check/[id] até terminar, mostra as verificações, as
 * capturas de tela e as páginas abertas, e termina no convite para a lista de espera (o que o teste
 * grátis não faz: rodar depois de cada deploy, com login e fluxos completos).
 */

const POLL_MS = 2500;
const PHASES = ["Opening your app in a real browser…", "Watching for JavaScript errors and failed requests…", "Checking the mobile layout…", "Opening your key pages like a user would…", "Testing internal links…", "Writing your report…"];

const VERDICT: Record<Verdict, { icon: PixelIconName; label: string; text: string; box: string }> = {
  fail: { icon: "fail", label: "Fail", text: "text-critical", box: "border-critical bg-critical-soft" },
  warn: { icon: "inconclusive", label: "Warning", text: "text-warning", box: "border-warning bg-warning-soft" },
  pass: { icon: "pass", label: "Pass", text: "text-success", box: "border-line bg-card" },
  skip: { icon: "inconclusive", label: "Skipped", text: "text-muted", box: "border-line bg-card" },
};

const ORDER: Record<Verdict, number> = { fail: 0, warn: 1, pass: 2, skip: 3 };

function host(url: string): string {
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname === "/" ? "" : u.pathname}`;
  } catch {
    return url;
  }
}

function CheckRow({ check }: { check: CheckItem }) {
  const v = VERDICT[check.verdict];
  return (
    <li className={cn("rounded-md border p-4", v.box)}>
      <div className="flex items-start gap-3">
        <PixelIcon name={v.icon} size={16} className={cn("mt-1 shrink-0", v.text)} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-semibold">{check.label}</span>
            <span className={cn("font-pixel text-sm", v.text)}>{v.label}</span>
          </p>
          <p className="mt-1 text-[15px] text-muted">{check.detail}</p>
          {check.items?.length ? (
            <ul className="mt-2 space-y-1 font-mono text-[13px] text-ink">
              {check.items.map((item) => (
                <li key={item} className="break-all">
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function Progress({ url, startedAt }: { url: string; startedAt: number }) {
  const [now, setNow] = useState(startedAt);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const elapsed = Math.max(0, Math.round((now - startedAt) / 1000));
  const phase = PHASES[Math.min(PHASES.length - 1, Math.floor(elapsed / 7))];
  return (
    <div className="rounded-md border border-line-strong bg-card p-6 shadow-[5px_5px_0_0_var(--line)] sm:p-8">
      <p role="status" aria-live="polite" className="flex items-center gap-3 font-pixel text-lg text-accent">
        <PixelLoader />
        {phase}
      </p>
      <p className="mt-3 text-muted">
        Checking <span className="font-mono text-ink">{host(url)}</span>. This usually takes 30 to 50 seconds. Keep this page open.
      </p>
      <p className="mt-1 text-sm text-muted">{elapsed} s</p>
    </div>
  );
}

function ShareResult({ counts }: { counts: ShareCounts }) {
  const [copied, setCopied] = useState(false);
  // quem já entrou na lista leva o próprio código de indicação no link: cada inscrição vinda do post conta para ele
  const refCode = useJoined()?.refCode ?? null;
  const text = shareText(counts);
  const x = `https://twitter.com/intent/tweet?${new URLSearchParams({ text, url: sharedUrl(SITE_URL, counts, "x", refCode) })}`;
  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?${new URLSearchParams({ url: sharedUrl(SITE_URL, counts, "linkedin", refCode) })}`;
  const threads = `https://www.threads.net/intent/post?${new URLSearchParams({ text: `${text} ${sharedUrl(SITE_URL, counts, "threads", refCode)}` })}`;
  const networks: [string, string, string][] = [
    ["x", "Share on X", x],
    ["linkedin", "LinkedIn", linkedin],
    ["threads", "Threads", threads],
  ];

  return (
    <div>
      <p className="mb-2 text-sm text-muted">Share your score, not your app: the post shows only these numbers, never your URL.</p>
      <div className="flex flex-wrap gap-2">
        {networks.map(([network, label, href]) => (
          <a
            key={network}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              sendFunnelEvent("share_click", `check_${network}`);
              track("app_check_shared", { network });
            }}
            className={buttonClasses("secondary", "md")}
          >
            <Share2 aria-hidden="true" className="h-4 w-4" />
            {label}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ))}
        <button
          type="button"
          className={buttonClasses("secondary", "md")}
          onClick={() => {
            sendFunnelEvent("share_click", "check_copy");
            track("app_check_shared", { network: "copy_report" });
            void navigator.clipboard.writeText(window.location.href).then(
              () => setCopied(true),
              () => setCopied(false),
            );
          }}
        >
          <Copy aria-hidden="true" className="h-4 w-4" />
          {copied ? "Report link copied" : "Copy private report link"}
        </button>
        <Link href="/check" className={buttonClasses("ghost", "md")}>
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          Check another app
        </Link>
      </div>
    </div>
  );
}

/**
 * A oferta Founding no momento de maior intenção: a pessoa acabou de ver o próprio app testado.
 * O texto muda com o resultado; os termos são os mesmos da home (FOUNDING_TERMS).
 */
function FoundingOffer({ fail, warn }: { fail: number; warn: number }) {
  const lead = fail
    ? `This check found ${fail} problem${fail === 1 ? "" : "s"} on public pages alone. Sign-up, login and checkout sit behind them, and nothing checks those after your next AI change.`
    : warn
      ? "Your public pages work today. Sign-up, login and checkout are the flows an AI change breaks quietly, and nothing checks those yet."
      : "Today it passed. The next AI change is the one to watch, starting with the flows a free check can't open: sign-up, login and checkout.";
  return (
    <div className="mt-8 rounded-md border-2 border-action bg-card p-6 sm:p-8">
      <p className="flex items-center gap-2 font-pixel text-sm text-accent">
        <PixelIcon name="star" size={14} />
        Founding Customers · $0 today
      </p>
      <h3 className="mt-3 text-xl font-bold sm:text-2xl">Get this checked every hour, set up for you by the founder.</h3>
      <p className="mt-3 max-w-2xl text-muted">{lead}</p>
      <ul className="mt-4 grid gap-2 text-[15px]">
        {FOUNDING_PERKS.slice(0, 4).map((item) => (
          <li key={item} className="flex items-start gap-2">
            <PixelIcon name="pass" size={14} className="mt-1 shrink-0 text-success" />
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-6 max-w-md">
        <FoundingCheckoutButton label="Reserve my founding spot · $0 today" />
      </div>
      <p className="mt-4 max-w-xl border-l-4 border-action bg-accent-soft px-3 py-2 text-sm">
        <strong>Publishub isn&apos;t available yet.</strong> We&apos;re building it now; reserving holds your spot and the founding price, and you get access when it launches.
      </p>
      <p className="mt-3 max-w-xl text-sm text-muted">
        Stripe stores your card and charges $0 now. At launch we email you at least {FOUNDING_TERMS.noticeDays} days before the first charge; cancel before then and you pay nothing.{" "}
        <Link href={`/terms#${FOUNDING_TERMS_ANCHOR}`}>Full terms</Link> · <Link href={`/#${PRICING_ANCHOR}`}>See pricing</Link>
      </p>
    </div>
  );
}

function readToken(id: string): string | null {
  try {
    return window.localStorage.getItem(deleteTokenKey(id));
  } catch {
    return null;
  }
}

/** Quem criou o teste (o token está neste navegador) pode apagar o relatório de vez. */
function DeleteReport({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const [token, setToken] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // o localStorage só existe no navegador: lido depois de montar, para o HTML do servidor bater com o do cliente
    const timer = setTimeout(() => setToken(readToken(id)), 0);
    return () => clearTimeout(timer);
  }, [id]);

  if (!token) return null;

  async function remove() {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/check/${id}`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) }).catch(() => null);
    if (response?.ok) {
      try {
        window.localStorage.removeItem(deleteTokenKey(id));
      } catch {
        // nada a limpar
      }
      onDeleted();
      return;
    }
    const body = (await response?.json().catch(() => ({}))) as { error?: { message?: string } } | undefined;
    setError(body?.error?.message ?? "We couldn't delete this report. Please try again.");
    setBusy(false);
  }

  return (
    <div className="mt-3">
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">Delete this report and its screenshots for good?</span>
          <button type="button" onClick={() => void remove()} disabled={busy} className={buttonClasses("secondary", "md", "border-critical text-critical")}>
            {busy ? <PixelLoader /> : <Trash2 aria-hidden="true" className="h-4 w-4" />}
            Yes, delete it
          </button>
          <button type="button" onClick={() => setConfirming(false)} disabled={busy} className={buttonClasses("ghost", "md")}>
            Cancel
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className={buttonClasses("ghost", "md", "px-0 text-muted hover:text-critical")}>
          <Trash2 aria-hidden="true" className="h-4 w-4" />
          Delete this report
        </button>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-critical">
          {error}
        </p>
      )}
    </div>
  );
}

export function CheckReportView({ id }: { id: string }) {
  const [report, setReport] = useState<CheckReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());
  const [deleted, setDeleted] = useState(false);
  const viewed = useRef(false);

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function load() {
      try {
        const response = await fetch(`/api/check/${id}`, { cache: "no-store" });
        const body = (await response.json().catch(() => ({}))) as unknown;
        if (!response.ok) {
          const message = (body as { error?: { message?: string } }).error?.message;
          throw new Error(message || "We couldn't load this check.");
        }
        if (stop) return;
        const data = body as CheckReport;
        setReport(data);
        setError(null);
        if (data.status === "queued" || data.status === "running") timer = setTimeout(load, POLL_MS);
      } catch (err) {
        if (stop) return;
        setError(err instanceof Error ? err.message : "We couldn't load this check.");
        // um soluço de rede não encerra a espera: tenta de novo mais devagar
        timer = setTimeout(load, POLL_MS * 2);
      }
    }
    void load();
    return () => {
      stop = true;
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  useEffect(() => {
    if (report?.status === "done" && report.result && !viewed.current) {
      viewed.current = true;
      track("app_check_viewed", { fail: report.result.summary.fail, warn: report.result.summary.warn });
    }
  }, [report]);

  if (deleted) {
    return (
      <div role="status" className="rounded-md border border-line-strong bg-card p-6">
        <p className="text-lg font-semibold">This report was deleted.</p>
        <p className="mt-1 text-muted">The results and screenshots are gone from our servers.</p>
        <Link href="/check" className={buttonClasses("primary", "md", "mt-4")}>
          Run a new check
        </Link>
      </div>
    );
  }

  if (!report) {
    return error ? (
      <p role="alert" className="rounded-md border border-critical bg-critical-soft p-4 font-semibold text-critical">
        {error}
      </p>
    ) : (
      <p role="status" className="flex items-center gap-3 font-pixel text-lg text-accent">
        <PixelLoader />
        Loading…
      </p>
    );
  }

  if (report.status === "queued" || report.status === "running") return <Progress url={report.url} startedAt={startedAt} />;

  if (report.status === "failed" || !report.result) {
    return (
      <div className="rounded-md border border-critical bg-critical-soft p-6">
        <p role="alert" className="font-semibold text-critical">
          {report.error ?? "We couldn't finish the check."}
        </p>
        <Link href="/check" className={buttonClasses("primary", "md", "mt-4")}>
          Try again
        </Link>
      </div>
    );
  }

  const { result, screenshots } = report;
  const { fail, warn, pass } = result.summary;
  const checks = [...result.checks].sort((a, b) => ORDER[a.verdict] - ORDER[b.verdict]);
  const headline = fail ? `${fail} problem${fail === 1 ? "" : "s"} found` : warn ? "Working, with warnings" : "No problems found";

  return (
    <div className="space-y-12">
      <section aria-labelledby="summary-heading" className="rounded-md border border-line-strong bg-card p-6 shadow-[5px_5px_0_0_var(--line)] sm:p-8">
        <p className="font-mono text-sm text-muted break-all">{host(result.finalUrl)}</p>
        <h2 id="summary-heading" className={cn("mt-2 text-3xl font-bold", fail ? "text-critical" : warn ? "text-warning" : "text-success")}>
          {headline}
        </h2>
        <p className="mt-2 text-lg">
          {fail
            ? "Good news: you found it before your users did."
            : warn
              ? "Nothing is broken right now. A few things are worth a look before you share your app."
              : "Your app passed today's check. The next AI change is the one to watch."}
        </p>
        <dl className="mt-5 grid grid-cols-3 gap-3 sm:max-w-md">
          {[
            ["Failures", fail, "text-critical"],
            ["Warnings", warn, "text-warning"],
            ["Passed", pass, "text-success"],
          ].map(([label, value, color]) => (
            <div key={label as string} className="rounded-lg border border-line p-3">
              <dt className="text-sm text-muted">{label}</dt>
              <dd className={cn("font-pixel text-2xl", color as string)}>{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 text-sm text-muted">
          Checked {new Date(report.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })} in {(result.meta.durationMs / 1000).toFixed(0)} s. A free check opens public pages only: it doesn&apos;t log in, submit forms or test
          flows behind a login.
        </p>
        <div className="mt-5">
          <ShareResult counts={{ fail, warn, pass }} />
        </div>
        <div className="mt-5 border-t border-line pt-4">
          <p className="flex items-start gap-2 text-sm text-muted">
            <Lock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Only people with this link can see this report. It isn&apos;t listed anywhere and search engines don&apos;t index it.</span>
          </p>
          <DeleteReport id={report.id} onDeleted={() => setDeleted(true)} />
        </div>
      </section>

      <section aria-labelledby="checks-heading">
        <h2 id="checks-heading" className="text-2xl font-bold">
          What we checked
        </h2>
        <ul className="mt-5 space-y-3">
          {checks.map((check) => (
            <CheckRow key={check.id} check={check} />
          ))}
        </ul>
      </section>

      {(screenshots?.desktop || screenshots?.mobile) && (
        <section aria-labelledby="shots-heading">
          <h2 id="shots-heading" className="text-2xl font-bold">
            What a visitor sees
          </h2>
          <div className="mt-5 grid items-start gap-6 md:grid-cols-[1fr_auto]">
            {screenshots.desktop && (
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL gerada no servidor */}
                <img src={screenshots.desktop} alt={`Desktop screenshot of ${host(result.finalUrl)}`} width={1280} height={800} className="h-auto w-full rounded-md border border-line" />
                <figcaption className="mt-2 text-sm text-muted">Desktop, 1280 × 800</figcaption>
              </figure>
            )}
            {screenshots.mobile && (
              <figure className="mx-auto w-[200px] md:w-[220px]">
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL gerada no servidor */}
                <img src={screenshots.mobile} alt={`Mobile screenshot of ${host(result.finalUrl)}`} width={390} height={844} className="h-auto w-full rounded-md border border-line" />
                <figcaption className="mt-2 text-sm text-muted">Phone, 390 px wide</figcaption>
              </figure>
            )}
          </div>
        </section>
      )}

      {result.pages.length > 0 && (
        <section aria-labelledby="pages-heading">
          <h2 id="pages-heading" className="text-2xl font-bold">
            Pages we opened in the browser
          </h2>
          <div className="mt-5 overflow-x-auto" tabIndex={0} role="region" aria-label="Pages opened">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr>
                  {["Page", "Status", "Load time", "JS errors"].map((h) => (
                    <th key={h} scope="col" className="border-b border-line-strong px-3 py-2 text-left font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.pages.map((page) => (
                  <tr key={page.url}>
                    <td className="border-b border-line px-3 py-2 font-mono break-all">{host(page.url)}</td>
                    <td className="border-b border-line px-3 py-2">{page.error ? "Didn't load" : page.notFound ? "Shows \"not found\"" : (page.status ?? "–")}</td>
                    <td className="border-b border-line px-3 py-2">{page.loadMs !== null ? `${(page.loadMs / 1000).toFixed(1)} s` : "–"}</td>
                    <td className={cn("border-b border-line px-3 py-2", page.jsErrors ? "font-semibold text-critical" : "")}>{page.jsErrors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section aria-labelledby="next-heading" className="rounded-md border border-line-strong bg-surface p-6 sm:p-8">
        <p className="eyebrow">What a free check can&apos;t do</p>
        <h2 id="next-heading" className="mt-3 text-2xl font-bold sm:text-3xl">
          Your next AI change can break this again.
        </h2>
        <p className="mt-3 max-w-2xl text-muted">
          Publishub is building the full version: your sign-up, login and checkout journeys, run in a real browser after every deploy, compared with the last version that worked, with a bug report you can hand
          straight back to your coding agent. Join the waitlist to get early access.
        </p>
        <div className="mt-6 max-w-xl">
          <WaitlistForm form="check" submitLabel="Get early access" layout="stacked" defaultAppUrl={result.finalUrl} />
        </div>
        <FoundingOffer fail={fail} warn={warn} />
        <p className="mt-6 max-w-xl text-[15px] text-muted">
          Build with Claude Code or Cursor? Run the same kind of check on your machine after every change, free and open source:{" "}
          <a href="https://github.com/valmirjunior2109-spec/stillworks" target="_blank" rel="noopener noreferrer" data-cta="check_stillworks" className="font-semibold">
            stillworks<span className="sr-only"> (opens in a new tab)</span>
          </a>{" "}
          (<code className="font-mono text-[14px]">npx stillworks check</code>).
        </p>
      </section>
    </div>
  );
}
