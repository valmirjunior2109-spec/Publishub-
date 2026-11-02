import type { ReactNode } from "react";
import type { AppLocale } from "@/i18n/config";
import { cn } from "@/lib/cn";

/**
 * A bandeira de cada idioma do site, desenhada em SVG (30×20).
 *
 * Emoji de bandeira não serve: o Windows mostra só as letras ("BR", "US"). As
 * bandeiras são simplificadas para o tamanho de um ícone (sem brasões nem
 * estrelas miúdas), mas com as cores e as proporções certas.
 */
const FLAGS: Record<AppLocale, ReactNode> = {
  "pt-BR": (
    <>
      <rect width="30" height="20" fill="#009B3A" />
      <path d="M15 2.2 27.2 10 15 17.8 2.8 10Z" fill="#FEDF00" />
      <circle cx="15" cy="10" r="4.6" fill="#002776" />
      <path d="M10.6 9.1c3-.9 6.3-.6 8.9.9" fill="none" stroke="#fff" strokeWidth="0.9" />
    </>
  ),
  en: (
    <>
      <rect width="30" height="20" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12].map((stripe) => (
        <rect key={stripe} y={(stripe * 20) / 13} width="30" height={20 / 13} fill="#B22234" />
      ))}
      <rect width="13" height={(7 * 20) / 13} fill="#3C3B6E" />
      {[2.2, 6.5, 10.8].flatMap((x) => [2.2, 5.4, 8.6].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.75" fill="#fff" />))}
    </>
  ),
  es: (
    <>
      <rect width="30" height="20" fill="#AA151B" />
      <rect y="5" width="30" height="10" fill="#F1BF00" />
    </>
  ),
  fr: (
    <>
      <rect width="10" height="20" fill="#0055A4" />
      <rect x="10" width="10" height="20" fill="#fff" />
      <rect x="20" width="10" height="20" fill="#EF4135" />
    </>
  ),
  de: (
    <>
      <rect width="30" height="6.67" fill="#000" />
      <rect y="6.67" width="30" height="6.67" fill="#DD0000" />
      <rect y="13.33" width="30" height="6.67" fill="#FFCE00" />
    </>
  ),
  it: (
    <>
      <rect width="10" height="20" fill="#009246" />
      <rect x="10" width="10" height="20" fill="#fff" />
      <rect x="20" width="10" height="20" fill="#CE2B37" />
    </>
  ),
  hi: (
    <>
      <rect width="30" height="6.67" fill="#FF9933" />
      <rect y="6.67" width="30" height="6.67" fill="#fff" />
      <rect y="13.33" width="30" height="6.67" fill="#138808" />
      <circle cx="15" cy="10" r="2.6" fill="none" stroke="#000080" strokeWidth="0.7" />
      <circle cx="15" cy="10" r="0.6" fill="#000080" />
    </>
  ),
  id: (
    <>
      <rect width="30" height="10" fill="#CE1126" />
      <rect y="10" width="30" height="10" fill="#fff" />
    </>
  ),
  tr: (
    <>
      <rect width="30" height="20" fill="#E30A17" />
      <circle cx="11" cy="10" r="5" fill="#fff" />
      <circle cx="12.3" cy="10" r="4" fill="#E30A17" />
      <path d="m17.2 10 3.4-1.1-2.1 2.9V8.2l2.1 2.9Z" fill="#fff" />
    </>
  ),
  ja: (
    <>
      <rect width="30" height="20" fill="#fff" />
      <circle cx="15" cy="10" r="6" fill="#BC002D" />
    </>
  ),
  ko: (
    <>
      <rect width="30" height="20" fill="#fff" />
      <path d="M10 10a5 5 0 0 1 10 0 2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 0-5 0Z" fill="#CD2E3A" />
      <path d="M10 10a5 5 0 0 0 10 0 2.5 2.5 0 0 0-5 0 2.5 2.5 0 0 1-5 0Z" fill="#0047A0" />
      {[
        [4.2, 4.2, -33.7],
        [25.8, 4.2, 33.7],
        [4.2, 15.8, 33.7],
        [25.8, 15.8, -33.7],
      ].map(([x, y, angle]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y}) rotate(${angle})`} fill="#000">
          <rect x="-2" y="-1.6" width="4" height="0.8" />
          <rect x="-2" y="-0.4" width="4" height="0.8" />
          <rect x="-2" y="0.8" width="4" height="0.8" />
        </g>
      ))}
    </>
  ),
};

export function Flag({ locale, className }: { locale: AppLocale; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("inline-block shrink-0 overflow-hidden rounded-[3px] shadow-[0_0_0_1px_rgba(var(--ink-rgb),0.14)]", className)}>
      <svg viewBox="0 0 30 20" className="block h-full w-full" preserveAspectRatio="xMidYMid slice">
        {FLAGS[locale]}
      </svg>
    </span>
  );
}
