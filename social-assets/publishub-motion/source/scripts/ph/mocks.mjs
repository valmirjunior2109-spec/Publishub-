// Mocks da API para as capturas do demo do Product Hunt. globalThis.PH_STATE escolhe o estado:
//   "received" | "transcribing" | "aligning" | "diagnosing"  → análise em andamento (etapas reais)
//   "pending"  → pronta, cortes sugeridos para revisar
//   "done"     → os 3 cortes aplicados, vídeo editado pronto
// A análise é o exemplo da landing ("30 days without coffee"), com a conta num plano pago (vê tudo).
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import base, { analysis as orig } from "./mocks-base.mjs";
const here = dirname(fileURLToPath(import.meta.url));
const now = "2026-10-20T14:00:00Z";
const IMPACT = [9, 7, 6, 5, 4];
const analysis = {
  ...orig,
  video: { ...orig.video, filename: "client_cut_v7_FINAL.mp4", hypothesis: null },
  result: { ...orig.result, hypothesis: null, copilot: { ...orig.result.copilot, recommendations: orig.result.copilot.recommendations.map((r, i) => ({ ...r, impact: IMPACT[i] })) } },
};
const suggested = [
  { index: 0, start_seconds: 0, end_seconds: 4, reason: "dead_start", source: "ai", title: "Open with the result", why: "The first 4 seconds are context; 26% of viewers leave before the point.", params: { seconds: 4 }, confidence: "high", evidence: { silence_pct: 12, speech_pct: 88 }, merged: [] },
  { index: 1, start_seconds: 14, end_seconds: 17.5, reason: "repetition", source: "ai", title: "Trim the repeated sentence", why: "It repeats what you said at 0:09.", params: {}, confidence: "high", evidence: { silence_pct: 8, speech_pct: 92 }, merged: [] },
  { index: 2, start_seconds: 28, end_seconds: 29.8, reason: "long_pause", source: "ai", title: "Shorten the pause", why: "1.8s of silence before the last tip. Long pauses near the end push people to swipe.", params: { seconds: 1.8 }, confidence: "high", evidence: { silence_pct: 100, speech_pct: 0 }, merged: [] },
];
const cuts = suggested.map((s) => ({ start_seconds: s.start_seconds, end_seconds: s.end_seconds }));
const doneEdit = { analysis_id: "a1", status: "completed", source: "manual", revision: 1, instruction: null, reply: null, feedback: null, feedback_note: null, feedback_at: null, cuts,
  kept: [{ start_seconds: 4, end_seconds: 14 }, { start_seconds: 17.5, end_seconds: 28 }, { start_seconds: 29.8, end_seconds: 41 }],
  removed_seconds: 9.3, duration_seconds: 31.7, original_duration_seconds: 41, size_bytes: 31_000_000, error_code: null, download_url: null, created_at: now };
const STEPS = { received: null, transcribing: "transcribing", aligning: "aligning", diagnosing: "diagnosing" };
const state = () => globalThis.PH_STATE || "pending";
const paid = { plan: "creator", source: "subscription", tier: "creator", subscription: { plan: "creator", status: "active", current_period_end: "2026-11-20T00:00:00Z", cancel_at_period_end: false }, uploads_limit: null, uploads_remaining: null, uploads_used: 4, can_upload: true, can_see_rewrites: true, free_analyses_limit: null, free_analyses_used: 4, free_analyses_remaining: null, billing_configured: true };
export default {
  ...base,
  "/sample.mp4": { __file: join(here, "../../../publishub-demo-en.mp4") },
  "/api/me": { ...base["/api/me"], entitlement: paid },
  "/api/analyses/a1/edit": () => state() === "done"
    ? { edit: doneEdit, suggested: cuts, suggestions: suggested.map((s) => ({ ...s })), decisions: suggested.map((s) => ({ index: s.index, decision: "accepted", start_seconds: s.start_seconds, end_seconds: s.end_seconds, adjusted: false })) }
    : { edit: null, suggested: cuts, suggestions: suggested, decisions: [] },
  "/api/analyses/a1": () => (state() in STEPS ? { ...analysis, status: "processing", step: STEPS[state()], result: null } : analysis),
};
