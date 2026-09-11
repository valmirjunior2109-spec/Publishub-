import { NextRequest, NextResponse } from "next/server";
import { getAnalysisPayload } from "@/lib/analysis/get-analysis";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = await getAnalysisPayload(id);

  if (!payload) {
    return NextResponse.json({ error: "Análise não encontrada." }, { status: 404 });
  }

  return NextResponse.json(payload);
}
