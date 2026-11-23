import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckReportView } from "@/components/check/CheckReportView";
import { UUID_RE } from "@/lib/server/db";

export const metadata: Metadata = {
  title: "App check report",
  // os relatórios são de apps de outras pessoas: nunca no Google
  robots: { index: false, follow: false },
};

export default async function CheckReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  return (
    <div className="container-page max-w-4xl py-12 sm:py-16">
      <p className="eyebrow">Free app check</p>
      <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Your app check</h1>
      <div className="mt-8">
        <CheckReportView id={id} />
      </div>
    </div>
  );
}
