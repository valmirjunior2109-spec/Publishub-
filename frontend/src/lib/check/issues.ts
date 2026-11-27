import { INTL_LOCALE, type Locale } from "../i18n";
import { displayUrl, hostOf, redact, routeOf } from "./redact";
import { CHECK_LABELS, CHECK_LABELS_PT, type CheckId, type CheckItem, type CheckResult } from "./types";

/**
 * Os problemas do relatório, um por item, a partir do que o teste já grava (as verificações e as
 * páginas abertas). Nada é inventado: cada problema vem de uma verificação com falha ou aviso, e toda
 * evidência passa por redact() antes de aparecer na tela, na área de transferência ou num post.
 *
 * Também ficam aqui os textos que saem do relatório: o prompt para o agente de IA e o resumo
 * público para compartilhar (só contagens).
 */

export type IssueKind = "crash" | "request" | "page" | "other";
export type IssueSeverity = "fail" | "warn";

export interface CheckIssue {
  key: string;
  kind: IssueKind;
  severity: IssueSeverity;
  source: CheckId;
  title: string;
  /** A página ou rota afetada (só o caminho, já limpo), ou null quando o teste não sabe. */
  route: string | null;
  description: string;
  evidence: string[];
  /** O próximo passo para investigar, em linguagem de quem vai abrir o código. */
  step: string;
}

export interface IssueCounts {
  crash: number;
  request: number;
  page: number;
  other: number;
}

const MAIN_KINDS: IssueKind[] = ["crash", "request", "page"];

