import { Check, Play } from "lucide-react";
import { Logo } from "@/components/Logo";
import { RetentionCurve } from "@/components/RetentionCurve";
import { cn } from "@/lib/cn";
import type { RetentionPoint } from "@/lib/fixtures";

export interface ProductShotLabels {
  brand: string;
  dropEyebrow: string;
  dropBadge: string;
  phrase: string;
  marginalia: string;
  example: string;
  plan: { time: string; kind: string; text: string }[];
  apply: string;
  accepted: string;
}

interface ProductShotProps {
  labels: ProductShotLabels;
  curve: RetentionPoint[];
  duration: number;
  dropAt: number;
  dropTime: string;
  lost: number;
  className?: string;
}

/**
 * O "print" do produto no topo da landing: a tela de resultado montada em
 * componentes, com o mesmo exemplo (fixture) do resto da página e rotulada como
 * exemplo. Segue os tokens do tema, então também vira escura no modo escuro.
 */
export function ProductShot({ labels, curve, duration, dropAt, dropTime, lost, className }: ProductShotProps) {
  return (
    <div className={cn("relative", className)}>
      {/* o brilho azul atrás da janela */}
      <div aria-hidden="true" className="bg-glow pointer-events-none absolute -inset-x-16 -top-16 bottom-0 opacity-90" />

      <div className="relative overflow-hidden rounded-[22px] border border-line bg-paper-raised shadow-lift">
        {/* a barra da janela */}
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="mx-auto hidden rounded-md bg-paper px-16 py-1 text-[12px] text-ink-muted sm:block">getpublishub.com/results</span>
          <span className="rounded-full border border-line px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">{labels.example}</span>
        </div>

        <div className="grid gap-6 p-5 sm:p-7 md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-8">
          {/* o vídeo */}
          <div className="relative mx-auto hidden aspect-[9/16] w-full max-w-[250px] overflow-hidden rounded-2xl md:block bg-[linear-gradient(160deg,#1c2541_0%,#0b0d14_55%,#1a1410_100%)]">
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[11.5px] font-semibold text-paper-raised">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-white" />
              {labels.dropBadge}
            </span>
            <span aria-hidden="true" className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white backdrop-blur-sm">
              <Play size={22} strokeWidth={2} fill="currentColor" />
            </span>
            <span aria-hidden="true" className="absolute bottom-4 left-4 right-4 h-1 rounded-full bg-white/25">
              <span className="absolute inset-y-0 left-0 w-[12%] rounded-full bg-white" />
            </span>
          </div>

          {/* a análise */}
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <Logo size="sm" label={labels.brand} />
              <span className="rounded-full bg-accent-soft px-2.5 py-1 font-mono text-[12px] font-medium text-accent">−{lost}%</span>
            </div>
            <p className="t-label mt-6">{labels.dropEyebrow}</p>
            <p className="mt-1 font-display text-[64px] font-semibold leading-none tracking-[-0.05em] text-accent sm:text-[76px]">{dropTime}</p>
            <div className="mt-4">
              <RetentionCurve points={curve} durationSec={duration} dropAtSec={dropAt} variant="full" labels={{ watching: "", drop: "" }} />
            </div>
            <p className="mt-3 text-[13px] text-ink-muted">{labels.marginalia}</p>
            <p className="mt-1 text-[16px] font-medium leading-snug tracking-[-0.01em]">&ldquo;{labels.phrase}&rdquo;</p>

            <ul className="mt-6 flex flex-col gap-2">
              {labels.plan.map((item, index) => (
                <li key={item.time + item.kind} className="flex items-center gap-3 rounded-xl border border-line bg-paper px-3.5 py-3">
                  <span className="shrink-0 rounded-md bg-paper-raised px-2 py-0.5 font-mono text-[12px] font-medium text-accent">{item.time}</span>
                  <span className="min-w-0 flex-1 truncate text-[13.5px]">
                    <span className="font-semibold">{item.kind}.</span> {item.text}
                  </span>
                  <span
                    aria-label={index < 2 ? labels.accepted : undefined}
                    className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full border", index < 2 ? "border-accent bg-accent text-paper-raised" : "border-line text-transparent")}
                  >
                    <Check size={13} strokeWidth={3} aria-hidden="true" />
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex justify-end">
              <span className="inline-flex items-center rounded-full bg-accent px-5 py-2.5 text-[13.5px] font-semibold text-paper-raised shadow-glow">{labels.apply}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
