"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Bot, Copy, ExternalLink, Lock, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { PixelIcon, PixelLoader, type PixelIconName } from "@/components/ui/Pixel";
import { WaitlistForm } from "@/components/waitlist/WaitlistForm";
import { useJoined } from "@/components/waitlist/joined";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { sendFunnelEvent } from "@/lib/funnel";
import { agentPrompt, buildIssues, compareIssues, countIssues, fixedProblemCount, formatWhen, problemCount, publicSummary, summaryParts, type CheckIssue } from "@/lib/check/issues";
import { displayUrl, redact } from "@/lib/check/redact";
import { deleteTokenKey, type CheckItem, type CheckReport, type Verdict } from "@/lib/check/types";
import { FOUNDING_PATH, FOUNDING_TERMS, FOUNDING_TERMS_ANCHOR, STILLWORKS_URL } from "@/lib/founding";
import { apiError, localePath, type Locale } from "@/lib/i18n";
import { CheckIssues } from "./CheckIssues";
import { ContextForm } from "./ContextForm";
import { MonitorOffer } from "./MonitorOffer";
import { CopyButton } from "./CopyButton";
import { ShareReport } from "./ShareReport";
import { VerificationRequest } from "./VerificationRequest";

/**
 * O relatório do teste grátis: consulta /api/check/[id] até terminar e mostra o resumo, os problemas por
 * tipo (com a evidência já limpa de dados sensíveis), o botão que copia o relatório para o agente de IA,
 * o compartilhamento seguro (só contagens) e, no fim, o convite para a lista de espera e o Founding.
 *
 * O teste continua o mesmo: só páginas públicas, só leitura. Nada aqui diz que a Publishub já verifica
 * fluxos com login, de hora em hora ou depois de cada deploy: isso está em desenvolvimento.
 */

const POLL_MS = 2500;
const N = FOUNDING_TERMS.noticeDays;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** O link do stillworks (GitHub) a partir do relatório, com a origem marcada. */
const STILLWORKS_LINK = `${STILLWORKS_URL}?utm_source=publishub&utm_medium=check_report&utm_campaign=publishub_check`;

