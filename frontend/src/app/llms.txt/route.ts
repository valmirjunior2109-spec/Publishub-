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
    "> Publishub verifies that apps built with AI coding tools (Claude Code, Cursor, Codex, Lovable, Bolt, v0) actually work. Today it offers a free, read-only check that opens an app in a real browser and reports what's broken; the full product, which runs real user journeys after every change, is in development with an early-access waitlist.",
    "",
    "## Free tools",
    "",
    `- [Free app check](${SITE_URL}/check): paste a public URL; Publishub opens it in a real browser (desktop and phone), visits key pages, and reports JavaScript crashes, failed requests, broken links, "not found" pages, mobile layout, load time, link previews and HTTPS. Free, no signup, read-only (never logs in or submits forms).`,
    ...PLATFORMS.map((p) => `- [Free ${p.name} app checker](${SITE_URL}/app-checker/${p.slug}): the same free check, for apps built with ${p.name}.`),
    "- [stillworks](https://github.com/valmirjunior2109-spec/stillworks): free, open-source (MIT) CLI and MCP server by the same team. `npx stillworks check <url>` checks an app with zero setup; `npx stillworks mcp` lets Claude Code, Cursor and other MCP clients run the check themselves after a change.",
    "",
    "## Guides",
    "",
    ...GUIDES.map((g) => `- [${g.title}](${SITE_URL}/guides/${g.slug}): ${g.description}`),
    "",
    "## Product",
    "",
    `- [Publishub](${SITE_URL}/): in development. Will run an app's real user journeys (signup, login, checkout) in a real browser after every change, compare with the last working version, and hand a bug report back to the coding agent.`,
    `- [Early-access waitlist and Founding Customers](${SITE_URL}/#pricing): free waitlist; Founding Customers reserve a spot with $0 charged before launch.`,
    "",
    "## Legal",
    "",
    `- [Privacy policy](${SITE_URL}/privacy)`,
    `- [Terms of service](${SITE_URL}/terms)`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
