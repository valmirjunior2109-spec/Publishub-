import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { AuditSample } from "@/components/tools/AuditSample";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata() {
  return pageMetadata("toolAuditSample", "/tools/video-audit/sample");
}

/** O relatório de exemplo da auditoria grátis (ver components/tools/AuditSample). */
export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="container-page pb-12 pt-6 lg:pt-8">
        <div className="mx-auto max-w-[960px]">
          <AuditSample />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
