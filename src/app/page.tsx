import Link from "next/link";
import { Zap, Scissors, Captions, ArrowRight, Clock, AlertCircle } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { ButtonLink } from "@/components/ui/button";
import { Badge, scoreTone } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const VALUE_PILLARS = [
  {
    icon: Zap,
    title: "Hook e retenção",
    description: "Descubra se os primeiros segundos do seu vídeo prendem a atenção de quem assiste.",
  },
  {
    icon: Scissors,
    title: "Ritmo e cortes",
    description: "Veja se o ritmo da edição está dinâmico demais, devagar demais, ou no ponto certo.",
  },
  {
    icon: Captions,
    title: "Legendas e sincronização",
    description: "Avalie cobertura, velocidade de leitura e sincronia das suas legendas.",
  },
];

function statusLabel(status: string): { label: string; tone: "neutral" | "warning" | "danger" } {
  if (status === "FAILED") return { label: "Falhou", tone: "danger" };
  if (status === "DONE") return { label: "Concluída", tone: "neutral" };
  return { label: "Processando", tone: "warning" };
}

export default async function HomePage() {
  const recentAnalyses = await prisma.analysis.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
    include: { video: true },
  });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-20 px-4 pb-24 pt-16 sm:px-6 sm:pt-24">
      <section className="flex flex-col items-center gap-6 text-center">
        <Badge tone="primary">Copiloto de edição com IA</Badge>
        <h1 className="max-w-2xl text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Descubra o que ajustar na edição antes de publicar
        </h1>
        <p className="max-w-xl text-balance text-base text-muted sm:text-lg">
          O Publishub analisa cortes, ritmo, pausas, hook, legendas e áudio do seu vídeo e devolve recomendações
          objetivas para melhorar seu processo de edição — sem substituir o seu editor de vídeo.
        </p>
        <ButtonLink href="/new" size="lg" className="mt-2">
          Analisar meu vídeo
          <ArrowRight size={18} />
        </ButtonLink>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {VALUE_PILLARS.map(({ icon: Icon, title, description }) => (
          <div key={title} className="rounded-card border border-border bg-surface p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary-strong">
              <Icon size={18} />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
          </div>
        ))}
      </section>

      {recentAnalyses.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Análises recentes</h2>
          </div>
          <div className="flex flex-col divide-y divide-border rounded-card border border-border bg-surface">
            {recentAnalyses.map((analysis) => {
              const status = statusLabel(analysis.status);
              return (
                <Link
                  key={analysis.id}
                  href={`/analysis/${analysis.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-surface-2 sm:px-6"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {analysis.status === "FAILED" ? (
                      <AlertCircle size={16} className="shrink-0 text-danger" />
                    ) : (
                      <Clock size={16} className="shrink-0 text-muted-2" />
                    )}
                    <span className="truncate text-sm text-foreground">{analysis.video.fileName}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {analysis.overallScore !== null && (
                      <Badge tone={scoreTone(analysis.overallScore)}>{analysis.overallScore}/100</Badge>
                    )}
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
