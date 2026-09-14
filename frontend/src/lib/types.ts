/**
 * O contrato da API do backend (FastAPI). Espelha o que `analysis_service`
 * devolve — se um campo mudar lá, muda aqui.
 */

export type AnalysisStatus = "pending" | "processing" | "completed" | "failed";
export type AnalysisStep = "transcribing" | "aligning" | "diagnosing" | null;
export type LoopOutcome = "pending" | "confirmed" | "refuted";

export interface TranscriptSegment {
  start_seconds: number;
  end_seconds: number;
  text: string;
}

export interface Rewrite {
  text: string;
  why: string;
}

/** [segundo, % assistindo] */
export type CurvePoint = [number, number];

export type Pace = "lento" | "bom" | "acelerado";
export type CutAction = "cortar" | "encurtar_pausa" | "acelerar" | "trocar_plano" | "inserir_texto";

export interface SlowStretch {
  start_seconds: number;
  end_seconds: number;
  reason: string;
}

export interface CutSuggestion {
  at_seconds: number;
  end_seconds: number | null;
  action: CutAction;
  why: string;
}

/** O copiloto de edição: como o vídeo inteiro se comporta, não só a queda. */
export interface Copilot {
  pace: Pace;
  pace_note: string;
  hook_score: number;
  hook_note: string;
  slow_stretches: SlowStretch[];
  cuts: CutSuggestion[];
  summary: string;
}

export interface AnalysisResult {
  language: string;
  drop: { at_seconds: number; retained_before: number; retained_after: number };
  curve: CurvePoint[];
  transcript: TranscriptSegment[];
  phrase: { start_seconds: number; end_seconds: number; text: string; before: string; after: string };
  diagnosis: string;
  rewrites: Rewrite[];
  prediction: { at_second: number; baseline: number; predicted: number; statement: string };
  /** null quando a chamada do copiloto falhou — a análise vale mesmo assim. */
  copilot: Copilot | null;
  hypothesis: string | null;
  model: string;
}

export interface AnalysisVideo {
  id: string;
  filename: string;
  size_bytes: number;
  duration_seconds: number | null;
  created_at: string;
  hypothesis: string | null;
  playback_url: string | null;
  insights_url: string | null;
}

export interface Analysis {
  id: string;
  status: AnalysisStatus;
  step: AnalysisStep;
  outcome: LoopOutcome;
  actual_retention: number | null;
  outcome_recorded_at: string | null;
  error_message: string | null;
  result: AnalysisResult | null;
  created_at: string;
  updated_at: string;
  video: AnalysisVideo;
}

export interface VideoListAnalysis {
  id: string;
  status: AnalysisStatus;
  step: AnalysisStep;
  outcome: LoopOutcome;
  actual_retention: number | null;
  outcome_recorded_at: string | null;
  created_at: string;
  updated_at: string;
  drop_at: number | null;
  curve: CurvePoint[] | null;
}

export interface VideoListItem {
  id: string;
  filename: string;
  size_bytes: number;
  duration_seconds: number | null;
  status: "uploaded" | "processing" | "analyzed" | "failed";
  created_at: string;
  hypothesis: string | null;
  analysis: VideoListAnalysis | null;
}

export interface Accuracy {
  confirmed: number;
  refuted: number;
  total: number;
  rate: number | null;
}

export interface OutcomeResponse {
  id: string;
  outcome: LoopOutcome;
  actual_retention: number;
  outcome_recorded_at: string;
  accuracy: Accuracy;
}

/** O que a conta pode fazer: plano, limite e quanto já usou. */
export interface Entitlement {
  plan: "free" | "creator";
  /** "trial": análises grátis no total; "month": o limite zera no dia 1. */
  period: "trial" | "month";
  /** null quando o Stripe não está configurado no servidor (sem limite). */
  analyses_limit: number | null;
  analyses_used: number;
  analyses_remaining: number | null;
  can_analyze: boolean;
  billing_configured: boolean;
}

export interface Me {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string | null;
  entitlement: Entitlement;
}

export interface PurchaseStatus {
  paid: boolean;
  email_masked: string | null;
  amount_cents: number | null;
  currency: string | null;
}

export interface Health {
  status: string;
  supabase_configured: boolean;
  ai_configured: boolean;
}
