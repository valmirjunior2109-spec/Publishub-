import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckReportView } from "@/components/check/CheckReportView";
import { UUID_RE } from "@/lib/server/db";

export const metadata: Metadata = {
  title: "Relatório do teste do app",
  // os relatórios são de apps de outras pessoas: nunca no Google
  robots: { index: false, follow: false },
};

export default async function CheckReportPagePt({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  return (
    <div lang="pt-BR" className="container-page max-w-4xl py-12 sm:py-16">
      <p className="eyebrow">Teste grátis do app</p>
      <h1 className="mt-3 text-3xl font-bold sm:text-4xl">O teste do seu app</h1>
      <div className="mt-8">
        <CheckReportView id={id} locale="pt" />
      </div>
    </div>
  );
}
