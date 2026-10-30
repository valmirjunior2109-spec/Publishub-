// Mocks of the FastAPI backend for logged-in screenshots (shots.mjs MOCKS=...).
const now = "2026-10-20T14:00:00Z";
const curve = [[0, 100], [2, 92], [4, 74], [6, 66], [10, 61], [15, 57], [20, 54], [25, 51], [30, 48], [35, 46], [41, 44]];
const recs = [
  { kind: "hook", at_seconds: 0, end_seconds: 4, title: "Open with the result", action: "Cut the intro and start on “30 days without coffee fixed my sleep”.", why: "The first 4 seconds are context; 26% of viewers leave before the point.", impact: 3, effort: "rapido" },
  { kind: "cut", at_seconds: 14, end_seconds: 17.5, title: "Trim the repeated sentence", action: "Remove 14.0s–17.5s: it repeats what you said at 9s.", why: "Repetition flattens the curve right after the hook.", impact: 2, effort: "rapido" },
  { kind: "caption", at_seconds: 21, end_seconds: 26, title: "Put the number on screen", action: "Add “-2h awake at night” as on-screen text.", why: "Silent viewers miss the payoff.", impact: 2, effort: "medio" },
  { kind: "pacing", at_seconds: 28, end_seconds: 33, title: "Shorten the pause", action: "Tighten the 1.2s pause before the last tip.", why: "Long pauses near the end push people to swipe.", impact: 1, effort: "rapido" },
  { kind: "cta", at_seconds: 38, end_seconds: 41, title: "End on a question", action: "Ask which week was the hardest for them.", why: "A question invites comments instead of a scroll.", impact: 1, effort: "rapido" },
];
const transcript = [
  [0, 4.2, "Hey guys, so today I want to tell you about something I tried for 30 days."],
  [4.2, 9, "I quit coffee completely, and honestly the first week was really hard."],
  [9, 14, "I had headaches, I was tired all the time, I almost gave up."],
  [14, 17.5, "Like I said, the first week was really hard."],
  [17.5, 23, "But by week two my sleep started changing. I was falling asleep two hours earlier."],
  [23, 30, "By week three I stopped waking up at 3am, which I'd done for years."],
  [30, 36, "So if you're thinking about it, start on a Friday and drink a lot of water."],
  [36, 41, "Would you try it? Let me know in the comments."],
].map(([s, e, t]) => ({ start_seconds: s, end_seconds: e, text: t }));

export const analysis = {
  id: "a1", status: "completed", step: null, locked: null, share_token: null, blind: null, outcome: "pending",
  actual_retention: null, outcome_recorded_at: null, error_message: null, error_code: null, error_params: null,
  created_at: now, updated_at: now,
  video: { id: "v1", filename: "no-coffee-30-days.mp4", size_bytes: 48_000_000, duration_seconds: 41, created_at: now, hypothesis: "People leave because the intro is slow", playback_url: null, insights_url: null, has_insights: true },
  result: {
    language: "en", retention_source: "insights",
    drop: { at_seconds: 4, retained_before: 92, retained_after: 66, reason: "The intro delays the result." },
    curve, transcript,
    phrase: { start_seconds: 0, end_seconds: 4.2, text: "Hey guys, so today I want to tell you about something I tried for 30 days.", before: "", after: "I quit coffee completely" },
    diagnosis: "The video opens with a greeting and context. Viewers who came for the result don't hear it until second 17, so a quarter of them leave in the first 4 seconds.",
    rewrites: [
      { text: "30 days without coffee fixed my sleep. Here's what happened.", why: "Says the result first." },
      { text: "I quit coffee for a month. Week one almost broke me.", why: "Opens on tension." },
    ],
    prediction: { at_second: 4, baseline: 66, predicted: 74, statement: "Opening with the result should keep about 74% at 0:04." },
    copilot: { source: "ai", pace: "bom", pace_note: "Steady pace, one long pause near the end.", hook_score: 4, hook_note: "Greeting before the point.", recommendations: recs, summary: "Strong story, slow start. Fix the first 4 seconds and the repeated line.", overall_score: 6, funnel: "descoberta", funnel_note: "Built to reach new people." },
    hypothesis: "People leave because the intro is slow", model: "mock",
  },
};

