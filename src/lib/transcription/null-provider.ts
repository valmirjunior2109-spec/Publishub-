import type { TranscriptionProvider, TranscriptionResult } from "./types";

// Default provider: no automatic transcription. Users can still get full
// captions analysis today by uploading a .srt/.vtt file manually — this
// only stands in for that step until an ASR provider is configured.
export class NullTranscriptionProvider implements TranscriptionProvider {
  name = "none";
  isConfigured = false;

  async transcribe(): Promise<TranscriptionResult | null> {
    return null;
  }
}
