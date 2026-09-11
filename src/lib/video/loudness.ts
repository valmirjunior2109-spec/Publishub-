import { execFile } from "node:child_process";
import { FFMPEG_PATH } from "./binaries";

export interface LoudnessResult {
  meanVolumeDb: number | null;
  maxVolumeDb: number | null;
}

const MEAN_RE = /mean_volume:\s*(-?[\d.]+)\s*dB/;
const MAX_RE = /max_volume:\s*(-?[\d.]+)\s*dB/;

export function detectLoudness(absolutePath: string, hasAudio: boolean): Promise<LoudnessResult> {
  if (!hasAudio) {
    return Promise.resolve({ meanVolumeDb: null, maxVolumeDb: null });
  }

  return new Promise((resolve, reject) => {
    const args = ["-i", absolutePath, "-af", "volumedetect", "-f", "null", "-"];

    const child = execFile(FFMPEG_PATH, args, { maxBuffer: 1024 * 1024 * 64 }, (error) => {
      if (error && !stderr) reject(error);
    });

    let stderr = "";
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", () => {
      const mean = MEAN_RE.exec(stderr);
      const max = MAX_RE.exec(stderr);
      resolve({
        meanVolumeDb: mean ? Number(mean[1]) : null,
        maxVolumeDb: max ? Number(max[1]) : null,
      });
    });
  });
}
