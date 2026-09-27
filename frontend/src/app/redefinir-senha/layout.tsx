import type { ReactNode } from "react";
import { PRIVATE_METADATA } from "@/lib/seo";

/** Área de conta: fora do Google (ver lib/seo.ts). */
export const metadata = PRIVATE_METADATA;

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
