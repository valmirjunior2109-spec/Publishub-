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

/** Item medido no arquivo (sem IA): a tela escreve o texto a partir do código, no idioma do site. */
export type MeasuredCode = "dead_start" | "dead_end" | "long_pause" | "static_shot";

/** As sete frentes que o copiloto revisa. */
export type RecommendationKind = "hook" | "cut" | "pacing" | "broll" | "caption" | "structure" | "cta";
/** Quanto trabalho a mudança dá na edição. */
export type Effort = "rapido" | "medio" | "pesado";

/**
 * Uma mudança concreta no segundo em que ela acontece. `title`, `action` e `why`
 * são null quando o item foi medido do arquivo (a IA não respondeu): nesse caso
 * o texto sai de `code` + `params`, nas traduções do site.
 */
export interface Recommendation {
  kind: RecommendationKind;
  at_seconds: number;
  end_seconds: number | null;
  title: string | null;
  action: string | null;
  why: string | null;
  impact: number;
  effort: Effort;
  code?: MeasuredCode;
  params?: Record<string, number>;
}

export interface SlowStretch {
  start_seconds: number;
  end_seconds: number;
  /** Texto da IA, no idioma falado no vídeo; null quando o trecho foi medido do arquivo. */
  reason: string | null;
  reason_code?: MeasuredCode;
  params?: Record<string, number>;
}

export interface CutSuggestion {
  at_seconds: number;
  end_seconds: number | null;
  action: CutAction;
  /** Texto da IA, no idioma falado no vídeo; null quando o corte foi medido do arquivo. */
  why: string | null;
  why_code?: MeasuredCode;
  params?: Record<string, number>;
}

/**
 * O copiloto de edição: como o vídeo inteiro se comporta, não só a queda.
 * source "ai": textos da IA no idioma falado no vídeo. source "measured": a IA não respondeu e
 * os cortes vêm das pausas e dos planos medidos no arquivo, com textos das traduções do site.
 */
export interface Copilot {
  source?: "ai" | "measured";
  pace: Pace;
  pace_note: string | null;
  pace_params?: { wps: number; pause_pct: number };
  hook_score: number | null;
  hook_note: string | null;
  /** O plano de ação, já ordenado por impacto. Ausente em análises antigas. */
  recommendations?: Recommendation[];
  /** Só em análises antigas, de antes do plano de ação. */
  slow_stretches?: SlowStretch[];
  cuts?: CutSuggestion[];
  summary: string | null;
}

export interface AnalysisResult {
  language: string;
  /** "insights": veio do print; "estimated": sem print, a IA apontou o momento pelo vídeo. Análises antigas não têm o campo (= insights). */
  retention_source?: "insights" | "estimated";
  drop: { at_seconds: number; retained_before: number | null; retained_after: number | null; reason?: string | null };
  /** null quando a análise foi feita sem o print da retenção. */
  curve: CurvePoint[] | null;
  transcript: TranscriptSegment[];
  phrase: { start_seconds: number; end_seconds: number; text: string; before: string; after: string };
  diagnosis: string;
  rewrites: Rewrite[];
  /** null sem o print: sem a curva não há % de partida para apostar. */
  prediction: { at_second: number; baseline: number; predicted: number; statement: string } | null;
  /** null só em análises antigas; hoje, sem a IA, os cortes vêm medidos do arquivo. */
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
  /** O vídeo foi enviado com o print da retenção. */
  has_insights?: boolean;
}

/**
 * A previsão cega: a aposta feita só com o vídeo, antes de o print existir.
 * `hit` é null até a pessoa conferir no Insights; "errar" por até
 * `tolerance_seconds` conta como acerto.
 */
export interface BlindPrediction {
  at_seconds: number;
  phrase: string | null;
  shown_at: string | null;
  response: "hit" | "miss" | null;
  actual_seconds: number | null;
  hit: boolean | null;
  responded_at: string | null;
  tolerance_seconds: number;
}

export interface BlindResponse {
  id: string;
  blind: BlindPrediction;
  /** null para convidado: o placar é da conta. */
  accuracy: Accuracy | null;
}

/**
 * O que ficou atrás de uma porta. `analysis: true` é o convidado (a análise
 * inteira vem depois do cadastro); senão é a conta grátis, que vê o segundo e a
 * frase mas não as reescritas nem o copiloto. null quando não falta nada.
 */
export interface Locked {
  analysis: boolean;
  rewrites: number;
  copilot: boolean;
}

