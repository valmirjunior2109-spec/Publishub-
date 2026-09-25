import type { AppLocale } from "@/i18n/config";

/**
 * Os guias: artigos que respondem o que criadores pesquisam no Google ("gancho
 * para reels", "curva de retenção do instagram"…). É o caminho para quem ainda
 * não conhece o Publishub chegar até ele.
 *
 * Cada guia existe num idioma só; o endereço é /pt/guias/<slug>. Escrever uma
 * versão em outro idioma é outro item aqui, com outro slug.
 *
 * Regra do conteúdo: nada de número inventado. Se não dá para citar a fonte,
 * não entra.
 */

export type GuideBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  /** Uma frase de exemplo, em destaque. */
  | { type: "example"; text: string }
  /** O convite para testar o Publishub no próprio vídeo. */
  | { type: "cta"; text: string };

export interface Guide {
  slug: string;
  locale: AppLocale;
  title: string;
  /** Até ~155 caracteres: é o que aparece embaixo do título no Google. */
  description: string;
  published: string;
  updated: string;
  minutes: number;
  blocks: GuideBlock[];
}

export const GUIDES: Guide[] = [
  {
    slug: "gancho-para-reels",
    locale: "pt-BR",
    title: "Gancho para Reels: como segurar os 3 primeiros segundos",
    description: "O que fazer nos primeiros segundos do Reel para a pessoa não passar: cinco tipos de gancho, exemplos prontos e os erros que derrubam a audiência logo no começo.",
    published: "2026-09-25",
    updated: "2026-09-25",
    minutes: 6,
    blocks: [
      { type: "p", text: "No feed de Reels, ninguém decide assistir ao seu vídeo. A pessoa decide não passar para o próximo, e essa decisão acontece nos primeiros segundos. Por isso o começo do vídeo é o trecho que mais pesa na retenção: quem sai ali nunca vê o resto, por melhor que ele seja." },
      { type: "p", text: "Gancho é o que você diz ou mostra nesse começo para a pessoa ficar. Não é um truque: é deixar claro, logo de cara, o que ela ganha assistindo até o fim." },
      { type: "h2", text: "O erro mais comum: começar pelo contexto" },
      { type: "p", text: "A maioria dos Reels que perde gente no início abre do jeito que a gente fala numa conversa: cumprimento, contexto, e só depois o assunto. No feed, esse caminho é longo demais. Frases como estas costumam aparecer bem no ponto em que a audiência cai:" },
      { type: "ul", items: ["\"Oi, gente, tudo bem? Hoje eu vou falar sobre…\"", "\"Antes de tudo, deixa eu te dar um contexto rápido…\"", "\"Muita gente me pergunta sobre isso, então resolvi gravar…\""] },
      { type: "p", text: "Nenhuma delas diz o que a pessoa vai ganhar. A correção quase sempre é cortar essa abertura e começar pelo resultado, pela promessa ou pela parte mais interessante do vídeo." },
      { type: "h2", text: "Cinco tipos de gancho que funcionam" },
      { type: "ol", items: [
        "Resultado primeiro: mostre ou diga o final antes do caminho. \"Fiquei 30 dias sem açúcar e isso aqui mudou.\"",
        "Promessa específica: diga exatamente o que a pessoa vai saber no fim. \"Três ajustes no seu currículo que recrutador olha primeiro.\"",
        "Erro comum: aponte algo que a pessoa provavelmente faz errado. \"Se você lava o arroz assim, está jogando fora a parte boa.\"",
        "Pergunta com resposta no vídeo: uma dúvida que ela já tem, respondida de verdade. \"Vale a pena pagar mais caro num tênis de corrida?\"",
        "Imagem que pede explicação: algo na tela que não faz sentido sem o resto do vídeo. Funciona melhor quando a fala entra junto, sem esperar.",
      ] },
      { type: "h2", text: "Como testar se o seu gancho está funcionando" },
      { type: "p", text: "O Instagram mostra, nas estatísticas de cada Reel, um gráfico de retenção: quantas pessoas ainda estavam assistindo em cada segundo. Se a curva despenca logo no começo, o problema está no gancho, não no resto do vídeo." },
      { type: "p", text: "O passo seguinte é descobrir o que você estava dizendo exatamente naquele segundo. Assista ao vídeo pausando no ponto da queda e anote a frase. Na maior parte das vezes ela é uma das aberturas de contexto da lista acima." },
      { type: "h2", text: "Um checklist para os primeiros 3 segundos" },
      { type: "ul", items: [
        "A primeira frase diz o que a pessoa ganha? Se não diz, corte até a frase que diz.",
        "Tem algum silêncio antes de você começar a falar? Corte. Meio segundo parado já é tempo para passar.",
        "O texto na tela repete a promessa? Muita gente assiste sem som.",
        "O que aparece na imagem combina com o que você está falando?",
      ] },
      { type: "example", text: "Em vez de \"Oi, gente! Hoje eu vou mostrar como eu organizo minha semana\", tente \"Eu planejo a semana inteira em dez minutos no domingo. É assim.\"" },
      { type: "cta", text: "O Publishub aponta o segundo em que as pessoas saem do seu Reel, mostra a frase que você dizia nele e entrega o vídeo já editado, sem a abertura que não segura. O teste é grátis e sem cadastro." },
    ],
  },
  {
    slug: "como-aumentar-a-retencao-dos-reels",
    locale: "pt-BR",
    title: "Como aumentar a retenção dos Reels: 7 ajustes de edição",
    description: "Sete mudanças de edição para mais gente assistir seu Reel até o fim: cortar a introdução, encurtar pausas, trocar o plano parado e o que fazer em cada uma.",
    published: "2026-09-25",
    updated: "2026-09-25",
    minutes: 7,
    blocks: [
      { type: "p", text: "Retenção é quanto do seu vídeo as pessoas assistem antes de sair. Ela é um dos sinais que o Instagram usa para decidir se mostra o Reel para mais gente, e é também o número que mais responde à edição: o mesmo conteúdo, montado de outro jeito, pode segurar muito mais gente." },
      { type: "p", text: "Estes são sete ajustes que você faz no editor que já usa, sem regravar nada, em ordem do que costuma mudar mais." },
      { type: "h2", text: "1. Corte a introdução" },
      { type: "p", text: "Se o vídeo começa com cumprimento ou contexto, corte até a primeira frase que diz o que a pessoa vai ganhar. É o ajuste mais simples e, na maior parte das vezes, o que mais muda a curva, porque é no começo que a maioria decide sair." },
      { type: "h2", text: "2. Encurte as pausas" },
      { type: "p", text: "Pausas que passam despercebidas numa conversa parecem longas no feed. Procure silêncios de meio segundo ou mais entre as frases e encurte. Não precisa tirar toda respiração: o objetivo é que não haja um momento em que nada acontece." },
      { type: "h2", text: "3. Tire os trechos que repetem" },
      { type: "p", text: "Quando a gente grava sem roteiro, costuma dizer a mesma ideia duas vezes, com palavras diferentes. Escolha a versão melhor e corte a outra. Um jeito prático é ler a transcrição do vídeo: as repetições saltam aos olhos no texto." },
      { type: "h2", text: "4. Troque o plano parado" },
      { type: "p", text: "Muitos segundos com a mesma imagem, sem mudança nenhuma, cansam mesmo quando a fala é boa. Entre com um close, um print, uma demonstração do que você está explicando ou simplesmente um corte para outro enquadramento." },
      { type: "h2", text: "5. Coloque o que importa na tela" },
      { type: "p", text: "Muita gente assiste sem som. O número, o nome do produto ou a promessa do vídeo devem aparecer escritos no momento em que você fala deles. Legenda da fala inteira ajuda, mas o principal é o texto que resume a ideia." },
      { type: "h2", text: "6. Adiante a melhor parte" },
      { type: "p", text: "Se o momento mais interessante do vídeo está no meio, pense em trazê-lo para o começo, ou pelo menos prometer lá no início que ele vem. Estrutura é edição também: a ordem das partes pode segurar mais do que qualquer efeito." },
      { type: "h2", text: "7. Termine quando acabou" },
      { type: "p", text: "Depois que você entregou o que prometeu, cada segundo a mais é tempo para a pessoa sair antes do fim. Encerre logo depois da última informação útil. Se quiser pedir algo (seguir, salvar, comentar), peça de forma curta e ligada ao que acabou de mostrar." },
      { type: "h2", text: "Como saber qual ajuste fazer primeiro" },
      { type: "p", text: "A resposta está no gráfico de retenção do próprio Reel, nas estatísticas do Instagram. O ponto em que a curva cai mais forte é onde está o problema maior. Veja o que acontece no vídeo naquele segundo: se é uma pausa, encurte; se é contexto, corte; se é a mesma imagem há muito tempo, troque o plano." },
      { type: "cta", text: "O Publishub faz esse trabalho por você: acha o segundo em que as pessoas saem, corta os trechos que não seguram e entrega o vídeo editado para assistir e baixar. O que cortar não resolve vem num plano, cada item com o segundo dele." },
    ],
  },
  {
    slug: "curva-de-retencao-do-instagram",
    locale: "pt-BR",
    title: "Curva de retenção do Instagram: como ler e achar onde as pessoas saem",
    description: "Onde fica o gráfico de retenção do Reel, como ler a curva, o que significa cada tipo de queda e como achar a frase exata que fez as pessoas saírem.",
    published: "2026-09-25",
    updated: "2026-09-25",
    minutes: 6,
    blocks: [
      { type: "p", text: "Views dizem quantas pessoas o vídeo alcançou. A curva de retenção diz o que elas fizeram depois: em que segundo foram embora. É o dado mais útil para quem edita, porque aponta exatamente o trecho do vídeo que precisa mudar." },
      { type: "h2", text: "Onde encontrar o gráfico" },
      { type: "p", text: "Abra o Reel no seu perfil, toque em ver estatísticas (ou insights) e role até a parte de retenção. O gráfico mostra, ao longo da duração do vídeo, a porcentagem de pessoas que ainda estavam assistindo. Os nomes dos menus mudam de uma versão do app para outra, mas o gráfico é o que começa alto e desce da esquerda para a direita." },
      { type: "h2", text: "Como ler a curva" },
      { type: "p", text: "Toda curva desce: é normal perder gente ao longo do vídeo. O que interessa é a forma da descida." },
      { type: "ul", items: [
        "Queda brusca no começo: o gancho não segurou. As pessoas viram os primeiros segundos e não encontraram motivo para ficar.",
        "Degrau no meio: algo específico naquele segundo fez gente sair. Uma pausa, uma frase que enrola, uma mudança de assunto, uma imagem parada.",
        "Descida suave e constante: o vídeo não tem um problema pontual; o ritmo geral pode estar lento.",
        "Subida em algum ponto: gente voltando para rever um trecho. Normalmente é a parte que mais interessou, e uma pista do que colocar mais cedo.",
      ] },
      { type: "h2", text: "Da queda para a frase" },
      { type: "p", text: "O gráfico diz quando, mas não diz por quê. Para isso, você precisa cruzar o segundo da queda com o que estava acontecendo no vídeo. Anote o segundo em que a curva cai mais forte, abra o vídeo e pare um pouco antes desse ponto. Ouça a frase que você estava dizendo e olhe o que aparece na tela." },
      { type: "p", text: "Como o gráfico é aproximado, considere também a frase anterior e a seguinte. Muitas vezes a causa é uma promessa que demora a ser cumprida, e a pessoa sai logo depois de perceber isso." },
      { type: "example", text: "Queda aos 4 segundos, e aos 4 segundos você dizia: \"Então, antes de tudo, deixa eu te dar um contexto rápido\". A correção provável é cortar esse contexto e ir direto ao ponto." },
      { type: "h2", text: "Compare vídeos, não só o mesmo vídeo" },
      { type: "p", text: "Uma curva sozinha já ajuda. Várias, lado a lado, mostram padrões: talvez todos os seus vídeos percam gente no mesmo tipo de abertura, ou sempre que você mostra a mesma coisa. Esse padrão é o que vale mudar no jeito de gravar, e não só num vídeo." },
      { type: "cta", text: "Envie o vídeo e o print da curva de retenção para o Publishub: ele lê o gráfico, acha a frase dita no segundo da queda, explica por que as pessoas saíram e entrega o vídeo editado. Sem o print, ele estima o ponto provável pelo próprio vídeo." },
    ],
  },
  {
    slug: "editar-reels-com-ia",
    locale: "pt-BR",
    title: "Como editar Reels com IA: o que ela já faz bem e o que é com você",
    description: "O que a IA já faz na edição de Reels (cortar pausas, achar trechos mortos, apontar o gancho fraco) e o que continua sendo decisão sua. Um passo a passo prático.",
    published: "2026-09-25",
    updated: "2026-09-25",
    minutes: 6,
    blocks: [
      { type: "p", text: "Editar com IA não significa apertar um botão e receber um vídeo viral. Significa tirar do seu caminho a parte repetitiva da edição, a que toma tempo e não precisa de gosto, para você gastar energia no que só você decide." },
      { type: "h2", text: "O que a IA já faz bem" },
      { type: "ul", items: [
        "Transcrever o que você fala, com o tempo de cada frase. Com o texto na mão, fica fácil ver repetições e enrolação.",
        "Achar silêncios e pausas longas, medindo o áudio, e sugerir onde cortar.",
        "Encontrar trechos que não acrescentam nada: a introdução de contexto, a ideia dita duas vezes, o final que se arrasta.",
        "Apontar o segundo em que o vídeo provavelmente perde gente, lendo o gráfico de retenção ou o próprio vídeo.",
        "Gerar legendas automáticas.",
      ] },
      { type: "h2", text: "O que continua sendo com você" },
      { type: "ul", items: [
        "O tom. Uma pausa pode ser respiração ou pode ser o momento de impacto de uma piada. Só você sabe qual é qual.",
        "O que o vídeo promete. A IA pode dizer que o gancho está fraco, mas a promessa certa depende do que você quer que o público sinta.",
        "Regravar. Se a melhor correção é dizer a frase de outro jeito, a câmera ainda é sua.",
        "A decisão final. Todo corte sugerido é uma sugestão. Assista antes de publicar.",
      ] },
      { type: "h2", text: "Um fluxo que funciona" },
      { type: "ol", items: [
        "Grave como você já grava. Não precisa mudar nada para usar IA na edição.",
        "Deixe a IA fazer o primeiro corte: tirar pausas, a introdução que enrola e os trechos repetidos.",
        "Assista à versão cortada inteira, de preferência no celular, como o público vai ver.",
        "Ajuste o que ficou errado: devolva um trecho que fazia falta, corte outro que passou.",
        "Faça no seu editor o que não é corte: texto na tela, b-roll, música.",
        "Depois de publicar, olhe a curva de retenção. É ela que diz se a edição funcionou.",
      ] },
      { type: "h2", text: "Cuidado com o corte demais" },
      { type: "p", text: "Tirar todas as pausas deixa o vídeo acelerado e cansativo. O objetivo não é o vídeo mais curto possível, é não ter nenhum momento em que a pessoa fique sem motivo para continuar. Se depois do corte a sua fala parece atropelada, devolva um pouco de respiro." },
      { type: "cta", text: "No Publishub, a IA analisa o Reel, corta os trechos que fazem as pessoas saírem e entrega o vídeo editado. Se você não gostar, é só escrever o que mudaria e ele refaz. O original fica intacto." },
    ],
  },
];

export const guidePath = (slug: string) => `/guias/${slug}`;

export function guidesIn(locale: string): Guide[] {
  return GUIDES.filter((guide) => guide.locale === locale);
}

export function findGuide(slug: string): Guide | undefined {
  return GUIDES.find((guide) => guide.slug === slug);
}
