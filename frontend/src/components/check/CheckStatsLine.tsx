"use client";

import { useEffect, useState } from "react";
import { CHECK_LABELS, CHECK_LABELS_PT, STATS_MIN_CHECKS, type CheckStats } from "@/lib/check/types";
import { cn } from "@/lib/cn";

/**
 * A evidência que vem de quem usa: quantos apps os próprios criadores já verificaram e quantos tinham
 * pelo menos uma falha. Só contagens, nada que identifique um app. Some enquanto houver poucos testes
 * (uma amostra pequena não diz nada) ou se o banco não responder.
 */
export function CheckStatsLine({ className, locale = "en" }: { className?: string; locale?: "en" | "pt" }) {
  const [stats, setStats] = useState<CheckStats | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/check/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { stats?: CheckStats | null } | null) => {
        if (alive && body?.stats) setStats(body.stats);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (!stats || stats.checked < STATS_MIN_CHECKS) return null;
  const pct = Math.round((stats.withFailure / stats.checked) * 100);

  if (locale === "pt")
    return (
      <p className={cn("text-[15px] text-muted", className)}>
        <strong className="font-semibold text-ink">{stats.checked.toLocaleString("pt-BR")} apps</strong> testados por quem os criou.{" "}
        <strong className="font-semibold text-ink">{pct}%</strong> tinham pelo menos uma falha
        {stats.topFailure ? <>; a mais comum foi {CHECK_LABELS_PT[stats.topFailure.id]}</> : null}.
      </p>
    );
  return (
    <p className={cn("text-[15px] text-muted", className)}>
      <strong className="font-semibold text-ink">{stats.checked.toLocaleString("en-US")} apps</strong> checked by the people who built them.{" "}
      <strong className="font-semibold text-ink">{pct}%</strong> had at least one failure
      {stats.topFailure ? <>; the most common was {CHECK_LABELS[stats.topFailure.id]}</> : null}.
    </p>
  );
}