export interface Analysis {
  id: string;
  status: AnalysisStatus;
  step: AnalysisStep;
  locked: Locked | null;
  /** null quando a análise veio com o print (o segundo vem da curva, não de uma aposta). */
  blind: BlindPrediction | null;
  outcome: LoopOutcome;
  actual_retention: number | null;
  outcome_recorded_at: string | null;
  error_message: string | null;
  /** Código da falha: o site escreve a mensagem no idioma dele (error_message fica em pt-BR). */
  error_code: string | null;
  error_params: Record<string, number | string> | null;
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
  retention_source: "insights" | "estimated" | null;
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

/** O lembrete de 72 h agendado para uma análise. */
export interface Followup {
  analysis_id: string;
  /** Data que o criador informou, ou null (aí o lembrete sai 72 h depois da análise). */
  republish_on: string | null;
  send_after: string;
  status: "scheduled" | "sent" | "cancelled" | "failed";
  sent_at: string | null;
}

export interface Accuracy {
  confirmed: number;
  refuted: number;
  total: number;
  rate: number | null;
  /** O outro placar: quantas vezes a aposta acertou o segundo da queda. */
  blind: { hits: number; misses: number; total: number; rate: number | null };
}

export interface OutcomeResponse {
  id: string;
  outcome: LoopOutcome;
  actual_retention: number;
  outcome_recorded_at: string;
  accuracy: Accuracy;
}

/** O que a conta pode fazer: plano, de onde ele veio e o contador de uploads grátis. */
export interface Entitlement {
  plan: "free" | "lifetime";
  /** "purchase": pagou no Stripe; "partners": cinco indicados compraram; null no Free. */
  source: "purchase" | "partners" | null;
  /** null = sem limite (Lifetime, ou Stripe ainda não configurado no servidor). */
  uploads_limit: number | null;
  /** Vídeos registrados pelo backend que não falharam; o navegador nunca decide isso. */
  uploads_used: number;
  uploads_remaining: number | null;
  can_upload: boolean;
  /** A próxima análise sai completa (com plano de ação)? */
  can_see_rewrites: boolean;
  /** Quantas análises completas a conta grátis tem; null = sem limite. */
  free_analyses_limit: number | null;
  free_analyses_used: number;
  free_analyses_remaining: number | null;
  billing_configured: boolean;
}

/** Publishub Partners: o link da conta e o progresso até o Lifetime de graça. */
export interface Partners {
  /** false enquanto a migração do Partners não tiver sido aplicada: a seção não aparece. */
  available: boolean;
  code: string | null;
  referred_total: number;
  conversions: number;
  goal: number;
  remaining: number;
  unlocked: boolean;
}

/** Publishub Partners (comissão): o painel de quem indica. `enrolled: false` = ainda não entrou no programa. */
export interface PartnerProgram {
  /** false enquanto a migração do programa não tiver sido aplicada. */
  available: boolean;
  enrolled: boolean;
  code: string | null;
  status: "pending" | "active" | "paused" | null;
  /** Fração do valor pago que fica com o Partner (0.3 = 30%). */
  commission_rate: number;
  clicks: number;
  signups: number;
  paid_customers: number;
  earnings_cents: number;
  currency: string;
  /** O mesmo link também dá o Lifetime de graça: quantos indicados precisam comprar. */
  goal: number;
  remaining: number;
  unlocked: boolean;
}

export interface AdminPartnerRow {
  id: string;
  user_id: string;
  email: string | null;
  code: string | null;
  status: "pending" | "active" | "paused";
  commission_rate: number;
  created_at: string;
  clicks: number;
  signups: number;
  paid_customers: number;
  revenue_cents: number;
  commissions_owed_cents: number;
}

export interface AdminPartners {
  available: boolean;
  partners: AdminPartnerRow[];
  totals: { partners: number; clicks: number; signups: number; paid_customers: number; revenue_cents: number; commissions_owed_cents: number };
}

export interface Me {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string | null;
  /** null = nunca viu as boas-vindas. */
  onboarded_at: string | null;
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

/** Um trecho para tirar do vídeo. Só existe depois que o criador aprova. */
export interface CutSegment {
  start_seconds: number;
  end_seconds: number;
}

/**
 * A versão cortada de um vídeo. O original nunca é alterado: isto é outro
 * arquivo, gerado a partir dos cortes aprovados.
 */
export interface VideoEdit {
  analysis_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  cuts: CutSegment[];
  kept: CutSegment[] | null;
  removed_seconds: number | null;
  duration_seconds: number | null;
  original_duration_seconds: number | null;
  size_bytes: number | null;
  error_code: string | null;
  download_url: string | null;
  created_at: string | null;
}

export interface EditResponse {
  edit: VideoEdit | null;
  /** Os cortes que a análise sugere, ainda sem aprovação. */
  suggested: CutSegment[];
}
