export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptSegment[];
}

export interface TranscriptionProvider {
  name: string;
  isConfigured: boolean;
  transcribe(absoluteMediaPath: string): Promise<TranscriptionResult | null>;
}
