export interface CaptionCue {
  start: number;
  end: number;
  text: string;
}

export interface CaptionMetrics {
  cueCount: number;
  avgCharsPerSecond: number;
  coveragePct: number; // % of video duration that has a caption on screen
  longGapCount: number; // gaps between cues longer than LONG_GAP_SEC while there's audio
  overlapCount: number; // cues that overlap each other (bad sync)
}

const LONG_GAP_SEC = 4;

function timeToSeconds(time: string): number {
  // Supports "HH:MM:SS,mmm" (SRT) and "HH:MM:SS.mmm" (VTT)
  const normalized = time.trim().replace(",", ".");
  const parts = normalized.split(":").map(Number);
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return h * 3600 + m * 60 + s;
  }
  if (parts.length === 2) {
    const [m, s] = parts;
    return m * 60 + s;
  }
  return Number(normalized) || 0;
}

const TIME_RANGE_RE = /([\d:.,]+)\s*-->\s*([\d:.,]+)/;

export function parseCaptions(content: string): CaptionCue[] {
  const lines = content.replace(/\r/g, "").split("\n");
  const cues: CaptionCue[] = [];

  let i = 0;
  while (i < lines.length) {
    const match = TIME_RANGE_RE.exec(lines[i]);
    if (match) {
      const start = timeToSeconds(match[1]);
      const end = timeToSeconds(match[2]);
      const textLines: string[] = [];
      i += 1;
      while (i < lines.length && lines[i].trim() !== "") {
        textLines.push(lines[i].replace(/<[^>]+>/g, "").trim());
        i += 1;
      }
      const text = textLines.join(" ").trim();
      if (text) cues.push({ start, end, text });
    }
    i += 1;
  }

  return cues.sort((a, b) => a.start - b.start);
}

export function computeCaptionMetrics(cues: CaptionCue[], durationSec: number): CaptionMetrics {
  if (cues.length === 0) {
    return { cueCount: 0, avgCharsPerSecond: 0, coveragePct: 0, longGapCount: 0, overlapCount: 0 };
  }

  let totalChars = 0;
  let totalCueDuration = 0;
  let coveredSec = 0;
  let longGapCount = 0;
  let overlapCount = 0;

  for (let idx = 0; idx < cues.length; idx += 1) {
    const cue = cues[idx];
    const cueDuration = Math.max(cue.end - cue.start, 0.01);
    totalChars += cue.text.length;
    totalCueDuration += cueDuration;
    coveredSec += cueDuration;

    const next = cues[idx + 1];
    if (next) {
      const gap = next.start - cue.end;
      if (gap > LONG_GAP_SEC) longGapCount += 1;
      if (gap < 0) overlapCount += 1;
    }
  }

  return {
    cueCount: cues.length,
    avgCharsPerSecond: totalCueDuration > 0 ? totalChars / totalCueDuration : 0,
    coveragePct: durationSec > 0 ? Math.min((coveredSec / durationSec) * 100, 100) : 0,
    longGapCount,
    overlapCount,
  };
}