const TEXT = {
  en: {
    kinds: { crash: "Crashes", request: "Failed requests", page: "Broken or unreachable pages", other: "Other things worth a look" } satisfies Record<IssueKind, string>,
    kindTag: { crash: "Crash", request: "Failed request", page: "Broken page", other: "Warning" } satisfies Record<IssueKind, string>,
    startDidntLoad: "Your start page didn't open",
    startNotFound: 'Your start page shows a "not found" screen',
    jsError: "Uncaught JavaScript error",
    jsErrorDesc: (pages: string) => (pages ? `The browser hit an uncaught error on ${pages}. Whatever that code does (a button, a form, a section) may not work.` : "The browser hit an uncaught error. Whatever that code does (a button, a form, a section) may not work."),
    request: (reason: string) => `A request failed (${reason})`,
    requestDesc: "The page asked your app or its API for something and didn't get it. Data, images or actions that depend on it may be missing.",
    thirdParty: (reason: string) => `A third-party request failed (${reason})`,
    thirdPartyDesc: "A service your page loads from another domain didn't respond. It may or may not affect your users.",
    pageBroken: (reason: string) => `A page has a problem (${reason})`,
    pageDesc: "We opened this page from a link on your app, like a visitor would, and it didn't work as expected.",
    linkBroken: (reason: string) => `A link points to a page that doesn't work (${reason})`,
    linkDesc: "A link on your page leads somewhere that returns an error. Visitors who click it hit a dead end.",
    blocked: (status: number) => `A page blocks automated browsers or needs a login (HTTP ${status})`,
    blockedDesc: "This page answered our browser with an access error. That's normal for pages behind a login or protected against bots, so it isn't counted as a broken page.",
    authRequest: (reason: string) => `A request needed a login (${reason})`,
    authRequestDesc: "The page asked for something that requires a signed-in user. On a public page this is often expected, for example when it checks whether someone is logged in.",
    steps: {
      crash: "Open the page with the browser console open, reproduce the error and find the file and line it comes from. Check for missing data (undefined or null) or an environment variable that isn't set in production.",
      server: "Look at the server or function logs for this route at the time of the check, then reproduce the request locally.",
      client: "Check that the route exists, that the method and parameters match what the frontend sends, and whether it requires a login on a public page.",
      network: "Check that the domain responds, the URL is right for production and CORS allows the request.",
      thirdParty: "Check the service's key, allowed domains and configuration, and decide whether this failure affects users.",
      notFound: "Check that the route exists in the router and the link points to the right path. For a single-page app, check the host's fallback rewrites.",
      pageError: "Open this route locally and read the server log. Check the data and environment variables this page uses.",
      link: "Find where this link is generated and fix the path, or create the missing route.",
      console: "Read the console messages and fix the ones that come from your app's own code.",
      https: "Serve every page and asset over HTTPS, and replace http:// links to scripts, images and fonts.",
      mobile: "Look for elements with a fixed width wider than the screen, and make sure the viewport meta tag is set.",
      speed: "Check what blocks the first load: large images, heavy scripts or slow API calls on the server.",
      preview: "Add a title, a meta description and an og:image to the page's metadata.",
      blocked: "If this page should open for any visitor, check your host's bot protection or firewall and the route's access rules. If it needs a login, you can ignore this.",
      authRequest: "Check whether the public page should call this endpoint before login. If it's expected (like a \"who's logged in\" check), you can ignore this.",
    },
    at: "on",
    // o prompt para o agente
    prompt: {
      intro: "I found these possible problems while checking the public pages of my app with Publishub /check.",
      url: "URL checked",
      when: "Date/time",
      scope: "Scope: public pages only, read-only (no login, no form submissions). Flows behind a login were not checked.",
      problems: (n: number) => `## Possible problems (${n})`,
      noProblems: "No problems were found on the public pages checked in this run. Flows behind a login, forms and checkout were not checked.",
      page: "Page or route",
      kind: "Failure type",
      evidence: "Evidence",
      step: "Suggested next step",
      none: "none captured",
      outro: "Investigate the root cause before changing code. Don't change unrelated files. After fixing it, explain what changed and how I can verify it.",
    },
  },
  pt: {
    kinds: { crash: "Crashes", request: "Requisições que falharam", page: "Páginas quebradas ou inacessíveis", other: "Outros pontos para olhar" } satisfies Record<IssueKind, string>,
    kindTag: { crash: "Crash", request: "Requisição com falha", page: "Página quebrada", other: "Aviso" } satisfies Record<IssueKind, string>,
    startDidntLoad: "A página inicial não abriu",
    startNotFound: "A página inicial mostra uma tela de “não encontrado”",
    jsError: "Erro de JavaScript não tratado",
    jsErrorDesc: (pages: string) => (pages ? `O navegador encontrou um erro não tratado em ${pages}. O que esse código faz (um botão, um formulário, uma seção) pode não funcionar.` : "O navegador encontrou um erro não tratado. O que esse código faz (um botão, um formulário, uma seção) pode não funcionar."),
    request: (reason: string) => `Uma requisição falhou (${reason})`,
    requestDesc: "A página pediu algo ao seu app ou à API e não recebeu. Dados, imagens ou ações que dependem disso podem não aparecer.",
    thirdParty: (reason: string) => `Uma requisição para um serviço de terceiros falhou (${reason})`,
    thirdPartyDesc: "Um serviço que a página carrega de outro domínio não respondeu. Pode afetar ou não quem usa o app.",
    pageBroken: (reason: string) => `Uma página tem problema (${reason})`,
    pageDesc: "Abrimos esta página a partir de um link do seu app, como um visitante faria, e ela não funcionou como deveria.",
    linkBroken: (reason: string) => `Um link leva a uma página que não funciona (${reason})`,
    linkDesc: "Um link da sua página leva a um endereço que responde com erro. Quem clica cai num beco sem saída.",
    blocked: (status: number) => `Uma página bloqueia navegadores automáticos ou exige login (HTTP ${status})`,
    blockedDesc: "Esta página respondeu ao nosso navegador com um erro de acesso. Isso é normal em páginas que exigem login ou têm proteção contra robôs, então não conta como página quebrada.",
    authRequest: (reason: string) => `Uma requisição exigiu login (${reason})`,
    authRequestDesc: "A página pediu algo que exige um usuário logado. Numa página pública isso costuma ser esperado, por exemplo quando ela confere se alguém está logado.",
    steps: {
      crash: "Abra a página com o console do navegador aberto, reproduza o erro e encontre o arquivo e a linha de onde ele vem. Confira se falta algum dado (undefined ou null) ou uma variável de ambiente no deploy.",
      server: "Veja os logs do servidor ou da função dessa rota no horário do teste e reproduza a requisição localmente.",
      client: "Confira se a rota existe, se o método e os parâmetros batem com o que o front envia e se ela exige login numa página pública.",
      network: "Confira se o domínio responde, se a URL está certa para produção e se o CORS permite a requisição.",
      thirdParty: "Confira a chave, os domínios permitidos e a configuração do serviço, e decida se essa falha afeta quem usa o app.",
      notFound: "Confira se a rota existe no roteador e se o link aponta para o caminho certo. Em app de página única (SPA), confira o fallback de rotas (rewrites) do host.",
      pageError: "Abra essa rota localmente e leia o log do servidor. Confira os dados e as variáveis de ambiente que a página usa.",
      link: "Encontre onde esse link é gerado e corrija o caminho, ou crie a rota que falta.",
      console: "Leia as mensagens do console e corrija as que vêm do código do próprio app.",
      https: "Sirva todas as páginas e arquivos por HTTPS e troque os links http:// de scripts, imagens e fontes.",
      mobile: "Procure elementos com largura fixa maior que a tela e confira se a meta tag viewport está definida.",
      speed: "Veja o que trava o primeiro carregamento: imagens grandes, scripts pesados ou chamadas lentas à API no servidor.",
      preview: "Adicione título, meta description e og:image nos metadados da página.",
      blocked: "Se essa página deveria abrir para qualquer visitante, confira a proteção contra robôs ou o firewall do host e as regras de acesso da rota. Se ela exige login, pode ignorar.",
      authRequest: "Confira se a página pública deveria chamar esse endpoint antes do login. Se for esperado (como conferir quem está logado), pode ignorar.",
    },
    at: "em",
    prompt: {
      intro: "Encontrei estes possíveis problemas ao testar as páginas públicas do meu app com Publishub /check.",
      url: "URL testada",
      when: "Data/hora",
      scope: "Escopo: só páginas públicas, só leitura (sem login, sem enviar formulários). Fluxos por trás de um login não foram testados.",
      problems: (n: number) => `## Possíveis problemas (${n})`,
      noProblems: "Não encontrei problemas nas páginas públicas testadas nesta execução. Fluxos com login, formulários e checkout não foram testados.",
      page: "Página ou rota",
      kind: "Tipo de falha",
      evidence: "Evidência",
      step: "Passo sugerido de investigação",
      none: "nenhuma capturada",
      outro: "Investigue a causa raiz antes de alterar código. Não altere arquivos não relacionados. Depois de corrigir, explique o que mudou e como posso validar.",
    },
  },
} as const;

