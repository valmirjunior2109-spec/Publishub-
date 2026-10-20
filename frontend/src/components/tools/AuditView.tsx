"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ProcessingSteps } from "@/components/ProcessingSteps";
import { AuditReport } from "@/components/tools/AuditReport";
import { buttonClasses } from "@/components/ui/Button";
import { localePath } from "@/i18n/paths";
import { capture } from "@/lib/analytics";
import { isActive } from "@/lib/format";
import { readGuestToken } from "@/lib/guest";
import { useSession } from "@/lib/session";
import { usePolling } from "@/lib/usePolling";
import type { Analysis } from "@/lib/types";

const stillProcessing = (analysis: Analysis) => isActive(analysis.status);

/* O token de convidado mora no localStorage, que o servidor não tem (ver results/[id]). */
const noSubscription = () => () => {};
const noTokenOnServer = () => null;

/** Um evento do PostHog uma vez por tela, não a cada consulta. */
function useCaptureOnce(event: "audit_report_viewed" | "audit_failed", when: boolean, analysisId: string, props: Record<string, string | number | boolean | null> = {}) {
  const locale = useLocale();
  const fired = useRef(false);
  const payload = JSON.stringify(props);
  useEffect(() => {
    if (!when || fired.current) return;
    fired.current = true;
    capture(event, analysisId, locale, JSON.parse(payload));
  }, [when, event, analysisId, locale, payload]);
}

/**
 * A página do relatório: a mesma análise do produto, lida pela rota de sempre
 * (/api/analyses/:id, que só entrega ao dono: a conta ou o navegador do convidado).
 * Enquanto processa, mostra os passos; pronta, o relatório; com falha, o motivo e
 * o caminho de tentar outro vídeo.
 */
export function AuditView() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("AuditReport");
  const tFail = useTranslations("Errors.analysis");
  const locale = useLocale();
  const { loading, session } = useSession();
  const guestToken = useSyncExternalStore(noSubscription, readGuestToken, noTokenOnServer);
  const canRead = Boolean(session || guestToken);

  const { data: analysis, error } = usePolling<Analysis>(`/api/analyses/${id}`, { shouldPoll: stillProcessing, redirectWhenExpired: Boolean(session), enabled: !loading && canRead });

  const failed = analysis?.status === "failed";
  useCaptureOnce("audit_report_viewed", analysis?.status === "completed" && Boolean(analysis.audit), id, { guest: !session });
  useCaptureOnce("audit_failed", failed, id, { code: analysis?.error_code ?? null });

  const back = (
    <Link href={localePath(locale, "/tools/video-audit")} className="text-[13px] font-medium text-ink-muted hover:text-ink">
      ← {t("back")}
    </Link>
  );

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" aria-busy="true">
        <span className="h-5 w-5 animate-spin rounded-full border border-line border-t-accent" />
      </div>
    );
  }

  // sem conta e sem o teste neste navegador (ou de outro dono): o relatório é privado
  if (!canRead || (error && !analysis)) {
    return (
      <div>
        {back}
        <h1 className="t-h2 mt-4 text-balance">{t("notFound")}</h1>
        <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-ink-muted">{t("privateNote")}</p>
        <Link href={localePath(locale, "/tools/video-audit")} className={buttonClasses("primary", "md", "mt-6")}>
          {t("notFoundCta")}
        </Link>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" aria-busy="true">
        <span className="h-5 w-5 animate-spin rounded-full border border-line border-t-accent" />
      </div>
    );
  }

  return (
    <div>
      {back}
      <p className="eyebrow mt-6">{t("eyebrow")}</p>
      <h1 className="t-h2 mt-3 break-words text-balance">{analysis.video.filename || t("title")}</h1>

      {isActive(analysis.status) && (
        <div className="mt-8 max-w-[620px]">
          <ProcessingSteps status={analysis.status} step={analysis.step} withInsights={analysis.video.has_insights !== false} />
          <p className="mt-4 text-[13.5px] leading-relaxed text-ink-muted">{t("processingNote")}</p>
        </div>
      )}

      {failed && (
        <div className="mt-8 flex max-w-[620px] flex-col gap-4 rounded-[22px] border border-line bg-paper-raised p-6">
          <h2 className="font-display text-[22px] font-medium">{t("failedTitle")}</h2>
          <p className="rounded-lg border border-refuted bg-paper p-3 text-sm text-refuted">
            {analysis.error_code && tFail.has(analysis.error_code as "generic") ? tFail(analysis.error_code as "generic", analysis.error_params ?? {}) : analysis.error_message}
          </p>
          <Link href={localePath(locale, "/tools/video-audit")} className={buttonClasses("secondary", "md", "self-start")}>
            {t("tryAnother")}
          </Link>
        </div>
      )}

      {analysis.status === "completed" && analysis.audit && (
        <div className="mt-8">
          <AuditReport analysis={analysis} audit={analysis.audit} guest={!session} />
        </div>
      )}

      {analysis.status === "completed" && !analysis.audit && (
        <div className="mt-8 max-w-[620px]">
          <p className="text-[15px] leading-relaxed">{t("noAudit")}</p>
          <Link href={`/results/${analysis.id}`} className={buttonClasses("primary", "md", "mt-4")}>
            {t("noAuditCta")}
          </Link>
        </div>
      )}
    </div>
  );
}
