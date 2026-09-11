import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/db/client";
import { resolveStoragePath } from "@/lib/storage/local";
import { probeVideo, detectCuts, detectSilence, detectLoudness, parseCaptions, computeCaptionMetrics } from "@/lib/video";
import type { CaptionCue } from "@/lib/video";
import { getAIProvider } from "@/lib/ai";
import type { VideoMetrics } from "@/lib/ai/types";
import { getTranscriptionProvider } from "@/lib/transcription";

// The full pipeline for a single video: real signal extraction (ffmpeg)
// followed by an AI pass that turns those signals into recommendations.
// This runs in-process, right after upload — there's no job queue yet.
// That's a deliberate simplification for the MVP: `runAnalysisPipeline`
// is the single call site a real queue (BullMQ, etc.) would wrap later,
// so introducing one won't require touching anything upstream of it.

async function setStage(analysisId: string, stage: string) {
  await prisma.analysis.update({ where: { id: analysisId }, data: { stage } });
}

export async function runAnalysisPipeline(analysisId: string): Promise<void> {
  const analysis = await prisma.analysis.findUnique({ where: { id: analysisId }, include: { video: true } });
  if (!analysis) return;

  const { video } = analysis;
  const absoluteVideoPath = resolveStoragePath(video.filePath);

  try {
    await prisma.analysis.update({
      where: { id: analysisId },
      data: { status: "PROCESSING", stage: "Lendo metadados do vídeo", startedAt: new Date() },
    });

    const probe = await probeVideo(absoluteVideoPath);

    await prisma.video.update({
      where: { id: video.id },
      data: {
        durationSec: probe.durationSec,
        width: probe.width,
        height: probe.height,
        fps: probe.fps,
      },
    });

    await setStage(analysisId, "Detectando cortes e ritmo");
    const [cuts, silence, loudness] = await Promise.all([
      detectCuts(absoluteVideoPath, probe.durationSec),
      detectSilence(absoluteVideoPath, probe.durationSec, probe.hasAudio),
      detectLoudness(absoluteVideoPath, probe.hasAudio),
    ]);

    await setStage(analysisId, "Processando legendas");
    let cues: CaptionCue[] = [];
    let transcriptText: string | null = null;

    if (video.captionFilePath) {
      const captionContent = await readFile(resolveStoragePath(video.captionFilePath), "utf-8");
      cues = parseCaptions(captionContent);
      transcriptText = cues.map((c) => c.text).join(" ");
    } else {
      const transcription = getTranscriptionProvider();
      if (transcription.isConfigured) {
        try {
          const result = await transcription.transcribe(absoluteVideoPath);
          if (result) {
            cues = result.segments.map((s) => ({ start: s.start, end: s.end, text: s.text }));
            transcriptText = result.text;
          }
        } catch (err) {
          console.error("[pipeline] automatic transcription failed, continuing without captions:", err);
        }
      }
    }

    const captionMetrics = cues.length > 0 ? computeCaptionMetrics(cues, probe.durationSec) : null;

    const metrics: VideoMetrics = {
      durationSec: probe.durationSec,
      width: probe.width,
      height: probe.height,
      fps: probe.fps,
      cuts: { count: cuts.count, perMinute: cuts.perMinute, firstCutSec: cuts.firstCutSec },
      silence: {
        totalSilenceSec: silence.totalSilenceSec,
        silencePct: silence.silencePct,
        longestSilenceSec: silence.longestSilenceSec,
        segmentCount: silence.segments.length,
      },
      loudness: { meanVolumeDb: loudness.meanVolumeDb, maxVolumeDb: loudness.maxVolumeDb },
      captions: captionMetrics
        ? {
            present: true,
            cueCount: captionMetrics.cueCount,
            avgCharsPerSecond: captionMetrics.avgCharsPerSecond,
            coveragePct: captionMetrics.coveragePct,
            longGapCount: captionMetrics.longGapCount,
            overlapCount: captionMetrics.overlapCount,
          }
        : null,
      context: {
        platform: video.platform,
        views: video.views,
        avgWatchPct: video.avgWatchPct,
      },
    };

    await prisma.analysis.update({
      where: { id: analysisId },
      data: { status: "ANALYZING", stage: "Gerando recomendações com IA", metricsJson: JSON.stringify(metrics) },
    });

    const aiProvider = getAIProvider();
    const result = await aiProvider.analyze(metrics, transcriptText);

    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: "DONE",
        stage: null,
        resultJson: JSON.stringify(result),
        aiProvider: result.provider,
        overallScore: result.overallScore,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    console.error(`[pipeline] analysis ${analysisId} failed:`, error);
    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: "FAILED",
        stage: null,
        error: error instanceof Error ? error.message : "Erro desconhecido durante o processamento.",
      },
    });
  }
}
