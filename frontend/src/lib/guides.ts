import type { AppLocale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";

/**
 * Os guias: artigos que respondem o que criadores pesquisam no Google ("gancho
 * para reels", "curva de retenção do instagram"…). É o caminho para quem ainda
 * não conhece o Publishub chegar até ele.
 *
 * Cada item é um guia num idioma só; o endereço é /pt/guias/<slug>. A versão em
 * outro idioma é outro item, com um slug no idioma dele e o mesmo `topic`: é o
 * que liga as traduções nas tags hreflang e no seletor de idioma.
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
  /** O assunto, igual em todas as traduções do mesmo guia. */
  topic: string;
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
    topic: "hook",
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
    topic: "retention",
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
    topic: "retention-graph",
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
    topic: "ai-editing",
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
  {
    slug: "reels-hook-first-3-seconds",
    locale: "en",
    topic: "hook",
    title: "Reels hooks: how to hold the first 3 seconds",
    description: "What to do in the first seconds of a Reel so people don't swipe away: five types of hook, ready-to-use examples and the openings that lose viewers early.",
    published: "2026-10-01",
    updated: "2026-10-01",
    minutes: 6,
    blocks: [
      { type: "p", text: "In the Reels feed, nobody decides to watch your video. People decide not to swipe to the next one, and that decision happens in the first few seconds. That's why the opening is the part that weighs most on retention: whoever leaves there never sees the rest, however good it is." },
      { type: "p", text: "A hook is what you say or show in that opening so people stay. It isn't a trick: it's making it clear, right away, what they get by watching to the end." },
      { type: "h2", text: "The most common mistake: starting with context" },
      { type: "p", text: "Most Reels that lose people early open the way we talk in a conversation: a greeting, some context, and only then the subject. In the feed, that path is too long. Lines like these tend to show up right where the audience drops:" },
      { type: "ul", items: ["\"Hey guys, how's it going? Today I'm going to talk about…\"", "\"Before anything else, let me give you some quick context…\"", "\"A lot of you have been asking me about this, so I decided to film it…\""] },
      { type: "p", text: "None of them say what the viewer will get. The fix is almost always to cut that opening and start with the result, the promise or the most interesting part of the video." },
      { type: "h2", text: "Five types of hook that work" },
      { type: "ol", items: [
        "Result first: show or say the ending before the journey. \"I went 30 days without sugar and this is what changed.\"",
        "Specific promise: say exactly what the viewer will know by the end. \"Three things on your résumé recruiters look at first.\"",
        "Common mistake: point out something the viewer probably does wrong. \"If you wash rice like this, you're throwing out the good part.\"",
        "A question answered in the video: a doubt they already have, actually answered. \"Is it worth paying more for running shoes?\"",
        "An image that begs for an explanation: something on screen that makes no sense without the rest of the video. It works best when your voice comes in at the same time, without waiting.",
      ] },
      { type: "h2", text: "How to test whether your hook is working" },
      { type: "p", text: "In each Reel's insights, Instagram shows a retention graph: how many people were still watching at every second. If the curve plunges right at the start, the problem is the hook, not the rest of the video." },
      { type: "p", text: "The next step is to find out exactly what you were saying at that second. Watch the video, pause at the drop and write down the line. Most of the time it's one of the context openings from the list above." },
      { type: "h2", text: "A checklist for the first 3 seconds" },
      { type: "ul", items: [
        "Does your first line say what the viewer gets? If not, cut until the line that does.",
        "Is there any silence before you start talking? Cut it. Half a second of nothing is already enough time to swipe.",
        "Does the on-screen text repeat the promise? Lots of people watch with the sound off.",
        "Does what's on screen match what you're saying?",
      ] },
      { type: "example", text: "Instead of \"Hey guys! Today I'm going to show you how I organize my week\", try \"I plan my entire week in ten minutes on Sunday. Here's how.\"" },
      { type: "cta", text: "Publishub points out the second people leave your Reel, shows the line you were saying at it and gives you the video already edited, without the opening that doesn't hold. The test is free, no sign-up." },
    ],
  },
  {
    slug: "how-to-increase-reels-retention",
    locale: "en",
    topic: "retention",
    title: "How to increase Reels retention: 7 editing fixes",
    description: "Seven editing changes so more people watch your Reel to the end: cutting the intro, shortening pauses, replacing static shots and what to do in each case.",
    published: "2026-10-01",
    updated: "2026-10-01",
    minutes: 7,
    blocks: [
      { type: "p", text: "Retention is how much of your video people watch before leaving. It's one of the signals Instagram uses to decide whether to show the Reel to more people, and it's also the number that responds most to editing: the same content, put together differently, can hold many more viewers." },
      { type: "p", text: "These are seven fixes you can make in the editor you already use, without reshooting anything, ordered by how much they usually change." },
      { type: "h2", text: "1. Cut the intro" },
      { type: "p", text: "If the video opens with a greeting or context, cut to the first line that says what the viewer will get. It's the simplest fix and, most of the time, the one that changes the curve the most, because the start is where most people decide to leave." },
      { type: "h2", text: "2. Shorten the pauses" },
      { type: "p", text: "Pauses that go unnoticed in a conversation feel long in the feed. Look for silences of half a second or more between sentences and shorten them. You don't need to remove every breath: the goal is that there's never a moment where nothing is happening." },
      { type: "h2", text: "3. Remove the parts that repeat" },
      { type: "p", text: "When we film without a script, we often say the same idea twice in different words. Pick the better version and cut the other. A practical way to spot this is reading the video's transcript: repetitions jump out in text." },
      { type: "h2", text: "4. Replace the static shot" },
      { type: "p", text: "Many seconds of the same image, with nothing changing, get tiring even when what you're saying is good. Cut to a close-up, a screenshot, a demo of what you're explaining or simply a different framing." },
      { type: "h2", text: "5. Put what matters on screen" },
      { type: "p", text: "Lots of people watch with the sound off. The number, the product name or the video's promise should appear in writing at the moment you mention them. Full captions help, but the key is the text that sums up the idea." },
      { type: "h2", text: "6. Move the best part up" },
      { type: "p", text: "If the most interesting moment is in the middle, consider bringing it to the start, or at least promising early on that it's coming. Structure is editing too: the order of the parts can hold more people than any effect." },
      { type: "h2", text: "7. End when it's over" },
      { type: "p", text: "Once you've delivered what you promised, every extra second is time for people to leave before the end. Wrap up right after the last useful piece of information. If you want to ask for something (follow, save, comment), keep it short and tied to what you just showed." },
      { type: "h2", text: "How to know which fix to make first" },
      { type: "p", text: "The answer is in the Reel's own retention graph, in Instagram's insights. The point where the curve drops hardest is where the biggest problem is. Look at what's happening in the video at that second: if it's a pause, shorten it; if it's context, cut it; if it's been the same image for too long, change the shot." },
      { type: "cta", text: "Publishub does this work for you: it finds the second people leave, cuts the parts that don't hold and gives you the edited video to watch and download. What cutting can't fix comes in a plan, each item with its own second." },
    ],
  },
  {
    slug: "instagram-reels-retention-graph",
    locale: "en",
    topic: "retention-graph",
    title: "Reels retention graph: how to read it and find drop-offs",
    description: "Where to find your Reel's retention graph, how to read the curve, what each kind of drop means and how to find the exact line that made people leave.",
    published: "2026-10-01",
    updated: "2026-10-01",
    minutes: 6,
    blocks: [
      { type: "p", text: "Views tell you how many people the video reached. The retention curve tells you what they did next: at which second they left. It's the most useful data for anyone who edits, because it points to the exact part of the video that needs to change." },
      { type: "h2", text: "Where to find the graph" },
      { type: "p", text: "Open the Reel on your profile, tap View insights and scroll to the retention section. The graph shows, across the length of the video, the percentage of people who were still watching. Menu names change from one version of the app to another, but the graph is the one that starts high and goes down from left to right." },
      { type: "h2", text: "How to read the curve" },
      { type: "p", text: "Every curve goes down: losing people along the way is normal. What matters is the shape of the descent." },
      { type: "ul", items: [
        "A sharp drop at the start: the hook didn't hold. People saw the first seconds and found no reason to stay.",
        "A step in the middle: something specific at that second made people leave. A pause, a line that drags, a change of subject, a static image.",
        "A smooth, steady decline: the video has no single problem; the overall pacing may be slow.",
        "A rise at some point: people going back to rewatch a part. It's usually what interested them most, and a hint of what to put earlier.",
      ] },
      { type: "h2", text: "From the drop to the line" },
      { type: "p", text: "The graph tells you when, but not why. For that, you need to match the second of the drop with what was happening in the video. Note the second where the curve falls hardest, open the video and pause a little before that point. Listen to the line you were saying and look at what's on screen." },
      { type: "p", text: "Since the graph is approximate, also consider the line before and the line after. Often the cause is a promise that takes too long to pay off, and people leave right after they realize it." },
      { type: "example", text: "A drop at 4 seconds, and at 4 seconds you were saying: \"So, before anything else, let me give you some quick context\". The likely fix is cutting that context and getting straight to the point." },
      { type: "h2", text: "Compare videos, not just the same video" },
      { type: "p", text: "One curve on its own already helps. Several, side by side, reveal patterns: maybe all your videos lose people on the same kind of opening, or every time you show the same thing. That pattern is what's worth changing in the way you film, not just in one video." },
      { type: "cta", text: "Send the video and the retention screenshot to Publishub: it reads the graph, finds the line you said at the second of the drop, explains why people left and gives you the edited video. Without the screenshot, it estimates the likely point from the video itself." },
    ],
  },
  {
    slug: "edit-reels-with-ai",
    locale: "en",
    topic: "ai-editing",
    title: "How to edit Reels with AI (and what's still up to you)",
    description: "What AI already does when editing Reels (cutting pauses, finding dead spots, flagging a weak hook) and what remains your call. A practical step-by-step.",
    published: "2026-10-01",
    updated: "2026-10-01",
    minutes: 6,
    blocks: [
      { type: "p", text: "Editing with AI doesn't mean pressing a button and getting a viral video. It means getting the repetitive part of editing out of your way, the part that takes time and needs no taste, so you can spend your energy on what only you can decide." },
      { type: "h2", text: "What AI already does well" },
      { type: "ul", items: [
        "Transcribing what you say, with the timing of each sentence. With the text in hand, repetition and rambling are easy to see.",
        "Finding silences and long pauses by measuring the audio, and suggesting where to cut.",
        "Spotting parts that add nothing: the context intro, the idea said twice, the ending that drags on.",
        "Pointing to the second where the video probably loses people, by reading the retention graph or the video itself.",
        "Generating automatic captions.",
      ] },
      { type: "h2", text: "What's still up to you" },
      { type: "ul", items: [
        "The tone. A pause can be a breath or the beat before a punchline. Only you know which is which.",
        "What the video promises. AI can tell you the hook is weak, but the right promise depends on what you want your audience to feel.",
        "Reshooting. If the best fix is saying the line another way, the camera is still yours.",
        "The final call. Every suggested cut is a suggestion. Watch before you post.",
      ] },
      { type: "h2", text: "A workflow that works" },
      { type: "ol", items: [
        "Film the way you already do. You don't need to change anything to use AI for editing.",
        "Let AI make the first cut: removing pauses, the rambling intro and repeated parts.",
        "Watch the whole cut version, ideally on your phone, the way your audience will.",
        "Fix what went wrong: bring back a part that was missing, cut another that slipped through.",
        "Do what isn't cutting in your own editor: on-screen text, b-roll, music.",
        "After posting, check the retention curve. It's what tells you whether the edit worked.",
      ] },
      { type: "h2", text: "Watch out for over-cutting" },
      { type: "p", text: "Removing every pause makes the video rushed and tiring. The goal isn't the shortest possible video, it's having no moment where the viewer has no reason to keep watching. If your speech sounds rushed after the cut, give it a little breathing room back." },
      { type: "cta", text: "In Publishub, AI analyzes your Reel, cuts the parts that make people leave and gives you the edited video. If you don't like it, just write what you'd change and it redoes it. Your original stays untouched." },
    ],
  },
  {
    slug: "ganchos-para-reels",
    locale: "es",
    topic: "hook",
    title: "Ganchos para Reels: cómo retener los primeros 3 segundos",
    description: "Qué hacer en los primeros segundos del Reel para que no lo pasen: cinco tipos de gancho, ejemplos listos y los errores que tumban la audiencia al inicio.",
    published: "2026-10-01",
    updated: "2026-10-01",
    minutes: 6,
    blocks: [
      { type: "p", text: "En el feed de Reels, nadie decide ver tu video. La persona decide no pasar al siguiente, y esa decisión ocurre en los primeros segundos. Por eso el inicio es la parte que más pesa en la retención: quien se va ahí nunca ve el resto, por mejor que sea." },
      { type: "p", text: "El gancho es lo que dices o muestras en ese inicio para que la persona se quede. No es un truco: es dejar claro, desde el principio, qué gana viendo hasta el final." },
      { type: "h2", text: "El error más común: empezar por el contexto" },
      { type: "p", text: "La mayoría de los Reels que pierden gente al inicio arrancan como hablamos en una conversación: saludo, contexto y solo después el tema. En el feed, ese camino es demasiado largo. Frases como estas suelen aparecer justo en el punto en que la audiencia cae:" },
      { type: "ul", items: ["\"Hola, ¿cómo están? Hoy les voy a hablar de…\"", "\"Antes que nada, déjame darte un poco de contexto…\"", "\"Mucha gente me pregunta sobre esto, así que decidí grabarlo…\""] },
      { type: "p", text: "Ninguna dice qué va a ganar la persona. La solución casi siempre es cortar esa apertura y empezar por el resultado, por la promesa o por la parte más interesante del video." },
      { type: "h2", text: "Cinco tipos de gancho que funcionan" },
      { type: "ol", items: [
        "Primero el resultado: muestra o di el final antes del camino. \"Estuve 30 días sin azúcar y esto fue lo que cambió.\"",
        "Promesa específica: di exactamente qué sabrá la persona al final. \"Tres cosas de tu currículum que el reclutador mira primero.\"",
        "Error común: señala algo que la persona probablemente hace mal. \"Si lavas el arroz así, estás tirando la mejor parte.\"",
        "Pregunta con respuesta en el video: una duda que ya tiene, respondida de verdad. \"¿Vale la pena pagar más por unas zapatillas para correr?\"",
        "Una imagen que pide explicación: algo en pantalla que no tiene sentido sin el resto del video. Funciona mejor cuando tu voz entra al mismo tiempo, sin esperar.",
      ] },
      { type: "h2", text: "Cómo comprobar si tu gancho funciona" },
      { type: "p", text: "Instagram muestra, en las estadísticas de cada Reel, un gráfico de retención: cuántas personas seguían viendo en cada segundo. Si la curva se desploma al inicio, el problema está en el gancho, no en el resto del video." },
      { type: "p", text: "El siguiente paso es descubrir qué decías exactamente en ese segundo. Mira el video, pausa en el punto de la caída y anota la frase. La mayoría de las veces es una de las aperturas de contexto de la lista de arriba." },
      { type: "h2", text: "Un checklist para los primeros 3 segundos" },
      { type: "ul", items: [
        "¿Tu primera frase dice qué gana la persona? Si no, corta hasta la frase que lo dice.",
        "¿Hay algún silencio antes de que empieces a hablar? Córtalo. Medio segundo sin nada ya es tiempo suficiente para pasar.",
        "¿El texto en pantalla repite la promesa? Mucha gente ve sin sonido.",
        "¿Lo que aparece en la imagen coincide con lo que estás diciendo?",
      ] },
      { type: "example", text: "En lugar de \"¡Hola a todos! Hoy les voy a mostrar cómo organizo mi semana\", prueba \"Planifico toda mi semana en diez minutos el domingo. Así lo hago.\"" },
      { type: "cta", text: "Publishub señala el segundo en que la gente se va de tu Reel, muestra la frase que decías en él y te entrega el video ya editado, sin la apertura que no retiene. La prueba es gratis y sin registro." },
    ],
  },
  {
    slug: "como-aumentar-la-retencion-de-los-reels",
    locale: "es",
    topic: "retention",
    title: "Cómo aumentar la retención de los Reels: 7 ajustes de edición",
    description: "Siete cambios de edición para que más gente vea tu Reel hasta el final: cortar la intro, acortar pausas, cambiar el plano fijo y qué hacer en cada caso.",
    published: "2026-10-01",
    updated: "2026-10-01",
    minutes: 7,
    blocks: [
      { type: "p", text: "La retención es cuánto de tu video ve la gente antes de irse. Es una de las señales que usa Instagram para decidir si muestra el Reel a más personas, y también es el número que más responde a la edición: el mismo contenido, montado de otra forma, puede retener a mucha más gente." },
      { type: "p", text: "Estos son siete ajustes que puedes hacer en el editor que ya usas, sin volver a grabar nada, ordenados por lo que suele cambiar más." },
      { type: "h2", text: "1. Corta la introducción" },
      { type: "p", text: "Si el video empieza con un saludo o con contexto, corta hasta la primera frase que dice qué va a ganar la persona. Es el ajuste más simple y, la mayoría de las veces, el que más cambia la curva, porque es al inicio donde la mayoría decide irse." },
      { type: "h2", text: "2. Acorta las pausas" },
      { type: "p", text: "Las pausas que pasan desapercibidas en una conversación se sienten largas en el feed. Busca silencios de medio segundo o más entre frases y acórtalos. No hace falta quitar cada respiración: el objetivo es que nunca haya un momento en que no pase nada." },
      { type: "h2", text: "3. Quita las partes que se repiten" },
      { type: "p", text: "Cuando grabamos sin guion, solemos decir la misma idea dos veces con palabras distintas. Elige la mejor versión y corta la otra. Una forma práctica de detectarlo es leer la transcripción del video: las repeticiones saltan a la vista en el texto." },
      { type: "h2", text: "4. Cambia el plano fijo" },
      { type: "p", text: "Muchos segundos con la misma imagen, sin ningún cambio, cansan aunque lo que digas sea bueno. Mete un primer plano, una captura, una demostración de lo que explicas o simplemente un corte a otro encuadre." },
      { type: "h2", text: "5. Pon en pantalla lo que importa" },
      { type: "p", text: "Mucha gente ve sin sonido. El número, el nombre del producto o la promesa del video deben aparecer escritos en el momento en que hablas de ellos. Subtitular todo ayuda, pero lo principal es el texto que resume la idea." },
      { type: "h2", text: "6. Adelanta la mejor parte" },
      { type: "p", text: "Si el momento más interesante está en la mitad, piensa en llevarlo al inicio, o al menos en prometer desde el principio que va a llegar. La estructura también es edición: el orden de las partes puede retener más que cualquier efecto." },
      { type: "h2", text: "7. Termina cuando se acabó" },
      { type: "p", text: "Después de entregar lo que prometiste, cada segundo extra es tiempo para que la persona se vaya antes del final. Cierra justo después de la última información útil. Si quieres pedir algo (seguir, guardar, comentar), hazlo breve y ligado a lo que acabas de mostrar." },
      { type: "h2", text: "Cómo saber qué ajuste hacer primero" },
      { type: "p", text: "La respuesta está en el gráfico de retención del propio Reel, en las estadísticas de Instagram. El punto donde la curva cae con más fuerza es donde está el problema mayor. Mira qué pasa en el video en ese segundo: si es una pausa, acórtala; si es contexto, córtalo; si es la misma imagen desde hace mucho, cambia el plano." },
      { type: "cta", text: "Publishub hace este trabajo por ti: encuentra el segundo en que la gente se va, corta las partes que no retienen y te entrega el video editado para ver y descargar. Lo que cortar no resuelve llega en un plan, cada punto con su segundo." },
    ],
  },
  {
    slug: "curva-de-retencion-de-instagram",
    locale: "es",
    topic: "retention-graph",
    title: "Curva de retención de Instagram: cómo leerla y qué cambiar",
    description: "Dónde está el gráfico de retención del Reel, cómo leer la curva, qué significa cada caída y cómo encontrar la frase que hizo que la gente se fuera.",
    published: "2026-10-01",
    updated: "2026-10-01",
    minutes: 6,
    blocks: [
      { type: "p", text: "Las vistas dicen a cuántas personas llegó el video. La curva de retención dice qué hicieron después: en qué segundo se fueron. Es el dato más útil para quien edita, porque señala exactamente la parte del video que necesita cambiar." },
      { type: "h2", text: "Dónde encontrar el gráfico" },
      { type: "p", text: "Abre el Reel en tu perfil, toca Ver estadísticas y desliza hasta la parte de retención. El gráfico muestra, a lo largo de la duración del video, el porcentaje de personas que seguían viendo. Los nombres de los menús cambian de una versión de la app a otra, pero el gráfico es el que empieza alto y baja de izquierda a derecha." },
      { type: "h2", text: "Cómo leer la curva" },
      { type: "p", text: "Toda curva baja: es normal perder gente a lo largo del video. Lo que importa es la forma de la bajada." },
      { type: "ul", items: [
        "Caída brusca al inicio: el gancho no retuvo. La gente vio los primeros segundos y no encontró motivo para quedarse.",
        "Un escalón en la mitad: algo específico en ese segundo hizo que la gente se fuera. Una pausa, una frase que da vueltas, un cambio de tema, una imagen fija.",
        "Bajada suave y constante: el video no tiene un problema puntual; el ritmo general puede ser lento.",
        "Una subida en algún punto: gente volviendo para ver de nuevo una parte. Normalmente es lo que más les interesó, y una pista de qué poner antes.",
      ] },
      { type: "h2", text: "De la caída a la frase" },
      { type: "p", text: "El gráfico dice cuándo, pero no por qué. Para eso tienes que cruzar el segundo de la caída con lo que pasaba en el video. Anota el segundo en que la curva cae con más fuerza, abre el video y pausa un poco antes de ese punto. Escucha la frase que decías y mira qué aparece en pantalla." },
      { type: "p", text: "Como el gráfico es aproximado, considera también la frase anterior y la siguiente. Muchas veces la causa es una promesa que tarda en cumplirse, y la persona se va justo después de darse cuenta." },
      { type: "example", text: "Caída a los 4 segundos, y a los 4 segundos decías: \"Entonces, antes que nada, déjame darte un poco de contexto\". La solución probable es cortar ese contexto e ir directo al punto." },
      { type: "h2", text: "Compara videos, no solo el mismo video" },
      { type: "p", text: "Una curva sola ya ayuda. Varias, lado a lado, muestran patrones: quizá todos tus videos pierden gente en el mismo tipo de apertura, o cada vez que muestras lo mismo. Ese patrón es lo que vale la pena cambiar en tu forma de grabar, y no solo en un video." },
      { type: "cta", text: "Envía el video y la captura de la curva de retención a Publishub: lee el gráfico, encuentra la frase que dijiste en el segundo de la caída, explica por qué la gente se fue y te entrega el video editado. Sin la captura, estima el punto probable a partir del propio video." },
    ],
  },
  {
    slug: "editar-reels-con-ia",
    locale: "es",
    topic: "ai-editing",
    title: "Cómo editar Reels con IA (y lo que sigue siendo tuyo)",
    description: "Lo que la IA ya hace al editar Reels (cortar pausas, encontrar partes muertas, señalar un gancho débil) y lo que sigue siendo tu decisión. Paso a paso.",
    published: "2026-10-01",
    updated: "2026-10-01",
    minutes: 6,
    blocks: [
      { type: "p", text: "Editar con IA no significa apretar un botón y recibir un video viral. Significa quitarte de encima la parte repetitiva de la edición, la que lleva tiempo y no necesita gusto, para que gastes tu energía en lo que solo tú decides." },
      { type: "h2", text: "Lo que la IA ya hace bien" },
      { type: "ul", items: [
        "Transcribir lo que dices, con el tiempo de cada frase. Con el texto en la mano, es fácil ver repeticiones y rodeos.",
        "Encontrar silencios y pausas largas midiendo el audio, y sugerir dónde cortar.",
        "Detectar partes que no aportan nada: la introducción de contexto, la idea dicha dos veces, el final que se alarga.",
        "Señalar el segundo en que el video probablemente pierde gente, leyendo el gráfico de retención o el propio video.",
        "Generar subtítulos automáticos.",
      ] },
      { type: "h2", text: "Lo que sigue siendo tuyo" },
      { type: "ul", items: [
        "El tono. Una pausa puede ser una respiración o el momento de impacto de un chiste. Solo tú sabes cuál es cuál.",
        "Lo que promete el video. La IA puede decirte que el gancho es débil, pero la promesa correcta depende de lo que quieres que sienta tu público.",
        "Volver a grabar. Si la mejor solución es decir la frase de otra forma, la cámara sigue siendo tuya.",
        "La decisión final. Cada corte sugerido es una sugerencia. Míralo antes de publicar.",
      ] },
      { type: "h2", text: "Un flujo que funciona" },
      { type: "ol", items: [
        "Graba como ya grabas. No necesitas cambiar nada para usar IA en la edición.",
        "Deja que la IA haga el primer corte: quitar pausas, la introducción que da vueltas y las partes repetidas.",
        "Mira la versión cortada completa, de preferencia en el celular, como la verá tu público.",
        "Ajusta lo que quedó mal: devuelve una parte que hacía falta, corta otra que se escapó.",
        "Haz en tu editor lo que no es corte: texto en pantalla, b-roll, música.",
        "Después de publicar, mira la curva de retención. Es ella la que dice si la edición funcionó.",
      ] },
      { type: "h2", text: "Cuidado con cortar de más" },
      { type: "p", text: "Quitar todas las pausas deja el video acelerado y cansado. El objetivo no es el video más corto posible, sino que no haya ningún momento en que la persona se quede sin motivo para seguir. Si después del corte tu forma de hablar suena atropellada, devuélvele un poco de respiro." },
      { type: "cta", text: "En Publishub, la IA analiza tu Reel, corta las partes que hacen que la gente se vaya y te entrega el video editado. Si no te gusta, solo escribe qué cambiarías y lo rehace. El original queda intacto." },
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

/** O mesmo guia em todos os idiomas em que ele existe, ele incluído. */
export function translationsOf(guide: Guide): Guide[] {
  return GUIDES.filter((other) => other.topic === guide.topic);
}

/**
 * As tags hreflang de um guia: cada tradução no endereço dela (o slug muda de um
 * idioma para outro) e o x-default na versão em inglês, quando ela existe.
 */
export function guideLanguages(guide: Guide): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const translation of translationsOf(guide)) languages[translation.locale] = localePath(translation.locale, guidePath(translation.slug));
  if (languages.en) languages["x-default"] = languages.en;
  return languages;
}

/** Os outros guias do mesmo idioma: o "Leia também" no fim de cada um. */
export function relatedGuides(guide: Guide): Guide[] {
  return guidesIn(guide.locale).filter((other) => other.slug !== guide.slug);
}
