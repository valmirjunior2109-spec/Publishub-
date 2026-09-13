import { STORAGE_BUCKET, supabasePublicKey, supabaseUrl } from "./supabase";

export const ACCEPTED_TYPES = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

export const MAX_UPLOAD_BYTES = (Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB) || 50) * 1024 * 1024;

const TYPE_BY_EXTENSION = { mp4: "video/mp4", m4v: "video/mp4", mov: "video/quicktime", webm: "video/webm" };

/**
 * Alguns navegadores/sistemas entregam `file.type` vazio (ex.: .mov no Windows
 * sem QuickTime). Nesse caso inferimos pela extensão; o bucket e o backend
 * conferem o tipo de novo do lado deles.
 */
export function resolveVideoType(file) {
  if (file?.type && ACCEPTED_TYPES[file.type]) return file.type;
  const extension = (file?.name || "").split(".").pop().toLowerCase();
  return TYPE_BY_EXTENSION[extension] || file?.type || "";
}

/** Client-side checks for a fast answer; the backend and the bucket re-check everything. */
export function validateVideoFile(file) {
  if (!file) return "Selecione um vídeo.";
  if (!ACCEPTED_TYPES[resolveVideoType(file)]) return "Formato não suportado. Envie um vídeo MP4, MOV ou WEBM.";
  if (file.size === 0) return "O arquivo está vazio.";
  if (file.size > MAX_UPLOAD_BYTES) {
    return `O vídeo tem ${(file.size / 1024 / 1024).toFixed(1)} MB e o limite é ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`;
  }
  return null;
}

/**
 * Uploads straight to Supabase Storage (private bucket, into the user's own
 * folder — enforced by the Storage policies). Uses XMLHttpRequest because
 * fetch has no upload progress events.
 */
export function uploadVideo({ file, userId, accessToken, onProgress }) {
  const type = resolveVideoType(file);
  const path = `${userId}/${crypto.randomUUID()}.${ACCEPTED_TYPES[type]}`;
  const xhr = new XMLHttpRequest();

  const promise = new Promise((resolve, reject) => {
    xhr.open("POST", `${supabaseUrl()}/storage/v1/object/${STORAGE_BUCKET}/${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("apikey", supabasePublicKey());
    xhr.setRequestHeader("Content-Type", type);
    xhr.setRequestHeader("x-upsert", "false");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve({ path });
      let message = "Não foi possível enviar o vídeo. Tente novamente.";
      try {
        const body = JSON.parse(xhr.responseText);
        const text = `${body.statusCode ?? ""} ${body.error ?? ""} ${body.message ?? ""}`.toLowerCase();
        if (text.includes("413") || text.includes("too large") || text.includes("maximum allowed size")) {
          message = `O vídeo passa do limite de ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`;
        } else if (text.includes("mime") || text.includes("invalid_mime_type")) {
          message = "Formato não suportado. Envie um vídeo MP4, MOV ou WEBM.";
        } else if (xhr.status === 401 || xhr.status === 403 || text.includes("jwt")) {
          message = "Sua sessão expirou. Entre novamente para enviar o vídeo.";
        }
      } catch {
        // non-JSON error body
      }
      reject(new Error(message));
    };
    xhr.onerror = () => reject(new Error("A conexão caiu durante o envio. Verifique sua internet e tente de novo."));
    xhr.onabort = () => reject(new Error("Envio cancelado."));
    xhr.send(file);
  });

  return { promise, abort: () => xhr.abort() };
}