export type IssueText = (typeof TEXT)["en"];
export const ISSUE_TEXT: Record<Locale, IssueText> = TEXT as unknown as Record<Locale, IssueText>;

/** "HTTP 500 · host/caminho" → { reason, target }. Os itens do teste usam esse separador nos dois idiomas. */
function splitItem(item: string): { reason: string; target: string | null } {
  const at = item.lastIndexOf(" · ");
  if (at < 0) return { reason: item, target: null };
  return { reason: item.slice(0, at), target: item.slice(at + 3) };
}

function statusOf(reason: string): number | null {
  const match = /HTTP (\d{3})/.exec(reason);
  return match ? Number(match[1]) : null;
}

function sameHost(target: string | null, appHost: string | null): boolean {
  if (!target || !appHost) return false;
  const host = target.split("/")[0]?.toLowerCase();
  return host === appHost.toLowerCase();
}

/** Lista os problemas do relatório, os graves primeiro e na ordem: crashes, requisições, páginas, outros. */
export function buildIssues(result: CheckResult, locale: Locale): CheckIssue[] {
  const T = ISSUE_TEXT[locale];
  const S = T.steps;
  const appHost = hostOf(result.finalUrl);
  const issues: CheckIssue[] = [];
  const byId = new Map<CheckId, CheckItem>(result.checks.map((c) => [c.id, c]));
  const pagesWithErrors = result.pages.filter((p) => p.jsErrors > 0).map((p) => routeOf(p.url));
  const errorPages = [...new Set(pagesWithErrors)].join(", ");

  const loads = byId.get("loads");
  if (loads?.verdict === "fail") {
    const start = result.pages.find((p) => p.kind === "start");
    const notFound = Boolean(start?.notFound);
    issues.push({
      key: "loads",
      kind: "page",
      severity: "fail",
      source: "loads",
      title: notFound ? T.startNotFound : T.startDidntLoad,
      route: routeOf(result.finalUrl),
      description: redact(loads.detail),
      evidence: [start?.status ? `HTTP ${start.status}` : null, start?.error ? redact(start.error) : null].filter((x): x is string => Boolean(x)),
      step: notFound ? S.notFound : S.pageError,
    });
  }

  const js = byId.get("js_errors");
  if (js?.verdict === "fail") {
    const messages = js.items?.length ? js.items : [js.detail];
    messages.forEach((message, i) => {
      issues.push({
        key: `js-${i}`,
        kind: "crash",
        severity: "fail",
        source: "js_errors",
        title: T.jsError,
        route: errorPages || null,
        description: T.jsErrorDesc(errorPages),
        evidence: [redact(message)],
        step: S.crash,
      });
    });
  }

  const network = byId.get("network");
  if (network && (network.verdict === "fail" || network.verdict === "warn")) {
    (network.items ?? []).forEach((item, i) => {
      const { reason, target } = splitItem(item);
      const status = statusOf(reason);
      // 401/403: a requisição exige login, o que numa página pública muitas vezes é esperado
      if (status === 401 || status === 403) {
        issues.push({
          key: `net-${i}`,
          kind: "other",
          severity: "warn",
          source: "network",
          title: T.authRequest(redact(reason)),
          route: target ? routeOf(target) : null,
          description: T.authRequestDesc,
          evidence: [redact(item)],
          step: S.authRequest,
        });
        return;
      }
      const own = sameHost(target, appHost) || (status !== null && status >= 500);
      const severity: IssueSeverity = network.verdict === "fail" && own ? "fail" : "warn";
      issues.push({
        key: `net-${i}`,
        kind: "request",
        severity,
        source: "network",
        title: own ? T.request(redact(reason)) : T.thirdParty(redact(reason)),
        route: target ? (own ? routeOf(target) : redact(target.split("?")[0] ?? target)) : null,
        description: own ? T.requestDesc : T.thirdPartyDesc,
        evidence: [redact(item)],
        step: !own ? S.thirdParty : status === null ? S.network : status >= 500 ? S.server : S.client,
      });
    });
  }

  const pages = byId.get("pages");
  if (pages?.verdict === "fail") {
    (pages.items ?? []).forEach((item, i) => {
      const { reason, target } = splitItem(item);
      const status = statusOf(reason);
      // uma página que só falhou por erro de JavaScript já aparece nos crashes (com a mensagem do erro)
      if (status === null && /JS/.test(reason)) return;
      // 401/403: a página exige login ou bloqueia navegadores automáticos (Cloudflare, rotas de login): não é página quebrada
      if (status === 401 || status === 403) {
        issues.push({ key: `page-${i}`, kind: "other", severity: "warn", source: "pages", title: T.blocked(status), route: target ? routeOf(target) : null, description: T.blockedDesc, evidence: [redact(item)], step: S.blocked });
        return;
      }
      issues.push({
        key: `page-${i}`,
        kind: "page",
        severity: "fail",
        source: "pages",
        title: T.pageBroken(redact(reason)),
        route: target ? routeOf(target) : null,
        description: T.pageDesc,
        evidence: [redact(item)],
        step: status === 404 || status === null ? S.notFound : S.pageError,
      });
    });
  }

  const links = byId.get("links");
  if (links?.verdict === "fail") {
    (links.items ?? []).forEach((item, i) => {
      const { reason, target } = splitItem(item);
      const status = statusOf(reason);
      // 401/403: a página exige login ou bloqueia navegadores automáticos (Cloudflare, rotas de login): não é página quebrada
      if (status === 401 || status === 403) {
        issues.push({ key: `link-${i}`, kind: "other", severity: "warn", source: "links", title: T.blocked(status), route: target ? routeOf(target) : null, description: T.blockedDesc, evidence: [redact(item)], step: S.blocked });
        return;
      }
      issues.push({
        key: `link-${i}`,
        kind: "page",
        severity: "fail",
        source: "links",
        title: T.linkBroken(redact(reason)),
        route: target ? routeOf(target) : null,
        description: T.linkDesc,
        evidence: [redact(item)],
        step: S.link,
      });
    });
  }

  const others: [CheckId, keyof IssueText["steps"]][] = [
    ["https", "https"],
    ["console", "console"],
    ["mobile", "mobile"],
    ["speed", "speed"],
    ["preview", "preview"],
  ];
  // nos avisos, o nome do problema ("erros no console"), não o da verificação ("Sem erros no console")
  const problemLabels = locale === "pt" ? CHECK_LABELS_PT : CHECK_LABELS;
  const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
  for (const [id, step] of others) {
    const check = byId.get(id);
    if (!check || (check.verdict !== "fail" && check.verdict !== "warn")) continue;
    issues.push({
      key: id,
      kind: "other",
      severity: check.verdict,
      source: id,
      title: capitalize(problemLabels[id]),
      route: routeOf(result.finalUrl),
      description: redact(check.detail),
      evidence: (check.items ?? []).map(redact),
      step: S[step],
    });
  }

  // a mesma falha em URLs que só mudam na query (já escondida) aparece uma vez só
  const seen = new Set<string>();
  const unique = issues.filter((issue) => {
    const id = [issue.kind, issue.title, issue.route, issue.evidence.join("|")].join("::");
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  const order: Record<IssueKind, number> = { crash: 0, request: 1, page: 2, other: 3 };
  return unique.sort((a, b) => order[a.kind] - order[b.kind] || (a.severity === b.severity ? 0 : a.severity === "fail" ? -1 : 1));
}

export function countIssues(issues: CheckIssue[]): IssueCounts {
  const counts: IssueCounts = { crash: 0, request: 0, page: 0, other: 0 };
  for (const issue of issues) counts[issue.kind] += 1;
  return counts;
}

/** Os problemas que contam como "possíveis problemas": crashes, requisições e páginas (não os avisos gerais). */
export function problemCount(counts: IssueCounts): number {
  return MAIN_KINDS.reduce((sum, kind) => sum + counts[kind], 0);
}

export function formatWhen(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleString(INTL_LOCALE[locale], { dateStyle: "medium", timeStyle: "short" });
}

/** Um problema em texto, para o botão "Copiar detalhes". */
export function issueText(issue: CheckIssue, locale: Locale): string {
  const P = ISSUE_TEXT[locale].prompt;
  const tag = ISSUE_TEXT[locale].kindTag[issue.kind];
  return [
    `[${tag}] ${issue.title}`,
    `- ${P.page}: ${issue.route ?? "–"}`,
    `- ${P.kind}: ${issue.description}`,
    `- ${P.evidence}: ${issue.evidence.length ? issue.evidence.map((e) => `\`${e}\``).join("; ") : P.none}`,
    `- ${P.step}: ${issue.step}`,
  ].join("\n");
}

/** O texto para colar no Claude Code, no Cursor ou em outro agente. Sem screenshots, cookies nem headers. */
export function agentPrompt({ url, createdAt, issues, locale }: { url: string; createdAt: string; issues: CheckIssue[]; locale: Locale }): string {
  const P = ISSUE_TEXT[locale].prompt;
  const lines = [P.intro, "", `${P.url}: ${displayUrl(url)}`, `${P.when}: ${formatWhen(createdAt, locale)}`, P.scope, ""];
  if (issues.length) {
    lines.push(P.problems(issues.length), "");
    issues.forEach((issue, i) => {
      lines.push(`### ${i + 1}. ${issueText(issue, locale)}`, "");
    });
  } else {
    lines.push(P.noProblems, "");
  }
  lines.push(P.outro);
  return lines.join("\n");
}

