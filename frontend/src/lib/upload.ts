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

/** Alguns sistemas entregam `file.type` vazio (ex.: .mov no Windows); a extensão decide. Sem nenhum dos dois, ver sniffVideoType. */
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

/**
 * O formato pelo começo do arquivo, quando o nome e o `file.type` não dizem nada
 * útil. Acontece no celular: o navegador embutido do Instagram e alguns
 * Androids entregam o vídeo da galeria sem extensão, com tipo vazio ou com um
 * tipo genérico (video/3gpp, video/x-m4v, application/octet-stream).
 *
 * MP4, MOV e 3GP são o mesmo contêiner (ISO BMFF, com "ftyp" no byte 4); o
 * ffmpeg do backend lê todos. WebM começa com a assinatura do EBML.
 */
export async function sniffVideoType(file: File): Promise<string | null> {
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  } catch {
    return null;
  }
  if (bytes.length < 12) return null;
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return "video/webm";
  const box = String.fromCharCode(...bytes.slice(4, 8));
  if (box === "ftyp") return String.fromCharCode(...bytes.slice(8, 12)) === "qt  " ? "video/quicktime" : "video/mp4";
  // QuickTime antigo, sem ftyp: o arquivo já abre num desses átomos
  if (["moov", "mdat", "wide", "free", "skip", "pnot"].includes(box)) return "video/quicktime";
  return null;
}

export type VideoProblem = "missing" | "type" | "empty" | "size";

export interface CheckedVideo {
  /** O arquivo a enviar: o mesmo, com o tipo certo quando ele veio sem (nada é copiado). */
  file: File | null;
  problem: VideoProblem | null;
  /** Passa do limite, mas o navegador consegue comprimir antes de enviar. */
  needsCompression: boolean;
}

/**
 * Confere o vídeo escolhido. O tipo vem do nome ou do `file.type`; se nenhum dos
 * dois servir, do conteúdo. Acima do limite, só é problema quando o navegador
 * não consegue comprimir (ver compressVideo.ts).
 */
export async function checkVideo(file: File | null, canCompress: boolean): Promise<CheckedVideo> {
  if (!file) return { file: null, problem: "missing", needsCompression: false };
  if (file.size === 0) return { file: null, problem: "empty", needsCompression: false };
  let checked = file;
  if (!VIDEO_TYPES[resolveType(file)]) {
    const sniffed = await sniffVideoType(file);
    if (!sniffed) return { file: null, problem: "type", needsCompression: false };
    const name = /\.[a-z0-9]{2,4}$/i.test(file.name) ? file.name.replace(/\.[^.]+$/, `.${VIDEO_TYPES[sniffed]}`) : `${file.name || "video"}.${VIDEO_TYPES[sniffed]}`;
    checked = new File([file], name, { type: sniffed, lastModified: file.lastModified });
  }
  if (checked.size > MAX_VIDEO_BYTES) {
    return canCompress ? { file: checked, problem: null, needsCompression: true } : { file: null, problem: "size", needsCompression: false };
  }
  return { file: checked, problem: null, needsCompression: false };
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

function failureFrom(xhr: XMLHttpRequest): UploadFailure {
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
  return reason;
}

/**
 * Envio do convidado: a URL vem assinada pelo backend, então não há token de
 * sessão nem pasta do usuário — o caminho já está dentro da URL.
 */
export function uploadToSignedUrl({ file, url, onProgress }: { file: File; url: string; onProgress?: (fraction: number) => void }): UploadHandle {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<{ path: string }>((resolve, reject) => {
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", resolveType(file) || file.type || "application/octet-stream");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve({ path: url }) : reject(new UploadError(failureFrom(xhr))));
    xhr.onerror = () => reject(new UploadError("network"));
    xhr.onabort = () => reject(new UploadError("aborted"));
    xhr.send(file);
  });
  return { promise, abort: () => xhr.abort() };
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
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve({ path }) : reject(new UploadError(failureFrom(xhr))));
    xhr.onerror = () => reject(new UploadError("network"));
    xhr.onabort = () => reject(new UploadError("aborted"));
    xhr.send(file);
  });

  return { promise, abort: () => xhr.abort() };
}
