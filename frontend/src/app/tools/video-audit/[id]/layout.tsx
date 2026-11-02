import type { ReactNode } from "react";
import { PRIVATE_METADATA } from "@/lib/seo";

/** O relatório de uma auditoria é de quem enviou o vídeo: fora do Google (ver lib/seo.ts). */
export const metadata = PRIVATE_METADATA;

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
