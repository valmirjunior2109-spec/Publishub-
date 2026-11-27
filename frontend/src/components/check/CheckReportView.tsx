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
import { FOUNDING_PERKS, FOUNDING_PERKS_PT, FOUNDING_TERMS, FOUNDING_TERMS_ANCHOR, PRICING_ANCHOR, STILLWORKS_URL } from "@/lib/founding";
import { INTL_LOCALE, localePath, type Locale } from "@/lib/i18n";
import { sharedUrl, shareText, type ShareCounts } from "@/lib/check/share";
import { SITE_URL } from "@/lib/site";

/**
 * O relatório do teste grátis: consulta /api/check/[id] até terminar, mostra as verificações, as
 * capturas de tela e as páginas abertas, e termina no convite para a lista de espera (o que o teste
 * grátis não faz: rodar depois de cada deploy, com login e fluxos completos).
 */

const POLL_MS = 2500;
const N = FOUNDING_TERMS.noticeDays;
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

const COPY = {
  en: {
    phases: ["Opening your app in a real browser…", "Watching for JavaScript errors and failed requests…", "Checking the mobile layout…", "Opening your key pages like a user would…", "Testing internal links…", "Writing your report…"],
    verdict: { fail: "Fail", warn: "Warning", pass: "Pass", skip: "Skipped" } as Record<Verdict, string>,
    checking: "Checking",
    takes: "This usually takes 30 to 50 seconds. Keep this page open.",
    sharePrivacy: "Share your score, not your app: the post shows only these numbers, never your URL.",
    shareX: "Share on X",
    newTab: " (opens in a new tab)",
    copied: "Report link copied",
    copyLink: "Copy private report link",
    another: "Check another app",
    offerLead: (fail: number, warn: number): string =>
      fail
        ? `This check found ${fail} ${plural(fail, "problem", "problems")} on public pages alone. Sign-up, login and checkout sit behind them, and nothing checks those after your next AI change.`
        : warn
          ? "Your public pages work today. Sign-up, login and checkout are the flows an AI change breaks quietly, and nothing checks those yet."
          : "Today it passed. The next AI change is the one to watch, starting with the flows a free check can't open: sign-up, login and checkout.",
    offerBadge: "Founding Customers · $0 today",
    offerTitle: "Get this checked every hour, set up for you by the founder.",
    perks: FOUNDING_PERKS as readonly string[],
    reserve: "Reserve my founding spot · $0 today",
    notYet: "Publishub isn't available yet.",
    notYetText: "We're building it now; reserving holds your spot and the founding price, and you get access when it launches.",
    stripe: `Stripe stores your card and charges $0 now. At launch we email you at least ${N} days before the first charge; cancel before then and you pay nothing.`,
    terms: "Full terms",
    pricing: "See pricing",
    deleteError: "We couldn't delete this report. Please try again.",
    deleteConfirm: "Delete this report and its screenshots for good?",
    deleteYes: "Yes, delete it",
    cancel: "Cancel",
    deleteReport: "Delete this report",
    loadError: "We couldn't load this check.",
    deleted: "This report was deleted.",
    deletedText: "The results and screenshots are gone from our servers.",
    newCheck: "Run a new check",
    loading: "Loading…",
    finishError: "We couldn't finish the check.",
    tryAgain: "Try again",
    headline: (fail: number, warn: number): string => (fail ? `${fail} ${plural(fail, "problem", "problems")} found` : warn ? "Working, with warnings" : "No problems found"),
    lead: (fail: number, warn: number): string =>
      fail
        ? "Good news: you found it before your users did."
        : warn
          ? "Nothing is broken right now. A few things are worth a look before you share your app."
          : "Your app passed today's check. The next AI change is the one to watch.",
    failures: "Failures",
    warnings: "Warnings",
    passed: "Passed",
    checkedAt: (when: string, s: string) => `Checked ${when} in ${s} s. A free check opens public pages only: it doesn't log in, submit forms or test flows behind a login.`,
    privateLink: "Only people with this link can see this report. It isn't listed anywhere and search engines don't index it.",
    whatWeChecked: "What we checked",
    visitorSees: "What a visitor sees",
    desktopAlt: (h: string) => `Desktop screenshot of ${h}`,
    mobileAlt: (h: string) => `Mobile screenshot of ${h}`,
    desktop: "Desktop, 1280 × 800",
    phone: "Phone, 390 px wide",
    pagesOpened: "Pages we opened in the browser",
    pagesRegion: "Pages opened",
    cols: ["Page", "Status", "Load time", "JS errors"],
    didntLoad: "Didn't load",
    notFound: 'Shows "not found"',
    cantEyebrow: "What a free check can't do",
    cantTitle: "Your next AI change can break this again.",
    cantText:
      "Publishub is building the full version: your sign-up, login and checkout journeys, run in a real browser after every deploy, compared with the last version that worked, with a bug report you can hand straight back to your coding agent. Join the waitlist to get early access.",
    early: "Get early access",
    cli: "Build with Claude Code or Cursor? Run the same kind of check on your machine after every change, free and open source:",
  },
  pt: {
    phases: ["Abrindo seu app num navegador de verdade…", "Procurando erros de JavaScript e requisições com falha…", "Conferindo o layout no celular…", "Abrindo as páginas importantes como um usuário…", "Testando os links internos…", "Escrevendo seu relatório…"],
    verdict: { fail: "Falha", warn: "Aviso", pass: "Ok", skip: "Pulado" } as Record<Verdict, string>,
    checking: "Testando",
    takes: "Isso costuma levar de 30 a 50 segundos. Mantenha esta página aberta.",
    sharePrivacy: "Compartilhe sua nota, não seu app: o post mostra só estes números, nunca a sua URL.",
    shareX: "Compartilhar no X",
    newTab: " (abre em nova aba)",
    copied: "Link do relatório copiado",
    copyLink: "Copiar link privado do relatório",
    another: "Testar outro app",
    offerLead: (fail: number, warn: number): string =>
      fail
        ? `Este teste encontrou ${fail} ${plural(fail, "problema", "problemas")} só nas páginas públicas. Cadastro, login e checkout estão por trás delas, e nada confere esses fluxos depois da sua próxima mudança com IA.`
        : warn
          ? "Suas páginas públicas funcionam hoje. Cadastro, login e checkout são os fluxos que uma mudança da IA quebra em silêncio, e nada confere esses fluxos ainda."
          : "Hoje passou. A próxima mudança da IA é a que merece atenção, começando pelos fluxos que um teste grátis não abre: cadastro, login e checkout.",
    offerBadge: "Founding Customers · US$ 0 hoje",
    offerTitle: "Tenha isso verificado de hora em hora, configurado para você pelo fundador.",
    perks: FOUNDING_PERKS_PT as readonly string[],
    reserve: "Reservar minha vaga de fundador · US$ 0 hoje",
    notYet: "O Publishub ainda não está disponível.",
    notYetText: "Estamos construindo agora; a reserva garante sua vaga e o preço de fundador, e você recebe acesso no lançamento.",
    stripe: `O Stripe guarda seu cartão e cobra US$ 0 agora. No lançamento, avisamos por e-mail pelo menos ${N} dias antes da primeira cobrança; cancele antes e você não paga nada.`,
    terms: "Termos completos (em inglês)",
    pricing: "Ver preços",
    deleteError: "Não conseguimos apagar este relatório. Tente de novo.",
    deleteConfirm: "Apagar este relatório e as capturas de tela de vez?",
    deleteYes: "Sim, apagar",
    cancel: "Cancelar",
    deleteReport: "Apagar este relatório",
    loadError: "Não conseguimos carregar este teste.",
    deleted: "Este relatório foi apagado.",
    deletedText: "Os resultados e as capturas de tela foram removidos dos nossos servidores.",
    newCheck: "Fazer um novo teste",
    loading: "Carregando…",
    finishError: "Não conseguimos terminar o teste.",
    tryAgain: "Tentar de novo",
    headline: (fail: number, warn: number): string =>
      fail ? `${fail} ${plural(fail, "problema encontrado", "problemas encontrados")}` : warn ? "Funcionando, com avisos" : "Nenhum problema encontrado",
    lead: (fail: number, warn: number): string =>
      fail
        ? "A boa notícia: você encontrou antes dos seus usuários."
        : warn
          ? "Nada está quebrado agora. Algumas coisas merecem uma olhada antes de você divulgar o app."
          : "Seu app passou no teste de hoje. A próxima mudança da IA é a que merece atenção.",
    failures: "Falhas",
    warnings: "Avisos",
    passed: "Ok",
    checkedAt: (when: string, s: string) => `Testado em ${when}, em ${s} s. Um teste grátis abre só páginas públicas: não faz login, não envia formulários e não testa fluxos por trás de um login.`,
    privateLink: "Só quem tem este link vê este relatório. Ele não aparece em lugar nenhum e não é indexado por buscadores.",
    whatWeChecked: "O que verificamos",
    visitorSees: "O que um visitante vê",
    desktopAlt: (h: string) => `Captura de tela no desktop de ${h}`,
    mobileAlt: (h: string) => `Captura de tela no celular de ${h}`,
    desktop: "Desktop, 1280 × 800",
    phone: "Celular, 390 px de largura",
    pagesOpened: "Páginas que abrimos no navegador",
    pagesRegion: "Páginas abertas",
    cols: ["Página", "Status", "Carregamento", "Erros de JS"],
    didntLoad: "Não carregou",
    notFound: "Mostra “não encontrado”",
    cantEyebrow: "O que um teste grátis não faz",
    cantTitle: "Sua próxima mudança com IA pode quebrar isso de novo.",
    cantText:
      "O Publishub está construindo a versão completa: suas jornadas de cadastro, login e checkout rodando num navegador de verdade depois de cada deploy, comparadas com a última versão que funcionava, com um relatório de bug pronto para o seu agente de IA. Entre na lista de espera para ter acesso antecipado.",
    early: "Quero acesso antecipado",
    cli: "Usa Claude Code ou Cursor? Rode o mesmo tipo de teste na sua máquina depois de cada mudança, grátis e open source:",
  },
};

