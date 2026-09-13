"use client";

import RequireAuth from "@/components/RequireAuth";
import UploadForm from "@/components/UploadForm";

export default function AnalyzePage() {
  return (
    <RequireAuth>
      {(session) => (
        <div className="container page">
          <div>
            <h1 className="page-title">Nova análise</h1>
            <p className="muted">Envie o vídeo que você pretende publicar. Você recebe as recomendações em poucos minutos.</p>
          </div>
          <UploadForm session={session} />
        </div>
      )}
    </RequireAuth>
  );
}
