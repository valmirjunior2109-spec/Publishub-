import { formatTimestamp } from "@/lib/format";

/**
 * A régua da linha do tempo, de 0:00 até o fim do vídeo de exemplo, com a agulha
 * (o elástico do caderno) no segundo da queda. É ornamento: o conteúdo já está
 * dito no hero, então ela fica fora da árvore de acessibilidade.
 */
export function TimelineRuler({ duration, dropAt, dropLabel }: { duration: number; dropAt: number; dropLabel: string }) {
  const seconds = Array.from({ length: duration + 1 }, (_, s) => s);
  const at = (s: number) => `${(s / duration) * 100}%`;

  return (
    <div aria-hidden="true" className="relative select-none pt-9">
      {/* a agulha e o rótulo dela, que sai da agulha para dentro da régua (centrado, passava da borda no celular) */}
      <span className={`absolute top-0 whitespace-nowrap rounded-full bg-ink px-2.5 py-0.5 font-mono text-[11px] font-medium text-paper ${dropAt / duration > 0.6 ? "-translate-x-full" : "-translate-x-3"}`} style={{ left: at(dropAt) }}>
        {formatTimestamp(dropAt)} · {dropLabel}
      </span>
      <span className="absolute bottom-6 top-6 w-[6px] -translate-x-1/2 rounded-full bg-ink" style={{ left: at(dropAt) }} />

      {/* os segundos: um traço por segundo, maior a cada cinco */}
      <div className="relative h-5">
        {seconds.map((s) => (
          <span key={s} className={`absolute bottom-0 w-px ${s % 5 === 0 ? "h-5 bg-[rgba(var(--ink-rgb),0.45)]" : "h-2.5 bg-[rgba(var(--ink-rgb),0.2)]"}`} style={{ left: at(s) }} />
        ))}
      </div>
      {/* a borda das páginas: a faixa da timeline, com o trecho antes da queda marcado */}
      <div className="relative mt-1.5 h-2.5 rounded-full bg-kraft-soft">
        <span className="absolute inset-y-0 left-0 rounded-full bg-kraft" style={{ width: at(dropAt) }} />
      </div>
      <div className="relative mt-2 h-4">
        {seconds
          .filter((s) => s % 5 === 0)
          .map((s) => (
            <span key={s} className="absolute -translate-x-1/2 font-mono text-[11px] tabular-nums text-ink-muted first:translate-x-0" style={{ left: at(s) }}>
              {formatTimestamp(s)}
            </span>
          ))}
      </div>
    </div>
  );
}
