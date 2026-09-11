import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { HeuristicAIProvider } from "./heuristic-provider";
import type { AIProvider, AnalysisCategory, AnalysisCategoryKey, AnalysisResult, VideoMetrics } from "./types";

// Optional enrichment provider. It never talks to Claude about raw video —
// only the objective metrics ffmpeg already computed (plus an optional
// transcript) are sent, so recommendations stay grounded in real numbers
// instead of the model guessing. The heuristic provider's output is always
// computed first and used both as grounding context and as the fallback
// if the API call or response parsing fails for any reason, so an
// analysis never breaks just because the AI call had a hiccup.
//
// Per Publishub's privacy commitment, this data is sent only to generate
// this one analysis — it is not used to train any model, ours or anyone
// else's.

const categorySchema = z.object({
  key: z.enum(["hook", "pacing", "silence", "captions", "audio"]),
  label: z.string(),
  score: z.number().min(0).max(100),
  summary: z.string(),
  recommendations: z.array(z.string()),
});

const resultSchema = z.object({
  overallScore: z.number().min(0).max(100),
  headline: z.string(),
  categories: z.array(categorySchema),
});

const SUBMIT_ANALYSIS_TOOL: Anthropic.Tool = {
  name: "submit_analysis",
  description: "Submit the refined video editing analysis.",
  input_schema: {
    type: "object",
    properties: {
      overallScore: { type: "number" },
      headline: { type: "string" },
      categories: {
        type: "array",
        items: {
          type: "object",
          properties: {
            key: { type: "string", enum: ["hook", "pacing", "silence", "captions", "audio"] },
            label: { type: "string" },
            score: { type: "number" },
            summary: { type: "string" },
            recommendations: { type: "array", items: { type: "string" } },
          },
          required: ["key", "label", "score", "summary", "recommendations"],
        },
      },
    },
    required: ["overallScore", "headline", "categories"],
  },
};

function buildPrompt(metrics: VideoMetrics, baseline: AnalysisResult, transcriptText: string | null): string {
  return `Você é um editor de vídeo sênior atuando como copiloto de criadores de conteúdo dentro do produto Publishub.

Abaixo estão métricas objetivas extraídas automaticamente do vídeo (via ffmpeg) e uma análise heurística preliminar. Sua tarefa é refinar essa análise: melhore a qualidade e especificidade das explicações e recomendações em português, mantendo-as estritamente fundamentadas nos números fornecidos. Não invente informações que não podem ser inferidas das métricas ou do transcript.

Você pode ajustar as notas (score de 0 a 100) em até 10 pontos para cima ou para baixo em relação à análise heurística, caso o contexto (transcript, métricas combinadas) justifique. Não crie categorias novas nem remova nenhuma das cinco existentes.

MÉTRICAS:
${JSON.stringify(metrics, null, 2)}

ANÁLISE HEURÍSTICA PRELIMINAR:
${JSON.stringify(baseline, null, 2)}

${transcriptText ? `TRANSCRIÇÃO/LEGENDAS:\n${transcriptText.slice(0, 6000)}` : "Nenhuma transcrição disponível."}

Responda chamando a ferramenta submit_analysis com as 5 categorias (hook, pacing, silence, captions, audio).`;
}

export class AnthropicAIProvider implements AIProvider {
  name = "anthropic";
  private client: Anthropic;
  private model: string;
  private fallback = new HeuristicAIProvider();

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async analyze(metrics: VideoMetrics, transcriptText: string | null): Promise<AnalysisResult> {
    const baseline = await this.fallback.analyze(metrics, transcriptText);

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 2048,
        tools: [SUBMIT_ANALYSIS_TOOL],
        tool_choice: { type: "tool", name: "submit_analysis" },
        messages: [{ role: "user", content: buildPrompt(metrics, baseline, transcriptText) }],
      });

      const toolUse = response.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );
      if (!toolUse) throw new Error("Claude did not return a tool_use block");

      const parsed = resultSchema.parse(toolUse.input);

      // Guarantee all 5 categories always exist, even if the model omitted
      // one — fall back to the heuristic category for anything missing.
      const byKey = new Map(parsed.categories.map((c) => [c.key, c]));
      const categories: AnalysisCategory[] = baseline.categories.map((base) => {
        const refined = byKey.get(base.key as AnalysisCategoryKey);
        return refined ? { ...refined, key: base.key } : base;
      });

      return {
        overallScore: Math.round(parsed.overallScore),
        headline: parsed.headline,
        categories,
        provider: this.name,
      };
    } catch (error) {
      console.error("[anthropic-provider] falling back to heuristic analysis:", error);
      return baseline;
    }
  }
}
