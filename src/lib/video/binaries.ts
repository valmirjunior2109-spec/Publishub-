// Resolves the ffmpeg/ffprobe binaries bundled via npm (ffmpeg-static /
// ffprobe-static). This means video analysis works out of the box with
// `npm install` — no system package manager, no Docker image, no manual
// setup on the host machine.
import ffmpegPath from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";

if (!ffmpegPath) {
  throw new Error(
    "ffmpeg-static did not resolve a binary for this platform. " +
      "Video analysis cannot run without it."
  );
}

export const FFMPEG_PATH: string = ffmpegPath;
export const FFPROBE_PATH: string = ffprobeStatic.path;
