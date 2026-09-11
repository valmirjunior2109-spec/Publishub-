// Shared contract between the video-processing pipeline and any AI
// provider. Keeping this decoupled from ffmpeg/Prisma specifics is what
// lets a new provider (a different model, a fine-tuned one, a future
// in-house model) be dropped in later without touching the rest of the app.

export interface VideoMetrics {
  durationSec: number;
  width: number | null;
  height: number | null;
  fps: number | null;
  cuts: {
    count: number;
    perMinute: number;
    firstCutSec: number | null;
  };
  silence: {
    totalSilenceSec: number;
    silencePct: number;
    longestSilenceSec: number;
    segmentCount: number;
  };
  loudness: {
    meanVolumeDb: number | null;
    maxVolumeDb: number | null;
  };
  captions: {
    present: boolean;
    cueCount: number;
    avgCharsPerSecond: number;
    coveragePct: number;
    longGapCount: number;
    overlapCount: number;
  } | null;
  // Optional, user-supplied performance context. Never required for an
  // analysis to run; when present it lets a provider tailor advice
  // (e.g. "your retention data confirms this hook is underperforming").
  context: {
    platform: string | null;
    views: number | null;
    avgWatchPct: number | null;
  };
}

export type AnalysisCategoryKey = "hook" | "pacing" | "silence" | "captions" | "audio";

export interface AnalysisCategory {
  key: AnalysisCategoryKey;
  label: string;
  score: number; // 0-100
  summary: string;
  recommendations: string[];
}

export interface AnalysisResult {
  overallScore: number;
  headline: string;
  categories: AnalysisCategory[];
  provider: string;
}

export interface AIProvider {
  name: string;
  analyze(metrics: VideoMetrics, transcriptText: string | null): Promise<AnalysisResult>;
}
