"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/** Abaixo disso, o número não aparece: "junte-se a 3 pessoas" afasta mais do que convence. */
export const WAITLIST_COUNT_MIN = 25;

/** 63 → "60+": um número redondo que não muda a cada inscrição e nunca exagera. */
export function roundedCount(total: number): string {
  if (total < 100) return `${Math.floor(total / 10) * 10}+`;
  return `${Math.floor(total / 50) * 50}+`;
}

let cached: Promise<number | null> | null = null;

/** Uma consulta por página, mesmo com mais de um formulário na tela. */
function loadTotal(): Promise<number | null> {
  cached ??= fetch("/api/waitlist/count")
    .then((r) => (r.ok ? r.json() : null))
    .then((body: { total?: number | null } | null) => (typeof body?.total === "number" ? body.total : null))
    .catch(() => null);
  return cached;
}

/**
 * A prova social ao lado do formulário: quantas pessoas já estão na lista, com o número real do banco
 * (arredondado para baixo). Some se o banco não responder ou se ainda houver poucas inscrições.
 */
export function WaitlistCount({ className, as: Tag = "p" }: { className?: string; as?: "p" | "span" }) {
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    void loadTotal().then((value) => {
      if (alive) setTotal(value);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (total === null || total < WAITLIST_COUNT_MIN) return null;
  return (
    <Tag className={cn("text-[15px] text-muted", className)}>
      Join <strong className="font-semibold text-ink">{roundedCount(total)} builders</strong> already on the waitlist.
    </Tag>
  );
}
