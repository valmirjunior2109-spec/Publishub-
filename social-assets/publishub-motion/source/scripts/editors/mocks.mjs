// Mocks da API para as capturas do Reel: globalThis.REEL_STATE = "pending" | "processing" | "done".
// O exemplo é o da landing ("30 dias sem café"); os cortes e o vídeo editado seguem o mesmo vídeo.
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import base, { analysis as orig } from "./mocks-base.mjs";
const here = dirname(fileURLToPath(import.meta.url));
const IMPACT = [9, 7, 6, 5, 4];
const analysis = { ...orig, video: { ...orig.video, hypothesis: null }, result: { ...orig.result, hypothesis: null,
  copilot: { ...orig.result.copilot, recommendations: orig.result.copilot.recommendations.map((r, i) => ({ ...r, impact: IMPACT[i] })) } } };
const now = "2026-10-20T14:00:00Z";
const suggested = [
  { index: 0, start_seconds: 0, end_seconds: 4, reason: "dead_start", source: "ai", title: "Open with the result", why: "The first 4 seconds are context; 26% of viewers leave before the point.", params: { seconds: 4 }, confidence: "high", evidence: { silence_pct: 12, speech_pct: 88 } },
  { index: 1, start_seconds: 14, end_seconds: 17.5, reason: "repetition", source: "ai", title: "Trim the repeated sentence", why: "It repeats what you said at 0:09.", params: {}, confidence: "high", evidence: { silence_pct: 8, speech_pct: 92 } },
  { index: 2, start_seconds: 28, end_seconds: 29.8, reason: "long_pause", source: "ai", title: "Shorten the pause", why: "1.8s of silence before the last tip. Long pauses near the end push people to swipe.", params: { seconds: 1.8 }, confidence: "high", evidence: { silence_pct: 100, speech_pct: 0 } },
];
const cuts = suggested.map((s) => ({ start_seconds: s.start_seconds, end_seconds: s.end_seconds }));
const doneEdit = { analysis_id: "a1", status: "completed", source: "manual", revision: 1, instruction: null, reply: null, feedback: null, feedback_note: null, feedback_at: null, cuts,
  kept: [{ start_seconds: 4, end_seconds: 14 }, { start_seconds: 17.5, end_seconds: 28 }, { start_seconds: 29.8, end_seconds: 41 }],
  removed_seconds: 9.3, duration_seconds: 31.7, original_duration_seconds: 41, size_bytes: 31_000_000, error_code: null, download_url: null, created_at: now };
const processing = { ...analysis, status: "processing", step: "diagnosing", result: null };
export default {
  ...base,
  "/sample.mp4": { __file: join(here, "../../../publishub-demo-en.mp4") },
  "/api/analyses/a1/edit": () => globalThis.REEL_STATE === "done" ? { edit: doneEdit, suggested, decisions: suggested.map((s) => ({ index: s.index, decision: "accepted", start_seconds: s.start_seconds, end_seconds: s.end_seconds, adjusted: false })) } : { edit: null, suggested, decisions: [] },
  "/api/analyses/a1": () => globalThis.REEL_STATE === "processing" ? processing : analysis,
};
