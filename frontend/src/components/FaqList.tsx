import type { ReactNode } from "react";

export interface FaqItem {
  q: string;
  a: ReactNode;
}

/** Perguntas em <details>: abrem com Enter e Espaço e são anunciadas como expansíveis, sem JavaScript. */
export function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((item) => (
        <details key={item.q} className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-[17px] font-semibold [&::-webkit-details-marker]:hidden">
            <span>{item.q}</span>
            <span aria-hidden="true" className="text-2xl leading-none text-muted transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <div className="max-w-prose pb-5 text-[16px] text-ink">{item.a}</div>
        </details>
      ))}
    </div>
  );
}
