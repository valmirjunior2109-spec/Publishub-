"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Escolhe entre dois blocos do layout pelo endereço exato: a home (a lista de espera) tem cabeçalho
 * e rodapé próprios, o resto do site continua com os do scanner. Os dois blocos chegam prontos do servidor.
 */
export function PathSwitch({ path, match, otherwise }: { path: string; match: ReactNode; otherwise: ReactNode }) {
  const pathname = usePathname() ?? "";
  return <>{pathname === path ? match : otherwise}</>;
}