type Copy = (typeof COPY)["en"];

const VERDICT: Record<Verdict, { icon: PixelIconName; text: string; box: string }> = {
  fail: { icon: "fail", text: "text-critical", box: "border-critical bg-critical-soft" },
  warn: { icon: "inconclusive", text: "text-warning", box: "border-warning bg-warning-soft" },
  pass: { icon: "pass", text: "text-success", box: "border-line bg-card" },
  skip: { icon: "inconclusive", text: "text-muted", box: "border-line bg-card" },
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

function CheckRow({ check, t }: { check: CheckItem; t: Copy }) {
  const v = VERDICT[check.verdict];
  return (
    <li className={cn("rounded-md border p-4", v.box)}>
      <div className="flex items-start gap-3">
        <PixelIcon name={v.icon} size={16} className={cn("mt-1 shrink-0", v.text)} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-semibold">{check.label}</span>
            <span className={cn("font-pixel text-sm", v.text)}>{t.verdict[check.verdict]}</span>
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

function Progress({ url, startedAt, t }: { url: string; startedAt: number; t: Copy }) {
  const [now, setNow] = useState(startedAt);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const elapsed = Math.max(0, Math.round((now - startedAt) / 1000));
  const phase = t.phases[Math.min(t.phases.length - 1, Math.floor(elapsed / 7))];
  return (
    <div className="rounded-md border border-line-strong bg-card p-6 shadow-[5px_5px_0_0_var(--line)] sm:p-8">
      <p role="status" aria-live="polite" className="flex items-center gap-3 font-pixel text-lg text-accent">
        <PixelLoader />
        {phase}
      </p>
      <p className="mt-3 text-muted">
        {t.checking} <span className="font-mono text-ink">{host(url)}</span>. {t.takes}
      </p>
      <p className="mt-1 text-sm text-muted">{elapsed} s</p>
    </div>
  );
}

function ShareResult({ counts, t, locale }: { counts: ShareCounts; t: Copy; locale: Locale }) {
  const [copied, setCopied] = useState(false);
  // quem já entrou na lista leva o próprio código de indicação no link: cada inscrição vinda do post conta para ele
  const refCode = useJoined()?.refCode ?? null;
  const text = shareText(counts, locale);
  const x = `https://twitter.com/intent/tweet?${new URLSearchParams({ text, url: sharedUrl(SITE_URL, counts, "x", refCode) })}`;
  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?${new URLSearchParams({ url: sharedUrl(SITE_URL, counts, "linkedin", refCode) })}`;
  const threads = `https://www.threads.net/intent/post?${new URLSearchParams({ text: `${text} ${sharedUrl(SITE_URL, counts, "threads", refCode)}` })}`;
  const networks: [string, string, string][] = [
    ["x", t.shareX, x],
    ["linkedin", "LinkedIn", linkedin],
    ["threads", "Threads", threads],
  ];

  return (
    <div>
      <p className="mb-2 text-sm text-muted">{t.sharePrivacy}</p>
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
            <span className="sr-only">{t.newTab}</span>
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
          {copied ? t.copied : t.copyLink}
        </button>
        <Link href={localePath(locale, "/check")} className={buttonClasses("ghost", "md")}>
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          {t.another}
        </Link>
      </div>
    </div>
  );
}

/**
 * A oferta Founding no momento de maior intenção: a pessoa acabou de ver o próprio app testado.
 * O texto muda com o resultado; os termos são os mesmos da home (FOUNDING_TERMS).
 */
function FoundingOffer({ fail, warn, t, locale }: { fail: number; warn: number; t: Copy; locale: Locale }) {
  return (
    <div className="mt-8 rounded-md border-2 border-action bg-card p-6 sm:p-8">
      <p className="flex items-center gap-2 font-pixel text-sm text-accent">
        <PixelIcon name="star" size={14} />
        {t.offerBadge}
      </p>
      <h3 className="mt-3 text-xl font-bold sm:text-2xl">{t.offerTitle}</h3>
      <p className="mt-3 max-w-2xl text-muted">{t.offerLead(fail, warn)}</p>
      <ul className="mt-4 grid gap-2 text-[15px]">
        {t.perks.slice(0, 4).map((item) => (
          <li key={item} className="flex items-start gap-2">
            <PixelIcon name="pass" size={14} className="mt-1 shrink-0 text-success" />
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-6 max-w-md">
        <FoundingCheckoutButton label={t.reserve} locale={locale} />
      </div>
      <p className="mt-4 max-w-xl border-l-4 border-action bg-accent-soft px-3 py-2 text-sm">
        <strong>{t.notYet}</strong> {t.notYetText}
      </p>
      <p className="mt-3 max-w-xl text-sm text-muted">
        {t.stripe} <Link href={`/terms#${FOUNDING_TERMS_ANCHOR}`}>{t.terms}</Link> · <Link href={localePath(locale, `/#${PRICING_ANCHOR}`)}>{t.pricing}</Link>
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
function DeleteReport({ id, onDeleted, t }: { id: string; onDeleted: () => void; t: Copy }) {
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
    setError(t === COPY.pt ? t.deleteError : (body?.error?.message ?? t.deleteError));
    setBusy(false);
  }

  return (
    <div className="mt-3">
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">{t.deleteConfirm}</span>
          <button type="button" onClick={() => void remove()} disabled={busy} className={buttonClasses("secondary", "md", "border-critical text-critical")}>
            {busy ? <PixelLoader /> : <Trash2 aria-hidden="true" className="h-4 w-4" />}
            {t.deleteYes}
          </button>
          <button type="button" onClick={() => setConfirming(false)} disabled={busy} className={buttonClasses("ghost", "md")}>
            {t.cancel}
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className={buttonClasses("ghost", "md", "px-0 text-muted hover:text-critical")}>
          <Trash2 aria-hidden="true" className="h-4 w-4" />
          {t.deleteReport}
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

export function CheckReportView({ id, locale = "en" }: { id: string; locale?: Locale }) {
  const t = COPY[locale];
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
          throw new Error(locale === "pt" ? COPY.pt.loadError : message || COPY.en.loadError);
        }
        if (stop) return;
        const data = body as CheckReport;
        setReport(data);
        setError(null);
        if (data.status === "queued" || data.status === "running") timer = setTimeout(load, POLL_MS);
      } catch (err) {
        if (stop) return;
        setError(err instanceof Error ? err.message : COPY[locale].loadError);
        // um soluço de rede não encerra a espera: tenta de novo mais devagar
        timer = setTimeout(load, POLL_MS * 2);
      }
    }
    void load();
    return () => {
      stop = true;
      if (timer) clearTimeout(timer);
    };
  }, [id, locale]);

  useEffect(() => {
    if (report?.status === "done" && report.result && !viewed.current) {
      viewed.current = true;
      track("app_check_viewed", { fail: report.result.summary.fail, warn: report.result.summary.warn });
    }
  }, [report]);

  if (deleted) {
    return (
      <div role="status" className="rounded-md border border-line-strong bg-card p-6">
        <p className="text-lg font-semibold">{t.deleted}</p>
        <p className="mt-1 text-muted">{t.deletedText}</p>
        <Link href={localePath(locale, "/check")} className={buttonClasses("primary", "md", "mt-4")}>
          {t.newCheck}
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
        {t.loading}
      </p>
    );
  }

  if (report.status === "queued" || report.status === "running") return <Progress url={report.url} startedAt={startedAt} t={t} />;

  if (report.status === "failed" || !report.result) {
    return (
      <div className="rounded-md border border-critical bg-critical-soft p-6">
        <p role="alert" className="font-semibold text-critical">
          {report.error ?? t.finishError}
        </p>
        <Link href={localePath(locale, "/check")} className={buttonClasses("primary", "md", "mt-4")}>
          {t.tryAgain}
        </Link>
      </div>
    );
  }

  const { result, screenshots } = report;
  const { fail, warn, pass } = result.summary;
  const checks = [...result.checks].sort((a, b) => ORDER[a.verdict] - ORDER[b.verdict]);
  const headline = t.headline(fail, warn);

  return (
    <div className="space-y-12">
      <section aria-labelledby="summary-heading" className="rounded-md border border-line-strong bg-card p-6 shadow-[5px_5px_0_0_var(--line)] sm:p-8">
        <p className="font-mono text-sm text-muted break-all">{host(result.finalUrl)}</p>
        <h2 id="summary-heading" className={cn("mt-2 text-3xl font-bold", fail ? "text-critical" : warn ? "text-warning" : "text-success")}>
          {headline}
        </h2>
        <p className="mt-2 text-lg">
          {t.lead(fail, warn)}
        </p>
        <dl className="mt-5 grid grid-cols-3 gap-3 sm:max-w-md">
          {[
            [t.failures, fail, "text-critical"],
            [t.warnings, warn, "text-warning"],
            [t.passed, pass, "text-success"],
          ].map(([label, value, color]) => (
            <div key={label as string} className="rounded-lg border border-line p-3">
              <dt className="text-sm text-muted">{label}</dt>
              <dd className={cn("font-pixel text-2xl", color as string)}>{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 text-sm text-muted">
          {t.checkedAt(new Date(report.createdAt).toLocaleString(INTL_LOCALE[locale], { dateStyle: "medium", timeStyle: "short" }), (result.meta.durationMs / 1000).toFixed(0))}
        </p>
        <div className="mt-5">
          <ShareResult counts={{ fail, warn, pass }} t={t} locale={locale} />
        </div>
        <div className="mt-5 border-t border-line pt-4">
          <p className="flex items-start gap-2 text-sm text-muted">
            <Lock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t.privateLink}</span>
          </p>
          <DeleteReport id={report.id} onDeleted={() => setDeleted(true)} t={t} />
        </div>
      </section>

      <section aria-labelledby="checks-heading">
        <h2 id="checks-heading" className="text-2xl font-bold">
          {t.whatWeChecked}
        </h2>
        <ul className="mt-5 space-y-3">
          {checks.map((check) => (
            <CheckRow key={check.id} check={check} t={t} />
          ))}
        </ul>
      </section>

      {(screenshots?.desktop || screenshots?.mobile) && (
        <section aria-labelledby="shots-heading">
          <h2 id="shots-heading" className="text-2xl font-bold">
            {t.visitorSees}
          </h2>
          <div className="mt-5 grid items-start gap-6 md:grid-cols-[1fr_auto]">
            {screenshots.desktop && (
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL gerada no servidor */}
                <img src={screenshots.desktop} alt={t.desktopAlt(host(result.finalUrl))} width={1280} height={800} className="h-auto w-full rounded-md border border-line" />
                <figcaption className="mt-2 text-sm text-muted">{t.desktop}</figcaption>
              </figure>
            )}
            {screenshots.mobile && (
              <figure className="mx-auto w-[200px] md:w-[220px]">
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL gerada no servidor */}
                <img src={screenshots.mobile} alt={t.mobileAlt(host(result.finalUrl))} width={390} height={844} className="h-auto w-full rounded-md border border-line" />
                <figcaption className="mt-2 text-sm text-muted">{t.phone}</figcaption>
              </figure>
            )}
          </div>
        </section>
      )}

      {result.pages.length > 0 && (
        <section aria-labelledby="pages-heading">
          <h2 id="pages-heading" className="text-2xl font-bold">
            {t.pagesOpened}
          </h2>
          <div className="mt-5 overflow-x-auto" tabIndex={0} role="region" aria-label={t.pagesRegion}>
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr>
                  {t.cols.map((h) => (
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
                    <td className="border-b border-line px-3 py-2">{page.error ? t.didntLoad : page.notFound ? t.notFound : (page.status ?? "–")}</td>
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
        <p className="eyebrow">{t.cantEyebrow}</p>
        <h2 id="next-heading" className="mt-3 text-2xl font-bold sm:text-3xl">
          {t.cantTitle}
        </h2>
        <p className="mt-3 max-w-2xl text-muted">
          {t.cantText}
        </p>
        <div className="mt-6 max-w-xl">
          <WaitlistForm form="check" submitLabel={t.early} layout="stacked" defaultAppUrl={result.finalUrl} locale={locale} />
        </div>
        <FoundingOffer fail={fail} warn={warn} t={t} locale={locale} />
        <p className="mt-6 max-w-xl text-[15px] text-muted">
          {t.cli}{" "}
          <a href={STILLWORKS_URL} target="_blank" rel="noopener noreferrer" data-cta="check_stillworks" className="font-semibold">
            stillworks<span className="sr-only">{t.newTab}</span>
          </a>{" "}
          (<code className="font-mono text-[14px]">npx stillworks check</code>).
        </p>
      </section>
    </div>
  );
}
