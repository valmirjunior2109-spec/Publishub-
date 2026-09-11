import { CheckCircle2, Loader2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  "Lendo metadados do vídeo",
  "Detectando cortes e ritmo",
  "Processando legendas",
  "Gerando recomendações com IA",
];

export function ProcessingTimeline({ currentStage }: { currentStage: string | null }) {
  const currentIndex = currentStage ? STEPS.indexOf(currentStage) : -1;

  return (
    <div className="flex flex-col gap-4">
      {STEPS.map((step, index) => {
        const isActive = index === currentIndex;
        const isPending = currentIndex === -1 || index > currentIndex;

        return (
          <div key={step} className="flex items-center gap-3">
            {isActive ? (
              <Loader2 size={18} className="shrink-0 animate-spin text-primary-strong" />
            ) : isPending ? (
              <Circle size={18} className="shrink-0 text-muted-2" />
            ) : (
              <CheckCircle2 size={18} className="shrink-0 text-success" />
            )}
            <span
              className={cn(
                "text-sm",
                isActive ? "text-foreground font-medium" : isPending ? "text-muted-2" : "text-muted"
              )}
            >
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );
}
