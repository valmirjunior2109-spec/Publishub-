import { UploadForm } from "@/components/upload/upload-form";

export default function NewAnalysisPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-16 sm:px-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Nova análise</h1>
        <p className="text-sm text-muted sm:text-base">
          Envie o vídeo que você pretende publicar. Legendas e métricas de desempenho são opcionais, mas deixam a
          análise ainda mais precisa.
        </p>
      </div>
      <UploadForm />
    </div>
  );
}
