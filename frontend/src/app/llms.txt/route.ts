import { GUIDES } from "@/lib/guides";
import { PLATFORMS } from "@/lib/platforms";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * /llms.txt: o resumo do site para assistentes de IA (ChatGPT, Perplexity, Claude…) que respondem perguntas
 * citando páginas. Formato de llmstxt.org: título, uma frase do que é o produto e listas de links.
 * Só o que existe hoje; o produto completo aparece como "in development".
 */
export const dynamic = "force-static";

export function GET() {
  const lines = [
    `# ${SITE_NAME}`,
    "",
    "> Publishub checks that apps built with AI coding tools (Claude Code, Cursor, Codex, Lovable, Bolt, v0) still work, before their users find out they don't. Today: Publishub Check (a free, read-only check of an app's public pages in a real browser) and Publishub Monitor (a daily check of those pages that emails only when something new breaks, beta). Checks of real user journeys with login (signup, login, checkout) are in development. stillworks is the open-source engine behind it.",
    "",
    "## Free tools",
    "",
    `- [Publishub Check](${SITE_URL}/check): free. Paste a public URL; Publishub opens it in a real browser (desktop and phone), visits key pages, and reports JavaScript crashes, failed requests, broken links, "not found" pages, mobile layout, load time, link previews and HTTPS. Free, email required, read-only (never logs in or submits forms). From the report you can turn on Publishub Monitor, which repeats the check every day and emails only when a new problem shows up (beta, free, confirmed by email).`,
    ...PLATFORMS.map((p) => `- [Free ${p.name} app checker](${SITE_URL}/app-checker/${p.slug}): the same free check, for apps built with ${p.name}.`),
    "- [stillworks](https://github.com/valmirjunior2109-spec/stillworks): the open-source engine behind Publishub: a free (MIT) CLI and MCP server. `npx stillworks check <url>` checks an app with zero setup; `npx stillworks mcp` lets Claude Code, Cursor and other MCP clients run the check themselves after a change.",
    "",
    "## Guides",
    "",
    ...GUIDES.map((g) => `- [${g.title}](${SITE_URL}/guides/${g.slug}): ${g.description}`),
    "",
    "## Product",
    "",
    `- [Publishub](${SITE_URL}/): checks that an AI-built app still works. Available: Publishub Check and Publishub Monitor (public pages). In development: an app's real user journeys (signup, login, checkout) in a real browser, compared with the last working version, with a bug report for the coding agent.`,
    `- [Founding Customers](${SITE_URL}/founding) and the [waitlist](${SITE_URL}/#early-access): free waitlist; Founding Customers reserve a spot with $0 charged before launch.`,
    "",
    "## Legal",
    "",
    `- [Privacy policy](${SITE_URL}/privacy)`,
    `- [Terms of service](${SITE_URL}/terms)`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
