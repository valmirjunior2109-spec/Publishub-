import { CopyButton } from "@/components/CopyButton";
import { Card } from "@/components/ui/Card";
import type { Rewrite } from "@/lib/fixtures";

interface RewriteCardProps {
  index: number;
  rewrite: Rewrite;
  whyLabel: string;
}

/** Uma frase alternativa. A frase é o entregável — é o que pesa mais aqui. */
export function RewriteCard({ index, rewrite, whyLabel }: RewriteCardProps) {
  return (
    <Card className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
      <span className="pt-1 font-display text-sm tabular-nums text-ink-muted">{String(index).padStart(2, "0")}</span>

      <div className="min-w-0 flex-1">
        <p className="font-display text-[22px] font-medium leading-snug tracking-tight text-ink sm:text-[24px]">{rewrite.text}</p>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
          <span className="font-medium text-ink">{whyLabel} —</span> {rewrite.why}
        </p>
      </div>

      <div className="shrink-0 sm:pt-1">
        <CopyButton text={rewrite.text} />
      </div>
    </Card>
  );
}
