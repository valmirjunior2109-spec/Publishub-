import { execFile } from "node:child_process";
import { FFMPEG_PATH } from "./binaries";

export interface CutsResult {
  timestamps: number[];
  count: number;
  perMinute: number;
  firstCutSec: number | null;
}

// A scene-change score above this threshold (ffmpeg's `scene` metric, 0-1)
// is treated as a hard cut. 0.4 is a well-established middle ground: high
// enough to ignore camera shake/motion, low enough to catch real cuts.
const SCENE_THRESHOLD = 0.4;
const PTS_TIME_RE = /pts_time:([\d.]+)/g;

export function detectCuts(absolutePath: string, durationSec: number): Promise<CutsResult> {
  return new Promise((resolve, reject) => {
    const args = [
      "-i",
      absolutePath,
      "-filter:v",
      `select='gt(scene,${SCENE_THRESHOLD})',showinfo`,
      "-f",
      "null",
      "-",
    ];

    const child = execFile(FFMPEG_PATH, args, { maxBuffer: 1024 * 1024 * 64 }, (error) => {
      // ffmpeg with `-f null` exits non-zero on some inputs even when it
      // produced usable stderr output; we only bail out if we truly got
      // nothing to parse (handled by the caller via the resolved value).
      if (error && !stderr) {
        reject(error);
      }
    });

    let stderr = "";
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", () => {
      const timestamps: number[] = [];
      let match: RegExpExecArray | null;
      PTS_TIME_RE.lastIndex = 0;
      while ((match = PTS_TIME_RE.exec(stderr)) !== null) {
        timestamps.push(Number(match[1]));
      }

      const minutes = durationSec / 60;
      resolve({
        timestamps,
        count: timestamps.length,
        perMinute: minutes > 0 ? timestamps.length / minutes : 0,
        firstCutSec: timestamps.length > 0 ? timestamps[0] : null,
      });
    });
  });
}
