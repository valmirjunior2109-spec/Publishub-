import { getTranslations } from "next-intl/server";
import { Check, X } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { cn } from "@/lib/cn";

const SIDES = ["without", "with"] as const;

/**
 * Antes e depois: o mesmo vídeo, publicado no escuro e publicado já corrigido.
 * Só passos que o produto cumpre (cerca de 3 minutos, as sete frentes, os cortes
 * aceitos, a memória); nenhum número de tempo inventado do lado de "antes".
 */
export async function BeforeAfter() {
  const t = await getTranslations("Landing.beforeAfter");
  return (
    <div className="mt-20 lg:mt-28">
      <Reveal>
        <h3 className="t-h2 max-w-[18ch]">{t("title")}</h3>
      </Reveal>
      <div className="mt-10 grid gap-4 lg:grid-cols-2 lg:gap-6">
        {SIDES.map((side, index) => {
          const steps = t.raw(`${side}.steps`) as string[];
          const good = side === "with";
          return (
            <Reveal
              key={side}
              delay={index * 80}
              className={cn("flex flex-col rounded-2xl border p-6 sm:p-8", good ? "border-accent bg-paper-raised shadow-[0_0_0_1px_var(--accent)]" : "border-line bg-surface")}
            >
              <p className={cn("inline-flex items-center gap-2 text-[14px] font-semibold", good ? "text-accent" : "text-ink-muted")}>
                <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", good ? "bg-accent" : "bg-[rgba(var(--ink-rgb),0.35)]")} />
                {t(`${side}.label`)}
              </p>
              <ol className="mt-6 flex flex-col">
                {steps.map((step, n) => (
                  <li key={step} className="grid grid-cols-[30px_minmax(0,1fr)] gap-x-3 border-t border-line py-3.5 text-[15.5px] leading-snug first:border-t-0 first:pt-0">
                    <span className={cn("pt-0.5 font-mono text-[12px]", good ? "text-accent" : "text-ink-muted")}>{String(n + 1).padStart(2, "0")}</span>
                    <span className={good ? "text-ink" : "text-ink-muted"}>{step}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-auto pt-6">
                <p className="flex items-start gap-2.5 border-t border-line pt-5 text-[16px] font-semibold leading-snug">
                  {good ? (
                    <Check size={18} strokeWidth={2.5} className="mt-0.5 shrink-0 text-confirmed" aria-hidden="true" />
                  ) : (
                    <X size={18} strokeWidth={2.5} className="mt-0.5 shrink-0 text-refuted" aria-hidden="true" />
                  )}
                  {t(`${side}.result`)}
                </p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