const listItem = (id, filename, status, drop, phrase, i = 0) => ({
  id, filename, size_bytes: 30_000_000, duration_seconds: 41, status, created_at: `2026-10-${20 - i}T14:00:00Z`, hypothesis: null,
  analysis: status === "analyzed" ? { id: "a" + id, status: "completed", step: null, outcome: i === 1 ? "confirmed" : "pending", actual_retention: i === 1 ? 71 : null, outcome_recorded_at: null, created_at: now, updated_at: now, drop_at: drop, curve, retention_source: "insights", phrase, fix_first: recs[i % recs.length] }
    : status === "processing" ? { id: "a" + id, status: "processing", step: "diagnosing", outcome: "pending", actual_retention: null, outcome_recorded_at: null, created_at: now, updated_at: now, drop_at: null, curve: null, retention_source: null, phrase: null, fix_first: null } : null,
});

const entitlement = { plan: "free", source: null, tier: null, subscription: null, uploads_limit: 3, uploads_used: 2, uploads_remaining: 1, can_upload: true, can_see_rewrites: true, free_analyses_limit: 3, free_analyses_used: 2, free_analyses_remaining: 1, billing_configured: true };
const accuracy = { confirmed: 3, refuted: 1, total: 4, rate: 75, blind: { hits: 2, misses: 1, total: 3, rate: 67 } };

export default {
  "/api/me": { id: "00000000-0000-0000-0000-000000000001", email: "demo@getpublishub.com", full_name: "Demo Creator", created_at: now, onboarded_at: now, entitlement },
  "/api/accuracy": accuracy,
  "/api/videos": { videos: [
    listItem("1", "no-coffee-30-days.mp4", "analyzed", 4, "Hey guys, so today I want to tell you about something", 0),
    listItem("2", "morning-routine-v3.mp4", "analyzed", 11, "Before we start, make sure you follow", 1),
    listItem("3", "client-cut-gym-promo.mov", "processing", null, null, 2),
    listItem("4", "budget-travel-lisbon.mp4", "analyzed", 7, "So I landed in Lisbon with 200 euros", 3),
  ] },
  "/api/analyses/a1/followup": { followup: null },
  "/api/analyses/a1/edit": { edit: null, suggested: [{ start_seconds: 0, end_seconds: 4 }, { start_seconds: 14, end_seconds: 17.5 }], decisions: [] },
  "/api/analyses/a1": analysis,
  "/api/me/memory": { enabled: true, stored: true, forgotten_at: null, empty: false, stats: { analyses: 4, decisions: 9, requests: 2, notes: 1 }, cuts: { leanings: { long_pause: "accept", repetition: "accept", dead_end: "reject" }, shortens: true, by_type: { long_pause: { accepted: 4, rejected: 0, edited: 1, acceptance_rate: 1 }, repetition: { accepted: 2, rejected: 1, edited: 0, acceptance_rate: 0.67 }, dead_end: { accepted: 0, rejected: 2, edited: 0, acceptance_rate: 0 } } }, requests: [{ id: "r1", text: "Keep the jump cuts tight", at: "2026-10-18T10:00:00Z", analysis_id: "a1" }], missing: [], notes: [{ id: "n1", text: "My audience is mostly freelance editors", created_at: "2026-10-10T10:00:00Z" }], trajectory: { analyses: 4, hook_scores: [3, 4, 5, 6], hook_average: 4.5, hook_trend: "up", recurring_fronts: ["hook", "cut"], usual_pace: "bom" } },
  "/api/partners": { available: true, code: "DEMO42", referred_total: 2, conversions: 1, goal: 5, remaining: 4, unlocked: false, bonus_per_referral: 1, bonus_max_referrals: 5 },
  "/api/appsumo": { plan: null, used_this_month: 0, max_codes: 3 },
  "/api/health": { status: "ok", supabase_configured: true, ai_configured: true },
};
