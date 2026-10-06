import { locales } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { guidePath, guidesIn } from "@/lib/guides";
import { OFFER } from "@/lib/pricing";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

/**
 * /llms.txt: o resumo do site para assistentes de IA (ChatGPT, Perplexity, Claude…)
 * que respondem perguntas citando páginas. O formato é o de llmstxt.org: um
 * título, uma frase do que é o produto e listas de links com uma linha cada.
 *
 * Gerado a partir das mesmas fontes do sitemap: um guia novo entra aqui sozinho.
 */
export const dynamic = "force-static";

const LANGUAGE: Record<string, string> = { en: "English", "pt-BR": "Brazilian Portuguese", es: "Spanish" };

const url = (path: string) => SITE_URL + (path === "/" ? "" : path);

export function GET() {
  const lines = [
    `# ${SITE_NAME}`,
    "",
    "> AI video editing copilot for creators. Upload a Reel, TikTok or YouTube Short: publishub finds the second where viewers are most likely to leave, shows the line being said at that moment, explains why it weakens the video and returns an edited version with an editing plan. The creator decides what stays.",
    "",
    `- Free test, no sign-up: ${url("/experimentar")}`,
    `- Pricing: one plan (Founding Creator), ${OFFER.display} paid once, no subscription: ${url("/planos")}`,
    "- Available in English, Portuguese (/pt) and Spanish (/es).",
    "",
    "## Pages",
    "",
    `- [Home](${url("/")}): what publishub does and how it works`,
    `- [Free test](${url("/experimentar")}): upload a video and see where viewers leave`,
    `- [Pricing](${url("/planos")}): the Founding Creator plan`,
    `- [Partners](${url("/partners")}): referral program for creators`,
  ];

  for (const locale of locales) {
    const guides = guidesIn(locale);
    if (guides.length === 0) continue;
    lines.push("", `## Guides (${LANGUAGE[locale]})`, "");
    for (const guide of guides) lines.push(`- [${guide.title}](${url(localePath(locale, guidePath(guide.slug)))}): ${guide.description}`);
  }

  lines.push("", "## Optional", "", `- [Terms of Use](${url("/termos")})`, `- [Privacy Policy](${url("/privacidade")})`, `- [Sitemap](${url("/sitemap.xml")})`, "");

  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
