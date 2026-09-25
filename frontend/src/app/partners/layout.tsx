import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

/** A página é de cliente (o painel do Partner); o título e a descrição para o Google moram aqui. */
export function generateMetadata() {
  return pageMetadata("partners", "/partners");
}

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
