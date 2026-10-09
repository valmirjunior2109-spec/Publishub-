/**
 * O texto dos criativos, em PT e EN. Nada de número inventado: as curvas são
 * "exemplo" e as falas são as do vídeo de demonstração da landing.
 */
module.exports = {
  pt: {
    site: "getpublishub.com",
    example: "exemplo",
    swipe: "arraste →",
    save: "Salve para revisar antes de postar",
    change: "Troque por",
    carousel: {
      cover: {
        kicker: "Edição de Reels",
        title: "Seu Reel não flopou. Ele perdeu as pessoas no segundo 4.",
        drop: "0:04 · a atenção cai aqui",
        foot: "5 erros de edição que fazem isso",
      },
      errors: [
        {
          title: "Abrir com “Oi, gente”.",
          lines: [{ time: "0:00", text: "Oi, gente, tudo bem? Hoje eu quero contar uma coisa.", mark: "cut", note: "o gancho demora demais" }],
          fix: "Comece pelo resultado: “30 dias sem café. Isso mudou.”",
        },
        {
          title: "Contexto antes da promessa.",
          lines: [{ time: "0:03", text: "Então, antes de tudo, deixa eu dar um contexto rápido.", mark: "cut", note: "a pessoa ainda não sabe por que ficar" }],
          fix: "Diga primeiro o que a pessoa ganha ficando. O contexto vem depois, se vier.",
        },
        {
          title: "Legenda que chega atrasada.",
          timing: { said: "você fala “dormi 2 horas a mais”", saidAt: "0:12", shown: "o texto aparece na tela", shownAt: "0:14", gap: "2 segundos sem nada pra ler" },
          fix: "O número entra na tela no mesmo segundo em que você fala.",
        },
        {
          title: "Dizer a mesma coisa duas vezes.",
          lines: [
            { time: "0:14", text: "Na segunda semana, meu sono mudou completamente.", mark: "keep", note: "" },
            { time: "0:19", text: "Então, tipo, meu sono, meu sono mudou muito.", mark: "cut", note: "mesma ideia de 0:14" },
          ],
          fix: "Corte a repetição. Se já disse, siga em frente.",
        },
        {
          title: "A despedida longa.",
          lines: [{ time: "0:30", text: "Então é isso, gente, beijo, até o próximo.", mark: "cut", note: "as pessoas saem antes do fim" }],
          fix: "Termine no ponto alto, com um pedido só: “Salva pra testar amanhã.”",
        },
      ],
      errorLabel: "Erro",
      end: {
        title: "Agora reveja o seu último Reel com isso em mente.",
        checks: ["Abre com o resultado", "Promessa antes do contexto", "Legenda junto com a fala", "Nada repetido", "Termina no ponto alto"],
        product: "Ou envie o vídeo para o Publishub: ele aponta o segundo em que o público provavelmente sai e sugere o que mudar. Grátis para começar, sem cadastro.",
        link: "link na bio",
      },
    },
    checklist: {
      kicker: "Checklist · antes de postar",
      title: "7 coisas para revisar antes de postar seu Reel",
      items: [
        ["Gancho", "O que você diz ou mostra nos 3 primeiros segundos?"],
        ["Cortes", "Algum trecho não paga o tempo que ocupa?"],
        ["Ritmo", "Tem pausa para encurtar ou parte para acelerar?"],
        ["B-roll", "A tela fica parada enquanto você fala?"],
        ["Legendas", "O texto entra junto com a fala?"],
        ["Estrutura", "O melhor momento está cedo o bastante?"],
        ["CTA", "Tem um pedido só, no lugar certo?"],
      ],
      foot: "Salve e use no próximo vídeo",
    },
    meme: {
      top: "Você, depois de assistir o próprio Reel pela 10ª vez:",
      topQuote: "“Tá perfeito.”",
      bottom: "O público, no segundo 4:",
      bottomQuote: "*sai*",
      caption: "Depois da 10ª revisão, o olho acostuma. Um segundo par de olhos ajuda.",
    },
    cut: {
      kicker: "Exercício · 30 segundos",
      title: "Leia seu roteiro em voz alta. O que você cortaria, o público já pulou.",
      lines: [
        { time: "0:00", text: "Oi, gente, tudo bem? Hoje eu quero contar uma coisa.", mark: "cut", note: "gancho lento" },
        { time: "0:03", text: "Então, antes de tudo, deixa eu dar um contexto rápido.", mark: "cut", note: "a atenção cai aqui" },
        { time: "0:06", text: "Faz 30 dias que eu parei de tomar café.", mark: "keep", note: "o ponto alto. abra com isso" },
        { time: "0:09", text: "E a primeira semana foi a mais difícil de todas.", mark: "", note: "" },
        { time: "0:14", text: "Na segunda semana, meu sono mudou completamente.", mark: "", note: "" },
        { time: "0:19", text: "Então, tipo, meu sono, meu sono mudou muito.", mark: "cut", note: "repetido" },
        { time: "0:24", text: "Hoje eu acordo antes do despertador tocar.", mark: "", note: "" },
        { time: "0:30", text: "Então é isso, gente, beijo, até o próximo.", mark: "cut", note: "saem antes do fim" },
      ],
      final: "Edição final: 0:34 → 0:24",
    },
    hooks: {
      kicker: "Ganchos · salve",
      title: "5 aberturas para trocar hoje",
      pairs: [
        ["Oi, gente, tudo bem?", "Fiz isso por 30 dias. Olha o que aconteceu."],
        ["Hoje eu vou falar sobre…", "O erro que me custou [o resultado]."],
        ["Antes de começar, um contexto…", "Resultado primeiro: [o número]."],
        ["Esse vídeo é pra quem…", "Se você [situação], pare de [erro]."],
        ["Não esquece de me seguir!", "3 coisas que eu queria saber antes de [X]."],
      ],
      foot: "O gancho é a primeira coisa que o público decide",
    },
  },
  en: {
    site: "getpublishub.com",
    example: "example",
    swipe: "swipe →",
    save: "Save this to check before you post",
    change: "Try instead",
    carousel: {
      cover: {
        kicker: "Reels editing",
        title: "Your Reel didn't flop. It lost people at second 4.",
        drop: "0:04 · attention drops here",
        foot: "5 editing mistakes that cause it",
      },
      errors: [
        {
          title: "Opening with “Hey guys”.",
          lines: [{ time: "0:00", text: "Hey guys, how's it going? Today I want to tell you something.", mark: "cut", note: "the hook takes too long" }],
          fix: "Open with the result: “30 days without coffee. This changed.”",
        },
        {
          title: "Context before the promise.",
          lines: [{ time: "0:03", text: "So, before anything else, let me give you some quick context.", mark: "cut", note: "they don't know why to stay yet" }],
          fix: "Say what they get by staying first. Context comes later, if at all.",
        },
        {
          title: "Captions that show up late.",
          timing: { said: "you say “I slept 2 hours more”", saidAt: "0:12", shown: "the text appears on screen", shownAt: "0:14", gap: "2 seconds with nothing to read" },
          fix: "Put the number on screen the same second you say it.",
        },
        {
          title: "Saying the same thing twice.",
          lines: [
            { time: "0:14", text: "In the second week, my sleep changed completely.", mark: "keep", note: "" },
            { time: "0:19", text: "So, uh, like, my sleep, my sleep really changed.", mark: "cut", note: "same idea as 0:14" },
          ],
          fix: "Cut the repeat. If you said it, move on.",
        },
        {
          title: "The long goodbye.",
          lines: [{ time: "0:30", text: "So that's it, guys, bye, see you in the next one.", mark: "cut", note: "people leave before the end" }],
          fix: "End on the high point, with one ask: “Save this to try tomorrow.”",
        },
      ],
      errorLabel: "Mistake",
      end: {
        title: "Now rewatch your last Reel with this in mind.",
        checks: ["Opens with the result", "Promise before context", "Captions with the speech", "Nothing repeated", "Ends on the high point"],
        product: "Or send the video to Publishub: it points to the second your audience most likely leaves and suggests what to change. Free to start, no account.",
        link: "link in bio",
      },
    },
    checklist: {
      kicker: "Checklist · before you post",
      title: "7 things to check before you post your Reel",
      items: [
        ["Hook", "What do you say or show in the first 3 seconds?"],
        ["Cuts", "Is there a stretch that doesn't earn its time?"],
        ["Pacing", "A pause to trim, a part to speed up?"],
        ["B-roll", "Does the screen sit still while you talk?"],
        ["Captions", "Does the text come in with the speech?"],
        ["Structure", "Is the best moment early enough?"],
        ["CTA", "One ask, in the right place?"],
      ],
      foot: "Save it for your next video",
    },
    meme: {
      top: "You, after watching your own Reel for the 10th time:",
      topQuote: "“It's perfect.”",
      bottom: "Your audience, at second 4:",
      bottomQuote: "*leaves*",
      caption: "After the 10th pass, your eye gets used to it. A second pair of eyes helps.",
    },
    cut: {
      kicker: "Exercise · 30 seconds",
      title: "Read your script out loud. What you'd cut, your audience already skipped.",
      lines: [
        { time: "0:00", text: "Hey guys, how's it going? Today I want to tell you something.", mark: "cut", note: "slow hook" },
        { time: "0:03", text: "So, before anything else, let me give you some quick context.", mark: "cut", note: "attention drops here" },
        { time: "0:06", text: "It's been 30 days since I quit coffee.", mark: "keep", note: "the payoff. open with it" },
        { time: "0:09", text: "And the first week was the hardest of all.", mark: "", note: "" },
        { time: "0:14", text: "In the second week, my sleep changed completely.", mark: "", note: "" },
        { time: "0:19", text: "So, uh, like, my sleep, my sleep really changed.", mark: "cut", note: "repeated" },
        { time: "0:24", text: "Now I wake up before the alarm goes off.", mark: "", note: "" },
        { time: "0:30", text: "So that's it, guys, bye, see you in the next one.", mark: "cut", note: "they leave first" },
      ],
      final: "Final edit: 0:34 → 0:24",
    },
    hooks: {
      kicker: "Hooks · save this",
      title: "5 openings to swap today",
      pairs: [
        ["Hey guys, how's it going?", "I did this for 30 days. Here's what happened."],
        ["Today I'm going to talk about…", "The mistake that cost me [the result]."],
        ["Before we start, some context…", "Result first: [the number]."],
        ["This video is for anyone who…", "If you [situation], stop [mistake]."],
        ["Don't forget to follow me!", "3 things I wish I knew before [X]."],
      ],
      foot: "The hook is the first thing your audience decides on",
    },
  },
};
