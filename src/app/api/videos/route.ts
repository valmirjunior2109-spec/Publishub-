import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { saveVideoFile, saveCaptionFile } from "@/lib/storage/local";
import { runAnalysisPipeline } from "@/lib/analysis/pipeline";

// ffmpeg (child_process) and the filesystem require the Node.js runtime.
export const runtime = "nodejs";

const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-matroska", "video/mpeg"];
const ACCEPTED_CAPTION_EXTENSIONS = [".srt", ".vtt"];

function maxUploadBytes(): number {
  const mb = Number(process.env.MAX_UPLOAD_MB) || 500;
  return mb * 1024 * 1024;
}

function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const videoFile = formData.get("video");
  const captionFile = formData.get("captions");
  const platform = formData.get("platform");
  const views = formData.get("views");
  const avgWatchPct = formData.get("avgWatchPct");

  if (!(videoFile instanceof File) || videoFile.size === 0) {
    return NextResponse.json({ error: "Envie um arquivo de vídeo." }, { status: 400 });
  }

  if (videoFile.size > maxUploadBytes()) {
    return NextResponse.json(
      { error: `O vídeo excede o limite de ${process.env.MAX_UPLOAD_MB || 500}MB para esta versão.` },
      { status: 413 }
    );
  }

  if (videoFile.type && !ACCEPTED_VIDEO_TYPES.includes(videoFile.type)) {
    return NextResponse.json({ error: "Formato de vídeo não suportado. Use MP4, MOV, WEBM ou MKV." }, { status: 400 });
  }

  if (captionFile instanceof File && captionFile.size > 0) {
    const hasValidExtension = ACCEPTED_CAPTION_EXTENSIONS.some((ext) =>
      captionFile.name.toLowerCase().endsWith(ext)
    );
    if (!hasValidExtension) {
      return NextResponse.json({ error: "O arquivo de legenda deve ser .srt ou .vtt." }, { status: 400 });
    }
  }

  const videoId = randomUUID();
  const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
  const { relativePath: videoRelativePath } = await saveVideoFile(videoId, videoFile.name, videoBuffer);

  let captionRelativePath: string | null = null;
  let captionFileName: string | null = null;
  if (captionFile instanceof File && captionFile.size > 0) {
    const captionBuffer = Buffer.from(await captionFile.arrayBuffer());
    const saved = await saveCaptionFile(videoId, captionFile.name, captionBuffer);
    captionRelativePath = saved.relativePath;
    captionFileName = captionFile.name;
  }

  const video = await prisma.video.create({
    data: {
      id: videoId,
      fileName: videoFile.name,
      filePath: videoRelativePath,
      mimeType: videoFile.type || "application/octet-stream",
      fileSize: videoFile.size,
      captionFileName,
      captionFilePath: captionRelativePath,
      platform: typeof platform === "string" && platform.trim() ? platform.trim() : null,
      views: parseOptionalNumber(views) !== null ? Math.round(parseOptionalNumber(views)!) : null,
      avgWatchPct: parseOptionalNumber(avgWatchPct),
    },
  });

  const analysis = await prisma.analysis.create({
    data: { id: randomUUID(), videoId: video.id, status: "QUEUED" },
  });

  // Fire-and-forget: the client is redirected immediately and polls
  // GET /api/analyses/[id] for progress. See pipeline.ts for why this
  // isn't a real job queue yet.
  void runAnalysisPipeline(analysis.id);

  return NextResponse.json({ videoId: video.id, analysisId: analysis.id }, { status: 201 });
}
