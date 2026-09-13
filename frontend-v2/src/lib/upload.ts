import { INSIGHTS_BUCKET, VIDEOS_BUCKET, supabasePublicKey, supabaseUrl } from "./supabase";

export const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };
export const IMAGE_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

const TYPE_BY_EXTENSION: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export const MAX_VIDEO_BYTES = (Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB) || 50) * 1024 * 1024;
export const MAX_IMAGE_BYTES = (Number(process.env.NEXT_PUBLIC_MAX_IMAGE_MB) || 5) * 1024 * 1024;

export type UploadKind = "video" | "image";

/** Alguns sistemas entregam `file.type` vazio (ex.: .mov no Windows); a extensão decide. */
export function resolveType(file: File): string {
  if (file.type && (VIDEO_TYPES[file.type] || IMAGE_TYPES[file.type])) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return TYPE_BY_EXTENSION[extension] || file.type || "";
}

/** Código do problema (chave de mensagem) ou null. O bucket e o backend conferem de novo. */
export function validateFile(file: File | null, kind: UploadKind): "missing" | "type" | "empty" | "size" | null {
  if (!file) return "missing";
  const accepted = kind === "video" ? VIDEO_TYPES : IMAGE_TYPES;
  if (!accepted[resolveType(file)]) return "type";
  if (file.size === 0) return "empty";
  if (file.size > (kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)) return "size";
  return null;
}

interface UploadArgs {
  file: File;
  kind: UploadKind;
  userId: string;
  accessToken: string;
  onProgress?: (fraction: number) => void;
}

export interface UploadHandle {
  promise: Promise<{ path: string }>;
  abort: () => void;
}

export type UploadFailure = "size" | "type" | "session" | "network" | "aborted" | "unknown";

export class UploadError extends Error {
  reason: UploadFailure;
  constructor(reason: UploadFailure) {
    super(reason);
    this.reason = reason;
  }
}

/**
 * Sobe direto para o Supabase Storage, na pasta do próprio usuário (as
 * policies do bucket garantem isso). XMLHttpRequest porque fetch não tem
 * evento de progresso de upload.
 */
export function uploadFile({ file, kind, userId, accessToken, onProgress }: UploadArgs): UploadHandle {
  const type = resolveType(file);
  const extension = (kind === "video" ? VIDEO_TYPES : IMAGE_TYPES)[type];
  const bucket = kind === "video" ? VIDEOS_BUCKET : INSIGHTS_BUCKET;
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const xhr = new XMLHttpRequest();

  const promise = new Promise<{ path: string }>((resolve, reject) => {
    xhr.open("POST", `${supabaseUrl()}/storage/v1/object/${bucket}/${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("apikey", supabasePublicKey());
    xhr.setRequestHeader("Content-Type", type);
    xhr.setRequestHeader("x-upsert", "false");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve({ path });
      let reason: UploadFailure = "unknown";
      try {
        const body = JSON.parse(xhr.responseText);
        const text = `${body.statusCode ?? ""} ${body.error ?? ""} ${body.message ?? ""}`.toLowerCase();
        if (text.includes("413") || text.includes("too large") || text.includes("maximum allowed size")) reason = "size";
        else if (text.includes("mime") || text.includes("invalid_mime_type")) reason = "type";
        else if (xhr.status === 401 || xhr.status === 403 || text.includes("jwt")) reason = "session";
      } catch {
        // corpo de erro que não é JSON
      }
      reject(new UploadError(reason));
    };
    xhr.onerror = () => reject(new UploadError("network"));
    xhr.onabort = () => reject(new UploadError("aborted"));
    xhr.send(file);
  });

  return { promise, abort: () => xhr.abort() };
}
