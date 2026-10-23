"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AuditReport } from "@/components/tools/AuditReport";
import { buttonClasses } from "@/components/ui/Button";
import { localePath } from "@/i18n/paths";
import { capture } from "@/lib/analytics";
import type { Analysis, AnalysisAudit } from "@/lib/types";

/**
 * O relatório de exemplo: o mesmo AuditReport do relatório de verdade, com um
 * vídeo de amostra e números ilustrativos (o texto vem de AuditSample, nos 11
 * idiomas). Nada aqui chama a API: é só para mostrar o formato antes do envio.
 */
export function AuditSample() {
  const t = useTranslations("AuditSample");
  const locale = useLocale();

  // uma vez por visita: quantas pessoas abrem o exemplo
  const viewed = useRef(false);
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    capture("sample_report_viewed", null, locale);
  }, [locale]);

  const top = t.raw("top") as { title: string; why: string }[];
  const audit: AnalysisAudit = {
    overall_score: 5,
    hook: { score: 3, note: t("hookNote") },
    pace: { value: "lento", note: t("paceNote") },
    measured: { duration_seconds: 27.4, pauses: 4, longest_pause_seconds: 1.1, silence_start_seconds: 0.6, silence_end_seconds: 0.9, scene_changes: 2 },
    dimensions: [
      { key: "hook", status: "priority", suggestions: 1 },
      { key: "pacing", status: "attention", suggestions: 2 },
      { key: "structure", status: "ok", suggestions: 0 },
      { key: "captions", status: "attention", suggestions: 1 },
      { key: "visuals", status: "priority", suggestions: 1 },
      { key: "cta", status: "attention", suggestions: 1 },
    ],
    top: [
      { kind: "hook", at_seconds: 0, end_seconds: 5, title: top[0].title, why: top[0].why },
      { kind: "broll", at_seconds: 11, end_seconds: 17, title: top[1].title, why: top[1].why },
      { kind: "cta", at_seconds: 24, end_seconds: 27, title: top[2].title, why: top[2].why },
    ],
    remaining: 4,
  };
  const analysis = {
    id: "sample",
    status: "completed",
    result: {
      retention_source: "estimated",
      drop: { at_seconds: 3, retained_before: null, retained_after: null },
      phrase: { start_seconds: 1.2, end_seconds: 4.8, text: t("phrase"), before: "", after: "" },
    },
    video: { filename: t("filename") },
  } as unknown as Analysis;

  const toUpload = `${localePath(locale, "/tools/video-audit")}#upload`;

  return (
    <div>
      <Link href={localePath(locale, "/tools/video-audit")} className="text-[13px] font-medium text-ink-muted hover:text-ink">
        ← {t("back")}
      </Link>
      <p className="eyebrow mt-5">{t("eyebrow")}</p>
      <h1 className="t-h2 mt-3 text-balance">{t("title")}</h1>

      {/* o aviso: é um exemplo, não a análise do vídeo de quem está vendo */}
      <div role="note" className="mt-5 flex flex-col gap-4 rounded-xl border border-line bg-paper-raised p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:gap-3">
          <span className="h-fit shrink-0 rounded-full border border-[rgba(var(--accent-rgb),0.35)] bg-accent-soft px-2.5 py-0.5 text-[12px] font-semibold text-accent">{t("demoBadge")}</span>
          <p className="max-w-[62ch] text-[14px] leading-relaxed text-ink-muted">{t("demoNote")}</p>
        </div>
        <Link href={toUpload} onClick={() => capture("sample_report_cta_clicked", null, locale, { where: "sample_top" })} className={buttonClasses("primary", "md", "shrink-0 max-sm:min-h-11")}>
          {t("cta")}
        </Link>
      </div>

      <div className="mt-6">
        <AuditReport analysis={analysis} audit={audit} guest sample />
      </div>
    </div>
  );
}
