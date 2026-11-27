import Link from "next/link";
import type { ReactNode } from "react";
import type { FaqItem } from "@/components/FaqList";
import { FOUNDING_PERKS, FOUNDING_PERKS_PT, FOUNDING_TERMS, STILLWORKS_URL } from "@/lib/founding";
import type { Locale } from "@/lib/i18n";
import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";

/**
 * Os textos da home nos dois idiomas. A estrutura (seções, ícones, componentes) fica em components/home/HomePage.tsx;
 * aqui só o que se lê. O português não é tradução palavra por palavra: é o mesmo argumento, escrito para quem lê em português.
 */

const N = FOUNDING_TERMS.noticeDays;
const R = FOUNDING_TERMS.refundDays;

const en = {
  meta: {
    title: "Your AI writes the code. Who verifies it actually works?",
    description:
      "Publishub helps developers verify AI-generated code changes, detect application regressions, and catch broken user journeys before they reach production. Join the early-access waitlist.",
  },
  hero: {
    pill: "Early access is open",
    pillSub: "In development",
    h1a: "Your AI writes the code.",
    h1b: "Who verifies it actually works?",
    sub: "The build passes, but checkout quietly broke. Publishub will walk the flows that make you money in a real browser, after every AI change and every hour, and show you what broke, without putting your real data at risk.",
    join: "Join the waitlist",
    builtBy: "Built in public by",
    builtByAfter: ", a solo founder who reads every reply.",
    builtFor: "Built for anyone shipping with",
    stillworks: "Built on StillWorks, our open-source core",
    check: "Or check your app free right now",
  },
  problem: {
    eyebrow: "The problem",
    title: "Generated code isn't verified code",
    sub: "AI can write a feature in minutes. Whether your app still works afterwards is a different question, and today the answer is usually you, clicking around.",
    items: [
      { title: "Broken functionality", text: "A change can compile, pass lint and still break a button, a form or an API call." },
      { title: "Regressions you didn't ask for", text: "Agents touch more than the task. A fix in one file quietly breaks a flow somewhere else." },
      { title: "Broken user journeys", text: "Sign-up, checkout and onboarding fail at step four, where unit tests rarely look." },
      { title: "Manual testing overhead", text: "Clicking through the app after every AI change eats the time the agent saved you." },
      { title: "Uncertainty before deploying", text: "Without evidence, every deploy is a guess: ship and hope, or hold back." },
    ],
    closing: "Writing code got faster. Knowing it works didn't.",
    join: "Join the waitlist",
  },
  night: {
    eyebrow: "If you build alone",
    title: "You shouldn't have to find out from your users.",
    sub: "No QA team. No one to ask “does this still work?” Just you, an AI that sounds sure of itself, and the people who trusted your app enough to try it.",
    body: "Publishub exists for that moment, so it stops happening. You can start today: check your own app, for free, in about a minute.",
    check: "Check my app free",
    join: "Join the waitlist",
    label: "A night you might recognize",
    timeline: [
      { time: "11:48 PM", text: "You ask the AI for one small change. It replies: “Done. Everything works.”" },
      { time: "11:52 PM", text: "You deploy. It looks fine on your screen. You finally go to sleep." },
      { time: "8:15 AM", text: "An email from a user: “I tried to sign up three times. Nothing happens.”" },
      { time: "8:16 AM", text: "You don't know how long it's been broken, or how many people quietly left." },
    ],
  },
  why: {
    eyebrow: "Why not just ask the agent?",
    title: "The agent's report is a claim, not a result",
    sub: "Asking your agent to test its own work helps. But the same system that wrote the change is grading it, and agents sometimes report passing tests they never ran, or rewrite a failing test so it passes.",
    agentTitle: "The agent checking its own work",
    agent: ["The same agent that wrote the change decides if it works", "Runs when you remember to ask for it", "Usually only inside one editor or tool", "One run, with nothing to compare it to"],
    usTitle: "Publishub (what we're building)",
    us: [
      "An independent check, outside the agent",
      "Runs after every change and every hour, the same way each time",
      "Works with any AI coding tool, because it tests the running app",
      "Compared with the last version that worked, so you know what this change broke",
    ],
  },
  safety: {
    eyebrow: "Safe on your live app",
    title: "Read freely. Write only what you approved.",
    sub: "We asked builders whether they'd let a bot touch their production app. The answer was clear: the real question is write access, not the environment. So that's how we're building it.",
    items: [
      { title: "Read-only on your live app by default", text: "It walks each flow and stops right before the final submit. Writing to production is opt-in, flow by flow." },
      { title: "Side effects run as a dry run", text: "During setup you mark the flows that send email, fire webhooks or touch payments. Those never fire for real unless you say so." },
      { title: "Test data tagged by what your app already stores", text: "Test accounts use a non-deliverable email domain, so they're easy to filter out. No schema changes, no test-flag column." },
      { title: "A log of every write", text: "If a flow does write, you see every row it created, and cleanup only ever touches rows that same run created." },
      { title: "Checks who can see what", text: "A second test user tries to open the first one's records. If it can, that's a failure, not a pass." },
      { title: "Runs on preview deploys too", text: "No staging? Point it at your Vercel or Netlify preview and it can block a pull request when a key flow breaks." },
    ],
    alert: "You're only alerted when a flow fails twice in a row, so a slow page at 3 AM doesn't wake you up.",
  },
  how: {
    eyebrow: "How it will work",
    title: "From AI change to evidence in four steps",
    steps: [
      { title: "Pick the 5 flows that make you money", text: "Point Publishub at your preview deploy or live app and choose what must never break: sign-up, login, checkout, your core action." },
      { title: "Check after every change, and every hour", text: "Publishub walks those flows in a real browser on each deploy and keeps checking your live app hourly, read-only by default." },
      { title: "Identify failures and regressions", text: "Each result is compared with the last version that worked, so you see what this change broke." },
      { title: "Get actionable evidence", text: "What passed, what failed and what it didn't check, with the failing step, a screenshot and a bug report for your coding agent." },
    ],
    note: "This is the workflow we're building. Supported setups and integrations aren't available yet; we'll confirm them with early-access members first.",
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
  open: {
    eyebrow: "Open source core",
    title: "StillWorks checks when you ask. Publishub watches for you.",
    sub: "The engine is free and open source, and it stays that way. Publishub is for when you'd rather not maintain it yourself, or don't have a terminal at all.",
    colFree: "StillWorks · free, MIT",
    colPaid: "Publishub · Founding Customers",
    rows: [
      { label: "Setup", stillworks: "You write and maintain the journeys", publishub: "Set up with you, 1:1, by the founder" },
      { label: "When it runs", stillworks: "When you, your agent or CI run it", publishub: "Every deploy, plus every hour on your live app" },
      { label: "When something breaks", stillworks: "A report in your terminal or CI log", publishub: "An alert, only after two failures in a row" },
      { label: "History", stillworks: "One run at a time", publishub: "Each run compared with your last working version" },
      { label: "Production safety", stillworks: "Read-only checks; you decide the rest", publishub: "Read-only by default, dry-run side effects, a log of every write" },
      { label: "Who it's for", stillworks: "Developers with a terminal and CI", publishub: "Anyone with real users, including Lovable, Bolt and v0 apps" },
    ],
    reserve: "Reserve a founding spot · $0 today",
    github: "Use StillWorks free on GitHub",
  },
  pricing: {
    eyebrow: "Pricing",
    title: "Join free, or become a Founding Customer",
    sub: `${SITE_NAME} is in development. Both options put you in line for early access; neither charges you today.`,
    freeTitle: "Free Waitlist",
    free: "Free",
    freeSub: `Get notified when ${SITE_NAME} launches.`,
    freeItems: ["Join for free", "Receive product updates", `Get notified when ${SITE_NAME} launches`, "No payment required"],
    freeCta: "Join the waitlist",
    badge: "Early access · Coming soon",
    foundingTitle: "Founding Customers",
    today: "$0 today",
    afterLaunch: "after launch",
    foundingSub: `For builders whose app already has real users. You don't configure anything: we set up your critical flows together, and ${SITE_NAME} watches them for you.`,
    perks: [...FOUNDING_PERKS] as string[],
    notYet: `${SITE_NAME} isn't available yet.`,
    notYetText: "Reserving doesn't give you immediate access. You get access when the product launches, and we haven't set a launch date yet.",
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
    reserve: "Reserve my founding spot · $0 today",
    secure: "Secure card storage by Stripe. Cancel anytime by emailing",
    terms: "Full terms",
  },
  early: {
    eyebrow: "Early access",
    title: `Be among the first to experience ${SITE_NAME}.`,
    sub: `We're building a better way to verify software created with AI coding agents. Join the early-access waitlist and be notified when ${SITE_NAME} is ready.`,
    benefits: ["Early access to the first version", "Direct product updates from the founder", "A say in the roadmap: tell us what to verify first", "Access to the first public release"],
    submit: "Get Early Access",
  },
  feedback: {
    eyebrow: "Tell us what you think",
    title: "Would you trust this with your app?",
    sub: "Everything on this page came from builders telling us what they'd need. Read-only by default, dry-run side effects and the “who can see what” check all started as someone's comment.",
    body: "Tell us what's missing, what you'd change, or why it's not for you. It goes straight to the founder, and it shapes what we build next.",
  },
  faqTitle: "Questions",
  faq: [
    {
      q: "What is Publishub?",
      a: "A verification tool we're building for software written with AI coding agents. It checks that your application still behaves correctly after a change: it runs real user journeys, catches regressions and gives you evidence of what broke.",
    },
    {
      q: "Who is it for?",
      a: "Developers who ship with Claude Code, Cursor, Codex and similar tools: indie hackers, SaaS founders, software engineers and small teams who move fast without a dedicated QA team.",
    },
    {
      q: "How does it work?",
      a: "The plan: you connect your project, choose the user journeys that matter, and Publishub runs them in a real browser after each change. When something fails, you get the failing step, a screenshot and a bug report. We're shaping the details with early-access members, so the workflow may change.",
    },
    {
      q: "How will it handle login and payments?",
      a: "The plan: a dedicated test account for each project, with its credentials stored encrypted, and payments run in your provider's test mode (like Stripe test cards), so nothing real is charged. We'll confirm the details with early-access members.",
    },
    {
      q: "What about false alarms?",
      a: "A check that cries wolf gets ignored, so reliability comes before coverage. A flow has to fail twice in a row before you're alerted, and results we can't trust (a page that didn't load, a timeout) are marked inconclusive instead of failed. Every report also lists what it didn't check, so a green result never hides a gap.",
    },
    {
      q: "Will it touch my production database?",
      a: "Not by default. On your live app it's read-only: it walks each flow and stops before the final submit. You can opt specific flows into writing; those use tagged test accounts, never fire emails, webhooks or payments you've marked as side effects, and every write shows up in a log. If you'd rather keep it off production entirely, point it at a preview deploy.",
    },
    {
      q: "How is this different from my agent testing its own work?",
      a: "Your agent can run tests and even click through your app, and that helps. Publishub is meant to be the independent check: it runs outside the agent, the same way after every change, works with any AI coding tool, and compares each result with the last version that worked.",
    },
    {
      q: "What's the difference between StillWorks and Publishub?",
      a: (
        <>
          <a href={STILLWORKS_URL}>StillWorks</a> is our free, open-source (MIT) CLI and MCP server: you write the journeys and run them yourself, from your terminal, your agent or CI. It stays free.
          Publishub is the hosted service built on it: we set up your flows with you, watch your live app every hour, alert you when something breaks and compare each run with your last working
          version. No terminal or CI needed.
        </>
      ),
    },
    {
      q: "Does it support Claude Code and Cursor?",
      a: "Publishub is being designed to work alongside any AI coding tool, including Claude Code, Cursor and Codex, because it verifies the running application rather than the editor. No integrations are available yet. Tell us which tool you use when you join, and we'll prioritize it.",
    },
    {
      q: "When will early access begin?",
      a: "We're building the first version now and will invite waitlist members in small groups as soon as it's ready. We don't have a date to announce yet; you'll hear from us by email first.",
    },
    {
      q: "Can I try anything today?",
      a: (
        <>
          Yes. The <Link href="/check">free app check</Link> opens your app in a real browser and shows JavaScript crashes, failed requests, broken links and pages that don&apos;t load, in about a
          minute. It only looks at public pages once; the full product will run your real user journeys after every deploy.
        </>
      ),
    },
    {
      q: "Is early access free?",
      a: "Yes. Joining the waitlist is free, and StillWorks, the open-source core, is free forever. Founding Customers is optional: you reserve a spot today for $0, the founder sets up your flows with you, and the founding price is only charged after Publishub launches.",
    },
    {
      q: "Will I be charged as a Founding Customer before launch?",
      a: `No. Reserving stores your card securely with Stripe and charges $0, and no subscription starts. When Publishub launches, we'll email you at least ${N} days before your first charge, with the exact date. Cancel before then and you pay nothing. After that, the founding price is billed monthly, you can cancel anytime, and your first payment is refundable on request within ${R} days.`,
    },
  ] as FaqItem[],
};

export type HomeCopy = typeof en;

const pt: HomeCopy = {
  meta: {
    title: "Sua IA escreve o código. Quem confere se ele funciona?",
    description:
      "O Publishub testa os fluxos do seu app feito com IA num navegador de verdade, depois de cada mudança e de hora em hora, e mostra o que quebrou antes dos seus usuários. Entre na lista de espera.",
  },
  hero: {
    pill: "Acesso antecipado aberto",
    pillSub: "Em desenvolvimento",
    h1a: "Sua IA escreve o código.",
    h1b: "Quem confere se ele funciona?",
    sub: "O build passa, mas o checkout quebrou sem ninguém perceber. O Publishub vai percorrer os fluxos que geram dinheiro num navegador de verdade, depois de cada mudança da IA e de hora em hora, e mostrar o que quebrou, sem colocar seus dados reais em risco.",
    join: "Entrar na lista de espera",
    builtBy: "Construído em público por",
    builtByAfter: ", um fundador solo que lê cada resposta.",
    builtFor: "Para quem publica com",
    stillworks: "Construído sobre o StillWorks, nosso núcleo open source",
    check: "Ou teste seu app de graça agora",
  },
  problem: {
    eyebrow: "O problema",
    title: "Código gerado não é código verificado",
    sub: "A IA escreve uma funcionalidade em minutos. Se o app continua funcionando depois disso é outra pergunta, e hoje quem responde costuma ser você, clicando em tudo.",
    items: [
      { title: "Funcionalidade quebrada", text: "Uma mudança compila, passa no lint e mesmo assim quebra um botão, um formulário ou uma chamada de API." },
      { title: "Regressões que você não pediu", text: "O agente mexe em mais do que a tarefa. Uma correção num arquivo quebra, em silêncio, um fluxo em outro lugar." },
      { title: "Jornadas do usuário quebradas", text: "Cadastro, checkout e onboarding falham no passo quatro, onde os testes unitários quase nunca olham." },
      { title: "Teste manual sem fim", text: "Clicar no app inteiro depois de cada mudança da IA come o tempo que o agente te economizou." },
      { title: "Insegurança antes de publicar", text: "Sem evidência, todo deploy é um chute: publicar e torcer, ou segurar." },
    ],
    closing: "Escrever código ficou mais rápido. Saber se ele funciona, não.",
    join: "Entrar na lista de espera",
  },
  night: {
    eyebrow: "Se você constrói sozinho",
    title: "Você não deveria descobrir pelos seus usuários.",
    sub: "Sem time de QA. Sem ninguém para perguntar “isso ainda funciona?”. Só você, uma IA que parece ter certeza de tudo e as pessoas que confiaram no seu app o bastante para testar.",
    body: "O Publishub existe para esse momento, para que ele pare de acontecer. Dá para começar hoje: teste seu próprio app, de graça, em cerca de um minuto.",
    check: "Testar meu app grátis",
    join: "Entrar na lista de espera",
    label: "Uma noite que você talvez conheça",
    timeline: [
      { time: "23:48", text: "Você pede uma mudança pequena para a IA. Ela responde: “Pronto. Está tudo funcionando.”" },
      { time: "23:52", text: "Você publica. Na sua tela parece tudo certo. Finalmente vai dormir." },
      { time: "08:15", text: "Um e-mail de um usuário: “Tentei me cadastrar três vezes. Não acontece nada.”" },
      { time: "08:16", text: "Você não sabe há quanto tempo está quebrado, nem quantas pessoas foram embora sem dizer nada." },
    ],
  },
  why: {
    eyebrow: "Por que não pedir para o agente testar?",
    title: "O relatório do agente é uma afirmação, não um resultado",
    sub: "Pedir para o agente testar o próprio trabalho ajuda. Mas quem escreveu a mudança é quem está dando a nota, e às vezes o agente diz que os testes passaram sem ter rodado, ou reescreve um teste que falhou para ele passar.",
    agentTitle: "O agente conferindo o próprio trabalho",
    agent: ["O mesmo agente que fez a mudança decide se ela funciona", "Roda quando você lembra de pedir", "Normalmente só dentro de um editor ou ferramenta", "Uma execução, sem nada para comparar"],
    usTitle: "Publishub (o que estamos construindo)",
    us: [
      "Uma verificação independente, fora do agente",
      "Roda depois de cada mudança e de hora em hora, sempre do mesmo jeito",
      "Funciona com qualquer ferramenta de IA, porque testa o app rodando",
      "Comparado com a última versão que funcionava, para você saber o que esta mudança quebrou",
    ],
  },
  safety: {
    eyebrow: "Seguro no app em produção",
    title: "Lê à vontade. Só grava o que você aprovou.",
    sub: "Perguntamos para quem constrói se deixaria um robô mexer no app em produção. A resposta foi clara: a pergunta real é a permissão de escrita, não o ambiente. Então é assim que estamos construindo.",
    items: [
      { title: "Só leitura no app em produção, por padrão", text: "Ele percorre cada fluxo e para logo antes do envio final. Gravar em produção é opcional, fluxo por fluxo." },
      { title: "Efeitos colaterais rodam em modo de simulação", text: "Na configuração, você marca os fluxos que mandam e-mail, disparam webhooks ou mexem com pagamento. Eles nunca disparam de verdade sem você autorizar." },
      { title: "Dados de teste marcados pelo que o app já guarda", text: "As contas de teste usam um domínio de e-mail que não recebe mensagens, então são fáceis de filtrar. Sem mudar o banco, sem coluna de teste." },
      { title: "Um registro de cada gravação", text: "Se um fluxo grava algo, você vê cada linha que ele criou, e a limpeza só mexe nas linhas criadas naquela mesma execução." },
      { title: "Confere quem vê o quê", text: "Um segundo usuário de teste tenta abrir os dados do primeiro. Se conseguir, é falha, não aprovação." },
      { title: "Roda em preview deploys também", text: "Sem staging? Aponte para o preview da Vercel ou da Netlify e ele pode bloquear um pull request quando um fluxo importante quebra." },
    ],
    alert: "Você só recebe alerta quando um fluxo falha duas vezes seguidas, então uma página lenta às 3 da manhã não te acorda.",
  },
  how: {
    eyebrow: "Como vai funcionar",
    title: "Da mudança da IA à evidência em quatro passos",
    steps: [
      { title: "Escolha os 5 fluxos que geram dinheiro", text: "Aponte o Publishub para o seu preview ou app em produção e escolha o que nunca pode quebrar: cadastro, login, checkout, a ação principal." },
      { title: "Verificação a cada mudança e de hora em hora", text: "O Publishub percorre esses fluxos num navegador de verdade a cada deploy e continua conferindo o app em produção de hora em hora, só leitura por padrão." },
      { title: "Encontre falhas e regressões", text: "Cada resultado é comparado com a última versão que funcionava, para você ver o que esta mudança quebrou." },
      { title: "Receba evidência para agir", text: "O que passou, o que falhou e o que não foi verificado, com o passo que falhou, uma captura de tela e um relatório pronto para o seu agente de IA." },
    ],
    note: "Esse é o fluxo que estamos construindo. As configurações e integrações ainda não estão disponíveis; vamos confirmá-las primeiro com quem tiver acesso antecipado.",
  },
  founder: {
    eyebrow: "Uma palavra do fundador",
    photoAlt: "Valmir, fundador do Publishub",
    title: "Oi, eu sou o Valmir.",
    p1: "Sou um fundador solo de Salvador, na Bahia, e construo com as mesmas ferramentas de IA que você. Elas me deixaram mais rápido do que eu imaginava. Também me ensinaram que “pronto” nem sempre quer dizer “funcionando”.",
    p2: "Estou construindo o Publishub para que quem constrói sozinho tenha a rede de segurança que os times grandes têm: algo que confere, toda vez, antes dos seus usuários.",
    p3: (
      <>
        Todo e-mail para <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> chega em mim. Me conta o que quebrou no seu app e o que você gostaria que o Publishub verificasse primeiro.
      </>
    ),
    sign: `Valmir, fundador do ${SITE_NAME}`,
  },
  open: {
    eyebrow: "Núcleo open source",
    title: "O StillWorks verifica quando você pede. O Publishub vigia por você.",
    sub: "O motor é grátis e open source, e vai continuar assim. O Publishub é para quando você prefere não manter isso sozinho, ou nem usa terminal.",
    colFree: "StillWorks · grátis, MIT",
    colPaid: "Publishub · Founding Customers",
    rows: [
      { label: "Configuração", stillworks: "Você escreve e mantém as jornadas", publishub: "Configurado com você, 1:1, pelo fundador" },
      { label: "Quando roda", stillworks: "Quando você, seu agente ou o CI rodam", publishub: "A cada deploy, e de hora em hora no app em produção" },
      { label: "Quando algo quebra", stillworks: "Um relatório no terminal ou no log do CI", publishub: "Um alerta, só depois de duas falhas seguidas" },
      { label: "Histórico", stillworks: "Uma execução de cada vez", publishub: "Cada execução comparada com a última versão que funcionava" },
      { label: "Segurança em produção", stillworks: "Verificações só de leitura; o resto você decide", publishub: "Só leitura por padrão, efeitos colaterais simulados, registro de cada gravação" },
      { label: "Para quem é", stillworks: "Devs com terminal e CI", publishub: "Quem tem usuários reais, inclusive apps feitos no Lovable, Bolt e v0" },
    ],
    reserve: "Reservar vaga de fundador · US$ 0 hoje",
    github: "Usar o StillWorks grátis no GitHub",
  },
  pricing: {
    eyebrow: "Preços",
    title: "Entre de graça, ou seja Founding Customer",
    sub: `O ${SITE_NAME} está em desenvolvimento. As duas opções te colocam na fila do acesso antecipado; nenhuma cobra nada hoje.`,
    freeTitle: "Lista de espera",
    free: "Grátis",
    freeSub: `Receba um aviso quando o ${SITE_NAME} for lançado.`,
    freeItems: ["Entre de graça", "Receba as novidades do produto", `Seja avisado quando o ${SITE_NAME} for lançado`, "Sem pagamento"],
    freeCta: "Entrar na lista de espera",
    badge: "Acesso antecipado · Em breve",
    foundingTitle: "Founding Customers",
    today: "US$ 0 hoje",
    afterLaunch: "depois do lançamento",
    foundingSub: `Para quem já tem usuários reais no app. Você não configura nada: a gente monta seus fluxos críticos juntos, e o ${SITE_NAME} vigia por você.`,
    perks: [...FOUNDING_PERKS_PT] as string[],
    notYet: `O ${SITE_NAME} ainda não está disponível.`,
    notYetText: "Reservar não dá acesso imediato. Você recebe acesso quando o produto for lançado, e ainda não temos data de lançamento.",
    howTitle: "Como funciona a reserva",
    step1: (
      <>
        <strong>Hoje:</strong> você reserva sua vaga com o cartão. O Stripe guarda o cartão com segurança e <strong>você paga US$ 0</strong>. Nenhuma assinatura começa.
      </>
    ),
    step2: (
      <>
        <strong>No lançamento:</strong> avisamos por e-mail pelo menos {N} dias antes da primeira cobrança, com a data exata. Cancele antes disso e você não paga nada.
      </>
    ),
    step3a: "Depois disso:",
    step3b: `, cobrado mensalmente no preço de fundador. Cancele quando quiser; a primeira mensalidade pode ser reembolsada a pedido em até ${R} dias.`,
    reserve: "Reservar minha vaga de fundador · US$ 0 hoje",
    secure: "Cartão guardado com segurança pelo Stripe. Cancele quando quiser mandando um e-mail para",
    terms: "Termos completos (em inglês)",
  },
  early: {
    eyebrow: "Acesso antecipado",
    title: `Seja um dos primeiros a usar o ${SITE_NAME}.`,
    sub: `Estamos construindo um jeito melhor de verificar software feito com agentes de IA. Entre na lista de espera e seja avisado quando o ${SITE_NAME} estiver pronto.`,
    benefits: ["Acesso antecipado à primeira versão", "Novidades do produto direto do fundador", "Voz no roadmap: diga o que devemos verificar primeiro", "Acesso à primeira versão pública"],
    submit: "Quero acesso antecipado",
  },
  feedback: {
    eyebrow: "Diga o que você acha",
    title: "Você confiaria isso ao seu app?",
    sub: "Tudo nesta página veio de pessoas que constroem dizendo do que precisariam. Só leitura por padrão, efeitos colaterais simulados e a verificação de “quem vê o quê” começaram como comentários de alguém.",
    body: "Conte o que está faltando, o que você mudaria, ou por que não é para você. Vai direto para o fundador e decide o que construímos a seguir.",
  },
  faqTitle: "Dúvidas",
  faq: [
    {
      q: "O que é o Publishub?",
      a: "Uma ferramenta de verificação que estamos construindo para software feito com agentes de IA. Ela confere se o seu app continua funcionando depois de uma mudança: roda jornadas reais de usuário, pega regressões e mostra a evidência do que quebrou.",
    },
    {
      q: "Para quem é?",
      a: "Para quem publica com Claude Code, Cursor, Codex, Lovable e ferramentas parecidas: indie hackers, fundadores de SaaS, devs e times pequenos que andam rápido sem um time de QA.",
    },
    {
      q: "Como funciona?",
      a: "O plano: você conecta o projeto, escolhe as jornadas que importam e o Publishub roda essas jornadas num navegador de verdade depois de cada mudança. Quando algo falha, você recebe o passo que falhou, uma captura de tela e um relatório do bug. Estamos definindo os detalhes com quem tiver acesso antecipado, então o fluxo pode mudar.",
    },
    {
      q: "Como ele lida com login e pagamentos?",
      a: "O plano: uma conta de teste própria para cada projeto, com as credenciais guardadas criptografadas, e pagamentos no modo de teste do seu provedor (como os cartões de teste do Stripe), então nada é cobrado de verdade. Vamos confirmar os detalhes com quem tiver acesso antecipado.",
    },
    {
      q: "E os alarmes falsos?",
      a: "Um alerta que grita “lobo” à toa acaba ignorado, então confiabilidade vem antes de cobertura. Um fluxo precisa falhar duas vezes seguidas para você ser avisado, e resultados em que não dá para confiar (uma página que não carregou, um tempo esgotado) são marcados como inconclusivos, não como falha. Todo relatório também lista o que não foi verificado, para um resultado verde nunca esconder um buraco.",
    },
    {
      q: "Ele vai mexer no meu banco de dados de produção?",
      a: "Não por padrão. No app em produção ele só lê: percorre cada fluxo e para antes do envio final. Você pode liberar a gravação em fluxos específicos; esses usam contas de teste marcadas, nunca disparam e-mails, webhooks ou pagamentos que você marcou como efeito colateral, e cada gravação aparece num registro. Se preferir manter fora de produção, aponte para um preview deploy.",
    },
    {
      q: "Qual a diferença para o meu agente testar o próprio trabalho?",
      a: "Seu agente pode rodar testes e até clicar no app, e isso ajuda. O Publishub é a verificação independente: roda fora do agente, do mesmo jeito depois de cada mudança, funciona com qualquer ferramenta de IA e compara cada resultado com a última versão que funcionava.",
    },
    {
      q: "Qual a diferença entre o StillWorks e o Publishub?",
      a: (
        <>
          O <a href={STILLWORKS_URL}>StillWorks</a> é o nosso CLI e servidor MCP, grátis e open source (MIT): você escreve as jornadas e roda sozinho, no terminal, no seu agente ou no CI. Ele continua grátis.
          O Publishub é o serviço hospedado construído sobre ele: a gente configura seus fluxos com você, vigia o app em produção de hora em hora, avisa quando algo quebra e compara cada execução com a
          última versão que funcionava. Sem terminal nem CI.
        </>
      ),
    },
    {
      q: "Funciona com Claude Code e Cursor?",
      a: "O Publishub está sendo pensado para funcionar com qualquer ferramenta de IA, incluindo Claude Code, Cursor e Codex, porque verifica o app rodando, não o editor. Ainda não há integrações disponíveis. Diga qual ferramenta você usa quando entrar na lista, e a gente prioriza.",
    },
    {
      q: "Quando começa o acesso antecipado?",
      a: "Estamos construindo a primeira versão agora e vamos convidar quem está na lista em pequenos grupos assim que estiver pronta. Ainda não temos data; você fica sabendo primeiro, por e-mail.",
    },
    {
      q: "Dá para testar alguma coisa hoje?",
      a: (
        <>
          Sim. O <Link href="/pt/check">teste grátis</Link> abre seu app num navegador de verdade e mostra erros de JavaScript, requisições que falharam, links quebrados e páginas que não carregam,
          em cerca de um minuto. Ele olha só as páginas públicas, uma vez; o produto completo vai rodar as jornadas reais depois de cada deploy.
        </>
      ),
    },
    {
      q: "O acesso antecipado é grátis?",
      a: "Sim. Entrar na lista de espera é grátis, e o StillWorks, o núcleo open source, é grátis para sempre. Ser Founding Customer é opcional: você reserva a vaga hoje por US$ 0, o fundador configura seus fluxos com você, e o preço de fundador só é cobrado depois do lançamento do Publishub.",
    },
    {
      q: "Vou ser cobrado como Founding Customer antes do lançamento?",
      a: `Não. A reserva guarda seu cartão com segurança no Stripe e cobra US$ 0, sem começar nenhuma assinatura. Quando o Publishub for lançado, avisamos por e-mail pelo menos ${N} dias antes da primeira cobrança, com a data exata. Cancele antes disso e você não paga nada. Depois, o preço de fundador é cobrado mensalmente, você cancela quando quiser, e a primeira mensalidade pode ser reembolsada a pedido em até ${R} dias.`,
    },
  ],
};

export const HOME_COPY: Record<Locale, HomeCopy> = { en, pt };
