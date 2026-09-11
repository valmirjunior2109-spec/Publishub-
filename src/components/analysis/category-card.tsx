import type { LucideIcon } from "lucide-react";
import { Zap, Scissors, VolumeX, Captions, Volume2 } from "lucide-react";
import { Badge, scoreTone } from "@/components/ui/badge";
import type { AnalysisCategory } from "@/lib/ai/types";

const ICONS: Record<AnalysisCategory["key"], LucideIcon> = {
  hook: Zap,
  pacing: Scissors,
  silence: VolumeX,
  captions: Captions,
  audio: Volume2,
};

export function CategoryCard({ category }: { category: AnalysisCategory }) {
  const Icon = ICONS[category.key];

  return (
    <div className="rounded-card border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary-strong">
            <Icon size={17} />
          </div>
          <h3 className="text-sm font-semibold text-foreground">{category.label}</h3>
        </div>
        <Badge tone={scoreTone(category.score)}>{category.score}/100</Badge>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted">{category.summary}</p>

      {category.recommendations.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {category.recommendations.map((rec, i) => (
            <li key={i} className="flex gap-2 text-sm leading-relaxed text-foreground/90">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary-strong" />
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
