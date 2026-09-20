"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useTrackOnce } from "@/lib/events";
import { formatTimestamp } from "@/lib/format";
import type { Recommendation, RecommendationKind } from "@/lib/types";

/** Cada frente tem um tom, para dar para varrer a lista sem ler tudo. */
const KIND_TONE: Record<RecommendationKind, BadgeTone> = {
  hook: "accent",
  cut: "ink",
  pacing: "pending",
  broll: "neutral",
  caption: "neutral",
  structure: "ink",
  cta: "confirmed",
};

interface ActionPlanProps {
  recommendations: Recommendation[];
  /** Identifica o vídeo ao guardar o que já foi feito, no navegador de quem edita. */
  analysisId: string;
  onSeek: (seconds: number) => void;
  /** Ações do topo, como copiar o plano. */
  actions?: React.ReactNode;
}

function readDone(analysisId: string): number[] {
  try {
    const raw = window.localStorage.getItem(`publishub.plan.${analysisId}`);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

/**
 * O plano de ação: o que mudar, em ordem de impacto, com o segundo de cada coisa.
 * É a entrega do produto — não editamos o vídeo, dizemos o que editar.
 *
 * O que já foi feito fica no navegador de quem edita: é conveniência de uma
 * sessão de edição, não estado do produto.
 */
export function ActionPlan({ recommendations, analysisId, onSeek, actions }: ActionPlanProps) {
  const t = useTranslations("Analysis.plan");
  // Lido na inicialização, não num effect: esta tela só existe depois que a
  // análise chega pelo cliente, então não há HTML do servidor para divergir.
  const [done, setDone] = useState<number[]>(() => readDone(analysisId));
  useTrackOnce("action_plan_viewed", recommendations.length > 0, analysisId, { items: recommendations.length });

  function toggle(index: number) {
    setDone((current) => {
      const next = current.includes(index) ? current.filter((i) => i !== index) : [...current, index];
      try {
        window.localStorage.setItem(`publishub.plan.${analysisId}`, JSON.stringify(next));
      } catch {
        // sem localStorage o check vale só enquanto a aba estiver aberta
      }
      return next;
    });
  }

  /** O texto de um item: da IA, ou escrito aqui a partir do que foi medido. */
  function lines(item: Recommendation) {
    if (item.title) return { title: item.title, action: item.action, why: item.why };
    const code = item.code ?? "long_pause";
    const params = item.params ?? {};
    return { title: t(`measured.${code}.title` as "measured.long_pause.title", params), action: t(`measured.${code}.action` as "measured.long_pause.action", params), why: null };
  }

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="t-label tracking-[0.08em]">{t("label")}</p>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">{t("lead", { count: recommendations.length, done: done.length })}</p>
        </div>
        {actions}
      </div>

      <ol className="flex flex-col">
        {recommendations.map((item, index) => {
          const text = lines(item);
          const checked = done.includes(index);
          return (
            <li key={index} className={cn("grid gap-3 border-t border-line py-4 last:border-b sm:grid-cols-[auto_1fr] sm:gap-5", checked && "opacity-55")}>
              {/* a ordem é a prioridade: 1 é o que muda mais */}
              <div className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2">
                <span className="font-display text-[15px] font-semibold tabular-nums text-ink-muted">{String(index + 1).padStart(2, "0")}</span>
                <button
                  type="button"
                  onClick={() => onSeek(item.at_seconds)}
                  className="inline-flex shrink-0 items-center gap-1.5 font-display text-[15px] font-semibold tabular-nums tracking-tight text-ink hover:text-accent"
                >
                  <span aria-hidden="true" className="h-0 w-0 border-y-[4px] border-l-[6px] border-y-transparent border-l-accent" />
                  {formatTimestamp(item.at_seconds)}
                  {item.end_seconds != null && item.end_seconds > item.at_seconds && <span className="font-normal text-ink-muted">→ {formatTimestamp(item.end_seconds)}</span>}
                </button>
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={KIND_TONE[item.kind]}>{t(`kinds.${item.kind}`)}</Badge>
                  <span className="text-[12px] tracking-[0.04em] text-ink-muted">{t("impact", { value: item.impact })}</span>
                  <span className="text-[12px] tracking-[0.04em] text-ink-muted">{t(`efforts.${item.effort}`)}</span>
                </div>
                <p className={cn("mt-2.5 font-display text-[17px] leading-snug tracking-[-0.01em]", checked && "line-through")}>{text.title}</p>
                {text.action && <p className="mt-2 text-[14.5px] leading-relaxed">{text.action}</p>}
                {text.why && <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">{text.why}</p>}

                <button
                  type="button"
                  onClick={() => toggle(index)}
                  aria-pressed={checked}
                  className="mt-3 inline-flex min-h-9 items-center gap-2 text-[13px] text-ink-muted hover:text-ink"
                >
                  <span className={cn("grid h-4 w-4 place-items-center rounded-sm border", checked ? "border-ink bg-ink text-paper" : "border-line")}>
                    {checked && <Check size={11} strokeWidth={3} aria-hidden="true" />}
                  </span>
                  {checked ? t("undo") : t("markDone")}
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** O plano em markdown: serve para colar no editor, no bloco de notas ou onde a pessoa trabalhar. */
export function planAsMarkdown(recommendations: Recommendation[], title: string): string {
  const lines = [`# ${title}`, ""];
  recommendations.forEach((item, index) => {
    const when = item.end_seconds != null && item.end_seconds > item.at_seconds ? `${formatTimestamp(item.at_seconds)}-${formatTimestamp(item.end_seconds)}` : formatTimestamp(item.at_seconds);
    lines.push(`${index + 1}. [${item.kind}] ${when} — ${item.title ?? ""}`.trim());
    if (item.action) lines.push(`   ${item.action}`);
    if (item.why) lines.push(`   (${item.why})`);
    lines.push("");
  });
  return lines.join("\n");
}

/** Botão de copiar o plano, com o "copiado" que some sozinho. */
export function CopyPlanButton({ markdown }: { markdown: string }) {
  const t = useTranslations("Analysis.plan");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <Button
      variant="secondary"
      size="sm"
      className="min-h-10"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(markdown);
          setCopied(true);
        } catch {
          // sem permissão de clipboard: não trava a tela
        }
      }}
    >
      {copied ? <Check size={14} strokeWidth={2} aria-hidden="true" /> : <Copy size={14} strokeWidth={1.75} aria-hidden="true" />}
      {copied ? t("copied") : t("copy")}
    </Button>
  );
}
