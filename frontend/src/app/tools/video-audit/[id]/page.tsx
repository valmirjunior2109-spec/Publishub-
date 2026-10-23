import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { AuditView } from "@/components/tools/AuditView";

/** O relatório da auditoria grátis (ver components/tools/AuditView). */
export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="container-page pb-12 pt-6 lg:pt-8">
        <div className="mx-auto max-w-[960px]">
          <AuditView />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
