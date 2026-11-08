import { AUTOMATED_LIMITS, DISCLAIMER } from "@/lib/site";
import { cn } from "@/lib/cn";

/** O aviso que aparece em todo relatório e na oferta: não é parecer jurídico, e o automático não pega tudo. */
export function Disclaimer({ className }: { className?: string }) {
  return (
    <div role="note" aria-label="Important notice" className={cn("rounded-lg border-l-4 border-line-strong bg-surface p-4", className)}>
      <p className="font-semibold">{DISCLAIMER}</p>
      <p className="mt-1 text-[15px] text-muted">{AUTOMATED_LIMITS}</p>
    </div>
  );
}
