/**
 * As páginas de busca do teste grátis, uma por ferramenta (getpublishub.com/app-checker/<slug>). Quem procura
 * "lovable app checker" cai direto num teste que funciona. Só fatos gerais sobre cada ferramenta e riscos que
 * qualquer app pode ter: nada de estatística inventada.
 */

export interface Platform {
  slug: string;
  name: string;
  /** Uma frase sobre como os apps dessa ferramenta costumam ser feitos. */
  stack: string;
  /** O que pode quebrar depois de uma mudança, em linguagem simples (riscos gerais, não estatísticas). */
  risks: { title: string; text: string }[];
  /** Como ligar o MCP do stillworks nessa ferramenta (só para as que rodam agentes com MCP). */
  mcp?: string;
}

export const PLATFORMS: Platform[] = [
  {
    slug: "lovable",
    name: "Lovable",
    stack: "Apps built with Lovable are usually React single-page apps, often with Supabase for login and data.",
    risks: [
      { title: "Supabase requests that fail", text: "A change to a table or a row-level security policy can make a query fail while the page still looks normal." },
      { title: "Pages that show \"not found\"", text: "A renamed route or a missing page shows the app's 404 screen, even though the server answers 200." },
      { title: "One change breaking another screen", text: "Editing a shared component can break a page you didn't touch in that prompt." },
    ],
  },
  {
    slug: "bolt",
    name: "Bolt",
    stack: "Apps built with Bolt are generated and run in the browser, then deployed to a public URL.",
    risks: [
      { title: "Works in the editor, fails when deployed", text: "Missing environment variables or API keys in the deployed version make requests fail." },
      { title: "Links to pages that don't exist yet", text: "Navigation can point to pages the AI mentioned but never created." },
      { title: "Layouts that break on phones", text: "A page that looks right on desktop can scroll sideways on a phone." },
    ],
  },
  {
    slug: "v0",
    name: "v0",
    stack: "Apps built with v0 are usually Next.js apps deployed on Vercel.",
    risks: [
      { title: "Server errors from routes and actions", text: "An API route or server action that throws returns a 500 the visitor never sees explained." },
      { title: "Crashes when the page loads", text: "A component that expects data that isn't there yet can crash the whole page in the browser." },
      { title: "Renamed pages that now 404", text: "Moving or renaming a page leaves old links pointing nowhere." },
    ],
  },
  {
    slug: "replit",
    name: "Replit",
    stack: "Apps built with Replit Agent run on Replit and are published to a public URL.",
    risks: [
      { title: "A backend that errors", text: "When the server code fails, pages load but every request to the API returns an error." },
      { title: "Pages that don't load", text: "A change can leave a page blank or returning an error instead of content." },
      { title: "Console errors nobody sees", text: "Errors in the browser console often point to a feature that silently stopped working." },
    ],
  },
  {
    slug: "cursor",
    name: "Cursor",
    stack: "Apps built with Cursor can use any stack: Next.js, React, Vue, Rails, Django and more.",
    risks: [
      { title: "Changes outside the task", text: "The agent can edit a file it wasn't asked to touch, breaking a flow that worked before." },
      { title: "\"Tests pass\" but the page is broken", text: "Unit tests check functions, not the page a user actually opens and clicks." },
      { title: "Failing API calls", text: "A renamed field or endpoint makes requests fail while the build stays green." },
    ],
    mcp: '.cursor/mcp.json: { "mcpServers": { "stillworks": { "command": "npx", "args": ["-y", "stillworks", "mcp"] } } }',
  },
  {
    slug: "claude-code",
    name: "Claude Code",
    stack: "Apps built with Claude Code can use any stack, deployed anywhere: Vercel, Netlify, Railway, Fly and more.",
    risks: [
      { title: "\"Done\" doesn't mean working", text: "The agent can report a change as finished while a page it touched now crashes." },
      { title: "Refactors that break a flow", text: "A cleanup in one file can break signup or checkout somewhere else." },
      { title: "Failing API calls", text: "A changed request or response shape makes the page's requests fail." },
    ],
    mcp: "claude mcp add stillworks -- npx -y stillworks mcp",
  },
];

export const platformBySlug = (slug: string) => PLATFORMS.find((p) => p.slug === slug);
