import Link from "next/link";
import type { ReactNode } from "react";
import type { FaqItem } from "@/components/FaqList";
import { FOUNDING_PERKS, FOUNDING_PERKS_PT, FOUNDING_TERMS, STILLWORKS_URL } from "@/lib/founding";
import type { Locale } from "@/lib/i18n";
import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";

/**
 * Os textos da home nos dois idiomas. A estrutura (seções, ícones, componentes) fica em components/home/HomePage.tsx;
 * aqui só o que se lê. O português não é tradução palavra por palavra: é o mesmo argumento, escrito para quem lê em português.
 *
 * Regra de honestidade: hoje existe o teste grátis (/check, páginas públicas, só leitura), a lista de espera, a reserva
 * Founding e o stillworks. Jornadas com login, verificação contínua, comparação entre versões e alertas estão em
 * desenvolvimento, e o texto sempre diz isso.
 */

const N = FOUNDING_TERMS.noticeDays;
const R = FOUNDING_TERMS.refundDays;

const en = {
  meta: {
    title: "Don't let your next bug be found by a user",
    description:
      "Publishub is an independent check for apps built with AI. Check your app's public pages free in a real browser today; continuous checks of sign-up, login and checkout are in development.",
  },
  hero: {
    context: "Pre-launch. The free check is available now.",
    h1: "Don't let your next bug be found by a user.",
    sub: "Publishub is being built to check the journeys your users actually take (sign-up, login and checkout) and tell you before they hit the problem.",
    check: "Check my app free",
    founding: "Reserve a Founding Customer spot",
    stillworks: "See stillworks on GitHub",
    builtBy: "Built in public by",
    builtByAfter: ", a solo founder who reads every reply.",
    builtFor: "For apps built with",
  },
  problem: {
    eyebrow: "The problem",
    title: "Building an app with AI got easy. Knowing it still works didn't.",
    p1: "Tools like Claude Code, Cursor, Lovable, Bolt and v0 make building software fast. But a change can compile, pass lint and tests, and still break sign-up, login, a form or checkout.",
    p2: "Whoever decides if the change worked is usually the same agent that wrote it. And it always says “done”.",
    p3: "In the end, the person who finds the problem is your user.",
    label: "A night you might recognize",
    timeline: [
      { time: "11:48 PM", text: "You ask for one small change." },
      { time: "11:52 PM", text: "The AI says: “Done. Everything works.”" },
      { time: "11:52 PM", text: "You deploy." },
      { time: "8:15 AM", text: "A user writes: “I tried to sign up three times. Nothing happens.”" },
    ],
    check: "Check my app free",
  },
  how: {
    eyebrow: "How it works",
    title: "An independent check, done from outside the agent.",
    steps: [
      { title: "Paste your app's URL", text: "Any public address, from any AI tool or host." },
      { title: "We open your public pages in a real browser", text: "Desktop and phone, the way a visitor would." },
      { title: "We list what's broken", text: "Crashes, failed requests and broken pages." },
      { title: "You get a clear report", text: "Each problem with the page it happened on and the evidence." },
      { title: "Hand it to your agent", text: "Copy the report into Claude Code, Cursor or another agent to investigate." },
    ],
    today: "Today: the free check opens public pages only. It's read-only: it never logs in and never submits forms.",
    planned: "In development: checks of sign-up, login and checkout, on a schedule, with alerts.",
  },
  proof: {
    eyebrow: "What you get",
    title: "A problem found before your user is worth more than a pretty dashboard.",
    sample: "Illustrative example",
    found: "We found 2 possible problems",
    tiles: ["Crashes", "Failed requests", "Broken pages"],
    rows: [
      { kind: "Failed request", title: "A request failed (HTTP 500)", route: "/api/plans" },
      { kind: "Broken page", title: "A page shows “not found”", route: "/dashboard" },
    ],
    agent: "Copy the report into your AI agent and investigate the root cause.",
    check: "Check my app free",
  },
  founder: {
    eyebrow: "A note from the founder",
    photoAlt: "Valmir, founder of Publishub",
    title: "Hi, I'm Valmir.",
    p1: "I'm a solo founder in Salvador, Brazil, and I build with the same AI tools you do. They made me faster than I ever imagined. They also taught me that “done” doesn't always mean “working”.",
    p2: "I'm building Publishub so that people who build alone get the safety net big teams take for granted: something that checks, every time, before your users do.",
    p3: (
      <>
        Every email to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> reaches me. Tell me what broke in your app, and what you&apos;d want Publishub to check first.
      </>
    ) as ReactNode,
    sign: `Valmir, founder of ${SITE_NAME}`,
  },
  founding: {
    eyebrow: "Founding Customers",
    title: "Reserve your Founding Customer spot.",
    sub: "For people who want to protect the flows that can't break.",
    badge: "Pre-launch",
    today: "$0 today",
    afterLaunch: "after launch",
    perksTitle: "What you get when Publishub launches:",
    perks: [...FOUNDING_PERKS] as string[],
    zero: "Reserving costs $0 today. Nothing is charged before launch.",
    notYet: `${SITE_NAME} isn't available yet. Reserving doesn't give you immediate access, and there's no launch date yet.`,
    howTitle: "How the reservation works",
    step1: (
      <>
        <strong>Today:</strong> reserve your spot with your card. Stripe stores it securely and <strong>you&apos;re charged $0</strong>. No subscription starts.
      </>
    ) as ReactNode,
    step2: (
      <>
        <strong>At launch:</strong> we email you at least {N} days before your first charge, with the exact date. Cancel before then and you pay nothing.
      </>
    ) as ReactNode,
    step3a: "After that:",
    step3b: `, billed monthly at the founding price. Cancel anytime; your first payment is refundable on request within ${R} days.`,
    reserve: "Reserve a Founding Customer spot",
    details: "Everything about Founding Customers",
    secure: "Secure card storage by Stripe. Cancel anytime by emailing",
    terms: "Full terms",
  },
  stillworks: {
    eyebrow: "Open source",
    title: "Rather run it in your own environment?",
    p1: "stillworks is Publishub's open-source core. It runs the same journeys in a real browser, but you run and maintain it yourself, in the terminal or through Claude Code and Cursor.",
    p2: "Publishub is for people who don't want to maintain that alone, or don't use a terminal at all.",
    cta: "See stillworks on GitHub",
  },
  feedback: {
    eyebrow: "Tell us what you think",
    title: "Would you trust this with your app?",
    sub: "Read-only by default, dry-run side effects and the “who can see what” check all started as someone's comment.",
    body: "Tell us what's missing, what you'd change, or why it's not for you. It goes straight to the founder, and it shapes what we build next.",
  },
  faqTitle: "Questions",
  faq: [
    {
      q: "Does Publishub replace automated tests?",
      a: "No. It's an external, independent layer of verification. It shows what broke; you or your agent fix it.",
    },
    {
      q: "Is Publishub a security scanner?",
      a: "No. It doesn't look for data leaks or vulnerabilities.",
    },
    {
      q: "Does Publishub write or fix code?",
      a: "No. It shows what broke. You or your agent fix it.",
    },
    {
      q: "Does /check test flows behind a login?",
      a: (
        <>
          Not yet. Today the <Link href="/check">free check</Link> only opens public pages, and it&apos;s read-only: it never logs in and never submits forms.
        </>
      ),
    },
    {
      q: "When will continuous checks be available?",
      a: "We're still building it, and there's no launch date yet. Join the waitlist to follow the launch; you'll hear from us by email first.",
    },
    {
      q: "Does the Founding Customer reservation charge anything today?",
      a: `No. Reserving stores your card securely with Stripe and charges $0, and no subscription starts. When Publishub launches, we'll email you at least ${N} days before your first charge. Cancel before then and you pay nothing. After that, the founding price is billed monthly, you can cancel anytime, and your first payment is refundable on request within ${R} days.`,
    },
    {
      q: "Will it touch my production database?",
      a: "The plan: on your live app it's read-only by default. It walks each flow and stops before the final submit. Writing is opt-in, flow by flow, with tagged test accounts, dry-run side effects (email, webhooks, payments) and a log of every write.",
    },
    {
      q: "What's the difference between stillworks and Publishub?",
      a: (
        <>
          <a href={STILLWORKS_URL}>stillworks</a> is free and open source (MIT): you write the journeys and run them yourself, from your terminal, your agent or CI. Publishub, in development, is the
          hosted version: your flows set up with you, checked for you, without a terminal or CI.
        </>
      ),
    },
  ] as FaqItem[],
  final: {
    title: "Ship with more confidence.",
    text: "Check your app's public pages now. Then reserve a Founding Customer spot to protect the flows that can't break.",
    check: "Check my app free",
    founding: "Reserve a Founding Customer spot",
    waitlistTitle: "Just want to follow the launch?",
    waitlistText: "Join the free waitlist. Only launch emails, unsubscribe anytime.",
    submit: "Join the waitlist",
  },
};

