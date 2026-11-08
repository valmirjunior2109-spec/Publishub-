import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReportView } from "@/components/report/ReportView";
import { UUID_RE } from "@/lib/server/db";

// o relatório é compartilhável pelo link, mas não entra no Google
export const metadata: Metadata = {
  title: "Accessibility report",
  robots: { index: false, follow: false },
};

export default async function ScanReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  return (
    <div className="container-page py-10 sm:py-14">
      <h1 className="text-3xl font-bold sm:text-4xl">Accessibility report</h1>
      <p className="mt-2 text-muted">Automated WCAG 2.2 AA scan by Publishub. Share this page with your developer using its link.</p>
      <div className="mt-8">
        <ReportView id={id} />
      </div>
    </div>
  );
}
