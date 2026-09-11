"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, FileText, X } from "lucide-react";
import { VideoDropzone } from "./video-dropzone";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function UploadForm() {
  const router = useRouter();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [captionFile, setCaptionFile] = useState<File | null>(null);
  const [showMetrics, setShowMetrics] = useState(false);
  const [platform, setPlatform] = useState("");
  const [views, setViews] = useState("");
  const [avgWatchPct, setAvgWatchPct] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!videoFile) {
      setError("Selecione um vídeo para analisar.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append("video", videoFile);
    if (captionFile) formData.append("captions", captionFile);
    if (platform) formData.append("platform", platform);
    if (views) formData.append("views", views);
    if (avgWatchPct) formData.append("avgWatchPct", avgWatchPct);

    try {
      const response = await fetch("/api/videos", { method: "POST", body: formData });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Não foi possível iniciar a análise.");
        setIsSubmitting(false);
        return;
      }

      router.push(`/analysis/${data.analysisId}`);
    } catch {
      setError("Falha de conexão. Verifique sua rede e tente novamente.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <VideoDropzone file={videoFile} onChange={setVideoFile} />

      <div>
        {captionFile ? (
          <div className="flex items-center gap-3 rounded-card border border-border bg-surface-2 px-4 py-3">
            <FileText size={16} className="shrink-0 text-primary-strong" />
            <span className="min-w-0 flex-1 truncate text-sm text-foreground">{captionFile.name}</span>
            <button
              type="button"
              onClick={() => setCaptionFile(null)}
              className="text-muted hover:text-foreground"
              aria-label="Remover legenda"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted hover:text-foreground">
            <FileText size={16} />
            <span>
              Adicionar legenda (.srt/.vtt) — <span className="text-muted-2">opcional</span>
            </span>
            <input
              type="file"
              accept=".srt,.vtt"
              className="hidden"
              onChange={(e) => setCaptionFile(e.target.files?.[0] ?? null)}
            />
          </label>
        )}
      </div>

      <div className="rounded-card border border-border bg-surface">
        <button
          type="button"
          onClick={() => setShowMetrics((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <span className="text-sm font-medium text-foreground">
            Métricas de desempenho <span className="font-normal text-muted-2">(opcional)</span>
          </span>
          <ChevronDown size={16} className={cn("text-muted transition-transform", showMetrics && "rotate-180")} />
        </button>
        {showMetrics && (
          <div className="grid grid-cols-1 gap-4 border-t border-border px-5 py-5 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted">Plataforma</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="h-10 rounded-lg border border-border bg-surface-2 px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                <option value="">Não informar</option>
                <option value="tiktok">TikTok</option>
                <option value="instagram">Instagram Reels</option>
                <option value="youtube_shorts">YouTube Shorts</option>
                <option value="youtube">YouTube</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted">Visualizações</label>
              <input
                type="number"
                min={0}
                value={views}
                onChange={(e) => setViews(e.target.value)}
                placeholder="Ex: 12000"
                className="h-10 rounded-lg border border-border bg-surface-2 px-3 text-sm text-foreground placeholder:text-muted-2 focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted">Retenção média (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={avgWatchPct}
                onChange={(e) => setAvgWatchPct(e.target.value)}
                placeholder="Ex: 45"
                className="h-10 rounded-lg border border-border bg-surface-2 px-3 text-sm text-foreground placeholder:text-muted-2 focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
      )}

      <Button type="submit" size="lg" disabled={!videoFile || isSubmitting} className="w-full sm:w-auto sm:self-start">
        {isSubmitting ? "Enviando..." : "Analisar vídeo"}
      </Button>
    </form>
  );
}
