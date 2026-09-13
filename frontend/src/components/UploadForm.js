"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import { MAX_UPLOAD_BYTES, uploadVideo, validateVideoFile } from "@/lib/upload";
import { useApiErrorHandler } from "@/lib/useApiErrorHandler";
import styles from "./UploadForm.module.css";

// idle → uploading (Storage) → registering (backend) → redirect to the analysis page
export default function UploadForm({ session }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const uploadRef = useRef(null);
  const handleApiError = useApiErrorHandler();
  const [file, setFile] = useState(null);
  const [phase, setPhase] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(true);

  useEffect(() => {
    apiFetch("/api/health")
      .then((health) => setAiConfigured(health.ai_configured))
      .catch(() => {});
  }, []);

  const busy = phase === "uploading" || phase === "registering";

  function pick(candidate) {
    if (!candidate || busy) return;
    const problem = validateVideoFile(candidate);
    setError(problem);
    setFile(problem ? null : candidate);
  }

  async function submit() {
    if (!file) return;
    setError(null);
    setProgress(0);
    setPhase("uploading");

    try {
      const upload = uploadVideo({ file, userId: session.user.id, accessToken: session.access_token, onProgress: setProgress });
      uploadRef.current = upload;
      const { path } = await upload.promise;

      setPhase("registering");
      const created = await apiFetch("/api/videos", { method: "POST", body: { storage_path: path, filename: file.name } });
      router.push(`/analysis/${created.analysis.id}`);
    } catch (err) {
      if (await handleApiError(err)) return;
      setError(err.message);
      setPhase("idle");
    }
  }

  return (
    <div className="card stack">
      {!aiConfigured && (
        <p className="alert alert-warning">
          A análise por IA ainda não foi configurada neste servidor. Você pode enviar o vídeo, mas a análise não será
          concluída até a IA ser configurada.
        </p>
      )}

      {file ? (
        <div className={styles.selected}>
          <div>
            <p className={styles.fileName}>{file.name}</p>
            <p className="muted small">{formatBytes(file.size)}</p>
          </div>
          {!busy && (
            <button type="button" className="btn btn-ghost" onClick={() => setFile(null)}>
              Trocar
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          className={`${styles.dropzone} ${dragging ? styles.dragging : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files?.[0]);
          }}
        >
          <strong>Arraste o vídeo aqui ou clique para escolher</strong>
          <span className="muted small">MP4, MOV ou WEBM · até {MAX_UPLOAD_BYTES / 1024 / 1024} MB</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        hidden
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {phase === "uploading" && (
        <div className="stack" aria-live="polite">
          <div className={styles.progressLabel}>
            <span>Enviando vídeo…</span>
            <span className="muted">{Math.round(progress * 100)}%</span>
          </div>
          <div className="progress">
            <div style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        </div>
      )}
      {phase === "registering" && (
        <p className={styles.progressLabel} aria-live="polite">
          <span className="spinner spinner-small" /> Vídeo enviado. Iniciando a análise…
        </p>
      )}

      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}

      <div className={styles.actions}>
        <button type="button" className="btn btn-primary" disabled={!file || busy} onClick={submit}>
          {busy && <span className="spinner spinner-small" />}
          Analisar vídeo
        </button>
        {phase === "uploading" && (
          <button type="button" className="btn btn-ghost" onClick={() => uploadRef.current?.abort()}>
            Cancelar envio
          </button>
        )}
      </div>
    </div>
  );
}
