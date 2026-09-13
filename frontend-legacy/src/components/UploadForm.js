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
  const percent = Math.round(progress * 100);

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
    <div className={`card ${styles.card}`}>
      {!aiConfigured && (
        <p className="alert alert-warning">
          A análise por IA ainda não foi configurada neste servidor. Você pode enviar o vídeo, mas a análise não será
          concluída até a IA ser configurada.
        </p>
      )}

      {file ? (
        <div className={styles.selected}>
          <span className={styles.fileIcon} aria-hidden="true" />
          <div className={styles.fileInfo}>
            <p className={styles.fileName}>{file.name}</p>
            <p className="muted small">{formatBytes(file.size)}</p>
          </div>
          {!busy && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFile(null)}>
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
          <span className={styles.dropIcon} aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4" />
              <path d="m7 9 5-5 5 5" />
              <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
            </svg>
          </span>
          <strong className={styles.dropTitle}>Arraste o vídeo aqui ou clique para escolher</strong>
          <span className="muted small">MP4, MOV ou WEBM · até {MAX_UPLOAD_BYTES / 1024 / 1024} MB · até 10 minutos</span>
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
            <span className={styles.percent}>{percent}%</span>
          </div>
          <div className="progress">
            <div style={{ width: `${percent}%` }} />
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
        <button type="button" className="btn btn-primary btn-lg" disabled={!file || busy} onClick={submit}>
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
