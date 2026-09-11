import { prisma } from "@/lib/db/client";
import type { AnalysisResult, VideoMetrics } from "@/lib/ai/types";

export interface AnalysisPayload {
  id: string;
  status: "QUEUED" | "PROCESSING" | "ANALYZING" | "DONE" | "FAILED";
  stage: string | null;
  error: string | null;
  overallScore: number | null;
  result: AnalysisResult | null;
  metrics: VideoMetrics | null;
  aiProvider: string | null;
  createdAt: Date;
  completedAt: Date | null;
  video: {
    id: string;
    fileName: string;
    durationSec: number | null;
    width: number | null;
    height: number | null;
    captionFileName: string | null;
    platform: string | null;
    views: number | null;
    avgWatchPct: number | null;
  };
}

// Shared between the polling API route and the analysis page's initial
// server-rendered fetch, so both always shape the payload identically.
export async function getAnalysisPayload(id: string): Promise<AnalysisPayload | null> {
  const analysis = await prisma.analysis.findUnique({ where: { id }, include: { video: true } });
  if (!analysis) return null;

  return {
    id: analysis.id,
    status: analysis.status,
    stage: analysis.stage,
    error: analysis.error,
    overallScore: analysis.overallScore,
    result: analysis.resultJson ? JSON.parse(analysis.resultJson) : null,
    metrics: analysis.metricsJson ? JSON.parse(analysis.metricsJson) : null,
    aiProvider: analysis.aiProvider,
    createdAt: analysis.createdAt,
    completedAt: analysis.completedAt,
    video: {
      id: analysis.video.id,
      fileName: analysis.video.fileName,
      durationSec: analysis.video.durationSec,
      width: analysis.video.width,
      height: analysis.video.height,
      captionFileName: analysis.video.captionFileName,
      platform: analysis.video.platform,
      views: analysis.video.views,
      avgWatchPct: analysis.video.avgWatchPct,
    },
  };
}
