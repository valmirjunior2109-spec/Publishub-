"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Check, Copy, Download, Printer } from "lucide-react";
import { ShareResult } from "@/components/ShareResult";
import { TrackedLink } from "@/components/TrackedLink";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { localePath } from "@/i18n/paths";
import { capture } from "@/lib/analytics";
import { formatTimestamp } from "@/lib/format";
import { PLANS } from "@/lib/pricing";
import { captureTool, upgradeClicked } from "@/lib/toolAnalytics";
import type { Analysis, AnalysisAudit, AuditDimensionKey, AuditStatus } from "@/lib/types";

const STATUS_TONE: Record<AuditStatus, string> = {
  ok: "border-line text-confirmed",
  attention: "border-line text-ink",
  priority: "border-[rgba(var(--accent-rgb),0.45)] bg-accent-soft text-accent",
};

type CheckKey = "silenceStart" | "hook" | "pauses" | "structure" | "visuals" | "captions" | "cta" | "silenceEnd" | "mute";
type CheckItem = { key: CheckKey; values?: Record<string, number | string> };

/* As frentes do plano que têm nome na tela; outra (de uma versão futura) aparece como veio. */
const KINDS = ["hook", "cut", "pacing", "broll", "caption", "structure", "cta"] as const;
type Kind = (typeof KINDS)[number];
const isKind = (kind: string): kind is Kind => (KINDS as readonly string[]).includes(kind);

/** Os itens do checklist, de fatos medidos e do estado de cada dimensão: nada genérico sem motivo no vídeo. */
function checklist(audit: AnalysisAudit): CheckItem[] {
  const m = audit.measured;
  const status = Object.fromEntries(audit.dimensions.map((d) => [d.key, d.status])) as Record<AuditDimensionKey, AuditStatus>;
  const items: CheckItem[] = [];
  if (m.silence_start_seconds >= 0.3) items.push({ key: "silenceStart", values: { s: m.silence_start_seconds } });
  if (status.hook !== "ok") items.push({ key: "hook" });
  if (m.pauses > 0) items.push({ key: "pauses", values: { count: m.pauses, s: m.longest_pause_seconds } });
  if (status.structure !== "ok") items.push({ key: "structure" });
  if (status.visuals !== "ok") items.push({ key: "visuals" });
  if (status.captions !== "ok") items.push({ key: "captions" });
  if (status.cta !== "ok") items.push({ key: "cta" });
  if (m.silence_end_seconds >= 0.5) items.push({ key: "silenceEnd", values: { s: m.silence_end_seconds } });
  items.push({ key: "mute" });
  return items;
}

/**
 * O relatório da auditoria grátis. Separa o que foi medido no arquivo (fatos) do
 * que é leitura da IA (notas e comentários), e termina no produto: o plano
 * completo, as reescritas e o vídeo cortado ficam na análise da publishub.
 *
 * `sample`: o relatório de exemplo (/tools/video-audit/sample). Sem copiar e
 * baixar, e o fim leva de volta ao envio em vez de à análise completa.
 */
