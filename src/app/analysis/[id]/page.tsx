import { notFound } from "next/navigation";
import { getAnalysisPayload } from "@/lib/analysis/get-analysis";
import { AnalysisView } from "@/components/analysis/analysis-view";

export const dynamic = "force-dynamic";

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = await getAnalysisPayload(id);

  if (!payload) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <AnalysisView analysisId={id} initial={payload} />
    </div>
  );
}
