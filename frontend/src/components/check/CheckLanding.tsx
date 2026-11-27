import Link from "next/link";
import type { ReactNode } from "react";
import { Bug, EyeOff, FileWarning, Globe, Link2, MonitorSmartphone, MousePointerClick, Route, Share2, ShieldCheck, Timer, Trash2, Unplug } from "lucide-react";
import { CheckForm } from "@/components/check/CheckForm";
import { CheckStatsLine } from "@/components/check/CheckStatsLine";
import { FaqList, type FaqItem } from "@/components/FaqList";
import { WaitlistTracker } from "@/components/waitlist/WaitlistTracker";
import { buttonClasses } from "@/components/ui/Button";
import { CHECK_LIMIT_PER_HOUR } from "@/lib/check/types";
import { HTML_LANG, localePath, type Locale } from "@/lib/i18n";
import { PLATFORMS } from "@/lib/platforms";
import { SITE_NAME } from "@/lib/site";

/** A página do teste grátis (/check e /pt/check): a estrutura é a mesma, os textos mudam com o idioma. */

const WHAT_ICONS = [Globe, Bug, Unplug, Route, Link2, MonitorSmartphone, Timer, Share2, ShieldCheck];
const TRUST_ICONS = [MousePointerClick, ShieldCheck, EyeOff, Trash2];

const en = {
  meta: {
    title: "Free AI app checker: test your app in a real browser",
    description:
      "Paste the URL of an app you built with Lovable, Bolt, Cursor, Claude Code or v0. Publishub opens it in a real browser and finds JavaScript crashes, failed requests, broken links and pages that don't load. Free.",
  },
  eyebrow: "Free tool · Report in about a minute",
  title: "Is your AI-built app actually working?",
  sub: "You built it yourself, maybe late at night, with an AI that said “done”. Paste your app's URL and see what your visitors actually see, in about a minute, before one of them tells you.",
  worksWith: "Works with apps built in",
  checkersFor: "Checkers for",
  whatEyebrow: "What we check",
  whatTitle: "The things that break first when AI writes the code",
  what: [
    { title: "The page loads", text: "No server errors, no blank screen, no “not found” page where your app should be." },
    { title: "No JavaScript crashes", text: "Uncaught errors that silently break buttons, forms and whole screens." },
    { title: "No failed requests", text: "API calls, Supabase queries and assets that return errors or never arrive." },
    { title: "Key pages open", text: "We follow your sign-up, login, pricing and dashboard links like a visitor would." },
    { title: "Internal links work", text: "Every internal link on the page, checked for 404s and server errors." },
    { title: "Works on a phone", text: "A real mobile viewport: does the page fit, or scroll sideways?" },
    { title: "Loads quickly", text: "How long the page takes to load in a real browser." },
    { title: "Link previews", text: "Title, description and share image for X, LinkedIn and Slack." },
    { title: "HTTPS", text: "Served securely, with no insecure resources." },
  ],
  trustEyebrow: "Your app, your check",
  trustTitle: "It looks. It never touches.",
  trustSub: "You're trusting us with something you made. Here's exactly what the check does, and what it will never do.",
  trust: [
    { title: "Read-only, like a visitor", text: "We open your public pages the way a visitor would. Nothing is created, changed or deleted in your app." },
    { title: "No login, no forms", text: "We never sign in, never submit a form and skip links like log out or delete." },
    { title: "Private by link", text: "Your report has a long random address. It isn't listed anywhere, and search engines don't index it." },
    { title: "Delete it anytime", text: "From the browser you used, delete the report and its screenshots with one click." },
  ],
  fullTitle: "A free check sees your app once. Your next AI change can break it again.",
  fullText: `${SITE_NAME} is building the full version: your sign-up, login and checkout journeys, run in a real browser after every deploy, with evidence you can hand back to your coding agent.`,
  join: "Join the waitlist",
  faqTitle: "Questions",
  faq: [
    {
      q: "What does the free check actually do?",
      a: "It opens your app's URL in a real Chromium browser on desktop and on a phone-sized screen, records JavaScript errors, console errors and failed network requests, opens up to three of your key pages (sign-up, login, pricing, dashboard), checks your internal links, and takes screenshots. It takes about a minute.",
    },
    {
      q: "Will it change anything in my app?",
      a: "No. It only opens public pages. It never submits forms, never logs in, never creates accounts and skips links that look like they change data, such as log out or delete.",
    },
    {
      q: "Which apps can I check?",
      a: `Any public URL: apps built with Lovable, Bolt, v0, Replit, Cursor or Claude Code, deployed on Vercel, Netlify or anywhere else. Only check apps you own or are allowed to test. Local addresses (localhost) and private networks can't be checked. You can run ${CHECK_LIMIT_PER_HOUR} checks per hour.`,
    },
    {
      q: "Who can see my report?",
      a: "Only people you give the link to. It's a long random address we don't publish, list or let search engines index. From the browser you used to run the check, you can delete the report and its screenshots at any time.",
    },
    {
      q: "Can I run this on my own machine?",
      a: "Yes. stillworks, our free and open-source CLI, runs the same kind of check from your terminal (npx stillworks check http://localhost:3000) and can run your signup, login and checkout journeys after every change made by Claude Code or Cursor: github.com/valmirjunior2109-spec/stillworks.",
    },
    {
      q: "How is this different from Publishub?",
      a: "The free check looks at your public pages once. Publishub, which we're building now, will run your real user journeys, including login and checkout, after every deploy, and compare each run with the last version that worked. Join the waitlist for early access.",
    },
  ] as FaqItem[],
};

