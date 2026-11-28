import Link from "next/link";
import type { ReactNode } from "react";
import type { FaqItem } from "@/components/FaqList";
import { FOUNDING_PERKS, FOUNDING_PERKS_PT, FOUNDING_TERMS } from "@/lib/founding";
import type { Locale } from "@/lib/i18n";
import { SITE_NAME } from "@/lib/site";

/**
 * Os textos da página do Founding Customers (/founding e /pt/founding). Tudo o que a vaga dá é descrito como o que
 * a pessoa recebe quando a Publishub lançar: hoje só existem a reserva (US$ 0), o /check e o stillworks.
 */

const N = FOUNDING_TERMS.noticeDays;
const R = FOUNDING_TERMS.refundDays;

const en = {
  meta: {
    title: "Founding Customers: reserve your spot for $0",
    description: "Reserve a Founding Customer spot in Publishub for $0 today. Your 5 critical flows set up 1:1 by the founder when it launches, at the founding price. Nothing is charged before launch.",
  },
  hero: {
    eyebrow: "Founding Customers · Pre-launch",
    title: "Reserve your Founding Customer spot.",
    sub: "For people who want to protect the flows that can't break.",
    reserve: "Reserve a Founding Customer spot",
    zero: "$0 today. Nothing is charged before launch.",
    afterLaunch: "after launch",
  },
  problem: {
    title: "The problem isn't writing code. It's knowing it still works.",
    p1: "AI tools make building apps fast. But a change can compile, pass lint and tests, and still break sign-up, login, a form or checkout.",
    p2: "For solo founders and small teams, there's no QA team to click through every journey after every change.",
    p3: "In the end, the person who finds the problem is your user.",
  },
  perks: {
    title: "What Founding Customers get.",
    lead: `When ${SITE_NAME} launches, you get:`,
    items: [...FOUNDING_PERKS] as string[],
    zero: "Reserving costs $0 today. Nothing is charged before launch.",
    notYet: `${SITE_NAME} is in development and isn't available yet. Reserving doesn't give you immediate access, and there's no launch date yet.`,
  },
  how: {
    title: "How it will work.",
    steps: [
      "You reserve your spot.",
      "We talk about the 5 critical flows in your app.",
      "We set those flows up together.",
      "When the product launches, continuous checks start.",
      "If something breaks, you get an alert with proof of what failed.",
    ],
  },
  who: {
    title: "Who it's for.",
    items: ["Solo founders", "Technical SaaS founders", "Independent developers", "Small teams", "People building with Lovable, Bolt or v0", "People who don't use a terminal or CI"],
  },
  terms: {
    title: "The reservation, in detail",
    step1: (
      <>
        <strong>Today:</strong> you reserve with your card. Stripe stores it securely and <strong>you&apos;re charged $0</strong>. No subscription starts.
      </>
    ) as ReactNode,
    step2: (
      <>
        <strong>At launch:</strong> we email you at least {N} days before your first charge, with the exact date. Cancel before then and you pay nothing.
      </>
    ) as ReactNode,
    step3a: "After that:",
    step3b: `, billed monthly at the founding price. Cancel anytime; your first payment is refundable on request within ${R} days.`,
    full: "Full terms",
  },
  faqTitle: "Questions",
  faq: [
    { q: "Does the reservation charge anything today?", a: "No. Reserving costs $0 today and nothing is charged before launch." },
    {
      q: "When will continuous checks be available?",
      a: (
        <>
          For your sign-up, login and checkout, we&apos;re still building it, and there&apos;s no launch date yet. <Link href="/#early-access">Join the waitlist</Link> to follow the launch. For public pages, it&apos;s available now: run a <Link href="/check">free check</Link> and turn on the daily check from the report (beta).
        </>
      ),
    },
    { q: "Does Publishub replace automated tests?", a: "No. It's an external, independent layer of verification." },
    { q: "Does Publishub write or fix code?", a: "No. It shows what broke. You or your agent fix it." },
    { q: "Is Publishub a security scanner?", a: "No. It doesn't look for data leaks or vulnerabilities." },
    {
      q: "Can I try something today?",
      a: (
        <>
          Yes. The <Link href="/check">free check</Link> opens your app&apos;s public pages in a real browser and lists crashes, failed requests and broken pages. It&apos;s read-only: it never logs in
          and never submits forms.
        </>
      ),
    },
  ] as FaqItem[],
  final: {
    title: "Ship with more confidence.",
    reserve: "Reserve a Founding Customer spot",
    check: "Or check your app free first",
  },
};

