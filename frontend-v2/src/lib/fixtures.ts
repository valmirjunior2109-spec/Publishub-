/**
 * Dados fictícios do MVP. Os tipos abaixo são o contrato que vai virar o schema
 * do Supabase depois — mantenha-os explícitos e sem campos derivados da UI.
 *
 * O conteúdo (transcrições, diagnóstico, reescritas) é o material do criador e
 * da IA, portanto fica em português independentemente do idioma da interface.
 */

export type LoopStatus = "pending" | "confirmed" | "refuted";

/** Um ponto da curva de retenção: segundo do vídeo → % de quem ainda assiste. */
export interface RetentionPoint {
  t: number;
  retained: number;
}

/** A frase dita no instante da queda, com um pouco de contexto ao redor. */
export interface Transcript {
  before: string;
  phrase: string;
  after: string;
}

export interface Rewrite {
  id: string;
  text: string;
  why: string;
}

/**
 * A aposta falseável da IA. `atSecond` é o segundo da curva que ela prevê;
 * `actual` é o número que o criador cola depois de republicar.
 */
export interface Prediction {
  atSecond: number;
  baseline: number;
  predicted: number;
  actual: number | null;
  status: LoopStatus;
  recordedAt: string | null;
}

export interface Analysis {
  id: string;
  title: string;
  createdAt: string;
  durationSec: number;
  dropAtSec: number;
  retention: RetentionPoint[];
  transcript: Transcript;
  diagnosis: string;
  rewrites: Rewrite[];
  prediction: Prediction;
}

/* ---------- curva ----------
   Gera uma curva plausível: leve declínio até a queda, tombo em ~2s e depois
   decaimento lento. Determinística — a mesma entrada dá sempre a mesma saída. */
function buildCurve(durationSec: number, dropAtSec: number, dropTo: number, endAt: number): RetentionPoint[] {
  const points: RetentionPoint[] = [];
  const preDropEnd = 100 - dropAtSec * 1.8;
  for (let t = 0; t <= durationSec; t++) {
    let retained: number;
    if (t <= dropAtSec) {
      retained = 100 - (100 - preDropEnd) * (t / Math.max(dropAtSec, 1));
    } else if (t <= dropAtSec + 2) {
      const k = (t - dropAtSec) / 2;
      retained = preDropEnd - (preDropEnd - dropTo) * (1 - Math.pow(1 - k, 2));
    } else {
      const k = (t - dropAtSec - 2) / Math.max(durationSec - dropAtSec - 2, 1);
      retained = dropTo - (dropTo - endAt) * k;
    }
    const wobble = Math.sin(t * 1.7) * 0.6 + Math.cos(t * 0.9) * 0.4;
    points.push({ t, retained: Math.round((retained + wobble) * 10) / 10 });
  }
  return points;
}

function retainedAt(curve: RetentionPoint[], second: number): number {
  const point = curve.find((p) => p.t === second) ?? curve[curve.length - 1];
  return Math.round(point.retained);
}

/* ---------- análises ---------- */

const curveA1 = buildCurve(34, 4, 61, 38);
const curveA2 = buildCurve(41, 7, 54, 30);
const curveA3 = buildCurve(52, 11, 47, 24);
const curveA4 = buildCurve(28, 2, 66, 45);

