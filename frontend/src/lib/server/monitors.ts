import { buildIssues, compareIssues, type CheckIssue } from "@/lib/check/issues";
import type { CheckResult } from "@/lib/check/types";
import type { Locale } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";
import { checkUrlForOwner, createCheck, getCheck, runQueuedCheck } from "./checks";
import { db } from "./db";
import { escapeHtml, ownerEmail, sendEmail } from "./notify";
import { sign, verifySignature } from "./request";

/**
 * O monitor contínuo das páginas públicas (public.monitors): a pessoa ativa no relatório, confirma pelo e-mail e,
 * todo dia, o agendamento roda o mesmo teste do /check e compara com a execução anterior. O e-mail de alerta só
 * sai quando aparece um problema NOVO (crash, requisição ou página quebrada); o que já estava quebrado não repete.
 *
 * Os links de confirmar e parar levam uma assinatura HMAC do id: nada de token guardado no banco.
 */

const LABEL = "monitor";
/** O intervalo entre execuções. 23 h (não 24) para o agendamento diário nunca pular um dia por minutos. */
const INTERVAL_MS = 23 * 3600_000;
/** Monitores ligados (ou esperando confirmação) por e-mail. */
export const MAX_MONITORS_PER_EMAIL = 3;
/** Monitores criados por IP por dia. */
const MAX_PER_IP_PER_DAY = 5;

const FROM = () => process.env.MONITOR_FROM_EMAIL?.trim() || "Publishub <alerts@getpublishub.com>";

export type MonitorStatus = "pending" | "active" | "stopped";

export interface MonitorRow {
  id: string;
  url: string;
  email: string;
  locale: Locale;
  status: MonitorStatus;
  baseline_check_id: string | null;
  running_check_id: string | null;
  alerts_sent?: number;
}

export const monitorToken = (id: string) => sign(LABEL, id);
export const validMonitorToken = (id: string, token: unknown) => verifySignature(LABEL, id, token);

