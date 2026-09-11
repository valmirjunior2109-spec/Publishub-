import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These packages resolve native binaries relative to `__dirname` at
  // runtime. They must stay external (unbundled) or Turbopack/webpack
  // rewrite `__dirname` and the binary path breaks.
  serverExternalPackages: ["ffmpeg-static", "ffprobe-static"],
};

export default nextConfig;
