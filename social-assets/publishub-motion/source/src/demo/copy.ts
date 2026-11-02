/* ==========================================================================
   Demo do produto: os textos, em inglês e em português.
   --------------------------------------------------------------------------
   As palavras da interface são as do site (frontend/messages/*.json:
   Analysis.processing, insight, drop, plan, review, cuts, rewrite). O exemplo é
   o mesmo da landing: o Reel "30 dias sem café", com a queda em 0:04.
   ========================================================================== */

export type Lang = "en" | "pt";

export interface Copy {
  tagline: string;
  url: string;
  file: string;
  insightsFile: string;
  // 01 · envio
  upload: { title: string; lead: string; video: string; screenshot: string; optional: string; received: string; analyze: string };
  // 02 · análise
  processing: { eyebrow: string; title: string; steps: string[] };
  // 03 · resultado
  result: { eyebrow: string; summary: string; happening: string; why: string; whyText: string; test: string; testText: string };
  // 04 · plano
  plan: { label: string; lead: string; impact: string; accept: string; accepted: string; items: { time: string; kind: string; text: string; impact: number }[]; rewriteTitle: string; version: string; rewrite: string; rewriteWhy: string; copyLine: string };
  // 05 · cortes
  cuts: { title: string; lead: string; items: { label: string; from: number; to: number }[]; apply: string; applying: string; readyLabel: string; readyTitle: string; download: string; share: string; note: string };
  // legendas, uma por passo
  captions: string[];
  end: { line: string; cta: string; note: string };
}

const PHRASE_EN = "So, before anything else, let me give you some quick context on why I decided to do this.";
const PHRASE_PT = "Então, antes de tudo, deixa eu te dar um contexto rápido de por que eu decidi fazer isso.";

