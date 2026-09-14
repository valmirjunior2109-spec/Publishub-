"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { BadgeCheck } from "lucide-react";

/** Faixa que aparece uma vez, quando /obrigado manda a pessoa ao painel com ?ativado=1. */
export function ActivatedBanner() {
  const t = useTranslations("Billing");
  const params = useSearchParams();
  if (params.get("ativado") !== "1") return null;
  return (
    <p role="status" className="fade-in mb-8 flex items-center gap-3 rounded-md border border-[rgba(var(--accent-rgb),0.35)] bg-accent-soft px-4 py-3 text-[14px] font-medium text-accent">
      <BadgeCheck size={18} strokeWidth={1.75} aria-hidden="true" />
      {t("activated")}
    </p>
  );
}
