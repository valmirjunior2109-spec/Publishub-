import { Suspense } from "react";
import { NotionCallback } from "@/components/NotionCallback";
import { SiteHeader } from "@/components/SiteHeader";

/**
 * Para onde o Notion manda a pessoa depois de autorizar (?code=…&state=…).
 * Este endereço é o NOTION_REDIRECT_URI configurado na integração.
 */
export default function NotionCallbackPage() {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={null}>
        <NotionCallback />
      </Suspense>
    </>
  );
}
