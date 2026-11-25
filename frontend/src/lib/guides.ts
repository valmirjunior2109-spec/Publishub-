/**
 * Os guias (getpublishub.com/guides/<slug>): respostas completas às perguntas que quem constrói com IA faz
 * ao Google e ao ChatGPT. Cada um começa pela resposta direta (é o trecho que os assistentes citam), segue
 * com passos concretos e termina no teste grátis e na lista de espera. Só fatos gerais e verificáveis:
 * nada de estatística inventada, nada de promessa do produto que ainda não existe.
 */

export interface GuideStep {
  title: string;
  text: string;
  /** Um trecho de código ou comando, mostrado em bloco. */
  code?: string;
}

export interface GuideSection {
  heading: string;
  paragraphs?: string[];
  steps?: GuideStep[];
}

export interface Guide {
  slug: string;
  /** A pergunta, como a pessoa escreve. Vira o <h1> e o título da página. */
  title: string;
  description: string;
  /** A resposta curta, em 2 a 4 frases: o primeiro bloco da página. */
  answer: string;
  sections: GuideSection[];
  faq: { q: string; a: string }[];
  /** Para o formulário do teste grátis e os eventos do funil. */
  source: string;
  updated: string;
}

export const GUIDES: Guide[] = [
  {
    slug: "ai-says-it-works-but-app-is-broken",
    title: "My AI says the code works, but my app is broken. What should I check?",
    description:
      "Your coding agent said \"done\" and the app is broken anyway. Where AI-written changes usually break, and a 10-minute check to find the problem before your users do.",
    answer:
      "An AI coding agent judges its own work from the code it wrote, not from the running app, so \"done\" means the change compiles, not that users can still sign up or pay. Open the app the way a user does: load the main pages with the browser console open, submit each important form and reload to see if the data is really there, and check the pages the agent didn't mention, because that's where unexpected changes break things.",
    sections: [
      {
        heading: "Why it happens",
        paragraphs: [
          "Agents like Claude Code, Cursor, Codex, Lovable and Bolt check their work with what they can see: the code compiles, the types match, maybe a few tests pass. None of that proves a person can click through the app.",
          "Three patterns cause most of the surprises: the agent changes a file you didn't ask it to touch, it changes one side of a contract (a field name, an API route) without the other, or it writes a test that checks its own implementation instead of the behavior you wanted.",
        ],
      },
      {
        heading: "A 10-minute check after every AI change",
        steps: [
          { title: "Open the browser console first", text: "Load your home page and main screens with DevTools open (F12). Red errors in the Console tab usually mean a feature stopped working, even when the page looks fine." },
          { title: "Watch the Network tab", text: "Requests in red (4xx or 5xx) are calls to your API or database that failed. Click one to see the response: it often names the exact problem." },
          { title: "Submit every important form, then reload", text: "Sign up, log in, save something. Then reload the page. A success message doesn't prove the data was saved; seeing it after a reload does." },
          { title: "Check the pages the agent didn't mention", text: "Look at the diff and list every file it changed. Open the pages that use those files, not just the one you asked about." },
          { title: "Try it on a phone-sized screen", text: "In DevTools, switch to a mobile viewport. Layouts that scroll sideways or buttons pushed off screen are common after UI changes." },
          { title: "Test the deployed version, not only localhost", text: "Missing environment variables and API keys only show up in production. Open the real URL after each deploy." },
        ],
      },
      {
        heading: "Make it automatic",
        paragraphs: [
          "Doing this by hand after every prompt eats the time the AI saved. Two free tools run the same kind of check for you: Publishub's free app check opens your deployed app in a real browser and lists crashes, failed requests and broken pages; stillworks, its open-source counterpart, lets Claude Code or Cursor run the check themselves after a change.",
        ],
      },
    ],
    faq: [
      {
        q: "Can't I just ask the AI to test its own code?",
        a: "It helps, but the same system that wrote the change is grading it. Agents sometimes report tests they didn't run, or edit a failing test until it passes. An independent check of the running app is more reliable.",
      },
      {
        q: "Do unit tests catch this?",
        a: "Usually not. Unit tests check functions in isolation. The common breakages after an AI change, like a form that no longer submits or a page that 404s, only show up when you use the real app in a browser.",
      },
    ],
    source: "guide_ai_says_works",
    updated: "2026-11-25",
  },
  {
    slug: "supabase-form-says-saved-but-nothing-saved",
    title: "Supabase form says \"Saved!\" but nothing is saved: how to fix it",
    description:
      "Your app shows a success message after a Supabase insert, but the row never appears. The usual causes (row-level security, an ignored error, a wrong column) and how to fix each one.",
    answer:
      "supabase-js doesn't throw when an insert fails: it returns an error object, and if the code ignores it, the app shows \"Saved!\" anyway. The most common cause is row-level security (RLS): the table has RLS enabled but no policy that allows this user to insert, so Postgres rejects the row with \"new row violates row-level security policy\". Check the error, add an insert policy, and read the data back to confirm.",
    sections: [
      {
        heading: "Step 1: stop ignoring the error",
        steps: [
          {
            title: "Look at what the insert returns",
            text: "Every Supabase call returns { data, error }. Show the error instead of the success message when it's set. AI-generated code often skips this check.",
            code: `const { error } = await supabase.from("notes").insert({ title, user_id: user.id });
if (error) {
  console.error(error);
  showError("Couldn't save. Please try again.");
  return;
}
showSuccess("Saved!");`,
          },
          { title: "Read the message", text: "Open the browser console and the Network tab, save again and look at the failed request. The error message tells you which of the causes below you have." },
        ],
      },
      {
        heading: "Step 2: fix the cause",
        steps: [
          {
            title: "\"new row violates row-level security policy\" (RLS)",
            text: "RLS is on and no policy allows the insert. Add one that lets logged-in users insert rows they own, in the Supabase SQL editor:",
            code: `create policy "Users can insert their own notes"
on public.notes for insert
to authenticated
with check (auth.uid() = user_id);`,
          },
          {
            title: "The insert works but data comes back empty",
            text: "If the code calls .insert(...).select() and there's no select policy, the row is saved but can't be read back. Add a matching policy for select (using (auth.uid() = user_id)).",
          },
          { title: "\"Could not find the column\"", text: "The code sends a field name the table doesn't have, often after the AI renamed something on one side only. Make the names match the table in Supabase's Table Editor." },
          { title: "The user isn't logged in", text: "With RLS, a request without a session runs as the anon role and fails policies meant for authenticated users. Check that the session exists before saving." },
        ],
      },
      {
        heading: "Step 3: prove it saved",
        paragraphs: [
          "After the fix, save something, reload the page and confirm it's still there, or check the table in Supabase. Then test with a second account: it should not see the first account's rows. That last check catches the opposite mistake, a policy so open that everyone can read everything.",
          "To catch this automatically after every change, run a journey that saves something and reads it back. stillworks, a free open-source tool, has a ready-made \"read the data back\" recipe for exactly this case.",
        ],
      },
    ],
    faq: [
      {
        q: "Should I just disable RLS to make it work?",
        a: "No. Without RLS, anyone with your public anon key can read and change every row in that table. Keep RLS on and add policies that allow exactly what each user needs.",
      },
      {
        q: "Why does it work in the Supabase dashboard but not in my app?",
        a: "The dashboard's SQL editor runs with full privileges and skips RLS. Your app runs as the logged-in user (or anon), so the policies apply.",
      },
    ],
    source: "guide_supabase_saved",
    updated: "2026-11-25",
  },
  {
    slug: "test-lovable-app-before-launch",
    title: "How to test a Lovable app before launch",
    description:
      "A practical pre-launch checklist for apps built with Lovable (or Bolt): logins, data access, forms, broken pages, phones and the deployed version, plus how to check it automatically.",
    answer:
      "Before launching a Lovable app, test it the way a stranger would use it: logged out, on a phone, on the published URL. The checks that matter most are that private pages need a login, that one account can't see another's data, that forms really save, and that no page shows an error or a \"not found\" screen.",
    sections: [
      {
        heading: "The pre-launch checklist",
        steps: [
          { title: "Log out and open every private page", text: "Paste the URLs of your dashboard and settings pages into a private window. If you can see data without logging in, so can anyone." },
          { title: "Create two accounts", text: "Sign up twice. While logged in as the second account, try to see the first account's data. If you can, your Supabase row-level security policies are missing or too open." },
          { title: "Submit every form and reload", text: "A success toast isn't proof. Reload the page and confirm the data is there. If it isn't, see the guide on Supabase saves below." },
          { title: "Open every page from the menu", text: "Lovable apps are single-page apps: a broken route shows the app's own \"not found\" screen while the server still answers 200, so only opening the page reveals it." },
          { title: "Check the console for red errors", text: "Open DevTools on your main pages. Uncaught errors often mean a button or a whole screen silently stopped working." },
          { title: "Use a real phone", text: "Check that nothing scrolls sideways, buttons are reachable and forms are usable with the phone keyboard open." },
          { title: "Test the published URL", text: "Run the checklist on the published app, not just the editor preview. If you deploy elsewhere (Vercel, Netlify), check that refreshing a deep page doesn't 404." },
        ],
      },
      {
        heading: "After launch: every change is a new risk",
        paragraphs: [
          "Each prompt can touch files beyond the one you asked about, so a page that worked yesterday can break today. Re-run the important checks after every change, or automate them.",
          "Publishub's free checker opens your published Lovable app in a real browser and lists crashes, failed requests and broken pages in about a minute. If your Lovable project syncs to GitHub, the open-source stillworks GitHub Action can check every change automatically.",
        ],
      },
    ],
    faq: [
      {
        q: "Does Lovable test my app for me?",
        a: "Lovable can flag some security issues before you publish, but it doesn't click through your app as a user after each change. Testing the running app is still up to you.",
      },
      { q: "Does this work for Bolt and v0 apps too?", a: "Yes. The same checklist applies to any app built with an AI builder; only where you check the database rules and environment variables changes." },
    ],
    source: "guide_lovable_launch",
    updated: "2026-11-25",
  },
  {
    slug: "catch-regressions-cursor-claude-code",
    title: "How to catch what Cursor or Claude Code broke after a change",
    description:
      "Coding agents sometimes break a feature they weren't asked to touch. How to spot those regressions in the diff, protect yourself with checkpoints, and make the agent check the running app itself.",
    answer:
      "To catch regressions from Cursor or Claude Code, commit before every prompt, read the full diff (not the agent's summary), and run your key user flows in a real browser after each change. Better yet, give the agent a tool that opens the app and reports failures, so it checks its own work before saying \"done\".",
    sections: [
      {
        heading: "Before the prompt: make it easy to undo",
        steps: [
          { title: "Commit before every prompt", text: "A clean git state is your checkpoint. If the change breaks something, you can see exactly what changed and roll back.", code: `git add -A && git commit -m "checkpoint before AI change"` },
          { title: "Keep tasks small", text: "One feature or fix per prompt. Big multi-file requests make unrelated edits more likely and harder to review." },
        ],
      },
      {
        heading: "After the change: review what actually happened",
        steps: [
          { title: "Read the diff, not the summary", text: "The summary describes what the agent meant to do. The diff shows what it did. Look especially for files you didn't ask about.", code: "git diff --stat\ngit diff" },
          { title: "Watch for changed tests", text: "If the agent edited an existing test to make it pass, stop and check why. The old test may have been right." },
          { title: "Check both sides of every contract", text: "If an API field, route or prop was renamed, confirm every caller was updated too. TypeScript doesn't catch everything, especially across the client and server." },
        ],
      },
      {
        heading: "Make the agent check the running app",
        paragraphs: [
          "The most reliable fix is to test what users see. stillworks is a free, open-source MCP server: after a change, the agent opens your app in a real browser, gets a report of broken pages, JavaScript errors and failed requests, and fixes them before reporting back.",
        ],
        steps: [
          { title: "Claude Code", text: "Add it as an MCP server once:", code: "claude mcp add stillworks -- npx -y stillworks mcp" },
          { title: "Cursor", text: "Add it to .cursor/mcp.json:", code: `{ "mcpServers": { "stillworks": { "command": "npx", "args": ["-y", "stillworks", "mcp"] } } }` },
        ],
      },
    ],
    faq: [
      { q: "Is reviewing the diff enough?", a: "It catches a lot, but some breakages only appear at runtime: a request that now returns 500, a component that crashes with real data. Running the app is the only way to see those." },
      { q: "Does this work with Codex, Windsurf or VS Code?", a: "Yes. Any MCP client can run stillworks with the command npx -y stillworks mcp." },
    ],
    source: "guide_regressions",
    updated: "2026-11-25",
  },
  {
    slug: "how-to-test-a-vibe-coded-app",
    title: "How to test a vibe-coded app without writing tests",
    description:
      "You built an app by prompting an AI and you don't have tests. A simple routine to know it still works after each change, from a 5-minute manual pass to free automatic checks.",
    answer:
      "You don't need a test suite to know a vibe-coded app works. Pick the 3 to 5 flows that would hurt most if they broke (usually signup, login, the main action and payment), run them by hand after every change in the deployed app, and add a free automatic check that opens the app in a real browser so the boring part runs itself.",
    sections: [
      {
        heading: "Step 1: choose the flows that matter",
        paragraphs: [
          "Write down the few things a user must be able to do. For most apps: sign up, log in, do the main thing the app is for (create a project, book a slot, send a message) and pay. If any of these break, you lose users. Everything else can wait.",
        ],
      },
      {
        heading: "Step 2: a 5-minute routine after each change",
        steps: [
          { title: "Run each flow once, in the deployed app", text: "Use the real URL, in a private window, as a new user. Note any step that fails or looks wrong." },
          { title: "Keep the console open", text: "Red errors in DevTools point to problems before users report them." },
          { title: "Reload after saving", text: "Confirm the data is still there. Success messages can appear even when nothing was saved." },
          { title: "Glance at a phone-sized screen", text: "Many vibe-coded layouts break on mobile after small UI changes." },
        ],
      },
      {
        heading: "Step 3: automate the boring part",
        paragraphs: [
          "Publishub's free app check opens your public URL in a real browser, visits your key pages and reports JavaScript crashes, failed requests, broken links and mobile layout problems in about a minute, with no setup. If you build in Claude Code or Cursor, stillworks (free, open source) lets the agent run that check itself after every change, and can run your signup and login flows once you describe them.",
        ],
      },
    ],
    faq: [
      { q: "Do I need to learn Playwright or Cypress?", a: "Not to start. A manual routine plus a zero-setup check covers the most common breakages. If you later want your flows automated, tools like stillworks let the AI write the Playwright steps for you." },
      { q: "How often should I test?", a: "After every change you deploy. AI edits can affect pages you didn't touch, so yesterday's test doesn't cover today's version." },
    ],
    source: "guide_vibe_testing",
    updated: "2026-11-25",
  },
];

export function guideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