export function AuditReport({ analysis, audit, guest, sample = false }: { analysis: Analysis; audit: AnalysisAudit; guest: boolean; sample?: boolean }) {
  const t = useTranslations("AuditReport");
  const tSample = useTranslations("AuditSample");
  const locale = useLocale();
  const [copied, setCopied] = useState(false);
  const [done, setDone] = useState<Set<string>>(new Set());
  const result = analysis.result;
  const items = checklist(audit);
  // o que o plano pago acrescenta a ESTA análise: os números vêm do backend (audit.remaining, locked)
  const locked = Boolean(analysis.locked);
  const unlocks = [
    audit.remaining > 0 ? t("unlock.items.remaining", { count: audit.remaining }) : t("unlock.items.plan"),
    analysis.locked?.rewrites ? t("unlock.items.rewritesCount", { count: analysis.locked.rewrites }) : t("unlock.items.rewrites"),
    t("unlock.items.cuts"),
    t("unlock.items.copilot"),
  ];

  const dimensionDetail = (key: AuditDimensionKey, suggestions: number): string => {
    if (key === "hook" && audit.hook.score !== null) return t("hookScore", { score: audit.hook.score });
    if (key === "pacing" && audit.pace.value) return t(`pace.${audit.pace.value}`);
    return suggestions > 0 ? t("suggestions", { count: suggestions }) : t("nothingFlagged");
  };
  const dimensionNote = (key: AuditDimensionKey): string | null => (key === "hook" ? audit.hook.note : key === "pacing" ? audit.pace.note : null);

  function asText(): string {
    const lines = [`${t("title")}: ${analysis.video.filename}`, ""];
    if (audit.overall_score !== null) lines.push(`${t("overallLabel")}: ${audit.overall_score}/10`);
    if (result) lines.push(`${t("dropLabel")}: ${formatTimestamp(result.drop.at_seconds)} · "${result.phrase.text}"`);
    lines.push("", `## ${t("dimensionsTitle")}`);
    for (const d of audit.dimensions) {
      const note = dimensionNote(d.key);
      lines.push(`- ${t(`dimension.${d.key}`)}: ${t(`status.${d.status}`)} · ${dimensionDetail(d.key, d.suggestions)}${note ? ` · ${note}` : ""}`);
    }
    lines.push("", `## ${t("measuredTitle")}`);
    lines.push(`- ${t("measured.duration", { s: audit.measured.duration_seconds })}`);
    lines.push(`- ${t("measured.pauses", { count: audit.measured.pauses })}`);
    if (audit.measured.pauses > 0) lines.push(`- ${t("measured.longest", { s: audit.measured.longest_pause_seconds })}`);
    lines.push(`- ${t("measured.silenceStart", { s: audit.measured.silence_start_seconds })}`);
    lines.push(`- ${t("measured.silenceEnd", { s: audit.measured.silence_end_seconds })}`);
    lines.push(`- ${t("measured.scenes", { count: audit.measured.scene_changes })}`);
    if (audit.top.length) {
      lines.push("", `## ${t("topTitle")}`);
      audit.top.forEach((item, index) => lines.push(`${index + 1}. [${formatTimestamp(item.at_seconds)}] ${item.title}: ${item.why}`));
    }
    lines.push("", `## ${t("checklistTitle")}`);
    for (const item of items) lines.push(`- [ ] ${t(`check.${item.key}`, item.values ?? {})}`);
    lines.push("", t("limits"), "", "publishub · https://getpublishub.com/tools/video-audit");
    return lines.join("\n");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(asText());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      capture("report_copied", analysis.id, locale, { where: "video_audit" });
      captureTool("report_shared", "video_audit", { what: "report_text", method: "copy", authenticated: !guest }, analysis.id);
    } catch {
      // sem permissão de clipboard: o botão de baixar continua funcionando
    }
  }

  function download() {
    const blob = new Blob([asText()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(analysis.video.filename || "video").replace(/\.[^.]+$/, "")}-audit.txt`;
    link.click();
    URL.revokeObjectURL(url);
    capture("report_downloaded", analysis.id, locale, { where: "video_audit" });
    captureTool("report_shared", "video_audit", { what: "report_text", method: "download", authenticated: !guest }, analysis.id);
  }

  /** "Salvar em PDF": a impressão do navegador, com o relatório no papel claro (ver globals.css). */
  function print() {
    captureTool("report_shared", "video_audit", { what: "report_pdf", method: "print", authenticated: !guest }, analysis.id);
    window.print();
  }

  function toggle(key: string) {
    setDone((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="print-report flex flex-col gap-10">
      {/* a nota geral e a queda */}
      <section className="grid gap-5 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        {audit.overall_score !== null && (
          <div className="rounded-[22px] border border-line bg-paper-raised p-6">
            <p className="t-label">{t("overallLabel")}</p>
            <p className="mt-3 font-serif text-[56px] font-medium leading-none tracking-[-0.03em] tabular-nums">
              {audit.overall_score}
              <span className="text-[22px] text-ink-muted">/10</span>
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">{t("overallNote")}</p>
          </div>
        )}
        {result && (
          <div className="rounded-[22px] border border-line bg-paper-raised p-6">
            <p className="t-label">{t("dropLabel")}</p>
            <p className="mt-3 font-display text-[28px] font-medium tabular-nums tracking-tight">{formatTimestamp(result.drop.at_seconds)}</p>
            {result.phrase?.text && <p className="mt-2 text-[15px] leading-relaxed">{t("dropLine", { phrase: result.phrase.text })}</p>}
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink-muted">{result.retention_source === "estimated" ? t("dropEstimated") : t("dropFromScreenshot")}</p>
          </div>
        )}
      </section>

      {/* as dimensões: leitura da IA, com o estado de cada uma */}
      <section aria-labelledby="audit-dimensions">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="audit-dimensions" className="t-h3">{t("dimensionsTitle")}</h2>
          <Badge>{t("aiRead")}</Badge>
        </div>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {audit.dimensions.map((d) => {
            const note = dimensionNote(d.key);
            return (
              <li key={d.key} className="flex flex-col rounded-[22px] border border-line bg-paper-raised p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-[15.5px] font-semibold">{t(`dimension.${d.key}`)}</h3>
                  <span className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[12px] font-medium ${STATUS_TONE[d.status]}`}>{t(`status.${d.status}`)}</span>
                </div>
                <p className="mt-3 text-[14px] font-medium">{dimensionDetail(d.key, d.suggestions)}</p>
                {note && <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">{note}</p>}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[12.5px] leading-relaxed text-ink-muted">{t("clarityNote")}</p>
      </section>

      {/* o que foi medido no arquivo: fato, não opinião */}
      <section aria-labelledby="audit-measured">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="audit-measured" className="t-h3">{t("measuredTitle")}</h2>
          <Badge tone="ink">{t("measuredTag")}</Badge>
        </div>
        <ul className="mt-5 grid gap-x-8 sm:grid-cols-2">
          {[
            t("measured.duration", { s: audit.measured.duration_seconds }),
            t("measured.pauses", { count: audit.measured.pauses }),
            ...(audit.measured.pauses > 0 ? [t("measured.longest", { s: audit.measured.longest_pause_seconds })] : []),
            t("measured.silenceStart", { s: audit.measured.silence_start_seconds }),
            t("measured.silenceEnd", { s: audit.measured.silence_end_seconds }),
            t("measured.scenes", { count: audit.measured.scene_changes }),
          ].map((line) => (
            <li key={line} className="border-b border-line py-3 text-[14.5px] tabular-nums">
              {line}
            </li>
          ))}
        </ul>
      </section>

      {/* as melhorias de maior impacto, no segundo em que acontecem */}
      <section aria-labelledby="audit-top">
        <h2 id="audit-top" className="t-h3">{t("topTitle")}</h2>
        {audit.top.length === 0 ? (
          <p className="mt-4 text-[14.5px] text-ink-muted">{t("topEmpty")}</p>
        ) : (
          <ol className="mt-5 flex flex-col gap-3">
            {audit.top.map((item, index) => (
              <li key={`${item.at_seconds}-${item.title}`} className="flex gap-4 rounded-[22px] border border-line bg-paper-raised p-5">
                <span className="font-display text-[22px] font-medium leading-none text-accent">{index + 1}</span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-mono text-[12px] text-ink-muted">
                    {formatTimestamp(item.at_seconds)}
                    {item.end_seconds !== null && item.end_seconds > item.at_seconds ? ` → ${formatTimestamp(item.end_seconds)}` : ""}
                    <span className="rounded-full border border-line px-2 py-px font-sans text-[11.5px]">{isKind(item.kind) ? t(`kind.${item.kind}`) : item.kind}</span>
                  </p>
                  <p className="mt-1.5 text-[15.5px] font-semibold leading-snug">{item.title}</p>
                  <p className="mt-1 text-[14px] leading-relaxed text-ink-muted">{item.why}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
        {audit.remaining > 0 && <p className="mt-3 text-[13.5px] text-ink-muted">{t("remaining", { count: audit.remaining })}</p>}
      </section>

      {/* antes de publicar */}
      <section aria-labelledby="audit-checklist">
        <h2 id="audit-checklist" className="t-h3">{t("checklistTitle")}</h2>
        <ul className="mt-5 flex flex-col">
          {items.map((item) => {
            const checked = done.has(item.key);
            return (
              <li key={item.key} className="border-b border-line">
                <label className="flex min-h-11 cursor-pointer items-center gap-3 py-2.5 text-[14.5px]">
                  <input type="checkbox" checked={checked} onChange={() => toggle(item.key)} className="h-4 w-4 shrink-0 accent-[var(--accent)]" />
                  <span className={checked ? "text-ink-muted line-through" : ""}>{t(`check.${item.key}`, item.values ?? {})}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      {/* o exemplo termina no envio: agora o vídeo da pessoa */}
      {sample && (
        <section className="rounded-[28px] border border-[rgba(var(--accent-rgb),0.25)] bg-accent-soft p-7 sm:p-9">
          <h2 className="font-display text-[26px] font-medium tracking-[-0.01em] sm:text-[30px]">{tSample("ctaTitle")}</h2>
          <p className="mt-3 max-w-[58ch] text-[15px] leading-relaxed text-ink-muted">{tSample("ctaLead")}</p>
          <Link
            href={`${localePath(locale, "/tools/video-audit")}#upload`}
            onClick={() => capture("sample_report_cta_clicked", null, locale, { where: "sample_bottom" })}
            className={buttonClasses("primary", "md", "mt-6 min-h-11")}
          >
            {tSample("cta")}
          </Link>
        </section>
      )}

      {/* o que fazer com o relatório: levar para o editor, salvar em PDF, mostrar */}
      {!sample && (
        <section aria-labelledby="audit-export" className="print-hide flex flex-col gap-4">
          <h2 id="audit-export" className="sr-only">
            {t("actions.title")}
          </h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" className="min-h-11" onClick={copy} aria-live="polite">
              {copied ? <Check size={15} strokeWidth={2} aria-hidden="true" /> : <Copy size={15} strokeWidth={1.75} aria-hidden="true" />}
              {copied ? t("actions.copied") : t("actions.copy")}
            </Button>
            <Button variant="secondary" className="min-h-11" onClick={download}>
              <Download size={15} strokeWidth={1.75} aria-hidden="true" />
              {t("actions.download")}
            </Button>
            <Button variant="secondary" className="min-h-11" onClick={print}>
              <Printer size={15} strokeWidth={1.75} aria-hidden="true" />
              {t("actions.print")}
            </Button>
          </div>
          {/* o link público é da conta: o dono liga e desliga (ver share_service) */}
          {!guest && result?.drop ? (
            <ShareResult analysisId={analysis.id} initialToken={analysis.share_token ?? null} at={result.drop.at_seconds} where="video_audit" />
          ) : (
            guest && <p className="text-[13px] leading-relaxed text-ink-muted">{t("actions.shareNeedsAccount")}</p>
          )}
        </section>
      )}

      {/* o produto: onde as mudanças viram edição, com o que o plano pago entrega de fato */}
      {!sample && (
        <section aria-labelledby="audit-unlock" className="print-hide rounded-[28px] border border-[rgba(var(--accent-rgb),0.25)] bg-accent-soft p-7 sm:p-9">
          <h2 id="audit-unlock" className="font-display text-[26px] font-medium tracking-[-0.01em] sm:text-[30px]">
            {locked ? t("unlock.title") : t("unlock.titleOpen")}
          </h2>
          <p className="mt-3 max-w-[58ch] text-[15px] leading-relaxed text-ink-muted">{locked ? t("unlock.lead") : t("unlock.leadOpen")}</p>
          <ul className="mt-5 flex flex-col gap-2.5">
            {unlocks.map((line) => (
              <li key={line} className="flex gap-2.5 text-[14.5px] leading-snug">
                <Check size={16} strokeWidth={2.25} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                {line}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={locked ? `/results/${analysis.id}#plan` : `/results/${analysis.id}`}
              onClick={() => {
                capture("main_product_cta_clicked", analysis.id, locale, { where: "video_audit" });
                upgradeClicked("video_audit", "report_unlock", { authenticated: !guest, locked, target: "full_plan" }, analysis.id);
              }}
              className={buttonClasses("primary", "md", "min-h-12 px-6")}
            >
              {locked ? t("unlock.cta") : t("unlock.ctaOpen")}
              <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
            </Link>
            {locked && (
              <Link
                href={localePath(locale, "/pricing")}
                onClick={() => upgradeClicked("video_audit", "report_pricing", { authenticated: !guest, target: "pricing" }, analysis.id)}
                className="inline-flex min-h-11 items-center text-[14px] font-medium underline-offset-2 hover:underline"
              >
                {t("unlock.compare")}
              </Link>
            )}
          </div>
          {locked && <p className="mt-3 text-[12.5px] leading-relaxed text-ink-muted">{t("unlock.price", { price: PLANS.creator.display })}</p>}
        </section>
      )}

      {/* o próximo vídeo: sem conta, o teste grátis é de um vídeo; com conta, é o painel */}
      {!sample && (
        <section aria-labelledby="audit-another" className="print-hide rounded-[22px] border border-line bg-paper-raised p-6 sm:p-7">
          <h2 id="audit-another" className="text-[17px] font-semibold">
            {t("another.title")}
          </h2>
          <p className="mt-2 max-w-[60ch] text-[14.5px] leading-relaxed text-ink-muted">{guest ? t("another.leadGuest") : t("another.lead")}</p>
          {guest ? (
            <Link
              href={`${localePath(locale, "/signup")}?next=${encodeURIComponent(`/results/${analysis.id}`)}`}
              onClick={() => upgradeClicked("video_audit", "report_another", { authenticated: false, target: "signup" }, analysis.id)}
              className={buttonClasses("secondary", "md", "mt-4 min-h-11")}
            >
              {t("another.ctaGuest")}
            </Link>
          ) : (
            <TrackedLink where="audit_another" href="/new-analysis" className={buttonClasses("secondary", "md", "mt-4 min-h-11")}>
              {t("another.cta")}
            </TrackedLink>
          )}
        </section>
      )}

      {/* no papel: de onde veio o relatório */}
      <p className="hidden text-[12px] text-ink-muted print:block">{t("printBrand")}</p>

      <p className="text-[12.5px] leading-relaxed text-ink-muted">{t("limits")}</p>
    </div>
  );
}
