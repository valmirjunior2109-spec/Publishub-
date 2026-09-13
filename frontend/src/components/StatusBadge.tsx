"use client";

import { useTranslations } from "next-intl";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import type { AnalysisStatus, LoopOutcome } from "@/lib/types";

const STATUS_TONE: Record<AnalysisStatus, BadgeTone> = { pending: "pending", processing: "pending", completed: "confirmed", failed: "refuted" };

/** Estado do processamento (na fila / analisando / concluída / falhou). */
export function AnalysisStatusBadge({ status }: { status: AnalysisStatus }) {
  const t = useTranslations("AnalysisStatus");
  return (
    <Badge tone={STATUS_TONE[status]} dot={status === "pending" || status === "processing"}>
      {t(status)}
    </Badge>
  );
}

/** Estado do loop de previsão (pendente / confirmada / refutada). */
export function OutcomeBadge({ outcome }: { outcome: LoopOutcome }) {
  const t = useTranslations("Status");
  return (
    <Badge tone={outcome} dot>
      {t(outcome)}
    </Badge>
  );
}
