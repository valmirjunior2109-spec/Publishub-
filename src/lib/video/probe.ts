import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { FFPROBE_PATH } from "./binaries";

const execFileAsync = promisify(execFile);

export interface ProbeResult {
  durationSec: number;
  width: number | null;
  height: number | null;
  fps: number | null;
  hasAudio: boolean;
}

interface FfprobeStream {
  codec_type: string;
  width?: number;
  height?: number;
  r_frame_rate?: string;
  avg_frame_rate?: string;
}

interface FfprobeFormat {
  duration?: string;
}

interface FfprobeOutput {
  streams: FfprobeStream[];
  format: FfprobeFormat;
}

function parseFrameRate(rate: string | undefined): number | null {
  if (!rate) return null;
  const [num, den] = rate.split("/").map(Number);
  if (!den) return num || null;
  const fps = num / den;
  return Number.isFinite(fps) && fps > 0 ? fps : null;
}

export async function probeVideo(absolutePath: string): Promise<ProbeResult> {
  const { stdout } = await execFileAsync(FFPROBE_PATH, [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    absolutePath,
  ]);

  const data = JSON.parse(stdout) as FfprobeOutput;
  const videoStream = data.streams.find((s) => s.codec_type === "video");
  const audioStream = data.streams.find((s) => s.codec_type === "audio");

  return {
    durationSec: Number(data.format?.duration) || 0,
    width: videoStream?.width ?? null,
    height: videoStream?.height ?? null,
    fps: parseFrameRate(videoStream?.avg_frame_rate ?? videoStream?.r_frame_rate),
    hasAudio: Boolean(audioStream),
  };
}