type CheckCopy = typeof en;

const pt: CheckCopy = {
  meta: {
    title: "Teste grátis para apps feitos com IA: veja seu app num navegador de verdade",
    description:
      "Cole a URL de um app que você fez com Lovable, Bolt, Cursor, Claude Code ou v0. O Publishub abre o app num navegador de verdade e encontra erros de JavaScript, requisições com falha, links quebrados e páginas que não carregam. Grátis.",
  },
  eyebrow: "Ferramenta grátis · Relatório em 1 minuto",
  title: "Seu app feito com IA está funcionando de verdade?",
  sub: "Você construiu sozinho, talvez tarde da noite, com uma IA que disse “pronto”. Cole a URL do seu app e veja o que seus visitantes realmente veem, em cerca de um minuto, antes que um deles te avise.",
  worksWith: "Funciona com apps feitos no",
  checkersFor: "Páginas para (em inglês)",
  whatEyebrow: "O que verificamos",
  whatTitle: "O que quebra primeiro quando a IA escreve o código",
  what: [
    { title: "A página carrega", text: "Sem erro de servidor, sem tela em branco, sem página de “não encontrado” onde deveria estar seu app." },
    { title: "Sem erros de JavaScript", text: "Erros não tratados que quebram botões, formulários e telas inteiras sem avisar." },
    { title: "Sem requisições com falha", text: "Chamadas de API, consultas ao Supabase e arquivos que dão erro ou nunca chegam." },
    { title: "Páginas importantes abrem", text: "Seguimos os links de cadastro, login, preços e painel como um visitante faria." },
    { title: "Links internos funcionam", text: "Todo link interno da página, conferido contra 404 e erros de servidor." },
    { title: "Funciona no celular", text: "Uma tela de celular de verdade: a página cabe ou rola para o lado?" },
    { title: "Carrega rápido", text: "Quanto tempo a página leva para carregar num navegador de verdade." },
    { title: "Prévia de link", text: "Título, descrição e imagem para quando alguém compartilha no X, LinkedIn e Slack." },
    { title: "HTTPS", text: "Servido com segurança, sem recursos inseguros." },
  ],
  trustEyebrow: "Seu app, seu teste",
  trustTitle: "Ele olha. Nunca mexe.",
  trustSub: "Você está confiando a nós algo que você construiu. Aqui está exatamente o que o teste faz, e o que ele nunca vai fazer.",
  trust: [
    { title: "Só leitura, como um visitante", text: "Abrimos suas páginas públicas como um visitante faria. Nada é criado, alterado ou apagado no seu app." },
    { title: "Sem login, sem formulários", text: "Nunca fazemos login, nunca enviamos formulários e pulamos links como sair ou apagar." },
    { title: "Privado pelo link", text: "Seu relatório tem um endereço longo e aleatório. Ele não aparece em lugar nenhum e não é indexado por buscadores." },
    { title: "Apague quando quiser", text: "No navegador que você usou, apague o relatório e as capturas de tela com um clique." },
  ],
  fullTitle: "Um teste grátis vê seu app uma vez. Sua próxima mudança com IA pode quebrar tudo de novo.",
  fullText: `O ${SITE_NAME} está construindo a versão completa: suas jornadas de cadastro, login e checkout rodando num navegador de verdade depois de cada deploy, com evidência pronta para o seu agente de IA.`,
  join: "Entrar na lista de espera",
  faqTitle: "Dúvidas",
  faq: [
    {
      q: "O que o teste grátis faz exatamente?",
      a: "Ele abre a URL do seu app num navegador Chromium de verdade, no desktop e numa tela de celular, registra erros de JavaScript, erros de console e requisições de rede que falharam, abre até três páginas importantes (cadastro, login, preços, painel), confere os links internos e tira capturas de tela. Leva cerca de um minuto.",
    },
    {
      q: "Ele muda alguma coisa no meu app?",
      a: "Não. Ele só abre páginas públicas. Nunca envia formulários, nunca faz login, nunca cria contas e pula links que parecem mudar dados, como sair ou apagar.",
    },
    {
      q: "Quais apps posso testar?",
      a: `Qualquer URL pública: apps feitos com Lovable, Bolt, v0, Replit, Cursor ou Claude Code, publicados na Vercel, Netlify ou em qualquer lugar. Teste só apps que são seus ou que você tem permissão para testar. Endereços locais (localhost) e redes privadas não podem ser testados. Você pode fazer ${CHECK_LIMIT_PER_HOUR} testes por hora.`,
    },
    {
      q: "Quem pode ver meu relatório?",
      a: "Só quem recebe o link de você. É um endereço longo e aleatório que não publicamos, não listamos e não deixamos buscadores indexarem. No navegador que você usou para o teste, dá para apagar o relatório e as capturas de tela a qualquer momento.",
    },
    {
      q: "Posso rodar isso na minha máquina?",
      a: "Pode. O stillworks, nosso CLI grátis e open source, faz o mesmo tipo de teste no terminal (npx stillworks check http://localhost:3000) e pode rodar suas jornadas de cadastro, login e checkout depois de cada mudança feita pelo Claude Code ou Cursor: github.com/valmirjunior2109-spec/stillworks.",
    },
    {
      q: "Qual a diferença para o Publishub?",
      a: "O teste grátis olha suas páginas públicas uma vez. O Publishub, que estamos construindo agora, vai rodar suas jornadas reais, incluindo login e checkout, depois de cada deploy, e comparar cada execução com a última versão que funcionava. Entre na lista de espera para ter acesso antecipado.",
    },
  ],
};

