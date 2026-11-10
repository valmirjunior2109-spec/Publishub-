"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Escolhe entre dois blocos do layout pelo endereço exato: as páginas da Publishub (a home com a lista
 * de espera e a confirmação da assinatura) têm cabeçalho e rodapé próprios; o resto do site continua com
 * os do scanner. Os dois blocos chegam prontos do servidor.
 */
export function PathSwitch({ paths, match, otherwise }: { paths: readonly string[]; match: ReactNode; otherwise: ReactNode }) {
  const pathname = usePathname() ?? "";
  return <>{paths.includes(pathname) ? match : otherwise}</>;
}
