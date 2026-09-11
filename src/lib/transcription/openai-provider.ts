import { readFile } from "node:fs/promises";
import path from "node:path";
import type { TranscriptionProvider, TranscriptionResult } from "./types";

// Optional automatic transcription via OpenAI's Whisper API. Disabled
// unless OPENAI_API_KEY is set (see getTranscriptionProvider()). Sending
// media to this API is subject to OpenAI's own data-use terms, which is
// exactly why this stays opt-in rather than on by default.
//
// Note: the Whisper API caps uploads at 25MB — fine for short-form
// content, but longer/larger source files should have a caption file
// uploaded manually instead until a chunking strategy is worth building.
const MAX_WHISPER_BYTES = 25 * 1024 * 1024;

interface WhisperSegment {
  start: number;
  end: number;
  text: string;
}

interface WhisperVerboseResponse {
  text: string;
  segments?: WhisperSegment[];
}

export class OpenAIWhisperProvider implements TranscriptionProvider {
  name = "openai-whisper";
  isConfigured = true;

  constructor(private apiKey: string, private model: string = "whisper-1") {}

  async transcribe(absoluteMediaPath: string): Promise<TranscriptionResult | null> {
    const buffer = await readFile(absoluteMediaPath);
    if (buffer.byteLength > MAX_WHISPER_BYTES) {
      console.warn(
        `[openai-whisper] file too large (${buffer.byteLength} bytes) for automatic transcription; skipping.`
      );
      return null;
    }

    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(buffer)]), path.basename(absoluteMediaPath));
    form.append("model", this.model);
    form.append("response_format", "verbose_json");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(`OpenAI transcription failed (${response.status}): ${errorBody}`);
    }

    const data = (await response.json()) as WhisperVerboseResponse;

    return {
      text: data.text ?? "",
      segments: (data.segments ?? []).map((s) => ({ start: s.start, end: s.end, text: s.text.trim() })),
    };
  }
}