function monitorLink(id: string, action: "confirm" | "stop", locale: Locale): string {
  const query = new URLSearchParams({ a: action, t: monitorToken(id), ...(locale === "pt" ? { l: "pt" } : {}) });
  return `${SITE_URL}/monitor/${id}?${query}`;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

// ---------------------------------------------------------------- os e-mails para quem monitora

const MAIL = {
  en: {
    confirmSubject: (host: string) => `Confirm the daily check of ${host}`,
    confirmIntro: (host: string) => `You asked Publishub to check the public pages of ${host} every day and email you only when something new breaks.`,
    confirmCta: "Confirm and turn on the monitor",
    confirmIgnore: "Didn't ask for this? Ignore this email and nothing happens.",
    alertSubject: (n: number, host: string) => `${n} new ${n === 1 ? "problem" : "problems"} on ${host}`,
    alertIntro: (n: number, host: string) => `Today's check of ${host} found ${n} ${n === 1 ? "problem that wasn't" : "problems that weren't"} there in the previous check:`,
    alertCta: "Open the report (compared with the previous check)",
    alertScope: "The monitor opens your public pages only, read-only. Flows behind a login weren't checked.",
    stop: "Stop this monitor",
    sign: "Valmir, Publishub",
  },
  pt: {
    confirmSubject: (host: string) => `Confirme a verificação diária de ${host}`,
    confirmIntro: (host: string) => `Você pediu para a Publishub verificar as páginas públicas de ${host} todo dia e te avisar por e-mail só quando algo novo quebrar.`,
    confirmCta: "Confirmar e ligar o monitor",
    confirmIgnore: "Não pediu isso? Ignore este e-mail e nada acontece.",
    alertSubject: (n: number, host: string) => `${n} ${n === 1 ? "problema novo" : "problemas novos"} em ${host}`,
    alertIntro: (n: number, host: string) => `O teste de hoje de ${host} encontrou ${n} ${n === 1 ? "problema que não estava" : "problemas que não estavam"} no teste anterior:`,
    alertCta: "Abrir o relatório (comparado com o teste anterior)",
    alertScope: "O monitor abre só as páginas públicas, sem mexer em nada. Fluxos com login não foram testados.",
    stop: "Parar este monitor",
    sign: "Valmir, Publishub",
  },
} satisfies Record<Locale, unknown>;

function layout(paragraphs: string[], cta: { label: string; href: string }, footer: string[]): string {
  return [
    `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:16px;line-height:1.5;color:#111;max-width:560px">`,
    ...paragraphs.map((p) => `<p>${p}</p>`),
    `<p><a href="${escapeHtml(cta.href)}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 18px;border-radius:6px;text-decoration:none;font-weight:600">${escapeHtml(cta.label)}</a></p>`,
    ...footer.map((p) => `<p style="font-size:13px;color:#555">${p}</p>`),
    `</div>`,
  ].join("");
}

async function sendConfirmation(monitor: Pick<MonitorRow, "id" | "url" | "email" | "locale">): Promise<boolean> {
  const T = MAIL[monitor.locale];
  const host = hostOf(monitor.url);
  const href = monitorLink(monitor.id, "confirm", monitor.locale);
  return sendEmail({
    from: FROM(),
    to: monitor.email,
    replyTo: ownerEmail(),
    subject: T.confirmSubject(host),
    text: `${T.confirmIntro(host)}\n\n${T.confirmCta}: ${href}\n\n${T.confirmIgnore}\n\n${T.sign}`,
    html: layout([escapeHtml(T.confirmIntro(host))], { label: T.confirmCta, href }, [escapeHtml(T.confirmIgnore), escapeHtml(T.sign)]),
  });
}

async function sendAlert(monitor: MonitorRow, added: CheckIssue[], checkId: string, previousId: string): Promise<boolean> {
  const T = MAIL[monitor.locale];
  const host = hostOf(monitor.url);
  const report = `${SITE_URL}${monitor.locale === "pt" ? "/pt" : ""}/check/${checkId}?prev=${previousId}`;
  const stop = monitorLink(monitor.id, "stop", monitor.locale);
  const lines = added.map((issue) => `${issue.title}${issue.route ? ` (${issue.route})` : ""}`);
  return sendEmail({
    from: FROM(),
    to: monitor.email,
    replyTo: ownerEmail(),
    subject: T.alertSubject(added.length, host),
    text: `${T.alertIntro(added.length, host)}\n\n${lines.map((l) => `- ${l}`).join("\n")}\n\n${T.alertCta}: ${report}\n\n${T.alertScope}\n${T.stop}: ${stop}\n\n${T.sign}`,
    html: layout(
      [escapeHtml(T.alertIntro(added.length, host)), `<ul>${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>`],
      { label: T.alertCta, href: report },
      [escapeHtml(T.alertScope), `<a href="${escapeHtml(stop)}">${escapeHtml(T.stop)}</a>`, escapeHtml(T.sign)],
    ),
  });
}

/**
 * Os problemas que justificam um alerta: os que não estavam na execução anterior, só crashes, requisições e páginas
 * quebradas (os avisos gerais, como lentidão ou prévia de link, não geram e-mail).
 */
export function newProblems(previous: CheckResult, current: CheckResult, locale: Locale): CheckIssue[] {
  return compareIssues(buildIssues(previous, locale), buildIssues(current, locale)).added.filter((issue) => issue.kind !== "other");
}

// ---------------------------------------------------------------- criar, confirmar, parar

export type CreateResult = { status: "pending" | "active"; emailed: boolean } | { status: "forbidden" | "limit" | "rate_limited" };

/**
 * Cria o monitor a partir de um relatório. Só quem criou o teste (o token de apagar está no navegador dessa
 * pessoa) pode. O próprio relatório vira a base da primeira comparação. Se o mesmo e-mail já monitora a mesma
 * URL, reenvia a confirmação (ou responde que já está ativo).
 */
export async function createMonitor(input: { checkId: string; deleteToken: string; email: string; locale: Locale; ipHash: string }): Promise<CreateResult> {
  const url = await checkUrlForOwner(input.checkId, input.deleteToken);
  if (!url) return { status: "forbidden" };

  const { data: existing, error: findError } = await db()
    .from("monitors")
    .select("id, url, email, locale, status")
    .eq("email", input.email)
    .eq("url", url)
    .neq("status", "stopped")
    .maybeSingle();
  if (findError) throw findError;
  if (existing?.status === "active") return { status: "active", emailed: false };
  if (existing) return { status: "pending", emailed: await sendConfirmation(existing as MonitorRow) };

  const since = new Date(Date.now() - 86400_000).toISOString();
  const [{ count: byIp }, { count: byEmail }] = await Promise.all([
    db().from("monitors").select("id", { count: "exact", head: true }).eq("ip_hash", input.ipHash).gte("created_at", since),
    db().from("monitors").select("id", { count: "exact", head: true }).eq("email", input.email).neq("status", "stopped"),
  ]);
  if ((byIp ?? 0) >= MAX_PER_IP_PER_DAY) return { status: "rate_limited" };
  if ((byEmail ?? 0) >= MAX_MONITORS_PER_EMAIL) return { status: "limit" };

  const report = await getCheck(input.checkId);
  const { data, error } = await db()
    .from("monitors")
    .insert({ url, email: input.email, locale: input.locale, status: "pending", baseline_check_id: report?.status === "done" ? input.checkId : null, ip_hash: input.ipHash })
    .select("id, url, email, locale")
    .single();
  if (error) throw error;
  return { status: "pending", emailed: await sendConfirmation(data as MonitorRow) };
}

/** Confirma (liga) ou para o monitor. Devolve o estado novo, ou null se não existe. */
export async function setMonitorStatus(id: string, action: "confirm" | "stop"): Promise<{ status: MonitorStatus; url: string } | null> {
  const { data: monitor, error } = await db().from("monitors").select("id, url, status").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!monitor) return null;
  const now = new Date();
  if (action === "stop") {
    if (monitor.status !== "stopped") await db().from("monitors").update({ status: "stopped", stopped_at: now.toISOString() }).eq("id", id);
    return { status: "stopped", url: monitor.url as string };
  }
  if (monitor.status === "pending") {
    // a primeira execução fica para o próximo agendamento: o relatório de hoje já é a base
    await db().from("monitors").update({ status: "active", confirmed_at: now.toISOString(), next_run_at: now.toISOString() }).eq("id", id);
    return { status: "active", url: monitor.url as string };
  }
  return { status: monitor.status as MonitorStatus, url: monitor.url as string };
}

