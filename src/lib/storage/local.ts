import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";

// Local-disk storage for the MVP. Every function here is intentionally the
// entire surface a future StorageProvider (e.g. S3-compatible) would need
// to implement: save a file for a video, resolve it to an absolute path,
// delete it. Nothing else in the app should touch the filesystem directly.

export const STORAGE_ROOT = path.join(process.cwd(), "storage");
const VIDEOS_DIR = path.join(STORAGE_ROOT, "videos");

function sanitizeExtension(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  // Keep it short and predictable; reject anything that isn't a simple
  // alphanumeric extension to avoid path traversal via filenames.
  return /^\.[a-z0-9]{1,10}$/.test(ext) ? ext : "";
}

async function saveFile(videoId: string, kind: "source" | "captions", fileName: string, buffer: Buffer) {
  const dir = path.join(VIDEOS_DIR, videoId);
  await mkdir(dir, { recursive: true });
  const ext = sanitizeExtension(fileName);
  const targetName = `${kind}${ext}`;
  const absolutePath = path.join(dir, targetName);
  await writeFile(absolutePath, buffer);
  return {
    relativePath: path.relative(STORAGE_ROOT, absolutePath),
    absolutePath,
  };
}

export async function saveVideoFile(videoId: string, fileName: string, buffer: Buffer) {
  return saveFile(videoId, "source", fileName, buffer);
}

export async function saveCaptionFile(videoId: string, fileName: string, buffer: Buffer) {
  return saveFile(videoId, "captions", fileName, buffer);
}

export function resolveStoragePath(relativePath: string): string {
  return path.join(STORAGE_ROOT, relativePath);
}

export async function deleteVideoStorage(videoId: string) {
  const dir = path.join(VIDEOS_DIR, videoId);
  await rm(dir, { recursive: true, force: true });
}
