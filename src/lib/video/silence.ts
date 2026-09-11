import { execFile } from "node:child_process";
import { FFMPEG_PATH } from "./binaries";

export interface SilenceSegment {
  start: number;
  end: number;
}

export interface SilenceResult {
  segments: SilenceSegment[];
  totalSilenceSec: number;
  silencePct: number;
  longestSilenceSec: number;
}

const NOISE_FLOOR_DB = "-30dB";
const MIN_SILENCE_SEC = 0.5;

const SILENCE_START_RE = /silence_start:\s*([\d.]+)/;
const SILENCE_END_RE = /silence_end:\s*([\d.]+)/;

export function detectSilence(absolutePath: string, durationSec: number, hasAudio: boolean): Promise<SilenceResult> {
  if (!hasAudio) {
    return Promise.resolve({ segments: [], totalSilenceSec: 0, silencePct: 0, longestSilenceSec: 0 });
  }

  return new Promise((resolve, reject) => {
    const args = [
      "-i",
      absolutePath,
      "-af",
      `silencedetect=noise=${NOISE_FLOOR_DB}:d=${MIN_SILENCE_SEC}`,
      "-f",
      "null",
      "-",
    ];

    const child = execFile(FFMPEG_PATH, args, { maxBuffer: 1024 * 1024 * 64 }, (error) => {
      if (error && !stderr) reject(error);
    });

    let stderr = "";
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", () => {
      const segments: SilenceSegment[] = [];
      let pendingStart: number | null = null;

      for (const line of stderr.split("\n")) {
        const startMatch = SILENCE_START_RE.exec(line);
        if (startMatch) {
          pendingStart = Number(startMatch[1]);
          continue;
        }
        const endMatch = SILENCE_END_RE.exec(line);
        if (endMatch && pendingStart !== null) {
          segments.push({ start: pendingStart, end: Number(endMatch[1]) });
          pendingStart = null;
        }
      }

      const totalSilenceSec = segments.reduce((sum, s) => sum + (s.end - s.start), 0);
      const longestSilenceSec = segments.reduce((max, s) => Math.max(max, s.end - s.start), 0);

      resolve({
        segments,
        totalSilenceSec,
        silencePct: durationSec > 0 ? (totalSilenceSec / durationSec) * 100 : 0,
        longestSilenceSec,
      });
    });
  });
}
