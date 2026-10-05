import { Check, Scissors } from "lucide-react";
import { RetentionCurve } from "@/components/RetentionCurve";
import { Reveal } from "@/components/Reveal";
import type { RetentionPoint } from "@/lib/fixtures";

export interface NotebookHeroLabels {
  window: string;
  example: string;
  marginalia: string;
  phrase: string;
  planLabel: string;
  plan: { time: string; kind: string; text: string }[];
  cut: string;
  cutDetail: string;
  accept: string;
}

interface NotebookHeroProps {
  labels: NotebookHeroLabels;
  curve: RetentionPoint[];
  duration: number;
  dropAt: number;
  dropTime: string;
  lost: number;
}

/**
 * O hero é o próprio logotipo em escala: a capa caramelo do caderno, o elástico,
 * a borda das páginas e a caneta a 20°, presa atrás da página. Na página, a
 * análise de exemplo (fixture), rotulada como exemplo.
 *
 * As peças do caderno têm cor fixa (são a marca, iguais nos dois temas); a
 * página segue os tokens do tema.
 */
export function NotebookHero({ labels, curve, duration, dropAt, dropTime, lost }: NotebookHeroProps) {
  return (
    <div className="relative mx-auto w-full max-w-[540px] pb-12 pl-2 pt-8 sm:pl-6">
      {/* a capa, um pouco girada atrás da página */}
      <div aria-hidden="true" className="absolute bottom-0 left-0 right-2 top-2 rotate-[3deg] rounded-[34px] bg-[#c9824a] shadow-lift sm:left-4">
        <span className="absolute inset-y-0 right-12 w-5 bg-[#1e1b18]" />
        <span className="absolute bottom-5 left-7 right-7 h-3 rounded-full bg-[#fbf3e6]" />
      </div>

      {/* a caneta: atrás da página, aparece no alto e na margem */}
      <div aria-hidden="true" className="absolute right-[18px] top-[-34px] h-[300px] w-[16px] origin-top rotate-[20deg] rounded-full bg-[#1f47a6] shadow-float">
        <span className="absolute -right-[7px] top-5 h-24 w-[6px] rounded-full bg-[#1f47a6]" />
        <span className="absolute inset-x-[6px] top-[120px] h-[150px] rounded-full bg-[rgba(251,243,230,0.55)]" />
      </div>

      {/* a página: a análise */}
      <Reveal className="relative mr-8 rounded-[24px] border border-line bg-paper-raised p-5 shadow-lift sm:mr-12 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-ink-muted">{labels.window}</p>
          <span className="rounded-full border border-line px-2.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-muted">{labels.example}</span>
        </div>

        <div className="mt-3 flex items-end justify-between gap-4">
          <p className="font-serif text-[76px] leading-[0.9] text-accent sm:text-[92px]">{dropTime}</p>
          <span className="mb-2 rounded-full bg-kraft-soft px-3 py-1 font-mono text-[13px] font-medium tabular-nums text-kraft-ink">−{lost}%</span>
        </div>

        <div className="mt-3">
          <RetentionCurve points={curve} durationSec={duration} dropAtSec={dropAt} variant="full" labels={{ watching: "", drop: "" }} />
        </div>

        <p className="mt-3 text-[12.5px] leading-snug text-ink-muted">{labels.marginalia}</p>
        <p className="mt-1.5 font-serif text-[21px] italic leading-[1.25]">&ldquo;{labels.phrase}&rdquo;</p>

        {/* o plano, numa folha pautada */}
        <p className="mt-5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-ink-muted">{labels.planLabel}</p>
        <ol className="mt-1">
          {labels.plan.map((item) => (
            <li key={item.time + item.kind} className="flex items-baseline gap-3 border-t border-line py-2.5">
              <span className="shrink-0 font-mono text-[12px] font-medium tabular-nums text-accent">{item.time}</span>
              <span className="min-w-0 text-[13.5px] leading-snug">
                <span className="font-semibold">{item.kind}.</span> {item.text}
              </span>
            </li>
          ))}
        </ol>
      </Reveal>

      {/* o corte sugerido, flutuando sobre a capa */}
      <Reveal delay={300} className="absolute bottom-1 left-0 flex items-center gap-3 rounded-2xl border border-line bg-paper-raised py-2.5 pl-3 pr-2.5 shadow-lift sm:-left-4">
        <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-full bg-accent-soft text-accent">
          <Scissors size={15} strokeWidth={2} />
        </span>
        <span className="flex flex-col">
          <span className="text-[13px] font-semibold">{labels.cut}</span>
          <span className="font-mono text-[11px] text-ink-muted">{labels.cutDetail}</span>
        </span>
        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11.5px] font-semibold text-paper-raised">
          <Check size={12} strokeWidth={3} aria-hidden="true" />
          {labels.accept}
        </span>
      </Reveal>
    </div>
  );
}