export type HomeCopy = typeof en;

const pt: HomeCopy = {
  meta: {
    title: "Não deixe o próximo bug ser descoberto pelo seu usuário",
    description:
      "A Publishub é uma verificação independente para apps criados com IA. Teste grátis as páginas públicas do seu app num navegador de verdade; a verificação contínua de cadastro, login e checkout está em desenvolvimento.",
  },
  hero: {
    context: "Pré-lançamento. O teste gratuito já está disponível.",
    h1: "Não deixe o próximo bug ser descoberto pelo seu usuário.",
    sub: "A Publishub está sendo construída para verificar as jornadas que seus usuários realmente fazem (cadastro, login e checkout) e avisar você antes que eles descubram o problema.",
    check: "Testar meu app grátis",
    founding: "Reservar Founding Customer",
    stillworks: "Ver o stillworks no GitHub",
    builtBy: "Construído em público por",
    builtByAfter: ", um fundador solo que lê cada resposta.",
    builtFor: "Para apps feitos com",
  },
  problem: {
    eyebrow: "O problema",
    title: "Criar um app com IA ficou fácil. Saber se ele continua funcionando não.",
    p1: "Ferramentas como Claude Code, Cursor, Lovable, Bolt e v0 aceleram a criação de software. Mas uma mudança pode compilar, passar no lint e nos testes, e ainda quebrar o cadastro, o login, um formulário ou o checkout.",
    p2: "Quem decide se a mudança funcionou costuma ser o mesmo agente que a escreveu. E ele sempre diz “pronto”.",
    p3: "No fim, quem descobre o problema é o usuário.",
    label: "Uma noite que você talvez conheça",
    timeline: [
      { time: "23:48", text: "Você pede uma mudança pequena." },
      { time: "23:52", text: "A IA diz: “Done. Everything works.”" },
      { time: "23:52", text: "Você publica." },
      { time: "08:15", text: "Um usuário escreve: “Tentei me cadastrar três vezes. Não acontece nada.”" },
    ],
    check: "Testar meu app grátis",
  },
  how: {
    eyebrow: "Como funciona",
    title: "Uma verificação independente, feita de fora do agente.",
    steps: [
      { title: "Você cola a URL do seu app", text: "Qualquer endereço público, de qualquer ferramenta de IA ou hospedagem." },
      { title: "A Publishub abre as páginas públicas num navegador real", text: "No desktop e no celular, como um visitante faria." },
      { title: "Ela lista o que está quebrado", text: "Crashes, requisições que falham e páginas quebradas." },
      { title: "Você recebe um relatório claro", text: "Cada problema com a página onde aconteceu e a evidência." },
      { title: "Seu agente investiga", text: "Copie o relatório para o Claude Code, o Cursor ou outro agente investigar." },
    ],
    today: "Hoje: o teste grátis abre só páginas públicas. É somente leitura: nunca faz login nem envia formulários.",
    planned: "Em desenvolvimento: a verificação de cadastro, login e checkout, de forma contínua, com alertas.",
  },
  proof: {
    eyebrow: "O que você recebe",
    title: "Um problema encontrado antes do usuário vale mais que um dashboard bonito.",
    sample: "Exemplo ilustrativo",
    found: "Encontramos 2 possíveis problemas",
    tiles: ["Crashes", "Requisições com falha", "Páginas quebradas"],
    rows: [
      { kind: "Requisição com falha", title: "Uma requisição falhou (HTTP 500)", route: "/api/planos" },
      { kind: "Página quebrada", title: "Uma página mostra “não encontrado”", route: "/painel" },
    ],
    agent: "Copie o relatório para o seu agente de IA e investigue a causa raiz.",
    check: "Testar meu app grátis",
  },
  founder: {
    eyebrow: "Uma nota do fundador",
    photoAlt: "Valmir, fundador do Publishub",
    title: "Oi, eu sou o Valmir.",
    p1: "Sou um fundador solo em Salvador e construo com as mesmas ferramentas de IA que você. Elas me deixaram mais rápido do que eu imaginava. Também me ensinaram que “pronto” nem sempre quer dizer “funcionando”.",
    p2: "Estou construindo a Publishub para que quem constrói sozinho tenha a rede de proteção que times grandes têm: algo que confere, toda vez, antes dos seus usuários.",
    p3: (
      <>
        Todo e-mail para <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> chega em mim. Me conte o que quebrou no seu app e o que você gostaria que a Publishub verificasse primeiro.
      </>
    ) as ReactNode,
    sign: `Valmir, fundador da ${SITE_NAME}`,
  },
  founding: {
    eyebrow: "Founding Customers",
    title: "Reserve sua vaga de Founding Customer.",
    sub: "Para quem quer proteger os fluxos que não podem quebrar.",
    badge: "Pré-lançamento",
    today: "US$ 0 hoje",
    afterLaunch: "depois do lançamento",
    perksTitle: "O que você recebe quando a Publishub lançar:",
    perks: [...FOUNDING_PERKS_PT] as string[],
    zero: "A reserva é por US$ 0 hoje. Não haverá cobrança antes do lançamento.",
    notYet: `A ${SITE_NAME} ainda não está disponível. A reserva não dá acesso imediato, e ainda não há data de lançamento.`,
    howTitle: "Como a reserva funciona",
    step1: (
      <>
        <strong>Hoje:</strong> você reserva com o seu cartão. O Stripe guarda com segurança e <strong>cobra US$ 0</strong>. Nenhuma assinatura começa.
      </>
    ) as ReactNode,
    step2: (
      <>
        <strong>No lançamento:</strong> avisamos por e-mail pelo menos {N} dias antes da primeira cobrança, com a data exata. Cancele antes e você não paga nada.
      </>
    ) as ReactNode,
    step3a: "Depois disso:",
    step3b: `, cobrado por mês no preço de fundador. Cancele quando quiser; o primeiro pagamento é reembolsável a pedido em até ${R} dias.`,
    reserve: "Reservar Founding Customer",
    details: "Tudo sobre Founding Customers",
    secure: "Cartão guardado com segurança pelo Stripe. Cancele quando quiser pelo e-mail",
    terms: "Termos completos (em inglês)",
  },
  stillworks: {
    eyebrow: "Open source",
    title: "Prefere rodar no seu próprio ambiente?",
    p1: "O stillworks é o núcleo open source da Publishub. Ele roda as mesmas jornadas num navegador real, mas quem roda e mantém é o próprio dev, no terminal ou pelo Claude Code e Cursor.",
    p2: "A Publishub é para quem não quer manter isso sozinho, ou nem usa terminal.",
    cta: "Ver o stillworks no GitHub",
  },
  feedback: {
    eyebrow: "Diga o que você acha",
    title: "Você confiaria isso ao seu app?",
    sub: "Só leitura por padrão, efeitos colaterais em modo de teste e a verificação de “quem vê o quê” começaram como o comentário de alguém.",
    body: "Diga o que está faltando, o que você mudaria ou por que não é para você. Vai direto para o fundador e decide o que construímos a seguir.",
  },
  faqTitle: "Dúvidas",
  faq: [
    {
      q: "A Publishub substitui testes automatizados?",
      a: "Não. Ela é uma camada de verificação externa e independente. Ela mostra o que quebrou; quem corrige é você ou seu agente.",
    },
    {
      q: "A Publishub é um scanner de segurança?",
      a: "Não. Ela não procura vazamento de dados nem vulnerabilidades.",
    },
    {
      q: "A Publishub escreve ou corrige código?",
      a: "Não. Ela mostra o que quebrou. Quem corrige é você ou seu agente.",
    },
    {
      q: "O /check testa fluxos com login?",
      a: (
        <>
          Ainda não. Hoje o <Link href="/pt/check">teste grátis</Link> abre só páginas públicas e é somente leitura: nunca faz login nem envia formulários.
        </>
      ),
    },
    {
      q: "Quando a verificação contínua estará disponível?",
      a: "Ainda estamos em desenvolvimento, e não há data de lançamento. Entre na waitlist para acompanhar; você fica sabendo primeiro, por e-mail.",
    },
    {
      q: "A reserva de Founding Customer cobra algo hoje?",
      a: `Não. A reserva guarda seu cartão com segurança no Stripe e cobra US$ 0, e nenhuma assinatura começa. No lançamento, avisamos por e-mail pelo menos ${N} dias antes da primeira cobrança. Cancele antes e você não paga nada. Depois disso, o preço de fundador é cobrado por mês, você cancela quando quiser e o primeiro pagamento é reembolsável a pedido em até ${R} dias.`,
    },
    {
      q: "Ela vai mexer no meu banco de dados em produção?",
      a: "O plano: no app em produção, só leitura por padrão. Ela percorre cada fluxo e para antes do envio final. Escrever é opcional, fluxo por fluxo, com contas de teste marcadas, efeitos colaterais (e-mail, webhooks, pagamentos) em modo de teste e um registro de cada escrita.",
    },
    {
      q: "Qual a diferença entre o stillworks e a Publishub?",
      a: (
        <>
          O <a href={STILLWORKS_URL}>stillworks</a> é grátis e open source (MIT): você escreve as jornadas e roda sozinho, no terminal, pelo agente ou no CI. A Publishub, em desenvolvimento, é a versão
          hospedada: seus fluxos configurados com você e verificados para você, sem terminal nem CI.
        </>
      ),
    },
  ] as FaqItem[],
  final: {
    title: "Publique com mais confiança.",
    text: "Teste as páginas públicas do seu app agora. Depois, reserve uma vaga de Founding Customer para proteger os fluxos que não podem quebrar.",
    check: "Testar meu app grátis",
    founding: "Reservar Founding Customer",
    waitlistTitle: "Só quer acompanhar o lançamento?",
    waitlistText: "Entre na waitlist grátis. Só e-mails sobre o lançamento, saia quando quiser.",
    submit: "Entrar na waitlist",
  },
};

export const HOME_COPY: Record<Locale, HomeCopy> = { en, pt };
