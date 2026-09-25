import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

/** A página é de cliente (upload no navegador); o título e a descrição para o Google moram aqui. */
export function generateMetadata() {
  return pageMetadata("try", "/experimentar");
}

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
