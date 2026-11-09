"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Escolhe entre dois blocos do layout pelo endereço: a página /verify tem cabeçalho e rodapé
 * próprios, o resto do site continua com os do scanner. Os dois blocos chegam prontos do servidor.
 */
export function PathSwitch({ prefix, match, otherwise }: { prefix: string; match: ReactNode; otherwise: ReactNode }) {
  const pathname = usePathname() ?? "";
  return <>{pathname === prefix || pathname.startsWith(`${prefix}/`) ? match : otherwise}</>;
}
