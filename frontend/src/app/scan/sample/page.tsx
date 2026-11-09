import type { Metadata } from "next";
import Link from "next/link";
import { ReportView } from "@/components/report/ReportView";
import { sampleReport } from "@/lib/sample-report";

export const metadata: Metadata = {
  title: "Sample accessibility report for a Shopify store",
  description: "See what a Publishub accessibility report looks like: an estimated risk indicator, issues by severity, the affected elements and plain-English fixes.",
  alternates: { canonical: "/scan/sample" },
};

export default function SampleReportPage() {
  return (
    <div className="container-page py-10 sm:py-14">
      <h1 className="text-3xl font-bold sm:text-4xl">Sample accessibility report</h1>
      <p className="mt-3 rounded-lg border border-line-strong bg-surface p-4 text-[16px]">
        This is an example for a fictional store, example-store.com, so you can see what a report looks like. <Link href="/scanner#scan">Scan your own store free</Link>.
      </p>
      <div className="mt-8">
        <ReportView id="sample" initial={sampleReport()} sample />
      </div>
    </div>
  );
}
