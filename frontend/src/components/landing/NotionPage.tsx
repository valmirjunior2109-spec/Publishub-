import type { CSSProperties, ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export interface NotionPageText {
  label: string;
  file: string;
  example: string;
  dropAt: string;
  lost: string;
  quote: string;
  plan: string;
  items: { time: string; text: string }[];
  cut: string;
  cutRange: string;
}

/** Um "N" num quadrado: indica o Notion pelo nome, sem usar o logo dele. */
export function NotionTile({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("flex items-center justify-center border border-line bg-white font-[Georgia,serif] font-bold text-[#1b1d3a]", className)}>
      N
    </span>
  );
}

function Row({ i, className, children }: { i: number; className?: string; children: ReactNode }) {
  return (
    <div className={cn("np-row", className)} style={{ "--i": i } as CSSProperties}>
      {children}
    </div>
  );
}

const HEADING = "pt-3 text-[15px] font-semibold tracking-[-0.015em]";

/**
 * A análise virada página do Notion, na ordem em que o backend escreve
 * (services/notion_service.py): a queda, a frase, o plano em tarefas e os cortes.
 * `loop`: a página se escreve sem parar. `step`: entra quando `on` fica verdadeiro.
 */
export function NotionPage({ text, mode, on = false, className }: { text: NotionPageText; mode: "loop" | "step"; on?: boolean; className?: string }) {
  let row = 0;
  return (
    <figure aria-label={text.label} className={cn("overflow-hidden rounded-2xl border border-line bg-paper-raised text-left shadow-float", mode === "loop" ? "np-loop" : "np-step", on && "is-on", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <span className="flex min-w-0 items-center gap-2 text-[12.5px] text-ink-muted">
          <NotionTile className="h-5 w-5 shrink-0 rounded-[5px] text-[12px]" />
          <span className="truncate">{text.label}</span>
        </span>
        <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 font-mono text-[11px] text-ink-muted">{text.example}</span>
      </div>
      <div className="flex flex-col gap-1.5 px-5 pb-5 pt-4">
        <Row i={row++}>
          <p className="truncate text-[19px] font-semibold tracking-[-0.025em]">{text.file}</p>
        </Row>
        <Row i={row++}>
          <p className={HEADING}>{text.dropAt}</p>
        </Row>
        <Row i={row++}>
          <p className="text-[13.5px] text-ink-muted">{text.lost}</p>
        </Row>
        <Row i={row++}>
          <p className="border-l-[3px] border-ink/70 pl-3 text-[13.5px] leading-snug">{text.quote}</p>
        </Row>
        <Row i={row++}>
          <p className={HEADING}>{text.plan}</p>
        </Row>
        {text.items.map((item) => {
          const i = row++;
          return (
            <Row key={item.time + item.text} i={i} className="flex items-start gap-2">
              <span className="np-check mt-[3px] flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border border-line text-transparent" style={{ "--i": i } as CSSProperties}>
                <Check size={10} strokeWidth={3.5} aria-hidden="true" />
              </span>
              <p className="min-w-0 text-[13.5px] leading-snug">
                <span className="font-mono text-[12px] text-ink-muted">{item.time}</span> · {item.text}
              </p>
            </Row>
          );
        })}
        <Row i={row++}>
          <p className={HEADING}>{text.cut}</p>
        </Row>
        <Row i={row++}>
          <p className="text-[13.5px]">
            <span aria-hidden="true">• </span>
            {text.cutRange}
          </p>
        </Row>
      </div>
    </figure>
  );
}
