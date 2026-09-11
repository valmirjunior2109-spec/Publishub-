import type { AIProvider, AnalysisCategory, AnalysisResult, VideoMetrics } from "./types";

// The default AI provider. It needs no API key and no network access —
// every recommendation is derived directly from the objective metrics
// ffmpeg computed for this specific video. This is what makes Publishub
// useful on day one, before any model provider is configured, and it's
// also what an `anthropic` provider (see anthropic-provider.ts) can lean
// on as grounding so the model doesn't have to guess at numbers.

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function average(scores: number[]): number {
  if (scores.length === 0) return 0;
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

function analyzeHook(metrics: VideoMetrics): AnalysisCategory {
  const { firstCutSec } = metrics.cuts;
  const isShortForm = metrics.durationSec <= 120;
  const recommendations: string[] = [];
  let score: number;
  let summary: string;

  if (firstCutSec !== null && firstCutSec <= 3) {
    score = 90;
    summary = "O primeiro corte acontece nos primeiros 3 segundos, o que ajuda a prender a atenção logo de cara.";
  } else if (firstCutSec !== null && firstCutSec <= 6) {
    score = 70;
    summary = `O primeiro corte só acontece em ${firstCutSec.toFixed(1)}s. Para ${
      isShortForm ? "conteúdo curto" : "a maioria dos formatos"
    }, um hook mais rápido tende a reter melhor.`;
    recommendations.push("Considere abrir com um corte, texto ou movimento nos primeiros 1-3 segundos.");
  } else {
    score = 45;
    summary =
      firstCutSec === null
        ? "Não foram detectados cortes de cena no início do vídeo — a abertura pode estar visualmente estática."
        : `O primeiro corte só acontece em ${firstCutSec.toFixed(1)}s, o que é tarde para prender o espectador.`;
    recommendations.push("Reforce os primeiros segundos com um corte, uma pergunta direta ou um resultado antecipado.");
  }

  if (isShortForm && score < 90) {
    recommendations.push("Em formatos curtos (Reels/TikTok/Shorts), o hook é o fator que mais impacta a retenção inicial.");
  }

  return { key: "hook", label: "Hook (abertura)", score: clampScore(score), summary, recommendations };
}

function analyzePacing(metrics: VideoMetrics): AnalysisCategory {
  const { perMinute } = metrics.cuts;
  const recommendations: string[] = [];
  let score: number;
  let summary: string;

  if (perMinute < 2) {
    score = 45;
    summary = `Apenas ${perMinute.toFixed(1)} cortes por minuto. O ritmo pode parecer lento e cansar o espectador.`;
    recommendations.push("Experimente cortar trechos parados ou repetitivos para dar mais dinamismo à edição.");
  } else if (perMinute < 4) {
    score = 68;
    summary = `${perMinute.toFixed(1)} cortes por minuto — ritmo moderado, com espaço para mais dinamismo.`;
    recommendations.push("Avalie adicionar cortes em momentos de transição de ideia para acelerar o ritmo.");
  } else if (perMinute <= 15) {
    score = 92;
    summary = `${perMinute.toFixed(1)} cortes por minuto — ritmo dinâmico, dentro da faixa que costuma funcionar bem em conteúdo editado.`;
  } else {
    score = 62;
    summary = `${perMinute.toFixed(1)} cortes por minuto é bastante alto — a edição pode estar cansativa ou picotada demais.`;
    recommendations.push("Considere deixar algumas falas respirarem sem cortar tanto, para não sobrecarregar o espectador.");
  }

  return { key: "pacing", label: "Ritmo e cortes", score: clampScore(score), summary, recommendations };
}

function analyzeSilence(metrics: VideoMetrics): AnalysisCategory {
  const { silencePct, longestSilenceSec } = metrics.silence;
  const recommendations: string[] = [];
  let score: number;
  let summary: string;

  if (silencePct < 5) {
    score = 92;
    summary = `Silêncio ocupa apenas ${silencePct.toFixed(1)}% do vídeo — pausas bem controladas.`;
  } else if (silencePct < 15) {
    score = 72;
    summary = `Silêncio ocupa ${silencePct.toFixed(1)}% do vídeo. Algumas pausas podem estar um pouco longas.`;
    recommendations.push("Revise as pausas mais longas e corte silêncios que não agregam à fala.");
  } else {
    score = 45;
    summary = `Silêncio ocupa ${silencePct.toFixed(1)}% do vídeo, um percentual alto que tende a reduzir a retenção.`;
    recommendations.push("Corte os trechos de silêncio prolongado — eles são um dos principais motivos de abandono.");
  }

  if (longestSilenceSec > 3) {
    recommendations.push(`Foi detectada uma pausa de ${longestSilenceSec.toFixed(1)}s sem fala — vale revisar esse trecho.`);
  }

  return { key: "silence", label: "Pausas e silêncio", score: clampScore(score), summary, recommendations };
}

function analyzeCaptions(metrics: VideoMetrics): AnalysisCategory {
  const captions = metrics.captions;
  const recommendations: string[] = [];

  if (!captions || !captions.present) {
    return {
      key: "captions",
      label: "Legendas e sincronização",
      score: 50,
      summary: "Nenhum arquivo de legenda foi enviado para esta análise.",
      recommendations: [
        "Adicionar legendas costuma aumentar significativamente a retenção, já que boa parte do público assiste sem som.",
        "Envie um arquivo .srt ou .vtt na próxima análise para avaliar cobertura e sincronização.",
      ],
    };
  }

  let score = 80;
  let summary = `${captions.cueCount} legendas detectadas, cobrindo ${captions.coveragePct.toFixed(0)}% do vídeo.`;

  if (captions.coveragePct < 60) {
    score -= 15;
    recommendations.push("A cobertura de legendas está baixa — trechos falados podem estar sem legenda.");
  }

  if (captions.avgCharsPerSecond > 20) {
    score -= 15;
    recommendations.push("O texto das legendas pode estar rápido demais para ler confortavelmente — considere frases mais curtas.");
  } else if (captions.avgCharsPerSecond > 0 && captions.avgCharsPerSecond < 6) {
    score -= 5;
    recommendations.push("As legendas ficam muito tempo paradas na tela em relação ao texto — pode passar sensação de lentidão.");
  }

  if (captions.overlapCount > 0) {
    score -= 10;
    recommendations.push(`${captions.overlapCount} legenda(s) se sobrepõem no tempo — revise a sincronização.`);
  }

  if (captions.longGapCount > 0) {
    recommendations.push(`${captions.longGapCount} trecho(s) longos de fala sem legenda foram detectados.`);
  }

  if (recommendations.length === 0) {
    summary += " Cobertura e ritmo de leitura estão em uma boa faixa.";
  }

  return { key: "captions", label: "Legendas e sincronização", score: clampScore(score), summary, recommendations };
}

function analyzeAudio(metrics: VideoMetrics): AnalysisCategory {
  const { meanVolumeDb, maxVolumeDb } = metrics.loudness;
  const recommendations: string[] = [];
  let score: number;
  let summary: string;

  if (meanVolumeDb === null) {
    score = 30;
    summary = "Não foi detectada faixa de áudio neste vídeo.";
    recommendations.push("Confirme se o arquivo enviado contém áudio — a maior parte do conteúdo depende de som.");
  } else if (meanVolumeDb < -30) {
    score = 50;
    summary = `Volume médio de ${meanVolumeDb.toFixed(1)}dB — o áudio está bastante baixo.`;
    recommendations.push("Normalize ou aumente o ganho de áudio antes de publicar.");
  } else if (meanVolumeDb < -20) {
    score = 75;
    summary = `Volume médio de ${meanVolumeDb.toFixed(1)}dB — dentro de uma faixa aceitável, mas com espaço para ganho.`;
  } else {
    score = 90;
    summary = `Volume médio de ${meanVolumeDb.toFixed(1)}dB — bem equilibrado.`;
  }

  if (maxVolumeDb !== null && maxVolumeDb >= -1) {
    score -= 10;
    recommendations.push("Picos de volume muito próximos de 0dB indicam risco de clipping/distorção — considere normalizar o áudio.");
  }

  return { key: "audio", label: "Áudio", score: clampScore(score), summary, recommendations };
}

function buildHeadline(overallScore: number): string {
  if (overallScore >= 85) {
    return "A edição já está sólida — os ajustes abaixo são refinamentos para elevar ainda mais o resultado.";
  }
  if (overallScore >= 70) {
    return "Boa base de edição, com oportunidades claras de melhoria antes de publicar.";
  }
  if (overallScore >= 50) {
    return "Existem pontos importantes a ajustar na edição antes de publicar este vídeo.";
  }
  return "Este vídeo precisa de uma revisão de edição mais profunda — veja os pontos prioritários abaixo.";
}

export class HeuristicAIProvider implements AIProvider {
  name = "heuristic";

  async analyze(metrics: VideoMetrics, _transcriptText: string | null): Promise<AnalysisResult> {
    const categories = [
      analyzeHook(metrics),
      analyzePacing(metrics),
      analyzeSilence(metrics),
      analyzeCaptions(metrics),
      analyzeAudio(metrics),
    ];

    const overallScore = clampScore(average(categories.map((c) => c.score)));

    return {
      overallScore,
      headline: buildHeadline(overallScore),
      categories,
      provider: this.name,
    };
  }
}
