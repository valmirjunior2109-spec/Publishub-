import { NullTranscriptionProvider } from "./null-provider";
import { OpenAIWhisperProvider } from "./openai-provider";
import type { TranscriptionProvider } from "./types";

export type { TranscriptionProvider, TranscriptionResult, TranscriptSegment } from "./types";

export function getTranscriptionProvider(): TranscriptionProvider {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    return new OpenAIWhisperProvider(apiKey, process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1");
  }
  return new NullTranscriptionProvider();
}
