import type { ReactNode } from "react";

/** Moldura das páginas de texto (privacidade, termos, declaração de acessibilidade). */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article className="container-page max-w-3xl py-14 sm:py-20">
      <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
      <p className="mt-2 text-muted">Last updated: {updated}</p>
      <div className="prose-legal mt-6">{children}</div>
    </article>
  );
}