export type FoundingCopy = typeof en;

const pt: FoundingCopy = {
  meta: {
    title: "Founding Customers: reserve sua vaga por US$ 0",
    description: "Reserve uma vaga de Founding Customer na Publishub por US$ 0 hoje. Seus 5 fluxos críticos configurados 1:1 pelo fundador quando lançar, com preço de fundador. Nada é cobrado antes do lançamento.",
  },
  hero: {
    eyebrow: "Founding Customers · Pré-lançamento",
    title: "Reserve sua vaga de Founding Customer.",
    sub: "Para quem quer proteger os fluxos que não podem quebrar.",
    reserve: "Reservar Founding Customer",
    zero: "US$ 0 hoje. Não haverá cobrança antes do lançamento.",
    afterLaunch: "depois do lançamento",
  },
  problem: {
    title: "O problema não é escrever código. É saber se ele continua funcionando.",
    p1: "Ferramentas de IA aceleram a criação de apps. Mas uma mudança pode compilar, passar no lint e nos testes, e ainda quebrar cadastro, login, formulário ou checkout.",
    p2: "Para fundadores solo e times pequenos, não existe um time de QA para clicar em todas as jornadas depois de cada mudança.",
    p3: "No fim, quem descobre o problema é o usuário.",
  },
  perks: {
    title: "O que entra para Founding Customers.",
    lead: `Quando a ${SITE_NAME} lançar, você recebe:`,
    items: [...FOUNDING_PERKS_PT] as string[],
    zero: "A reserva é por US$ 0 hoje. Não haverá cobrança antes do lançamento.",
    notYet: `A ${SITE_NAME} está em desenvolvimento e ainda não está disponível. A reserva não dá acesso imediato, e ainda não há data de lançamento.`,
  },
  how: {
    title: "Como vai funcionar.",
    steps: [
      "Você reserva sua vaga.",
      "Conversamos sobre os 5 fluxos críticos do seu app.",
      "Configuramos os fluxos junto com você.",
      "Quando o produto lançar, a verificação contínua começa.",
      "Se algo quebrar, você recebe um alerta com prova do que falhou.",
    ],
  },
  who: {
    title: "Para quem é.",
    items: ["Fundadores solo", "Fundadores técnicos de SaaS", "Devs independentes", "Times pequenos", "Quem usa Lovable, Bolt ou v0", "Quem não usa terminal nem CI"],
  },
  terms: {
    title: "A reserva, em detalhes",
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
    full: "Termos completos (em inglês)",
  },
  faqTitle: "Dúvidas",
  faq: [
    { q: "A reserva cobra algo hoje?", a: "Não. A reserva é por US$ 0 hoje e não haverá cobrança antes do lançamento." },
    {
      q: "Quando a verificação contínua estará disponível?",
      a: (
        <>
          Para cadastro, login e checkout, ainda estamos em desenvolvimento, e não há data de lançamento. <Link href="/pt#early-access">Entre na waitlist</Link> para acompanhar o lançamento. Para as páginas públicas, já está disponível: faça um <Link href="/pt/check">teste grátis</Link> e ligue a verificação diária no relatório (beta).
        </>
      ),
    },
    { q: "A Publishub substitui testes automatizados?", a: "Não. Ela é uma camada de verificação externa e independente." },
    { q: "A Publishub escreve ou corrige código?", a: "Não. Ela mostra o que quebrou. Quem corrige é você ou seu agente." },
    { q: "A Publishub é um scanner de segurança?", a: "Não. Ela não procura vazamento de dados nem vulnerabilidades." },
    {
      q: "Dá para testar alguma coisa hoje?",
      a: (
        <>
          Dá. O <Link href="/pt/check">teste grátis</Link> abre as páginas públicas do seu app num navegador de verdade e lista crashes, requisições que falham e páginas quebradas. É somente
          leitura: nunca faz login nem envia formulários.
        </>
      ),
    },
  ],
  final: {
    title: "Publique com mais confiança.",
    reserve: "Reservar Founding Customer",
    check: "Ou teste seu app grátis antes",
  },
};

export const FOUNDING_COPY: Record<Locale, FoundingCopy> = { en, pt };