// ---------------------------------------------------------------- compartilhamento público

/** O que pode ir para um post: só contagens por tipo. Nunca URL, print, mensagem de erro ou header. */
export interface PublicSummary {
  crash: number;
  request: number;
  page: number;
  other: number;
}

export function publicSummary(counts: IssueCounts): PublicSummary {
  const cap = (n: number) => Math.min(99, Math.max(0, n));
  return { crash: cap(counts.crash), request: cap(counts.request), page: cap(counts.page), other: cap(counts.other) };
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "1 crash, 1 requisição falhando e 1 página quebrada" (só as partes que não são zero). */
export function summaryParts(summary: PublicSummary, locale: Locale): string {
  const parts =
    locale === "pt"
      ? [
          summary.crash && plural(summary.crash, "crash", "crashes"),
          summary.request && plural(summary.request, "requisição falhando", "requisições falhando"),
          summary.page && plural(summary.page, "página quebrada", "páginas quebradas"),
        ]
      : [
          summary.crash && plural(summary.crash, "crash", "crashes"),
          summary.request && plural(summary.request, "failing request", "failing requests"),
          summary.page && plural(summary.page, "broken page", "broken pages"),
        ];
  const list = parts.filter(Boolean) as string[];
  if (list.length <= 1) return list[0] ?? "";
  const and = locale === "pt" ? " e " : " and ";
  return `${list.slice(0, -1).join(", ")}${and}${list[list.length - 1]}`;
}

export function shareHeadlineFor(summary: PublicSummary, locale: Locale): string {
  const n = summary.crash + summary.request + summary.page;
  if (locale === "pt") return n ? `${plural(n, "possível problema", "possíveis problemas")} encontrados` : "Nenhum problema nas páginas públicas";
  return n ? `${plural(n, "possible problem", "possible problems")} found` : "No problems on the public pages";
}

/**
 * O texto do post, em primeira pessoa. appOrigin só entra se a pessoa marcou "incluir a URL do meu app",
 * e mesmo assim só a origem (https://meuapp.com), nunca o caminho nem a query.
 */
export function shareSummaryText(summary: PublicSummary, locale: Locale, link: string, appOrigin?: string | null): string {
  const n = summary.crash + summary.request + summary.page;
  const parts = summaryParts(summary, locale);
  if (locale === "pt") {
    const tested = appOrigin ? `Testei as páginas públicas do meu app (${appOrigin}) com o /check da Publishub.` : "Testei as páginas públicas do meu app com o /check da Publishub.";
    const found = n ? `Encontrei ${plural(n, "possível problema", "possíveis problemas")}: ${parts}.` : "Não encontrei problemas nas páginas públicas desta vez.";
    return `${tested}\n${found}\nTeste o seu app: ${link}`;
  }
  const tested = appOrigin ? `I checked the public pages of my app (${appOrigin}) with Publishub's /check.` : "I checked the public pages of my app with Publishub's /check.";
  const found = n ? `Found ${plural(n, "possible problem", "possible problems")}: ${parts}.` : "No problems on the public pages this time.";
  return `${tested}\n${found}\nCheck your app: ${link}`;
}
