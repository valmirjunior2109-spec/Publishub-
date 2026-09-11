import { HeuristicAIProvider } from "./heuristic-provider";
import { AnthropicAIProvider } from "./anthropic-provider";
import type { AIProvider } from "./types";

export type { AIProvider, AnalysisResult, AnalysisCategory, VideoMetrics } from "./types";

// Single place that decides which AI provider handles an analysis.
// Configured entirely through environment variables — swapping models or
// adding a new provider later never requires touching the pipeline code
// that calls getAIProvider().
export function getAIProvider(): AIProvider {
  const selected = process.env.AI_PROVIDER?.toLowerCase() ?? "heuristic";

  if (selected === "anthropic") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn(
        "[ai] AI_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set — falling back to the heuristic provider."
      );
      return new HeuristicAIProvider();
    }
    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
    return new AnthropicAIProvider(apiKey, model);
  }

  return new HeuristicAIProvider();
}