// ---------------------------------------------------------------- o agendamento

/**
 * Os monitores vencidos: cria um teste para cada (marcado com monitor_id) e já empurra a próxima execução,
 * para dois agendamentos seguidos não rodarem o mesmo monitor duas vezes.
 */
export async function startDueMonitors(limit: number): Promise<{ monitorId: string; checkId: string; locale: Locale }[]> {
  const { data, error } = await db()
    .from("monitors")
    .select("id, url, locale")
    .eq("status", "active")
    .lte("next_run_at", new Date().toISOString())
    .order("next_run_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  const started: { monitorId: string; checkId: string; locale: Locale }[] = [];
  for (const monitor of data ?? []) {
    const now = new Date();
    // só pega o monitor se ninguém pegou antes (o update só vale se next_run_at ainda está vencido)
    const { data: claimed } = await db()
      .from("monitors")
      .update({ next_run_at: new Date(now.getTime() + INTERVAL_MS).toISOString(), last_run_at: now.toISOString() })
      .eq("id", monitor.id)
      .lte("next_run_at", now.toISOString())
      .select("id")
      .maybeSingle();
    if (!claimed) continue;
    const { id: checkId } = await createCheck(monitor.url as string, `monitor:${monitor.id}`);
    await db().from("app_checks").update({ monitor_id: monitor.id }).eq("id", checkId);
    await db().from("monitors").update({ running_check_id: checkId }).eq("id", monitor.id);
    started.push({ monitorId: monitor.id as string, checkId, locale: monitor.locale as Locale });
  }
  return started;
}

/**
 * Roda o teste de um monitor e compara com a base. Alerta só os problemas novos (crashes, requisições e páginas
 * quebradas; os avisos gerais não geram e-mail). Um teste que falhou por inteiro não alerta nem troca a base.
 */
export async function runMonitorCheck(monitorId: string, checkId: string, locale: Locale): Promise<void> {
  await runQueuedCheck(checkId, locale);
  const { data, error } = await db().from("monitors").select("id, url, email, locale, status, baseline_check_id, running_check_id, alerts_sent").eq("id", monitorId).maybeSingle();
  if (error) throw error;
  const monitor = data as MonitorRow | null;
  if (!monitor || monitor.running_check_id !== checkId) return;

  const current = await getCheck(checkId);
  if (!current || current.status !== "done" || !current.result) {
    await db().from("monitors").update({ running_check_id: null }).eq("id", monitorId);
    return;
  }

  const previous = monitor.baseline_check_id ? await getCheck(monitor.baseline_check_id) : null;
  let alerted = false;
  if (monitor.status === "active" && previous?.status === "done" && previous.result) {
    const problems = newProblems(previous.result, current.result, monitor.locale);
    if (problems.length) alerted = await sendAlert(monitor, problems, checkId, previous.id);
  }

  const update: Record<string, unknown> = { baseline_check_id: checkId, running_check_id: null };
  if (alerted) {
    update.last_alert_at = new Date().toISOString();
    update.alerts_sent = (monitor.alerts_sent ?? 0) + 1;
  }
  await db().from("monitors").update(update).eq("id", monitorId);
}
