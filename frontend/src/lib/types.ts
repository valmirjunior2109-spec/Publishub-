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
/** Para que o vídeo serve: alcançar, aproximar ou pedir uma ação. */
export type Funnel = "descoberta" | "relacionamento" | "conversao";

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
  /** Nulos em análises antigas e quando a IA não completou: a tela simplesmente não mostra. */
  overall_score?: number | null;
  funnel?: Funnel | null;
  funnel_note?: string | null;
  /** Só quando a análise usou a memória do criador: o que dela mudou este plano, numa linha. */
  memory_note?: string | null;
}

/** A foto da memória do criador tirada quando a análise rodou (ausente sem memória). */
export interface AnalysisMemory {
  used: boolean;
  analyses: number;
  decisions: number;
  requests: number;
  notes: number;
  /** Como a pessoa costuma decidir cada tipo de corte: é o que já marca as sugestões. */
  cut_leanings: Partial<Record<CutReason, MemoryLeaning>>;
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
  /** A memória do criador usada nesta análise; ausente quando não havia ou estava pausada. */
  memory?: AnalysisMemory;
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
  /** Quantas recomendações do plano ficaram no servidor: o número, nunca o conteúdo. */
  recommendations?: number;
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
  /** A frase dita no segundo da queda: o problema que a análise achou, na lista. */
  phrase: string | null;
  /** O item de maior impacto do plano: o que mudar primeiro (sempre da parte grátis). */
  fix_first: Recommendation | null;
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
  /** Qual plano vitalício a conta tem. null quando ainda não comprou. */
  /** "pro" é o Vitalício Fundador (a análise mais profunda); o valor ficou por compatibilidade com o banco. */
  tier: "creator" | "pro" | null;
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
 * arquivo. Sai dos cortes que o criador aceitou (`manual`) ou do que ele disse
 * que mudaria (`revision`). `auto` só existe em análises antigas.
 */
export interface VideoEdit {
  analysis_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  source: "auto" | "manual" | "revision";
  /** 1 na primeira versão; cada versão nova soma um. */
  revision: number;
  /** O pedido do criador que gerou esta versão (só em `revision`). */
  instruction: string | null;
  /** O que a IA respondeu ao último pedido: o que mudou, ou o que cortar não resolve. */
  reply: string | null;
  /** "Gostou do vídeo editado?" — null enquanto não respondeu. */
  feedback: "liked" | "disliked" | null;
  feedback_note: string | null;
  feedback_at: string | null;
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

/** Por que um trecho foi sugerido para corte. Os medidos vêm do arquivo; os outros, da IA. */
export type CutReason = "long_pause" | "dead_start" | "dead_end" | "repetition" | "hesitation" | "pacing" | "low_information";

/** A confiança de uma sugestão: qualitativa, tirada de sinais medidos (nunca uma porcentagem inventada). */
export type CutConfidence = "high" | "medium" | "low";

/** Um corte sugerido, com o motivo, a origem e a evidência medida. */
export interface SuggestedCut {
  /** A identidade da sugestão: é por ela que o criador decide. */
  index: number;
  start_seconds: number;
  end_seconds: number;
  reason: CutReason;
  /** "ai": a IA apontou (tem texto); "measured": saiu do ffmpeg ou da transcrição. */
  source: "ai" | "measured";
  /** O texto da IA, no idioma do vídeo; null nos medidos (o site escreve pelo `reason`). */
  title: string | null;
  why: string | null;
  /** Números para o texto dos medidos: segundos da pausa, % de semelhança, a hesitação dita. */
  params: Record<string, number | string>;
  confidence: CutConfidence;
  /** O quanto do trecho é silêncio medido e o quanto tem fala. */
  evidence: { silence_pct: number; speech_pct: number };
  /** Outros motivos que apontaram o mesmo trecho (a sobreposição vira um card só). */
  merged: CutReason[];
  /** Pela memória do criador: ele costuma aceitar ("accept") ou recusar ("reject") esse tipo. Backends antigos não mandam. */
  memory?: MemoryLeaning | null;
}

/** O que o criador decidiu sobre um corte (guardado no backend). */
export interface SavedDecision {
  /** A posição da sugestão em `suggestions`; a partir de 60, um corte feito à mão. */
  index: number;
  decision: "accepted" | "rejected";
  /** true quando o criador mudou o trecho antes de aceitar. */
  adjusted: boolean;
  /** Um corte criado pelo criador, não sugerido. */
  manual?: boolean;
  /** O trecho que vale: o ajustado, se houver. */
  start_seconds: number;
  end_seconds: number;
}

export interface EditResponse {
  edit: VideoEdit | null;
  /** Os cortes que a análise sugere. Nada é cortado até o criador aceitar e aplicar. */
  suggested: CutSegment[];
  /** Os mesmos cortes, com motivo, confiança e evidência (ausente em backends antigos). */
  suggestions?: SuggestedCut[];
  /** O que o criador já decidiu sobre cada sugestão (ausente enquanto a migração não roda). */
  decisions?: SavedDecision[];
}

/** O que aconteceu com o "o que você mudaria?". */
export type RevisionStatus = "started" | "not_applicable" | "keep_original" | "unavailable" | "limit";

export interface EditFeedbackResponse {
  edit: VideoEdit;
  /** null quando a pessoa gostou: não há nada para refazer. */
  revision: { status: RevisionStatus; reply: string | null } | null;
}

/** O Notion da própria pessoa, conectado por OAuth (nunca por API key). */
export interface NotionConnection {
  workspace_name: string | null;
  workspace_icon: string | null;
  /** Onde as análises entram: uma página ou uma base. null = ainda não escolheu. */
  target_type: "page" | "data_source" | null;
  target_id: string | null;
  target_title: string | null;
  created_at: string | null;
}

/** Uma página ou base que a pessoa autorizou o Publishub a usar. */
export interface NotionTarget {
  id: string;
  type: "page" | "data_source";
  title: string;
  icon: string | null;
  url: string | null;
}

export interface NotionExport {
  page_url: string;
  created_at: string | null;
}

export interface NotionStatus {
  /** false quando o servidor não tem a integração configurada: o botão não aparece. */
  configured: boolean;
  connection: NotionConnection | null;
  export?: NotionExport | null;
}

/** As vagas do Vitalício Fundador: contadas no backend, nas compras pagas (GET /api/billing/founder). */
export interface FounderSpots {
  limit: number;
  taken: number;
  remaining: number;
  sold_out: boolean;
}

/* ---------- a memória do criador ---------- */

/** Como a pessoa costuma decidir um tipo de corte. */
export type MemoryLeaning = "accept" | "reject";

/** Um aprendizado que veio do feedback: "o que você mudaria?" (request) ou "o que faltou?" (missing). */
export interface MemoryItem {
  id: string;
  text: string;
  at: string | null;
  analysis_id: string | null;
}

export interface MemoryNote {
  id: string;
  text: string;
  created_at: string;
}

/** GET /api/me/memory: tudo o que a Publishub aprendeu com a pessoa, desde o último "esquecer". */
export interface CreatorMemory {
  enabled: boolean;
  /** false: o servidor ainda não guarda a memória (migração pendente). Dá para ver, não para ajustar. */
  stored: boolean;
  forgotten_at: string | null;
  empty: boolean;
  stats: { analyses: number; decisions: number; requests: number; notes: number };
  cuts: {
    leanings: Partial<Record<CutReason, MemoryLeaning>>;
    /** Costuma encurtar os cortes que aceita: quer cortar menos do que a IA. */
    shortens: boolean;
    by_type: Record<string, { accepted: number; rejected: number; edited: number; acceptance_rate: number | null }>;
  };
  requests: MemoryItem[];
  missing: MemoryItem[];
  notes: MemoryNote[];
  trajectory: {
    analyses: number;
    /** Do mais velho para o mais novo. */
    hook_scores: number[];
    hook_average: number | null;
    hook_trend: "up" | "down" | "flat" | null;
    recurring_fronts: RecommendationKind[];
    usual_pace: Pace | null;
  };
}
