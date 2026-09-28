"use client";

import { useTranslations } from "next-intl";
import { ArrowDown, Check } from "lucide-react";
import { cn } from "@/lib/cn";

export type FlowStep = "analyze" | "review" | "apply" | "export";

const ORDER: FlowStep[] = ["analyze", "review", "apply", "export"];

/**
 * Onde o criador está no caminho: a análise, a revisão dos cortes, o vídeo sendo
 * gerado e a exportação. `current` é a etapa da vez; as anteriores estão feitas.
 * `done` marca o fim (exportou): tudo verde.
 */
export function FlowSteps({ current, done = false, className }: { current: FlowStep; done?: boolean; className?: string }) {
  const t = useTranslations("Analysis.flow");
  const at = ORDER.indexOf(current);

  return (
    <nav aria-label={t("label")} className={cn("rounded-2xl border border-line bg-paper-raised p-3 sm:p-4", className)}>
      <ol className="grid grid-cols-4 gap-1.5 sm:gap-3">
        {ORDER.map((step, index) => {
          const state = done || index < at ? "done" : index === at ? "current" : "todo";
          return (
            <li key={step} aria-current={state === "current" ? "step" : undefined} className="flex min-w-0 flex-col gap-2">
              {/* a barrinha de progresso de cada etapa */}
              <span
                aria-hidden="true"
                className={cn("h-1 rounded-full transition-colors duration-500", state === "done" ? "bg-accent" : state === "current" ? "bg-[rgba(var(--accent-rgb),0.45)]" : "bg-line")}
              />
              <span className="flex min-w-0 items-start gap-1.5 sm:items-center">
                <span
                  aria-hidden="true"
                  className={cn(
                    // no celular a barrinha já diz o estado: o círculo sai e a palavra cabe inteira
                    "hidden h-5 w-5 shrink-0 place-items-center rounded-full text-[10.5px] font-bold tabular-nums transition-colors duration-300 sm:grid",
                    state === "done" ? "bg-accent text-paper-raised" : state === "current" ? "border-2 border-accent text-accent" : "border border-line text-ink-muted",
                  )}
                >
                  {state === "done" ? <Check size={11} strokeWidth={3} /> : index + 1}
                </span>
                <span className={cn("min-w-0 truncate text-[12px] font-semibold sm:text-[13.5px]", state === "todo" ? "text-ink-muted" : "text-ink")}>{t(`steps.${step}`)}</span>
              </span>
            </li>
          );
        })}
      </ol>
      {/* o próximo passo, dito com todas as letras */}
      {!done && (
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line pt-3 text-[13px] leading-snug text-ink-muted">
          {t(`hint.${current}`)}
          {current === "review" && (
            <a href="#revisar" className="inline-flex items-center gap-1 font-semibold text-accent hover:no-underline">
              {t("goToReview")}
              <ArrowDown size={13} strokeWidth={2.25} aria-hidden="true" />
            </a>
          )}
        </p>
      )}
    </nav>
  );
}