export const analyses: Analysis[] = [
  {
    id: "a1",
    title: "Parei de tomar café por 30 dias",
    createdAt: "2026-09-11T14:20:00-03:00",
    durationSec: 34,
    dropAtSec: 4,
    retention: curveA1,
    transcript: {
      before: "Eu fiquei trinta dias sem café.",
      phrase: "Então, antes de tudo, deixa eu te dar um contexto rápido de por que eu decidi fazer isso.",
      after: "Eu sempre fui daquelas pessoas que…",
    },
    diagnosis:
      "Quem chegou quer saber o que aconteceu com você, e você prometeu um contexto no lugar do resultado. \"Antes de tudo\" avisa que a resposta vai demorar — e a pessoa sai antes de você chegar nela.",
    rewrites: [
      {
        id: "a1-r1",
        text: "No dia 12 eu quase desisti. Aqui está o que aconteceu com o meu sono.",
        why: "Abre com um momento concreto e promete o resultado na frase seguinte.",
      },
      {
        id: "a1-r2",
        text: "Trinta dias sem café: dormi melhor, mas minha produtividade caiu. Vou te mostrar os números.",
        why: "Entrega o resultado de cara. A curiosidade passa a ser o \"como\", não o \"se\".",
      },
      {
        id: "a1-r3",
        text: "Se você toma mais de três cafés por dia, presta atenção no que aconteceu comigo na primeira semana.",
        why: "Fala direto com quem tem o mesmo hábito e cria uma janela de tempo específica.",
      },
    ],
    prediction: {
      atSecond: 6,
      baseline: retainedAt(curveA1, 6),
      predicted: 72,
      actual: null,
      status: "pending",
      recordedAt: null,
    },
  },
  {
    id: "a2",
    title: "3 erros ao gravar com o celular",
    createdAt: "2026-09-04T10:05:00-03:00",
    durationSec: 41,
    dropAtSec: 7,
    retention: curveA2,
    transcript: {
      before: "O primeiro erro é gravar contra a janela.",
      phrase: "E o segundo erro, que eu vejo muita gente cometendo e que eu também cometia no começo, é…",
      after: "…segurar o celular na horizontal.",
    },
    diagnosis:
      "Entre o primeiro e o segundo erro você passou quatro segundos sem informação nova. A pessoa já entendeu o formato da lista; ela quer o próximo item, não a introdução dele.",
    rewrites: [
      {
        id: "a2-r1",
        text: "Segundo: celular na horizontal. O Reels corta metade do seu rosto.",
        why: "Vai direto ao item e mostra a consequência em seguida.",
      },
      {
        id: "a2-r2",
        text: "O segundo eu cometi por dois anos: gravar na horizontal.",
        why: "Mantém a confissão pessoal, mas em uma frase só.",
      },
      {
        id: "a2-r3",
        text: "Erro dois. Olha esse enquadramento — é assim que a maioria grava.",
        why: "Troca a explicação por uma demonstração visual imediata.",
      },
    ],
    prediction: {
      atSecond: 9,
      baseline: retainedAt(curveA2, 9),
      predicted: 65,
      actual: 68,
      status: "confirmed",
      recordedAt: "2026-09-08T19:40:00-03:00",
    },
  },
  {
    id: "a3",
    title: "Quanto cobrar por um vídeo como freela",
    createdAt: "2026-08-27T16:45:00-03:00",
    durationSec: 52,
    dropAtSec: 11,
    retention: curveA3,
    transcript: {
      before: "Todo mundo me pergunta quanto eu cobro.",
      phrase: "Mas isso depende muito de cada caso, então não existe uma resposta certa.",
      after: "O que eu posso te dizer é como eu penso…",
    },
    diagnosis:
      "A pessoa veio buscar um número e você abriu com uma ressalva. \"Depende de cada caso\" soa como recusa em responder. Dê o seu número primeiro; as ressalvas cabem depois.",
    rewrites: [
      {
        id: "a3-r1",
        text: "Eu cobro 400 reais por um Reels de 30 segundos. Vou explicar de onde vem esse número.",
        why: "Responde a pergunta na primeira frase. A explicação vira o motivo para continuar.",
      },
      {
        id: "a3-r2",
        text: "Meu primeiro vídeo eu cobrei 80 reais. Hoje é 400. O que mudou foi isso aqui.",
        why: "Mostra a evolução com dois números concretos e promete a causa.",
      },
      {
        id: "a3-r3",
        text: "Três perguntas definem o meu preço. A primeira é: quem vai postar o vídeo?",
        why: "Transforma o \"depende\" em um método com passos contáveis.",
      },
    ],
    prediction: {
      atSecond: 13,
      baseline: retainedAt(curveA3, 13),
      predicted: 58,
      actual: 51,
      status: "refuted",
      recordedAt: "2026-09-02T09:15:00-03:00",
    },
  },
  {
    id: "a4",
    title: "Unboxing do microfone de lapela",
    createdAt: "2026-08-19T20:30:00-03:00",
    durationSec: 28,
    dropAtSec: 2,
    retention: curveA4,
    transcript: {
      before: "",
      phrase: "Oi gente, tudo bem? Hoje eu vou mostrar pra vocês…",
      after: "…esse microfone que chegou ontem.",
    },
    diagnosis:
      "Os dois primeiros segundos foram uma saudação genérica. No feed ninguém está esperando você chegar — a pessoa decide ficar ou não pelo que vê e ouve no primeiro segundo.",
    rewrites: [
      {
        id: "a4-r1",
        text: "Esse microfone de 90 reais soa assim.",
        why: "Entrega a promessa do vídeo antes de qualquer apresentação.",
      },
      {
        id: "a4-r2",
        text: "Ouve a diferença: sem microfone… e com.",
        why: "Começa com a comparação sonora, que é o motivo de assistir.",
      },
      {
        id: "a4-r3",
        text: "Eu quase não comprei esse microfone. Ainda bem que comprei.",
        why: "Uma opinião forte na abertura cria a pergunta \"por quê?\".",
      },
    ],
    prediction: {
      atSecond: 4,
      baseline: retainedAt(curveA4, 4),
      predicted: 78,
      actual: 80,
      status: "confirmed",
      recordedAt: "2026-08-24T12:00:00-03:00",
    },
  },
];

export function getAnalysis(id: string): Analysis | undefined {
  return analyses.find((a) => a.id === id);
}

/** Quantas previsões fechadas (confirmadas ou refutadas) a IA acertou. */
export function accuracyStats(): { confirmed: number; refuted: number; total: number; rate: number | null } {
  const confirmed = analyses.filter((a) => a.prediction.status === "confirmed").length;
  const refuted = analyses.filter((a) => a.prediction.status === "refuted").length;
  const total = confirmed + refuted;
  return { confirmed, refuted, total, rate: total === 0 ? null : Math.round((confirmed / total) * 100) };
}
