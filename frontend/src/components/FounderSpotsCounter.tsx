"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { useFounderSpots } from "@/lib/useFounderSpots";

/**
 * "Restam 37 vagas de 100": o número vem das compras pagas, contadas no backend.
 *
 * Enquanto a contagem não chega, a linha fica reservada (sem texto inventado);
 * se o backend não responder, ela simplesmente não aparece.
 */
export function FounderSpotsCounter({ className }: { className?: string }) {
  const t = useTranslations("Pricing.spots");
  const spots = useFounderSpots();

  if (!spots) return <p aria-hidden="true" className={cn("min-h-[22px]", className)} />;

  const used = spots.limit > 0 ? Math.min(100, Math.round((spots.taken / spots.limit) * 100)) : 100;
  return (
    <div className={className} aria-live="polite">
      <p className={cn("text-[14px] font-medium", spots.sold_out ? "text-refuted" : "text-accent")}>
        {spots.sold_out ? t("soldOutLead", { limit: spots.limit }) : t("remaining", { remaining: spots.remaining, limit: spots.limit })}
      </p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line" role="presentation">
        <div className={cn("h-full rounded-full", spots.sold_out ? "bg-refuted" : "bg-accent")} style={{ width: `${used}%` }} />
      </div>
    </div>
  );
}