export const CHECK_COPY: Record<Locale, CheckCopy> = { en, pt };

function Platforms({ label }: { label: ReactNode }) {
  return (
    <p className="mt-3 text-sm text-muted">
      {label}{" "}
      {PLATFORMS.map((p, i) => (
        <span key={p.slug}>
          <Link href={`/app-checker/${p.slug}`}>{p.name}</Link>
          {i < PLATFORMS.length - 1 ? " · " : ""}
        </span>
      ))}
    </p>
  );
}

export function CheckLanding({ locale }: { locale: Locale }) {
  const t = CHECK_COPY[locale];
  return (
    <div lang={HTML_LANG[locale]}>
      <WaitlistTracker />
      <section aria-labelledby="check-heading" className="relative overflow-hidden">
        <div aria-hidden="true" className="landing-grid" />
        <div aria-hidden="true" className="landing-beam" />
        <div className="container-page relative pb-16 pt-16 text-center sm:pb-20 sm:pt-24">
          <p className="eyebrow justify-center">{t.eyebrow}</p>
          <h1 id="check-heading" className="mx-auto mt-4 max-w-3xl text-4xl font-bold leading-[1.08] sm:text-6xl">
            {t.title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted sm:text-xl">{t.sub}</p>
          <div className="mx-auto mt-9 max-w-xl">
            <CheckForm source="check_hero" locale={locale} />
          </div>
          <p className="mt-4 text-[15px] text-muted">
            {t.worksWith} <span className="font-mono text-[14px] text-ink">Lovable · Bolt · v0 · Cursor · Claude Code</span>
          </p>
          <CheckStatsLine className="mx-auto mt-3 max-w-xl" locale={locale} />
          <Platforms label={t.checkersFor} />
        </div>
      </section>

      <section aria-labelledby="what-heading" className="container-page py-16 sm:py-24">
        <p className="eyebrow">{t.whatEyebrow}</p>
        <h2 id="what-heading" className="mt-3 max-w-2xl text-3xl font-bold sm:text-[2.5rem] sm:leading-[1.1]">
          {t.whatTitle}
        </h2>
        <ul className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {t.what.map(({ title, text }, i) => {
            const Icon = WHAT_ICONS[i];
            return (
              <li key={title} className="bg-bg p-6">
                <Icon aria-hidden="true" className="h-6 w-6 text-accent" />
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-1.5 text-[15px] text-muted">{text}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="trust-heading" className="border-y border-line bg-surface">
        <div className="container-page py-16 sm:py-20">
          <p className="eyebrow">{t.trustEyebrow}</p>
          <h2 id="trust-heading" className="mt-3 max-w-2xl text-3xl font-bold sm:text-[2.5rem] sm:leading-[1.1]">
            {t.trustTitle}
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-muted">{t.trustSub}</p>
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {t.trust.map(({ title, text }, i) => {
              const Icon = TRUST_ICONS[i];
              return (
                <li key={title}>
                  <Icon aria-hidden="true" className="h-6 w-6 text-accent" />
                  <h3 className="mt-3 font-semibold">{title}</h3>
                  <p className="mt-1.5 text-[15px] text-muted">{text}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section aria-labelledby="full-heading" className="container-page pt-16 sm:pt-24">
        <div className="rounded-md border border-line-strong bg-surface p-6 sm:p-10">
          <FileWarning aria-hidden="true" className="h-7 w-7 text-accent" />
          <h2 id="full-heading" className="mt-4 max-w-2xl text-2xl font-bold sm:text-3xl">
            {t.fullTitle}
          </h2>
          <p className="mt-3 max-w-2xl text-muted">{t.fullText}</p>
          <Link href={localePath(locale, "/#early-access")} data-cta="check_join" className={buttonClasses("primary", "lg", "mt-6")}>
            {t.join}
          </Link>
        </div>
      </section>

      <section aria-labelledby="faq-heading" className="container-page max-w-3xl py-16 sm:py-24">
        <h2 id="faq-heading" className="text-3xl font-bold">
          {t.faqTitle}
        </h2>
        <div className="mt-6">
          <FaqList items={t.faq} />
        </div>
      </section>
    </div>
  );
}