export const COPY: Record<Lang, Copy & { phrase: string }> = {
  en: {
    tagline: "See the second your video loses people. Fix it before you post.",
    url: "getpublishub.com",
    file: "no-coffee-30-days.mp4",
    insightsFile: "insights-retention.png",
    phrase: PHRASE_EN,
    upload: {
      title: "Analyze a video",
      lead: "Your Reel, TikTok or Short. Add the retention screenshot from Insights if you have it.",
      video: "Video",
      screenshot: "Retention screenshot",
      optional: "optional",
      received: "Received",
      analyze: "Analyze my video",
    },
    processing: {
      eyebrow: "Analysis in progress",
      title: "Listening to the video and reading the screenshot",
      steps: [
        "Files received",
        "Transcribing what you say, with timestamps",
        "Reading the retention curve in the screenshot",
        "Lining the drop up with the line you were saying",
        "Writing the alternatives to re-record",
      ],
    },
    result: {
      eyebrow: "Retention dropped here",
      summary: "From 93% to 61% still watching, over 2 seconds.",
      happening: "What was happening · 0:03",
      why: "Why this moment may cause friction",
      whyText:
        "The title promised what 30 days without coffee did to you. Here you switch to context instead, so whoever arrived for the result has no reason to stay yet.",
      test: "What we would test instead",
      testText: "Open with the result, then explain.",
    },
    plan: {
      label: "Fix plan",
      lead: "In order of impact: the first one changes the most.",
      impact: "impact",
      accept: "Accept",
      accepted: "Accepted",
      items: [
        { time: "0:00 → 0:04", kind: "Cut", text: "Drop the intro and open with the result.", impact: 9 },
        { time: "0:04", kind: "Hook", text: "Say the number the title promised, right here.", impact: 8 },
        { time: "0:12", kind: "Captions", text: "Put the number on screen while you say it.", impact: 6 },
        { time: "0:17", kind: "Pacing", text: "Shorten the 3s pause after the first tip.", impact: 5 },
      ],
      rewriteTitle: "Say it like this instead",
      version: "Version 1",
      copyLine: "Copy line",
      rewrite: "Thirty days without coffee: I slept better, but my mornings fell apart.",
      rewriteWhy: "Delivers the result in the first breath.",
    },
    cuts: {
      title: "publishub found 3 stretches to cut",
      lead: "Nothing is cut until you apply, and your original stays untouched.",
      items: [
        { label: "Slow intro", from: 0, to: 4 },
        { label: "Long pause", from: 17, to: 20 },
        { label: "Silence at the end", from: 31, to: 34 },
      ],
      apply: "Accept 3 cuts and get my video",
      applying: "Applying…",
      readyLabel: "Edited video ready",
      readyTitle: "10s came out: 0:34 → 0:24",
      download: "Download the edited video",
      share: "Share",
      note: "We never change the file you uploaded.",
    },
    captions: [
      "Upload your Reel. The retention screenshot is optional.",
      "publishub watches it second by second.",
      "The second people leave, the line you were saying, and why.",
      "A fix plan in order of impact. You decide what stays.",
      "Accept the cuts and download the edited video.",
    ],
    end: { line: "Find the second your video loses people.", cta: "Analyze your video free", note: "No account · No card · Results in ~3 min" },
  },
  pt: {
    tagline: "Veja o segundo em que seu vídeo perde gente. Corrija antes de postar.",
    url: "getpublishub.com",
    file: "30-dias-sem-cafe.mp4",
    insightsFile: "insights-retencao.png",
    phrase: PHRASE_PT,
    upload: {
      title: "Analisar um vídeo",
      lead: "Seu Reel, TikTok ou Short. Junte o print da retenção do Insights, se tiver.",
      video: "Vídeo",
      screenshot: "Print da retenção",
      optional: "opcional",
      received: "Recebido",
      analyze: "Analisar meu vídeo",
    },
    processing: {
      eyebrow: "Análise em andamento",
      title: "Ouvindo o vídeo e lendo o print",
      steps: [
        "Arquivos recebidos",
        "Transcrevendo o que você fala, com o tempo de cada frase",
        "Lendo a curva de retenção no print",
        "Alinhando a queda com a frase que você dizia",
        "Escrevendo as alternativas para regravar",
      ],
    },
    result: {
      eyebrow: "A retenção caiu aqui",
      summary: "De 93% para 61% assistindo, em 2 segundos.",
      happening: "O que estava acontecendo · 0:03",
      why: "Por que este momento pode gerar atrito",
      whyText:
        "O título prometeu o que 30 dias sem café fizeram com você. Aqui você troca isso por contexto, e quem chegou pelo resultado ainda não tem motivo para ficar.",
      test: "O que a gente testaria no lugar",
      testText: "Abra com o resultado, depois explique.",
    },
    plan: {
      label: "Plano de correção",
      lead: "Em ordem de impacto: a primeira é a que mais muda.",
      impact: "impacto",
      accept: "Aceitar",
      accepted: "Aceito",
      items: [
        { time: "0:00 → 0:04", kind: "Corte", text: "Tire a introdução e abra com o resultado.", impact: 9 },
        { time: "0:04", kind: "Gancho", text: "Diga aqui o número que o título prometeu.", impact: 8 },
        { time: "0:12", kind: "Legendas", text: "Ponha o número na tela enquanto você fala.", impact: 6 },
        { time: "0:17", kind: "Ritmo", text: "Encurte a pausa de 3s depois da primeira dica.", impact: 5 },
      ],
      rewriteTitle: "Reescreva assim",
      version: "Versão 1",
      copyLine: "Copiar frase",
      rewrite: "Trinta dias sem café: dormi melhor, mas as minhas manhãs desandaram.",
      rewriteWhy: "Entrega o resultado no primeiro fôlego.",
    },
    cuts: {
      title: "O publishub encontrou 3 trechos para cortar",
      lead: "Nada é cortado até você aplicar, e o seu original fica intacto.",
      items: [
        { label: "Introdução lenta", from: 0, to: 4 },
        { label: "Pausa longa", from: 17, to: 20 },
        { label: "Silêncio no fim", from: 31, to: 34 },
      ],
      apply: "Aceitar 3 cortes e receber o vídeo",
      applying: "Aplicando…",
      readyLabel: "Vídeo editado pronto",
      readyTitle: "Saíram 10s: 0:34 → 0:24",
      download: "Baixar o vídeo editado",
      share: "Compartilhar",
      note: "Nunca alteramos o arquivo que você enviou.",
    },
    captions: [
      "Envie o seu Reel. O print da retenção é opcional.",
      "O publishub assiste segundo a segundo.",
      "O segundo em que as pessoas saem, a frase que você dizia e o porquê.",
      "Um plano de correção em ordem de impacto. Você decide o que fica.",
      "Aceite os cortes e baixe o vídeo editado.",
    ],
    end: { line: "Descubra o segundo em que seu vídeo perde gente.", cta: "Analise seu vídeo grátis", note: "Sem conta · Sem cartão · Resultado em ~3 min" },
  },
};