const COPY = {
  en: {
    phases: ["Opening public pages…", "Checking responses…", "Looking for crashes…", "Writing your report…"],
    verdict: { fail: "Fail", warn: "Warning", pass: "Pass", skip: "Skipped" } as Record<Verdict, string>,
    checking: "Checking",
    takes: "This usually takes 30 to 50 seconds. Keep this page open.",
    copied: "Report link copied",
    copyLink: "Copy private report link",
    another: "Check another app",
    recheck: "Check again after fixing",
    rechecking: "Starting…",
    recheckHint: "Fixed something? Run the same check again and see what changed since this one.",
    recheckError: "We couldn't start the check. Please try again.",
    compareTitle: "Compared with your previous check",
    compareWhen: (when: string) => `Previous check: ${when}.`,
    fixedHead: (n: number) => (n === 1 ? "1 problem fixed" : `${n} problems fixed`),
    fixedNone: "Nothing from the previous check is gone yet.",
    winLead: "You found these before your users did, and fixed them.",
    stillThere: (n: number) => `${n} still showing`,
    newOnes: (n: number) => `${n} new since the previous check`,
    sameAsBefore: "Same result as the previous check.",
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
    testedUrl: "URL checked",
    when: "Checked on",
    found: "We found possible problems",
    foundCount: (n: number, parts: string) => `${plural(n, "possible problem", "possible problems")}${parts ? `: ${parts}` : ""}.`,
    foundLead: "Good news: you found it before your users did.",
    clean: "No problems found on the public pages",
    cleanWithNotes: (n: number) => `${plural(n, "other thing is", "other things are")} worth a look below.`,
    honest: "We didn't find problems on the public pages checked in this run. That doesn't guarantee that flows behind a login, forms, checkout or other journeys are working.",
    tiles: { crash: "Crashes", request: "Failed requests", page: "Broken pages" },
    scope: (s: string) => `The check took ${s} s. A free check opens public pages only: it doesn't log in, submit forms or test flows behind a login.`,
    agent: "Copy report for Claude / Cursor",
    agentCopied: "Report copied",
    agentFailed: "Couldn't copy automatically. Select the report below and copy it:",
    agentHint: "Paste it into your coding agent: it gets each problem, the evidence and where to start, without screenshots or private data.",
    privateLink: "Only people with this link can see this report. It isn't listed anywhere and search engines don't index it.",
    issuesTitle: "What we found",
    allChecks: (n: number) => `See all ${n} checks`,
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
    ctaEyebrow: "Publishub · in development",
    ctaTitle: "Don't let your next bug be found by a user.",
    ctaText: [
      "/check is a one-time check of your app's public pages.",
      "Publishub is building continuous checks for the flows that can't break, like sign-up, login and checkout.",
      "Join the waitlist to follow the launch and reserve a Founding Customer spot.",
    ],
    join: "Join the waitlist",
    founding: "Reserve a Founding Customer spot",
    foundingNote: `Reserving costs $0 today and nothing is charged before launch. At launch we email you at least ${N} days before any charge.`,
    terms: "Terms",
    stillworks: "See stillworks on GitHub",
    stillworksText: "Build with Claude Code or Cursor? stillworks is the free, open-source version you run yourself, on your machine.",
    newTab: " (opens in a new tab)",
  },
  pt: {
    phases: ["Abrindo páginas públicas…", "Verificando respostas…", "Procurando crashes…", "Gerando relatório…"],
    verdict: { fail: "Falha", warn: "Aviso", pass: "Ok", skip: "Pulado" } as Record<Verdict, string>,
    checking: "Testando",
    takes: "Isso costuma levar de 30 a 50 segundos. Mantenha esta página aberta.",
    copied: "Link do relatório copiado",
    copyLink: "Copiar link privado do relatório",
    another: "Testar outro app",
    recheck: "Testar de novo depois de corrigir",
    rechecking: "Começando…",
    recheckHint: "Corrigiu alguma coisa? Rode o mesmo teste de novo e veja o que mudou desde este.",
    recheckError: "Não conseguimos começar o teste. Tente de novo.",
    compareTitle: "Comparado com o seu teste anterior",
    compareWhen: (when: string) => `Teste anterior: ${when}.`,
    fixedHead: (n: number) => (n === 1 ? "1 problema corrigido" : `${n} problemas corrigidos`),
    fixedNone: "Nada do teste anterior sumiu ainda.",
    winLead: "Você encontrou antes dos seus usuários, e corrigiu.",
    stillThere: (n: number) => `${n} ainda ${n === 1 ? "aparece" : "aparecem"}`,
    newOnes: (n: number) => `${n} ${n === 1 ? "novo" : "novos"} desde o teste anterior`,
    sameAsBefore: "O mesmo resultado do teste anterior.",
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
    testedUrl: "URL testada",
    when: "Testado em",
    found: "Encontramos possíveis problemas",
    foundCount: (n: number, parts: string) => `${plural(n, "possível problema", "possíveis problemas")}${parts ? `: ${parts}` : ""}.`,
    foundLead: "A boa notícia: você encontrou antes dos seus usuários.",
    clean: "Não encontramos problemas nas páginas públicas",
    cleanWithNotes: (n: number) => `${plural(n, "outro ponto merece", "outros pontos merecem")} uma olhada logo abaixo.`,
    honest: "Não encontramos problemas nas páginas públicas testadas nesta execução. Isso não garante que fluxos autenticados, formulários, checkout ou outras jornadas estejam funcionando.",
    tiles: { crash: "Crashes", request: "Requisições com falha", page: "Páginas quebradas" },
    scope: (s: string) => `O teste levou ${s} s. Um teste grátis abre só páginas públicas: não faz login, não envia formulários e não testa fluxos por trás de um login.`,
    agent: "Copiar relatório para Claude / Cursor",
    agentCopied: "Relatório copiado",
    agentFailed: "Não deu para copiar automaticamente. Selecione o relatório abaixo e copie:",
    agentHint: "Cole no seu agente de IA: ele recebe cada problema, a evidência e por onde começar, sem prints nem dados privados.",
    privateLink: "Só quem tem este link vê este relatório. Ele não aparece em lugar nenhum e não é indexado por buscadores.",
    issuesTitle: "O que encontramos",
    allChecks: (n: number) => `Ver todas as ${n} verificações`,
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
    ctaEyebrow: "Publishub · em desenvolvimento",
    ctaTitle: "Não deixe o próximo bug ser descoberto pelo seu usuário.",
    ctaText: [
      "O /check faz uma verificação pontual das páginas públicas do seu app.",
      "A Publishub está desenvolvendo a verificação contínua dos fluxos que não podem quebrar, como cadastro, login e checkout.",
      "Entre na waitlist para acompanhar o lançamento e reservar uma vaga de Founding Customer.",
    ],
    join: "Entrar na waitlist",
    founding: "Reservar Founding Customer",
    foundingNote: `A reserva custa US$ 0 hoje e nada é cobrado antes do lançamento. No lançamento, avisamos por e-mail pelo menos ${N} dias antes de qualquer cobrança.`,
    terms: "Termos (em inglês)",
    stillworks: "Ver o stillworks no GitHub",
    stillworksText: "Usa Claude Code ou Cursor? O stillworks é a versão grátis e open source que você roda sozinho, na sua máquina.",
    newTab: " (abre em nova aba)",
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
    return redact(`${u.host}${u.pathname === "/" ? "" : u.pathname}`);
  } catch {
    return redact(url);
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
          <p className="mt-1 text-[15px] text-muted">{redact(check.detail)}</p>
          {check.items?.length ? (
            <ul className="mt-2 space-y-1 font-mono text-[13px] text-ink">
              {check.items.map((item) => (
                <li key={item} className="break-all">
                  {redact(item)}
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
  // 4 etapas em ~40 s: a última fica até o relatório chegar
  const phase = t.phases[Math.min(t.phases.length - 1, Math.floor(elapsed / 10))];
  return (
    <div className="rounded-md border border-line-strong bg-card p-6 shadow-[5px_5px_0_0_var(--line)] sm:p-8">
      <p role="status" aria-live="polite" className="flex items-center gap-3 font-pixel text-lg text-accent">
        <PixelLoader />
        {phase}
      </p>
      <p className="mt-3 text-muted">
        {t.checking} <span className="break-all font-mono text-ink">{host(url)}</span>. {t.takes}
      </p>
      <p className="mt-1 text-sm text-muted">{elapsed} s</p>
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

/**
 * "Testar de novo depois de corrigir": só para quem criou o teste (o token está neste navegador). Abre o
 * teste novo com ?prev= este, e o relatório novo compara os dois.
 */
function RecheckButton({ id, t, locale }: { id: string; t: Copy; locale: Locale }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setToken(readToken(id)), 0);
    return () => clearTimeout(timer);
  }, [id]);

  if (!token) return null;

  async function recheck() {
    if (busy) return;
    setBusy(true);
    setError(null);
    sendFunnelEvent("cta_click", "check_recheck");
    try {
      const response = await fetch(`/api/check/${id}/recheck`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, locale }) });
      const data = (await response.json().catch(() => ({}))) as { id?: string; deleteToken?: string; error?: { message?: string; code?: string } };
      if (!response.ok || !data.id) throw new Error(apiError(locale, data.error, t.recheckError));
      try {
        if (data.deleteToken) window.localStorage.setItem(deleteTokenKey(data.id), data.deleteToken);
      } catch {
        // sem armazenamento: o relatório novo funciona igual, só sem apagar e sem testar de novo
      }
      track("app_check_started", { source: "recheck" });
      router.push(localePath(locale, `/check/${data.id}?prev=${id}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.recheckError);
      setBusy(false);
    }
  }

  return (
    <div className="mb-4">
      <button type="button" onClick={() => void recheck()} disabled={busy} className={buttonClasses("secondary", "md", "w-full whitespace-normal text-center sm:w-auto")}>
        {busy ? <PixelLoader /> : <RefreshCw aria-hidden="true" className="h-4 w-4 shrink-0" />}
        {busy ? t.rechecking : t.recheck}
      </button>
      <p className="mt-1.5 text-sm text-muted">{t.recheckHint}</p>
      {error && (
        <p role="alert" className="mt-1 text-sm font-semibold text-critical">
          {error}
        </p>
      )}
    </div>
  );
}

/** O que mudou desde o teste anterior do mesmo app: corrigidos, os que continuam e os novos. */
function Comparison({ previous, previousAt, current, t, locale }: { previous: CheckIssue[]; previousAt: string; current: CheckIssue[]; t: Copy; locale: Locale }) {
  const result = compareIssues(previous, current);
  const fixed = result.fixed.length;
  return (
    <section aria-labelledby="compare-heading" className={cn("rounded-md border p-5 sm:p-6", fixed ? "border-2 border-success bg-card" : "border-line bg-card")}>
      <h2 id="compare-heading" className="text-xl font-bold sm:text-2xl">
        {t.compareTitle}
      </h2>
      <p className="mt-1 text-sm text-muted">{t.compareWhen(formatWhen(previousAt, locale))}</p>
      {fixed ? (
        <>
          <p className="mt-4 flex items-center gap-2 text-2xl font-bold text-success">
            <PixelIcon name="pass" size={18} />
            {t.fixedHead(fixed)}
          </p>
          <p className="mt-1">{t.winLead}</p>
          <ul className="mt-3 space-y-1 text-[15px]">
            {result.fixed.map((issue) => (
              <li key={issue.key} className="flex items-start gap-2">
                <PixelIcon name="pass" size={12} className="mt-1.5 shrink-0 text-success" />
                <span className="min-w-0 break-words">
                  <span className="line-through decoration-success/60">{issue.title}</span>
                  {issue.route ? <span className="ml-1 font-mono text-[13px] text-muted">{issue.route}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-4 font-semibold">{result.remaining.length || result.added.length ? t.fixedNone : t.sameAsBefore}</p>
      )}
      {(result.remaining.length > 0 || result.added.length > 0) && (
        <p className="mt-3 text-sm text-muted">{[result.remaining.length ? t.stillThere(result.remaining.length) : null, result.added.length ? t.newOnes(result.added.length) : null].filter(Boolean).join(" · ")}</p>
      )}
    </section>
  );
}

/** O link privado deste relatório (para a própria pessoa guardar) e "testar outro app". */
function ReportLinks({ id, t, locale }: { id: string; t: Copy; locale: Locale }) {
  return (
    <>
    <RecheckButton id={id} t={t} locale={locale} />
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <CopyButton
        text={() => window.location.href}
        label={t.copyLink}
        copiedLabel={t.copied}
        failedLabel={t.agentFailed}
        variant="secondary"
        icon={<Copy aria-hidden="true" className="h-4 w-4" />}
        onCopy={(ok) => ok && sendFunnelEvent("share_click", "check_copy")}
      />
      <Link href={localePath(locale, "/check")} className={buttonClasses("ghost", "md")}>
        <RotateCcw aria-hidden="true" className="h-4 w-4" />
        {t.another}
      </Link>
    </div>
    </>
  );
}

/**
 * O fim do relatório: o que o /check é (pontual, páginas públicas), o que a Publishub está construindo
 * (em desenvolvimento) e os três caminhos: waitlist, Founding Customer e stillworks.
 */
function NextSteps({ appUrl, t, locale }: { appUrl: string; t: Copy; locale: Locale }) {
  const joined = useJoined();
  return (
    <section aria-labelledby="next-heading" className="rounded-md border border-line-strong bg-surface p-5 sm:p-8">
      <p className="eyebrow">{t.ctaEyebrow}</p>
      <h2 id="next-heading" className="mt-3 text-2xl font-bold sm:text-3xl">
        {t.ctaTitle}
      </h2>
      <div className="mt-3 max-w-2xl space-y-2 text-muted">
        {t.ctaText.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>

      <div className="mt-6 max-w-xl">
        <WaitlistForm form="check" submitLabel={t.join} layout="stacked" defaultAppUrl={appUrl} locale={locale} />
        {joined?.refCode && joined.contextToken && <ContextForm refCode={joined.refCode} token={joined.contextToken} locale={locale} />}
      </div>

      <div className="mt-6 max-w-xl border-l-4 border-action bg-accent-soft px-4 py-3">
        <Link
          href={localePath(locale, FOUNDING_PATH)}
          onClick={() => sendFunnelEvent("cta_click", "check_report_founding")}
          className={buttonClasses("secondary", "md", "w-full whitespace-normal text-center sm:w-auto")}
        >
          {t.founding}
          <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
        </Link>
        <p className="mt-2 text-sm">
          {t.foundingNote} <Link href={`/terms#${FOUNDING_TERMS_ANCHOR}`}>{t.terms}</Link>
        </p>
      </div>

      <p className="mt-6 max-w-xl text-[15px] text-muted">
        {t.stillworksText}{" "}
        <a href={STILLWORKS_LINK} target="_blank" rel="noopener noreferrer" onClick={() => sendFunnelEvent("cta_click", "check_stillworks")} className="inline-flex items-center gap-1 font-semibold">
          {t.stillworks}
          <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
          <span className="sr-only">{t.newTab}</span>
        </a>
      </p>
    </section>
  );
}

export function CheckReportView({ id, locale = "en", prevId }: { id: string; locale?: Locale; prevId?: string }) {
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

  const issues = useMemo(() => (report?.status === "done" && report.result ? buildIssues(report.result, locale) : []), [report, locale]);

  // o teste anterior do mesmo app (?prev=), para comparar; se não existir mais, o relatório segue sem a comparação
  const [previous, setPrevious] = useState<CheckReport | null>(null);
  const done = report?.status === "done";
  useEffect(() => {
    if (!prevId || !done) return;
    let stop = false;
    fetch(`/api/check/${prevId}`, { cache: "no-store" })
      .then((response) => (response.ok ? (response.json() as Promise<CheckReport>) : null))
      .then((data) => {
        if (!stop && data?.status === "done" && data.result && data.url === report?.url) setPrevious(data);
      })
      .catch(() => undefined);
    return () => {
      stop = true;
    };
  }, [prevId, done, report?.url]);
  const previousIssues = useMemo(() => (previous?.result ? buildIssues(previous.result, locale) : null), [previous, locale]);
  const comparison = previousIssues ? compareIssues(previousIssues, issues) : null;
  const win = comparison ? { fixed: fixedProblemCount(comparison) || comparison.fixed.length, remaining: problemCount(countIssues(issues)) } : null;

  useEffect(() => {
    if (report?.status === "done" && report.result && !viewed.current) {
      viewed.current = true;
      const counts = countIssues(issues);
      track("app_check_viewed", { fail: report.result.summary.fail, warn: report.result.summary.warn, ...counts });
    }
  }, [report, issues]);

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
  const counts = countIssues(issues);
  const problems = problemCount(counts);
  const summary = publicSummary(counts);
  const checks = [...result.checks].sort((a, b) => ORDER[a.verdict] - ORDER[b.verdict]);
  // sem possíveis problemas o título é verde, mesmo com avisos gerais (lentidão, prévia de link): eles aparecem em laranja na lista
  const tone = problems ? "text-critical" : "text-success";

  return (
    <div className="space-y-12">
      <section aria-labelledby="summary-heading" className="rounded-md border border-line-strong bg-card p-5 shadow-[5px_5px_0_0_var(--line)] sm:p-8">
        <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-muted">{t.testedUrl}</dt>
          <dd className="min-w-0 break-all font-mono text-ink">{displayUrl(result.finalUrl)}</dd>
          <dt className="text-muted">{t.when}</dt>
          <dd>{formatWhen(report.createdAt, locale)}</dd>
        </dl>

        <h2 id="summary-heading" className={cn("mt-4 text-2xl font-bold sm:text-3xl", tone)}>
          {problems ? t.found : t.clean}
        </h2>
        {problems ? (
          <>
            <p className="mt-2 text-lg font-semibold">{t.foundCount(problems, summaryParts(summary, locale))}</p>
            <p className="mt-1 text-muted">{t.foundLead}</p>
          </>
        ) : (
          <p className="mt-2 text-lg">
            {t.honest} {counts.other ? t.cleanWithNotes(counts.other) : ""}
          </p>
        )}

        <dl className="mt-5 grid grid-cols-3 gap-2 sm:max-w-lg sm:gap-3">
          {(
            [
              [t.tiles.crash, counts.crash],
              [t.tiles.request, counts.request],
              [t.tiles.page, counts.page],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded-lg border border-line p-2 sm:p-3">
              <dt className="text-xs text-muted sm:text-sm">{label}</dt>
              <dd className={cn("font-pixel text-2xl", value ? "text-critical" : "text-success")}>{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-muted">{t.scope((result.meta.durationMs / 1000).toFixed(0))}</p>

        <div className="mt-5">
          <CopyButton
            text={() => agentPrompt({ url: result.finalUrl, createdAt: report.createdAt, issues, locale })}
            label={t.agent}
            copiedLabel={t.agentCopied}
            failedLabel={t.agentFailed}
            variant="primary"
            size="lg"
            icon={<Bot aria-hidden="true" className="h-5 w-5" />}
            onCopy={(ok) => {
              sendFunnelEvent("cta_click", "check_copy_agent");
              track("app_check_agent_copied", { ok, problems, other: counts.other });
            }}
          />
          <p className="mt-2 text-sm text-muted">{t.agentHint}</p>
        </div>

        <div className="mt-5 border-t border-line pt-4">
          <ReportLinks id={report.id} t={t} locale={locale} />
          <p className="mt-3 flex items-start gap-2 text-sm text-muted">
            <Lock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t.privateLink}</span>
          </p>
          <DeleteReport id={report.id} onDeleted={() => setDeleted(true)} t={t} />
        </div>
      </section>

      {previous && previousIssues && <Comparison previous={previousIssues} previousAt={previous.createdAt} current={issues} t={t} locale={locale} />}
      {/* com vitória, o compartilhamento sobe para logo depois da comparação: é o momento de postar */}
      {win && win.fixed > 0 && <ShareReport summary={summary} appUrl={result.finalUrl} locale={locale} win={win} />}

      <section aria-labelledby="issues-heading">
        <h2 id="issues-heading" className="text-2xl font-bold">
          {t.issuesTitle}
        </h2>
        {issues.length ? (
          <div className="mt-5">
            <CheckIssues issues={issues} locale={locale} />
          </div>
        ) : (
          <p className="mt-4 flex items-start gap-3 rounded-md border border-line bg-card p-4">
            <PixelIcon name="pass" size={16} className="mt-1 shrink-0 text-success" />
            <span>{t.honest}</span>
          </p>
        )}
        <details className="group mt-6">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 font-semibold text-accent [&::-webkit-details-marker]:hidden">
            <span aria-hidden="true" className="inline-block transition-transform group-open:rotate-90">
              ›
            </span>
            {t.allChecks(checks.length)}
          </summary>
          <ul className="mt-3 space-y-3">
            {checks.map((check) => (
              <CheckRow key={check.id} check={check} t={t} />
            ))}
          </ul>
        </details>
      </section>

      {/* o monitor diário das páginas públicas: só para quem criou o teste (este relatório é a primeira base) */}
      <MonitorOffer checkId={report.id} appUrl={result.finalUrl} locale={locale} />

      {/* o que o teste grátis não abre: o pedido de verificação manual ao fundador (o serviço feito à mão) */}
      <VerificationRequest checkId={report.id} appUrl={result.finalUrl} clean={problems === 0} locale={locale} />

      {!(win && win.fixed > 0) && <ShareReport summary={summary} appUrl={result.finalUrl} locale={locale} />}

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

      <NextSteps appUrl={result.finalUrl} t={t} locale={locale} />
    </div>
  );
}
