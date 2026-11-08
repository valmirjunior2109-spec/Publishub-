import { RISK_LABEL, type RiskBand } from "@/lib/scanner/score";
import { cn } from "@/lib/cn";

const BAND_STYLE: Record<RiskBand, string> = {
  high: "border-critical bg-critical-soft text-critical",
  elevated: "border-serious bg-serious-soft text-serious",
  low: "border-success bg-success-soft text-success",
};

/**
 * O número de 0 a 100 com a faixa escrita (a cor nunca é a única pista) e o rótulo
 * obrigatório: indicador estimado, não avaliação jurídica.
 */
export function RiskScore({ score, band }: { score: number; band: RiskBand }) {
  return (
    <section aria-labelledby="risk-heading" className="rounded-xl border border-line bg-card p-6 shadow-card">
      <h2 id="risk-heading" className="text-base font-semibold text-muted">
        Estimated risk indicator
      </h2>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="text-6xl font-bold tracking-[-0.04em] tabular-nums">{score}</span>
        <span className="text-xl font-semibold text-muted">/ 100</span>
      </p>
      <p className={cn("mt-3 inline-flex rounded-full border px-3 py-1 text-[15px] font-semibold", BAND_STYLE[band])}>{RISK_LABEL[band]} estimated risk</p>
      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-surface-strong" aria-hidden="true">
        <div className={cn("h-full rounded-full", band === "high" ? "bg-critical" : band === "elevated" ? "bg-serious" : "bg-success")} style={{ width: `${Math.max(score, 2)}%` }} />
      </div>
      <p className="mt-4 text-[15px] text-muted">
        Based on the number and severity of automated findings, weighted toward issue types commonly cited in accessibility lawsuits. This is an estimated risk indicator, not a legal assessment.
      </p>
    </section>
  );
}
