/* Publishub · Instagram campaign — the 10 creatives.
   Rules followed here:
   - Publishub is in development (waitlist + Founding Customers reservation). Nothing says it is live.
   - Product visuals reuse the site's own illustrative preview (TerminalPreview.tsx) and are labelled "demo content".
   - Scenarios and code samples are illustrative, never presented as customer data or testimonials. */

const { icon, journey, win, code, ctaBlock } = H;

const POSTS = [];

/* ───────────────────────── 01 · AI-Generated Code: 5 Security Risks ───────────────────────── */
const risk = (n, title, text, snippet) => `
  <div class="col" style="gap:18px">
    <div class="row center" style="gap:20px"><span class="num">${n}</span><span class="divider grow"></span></div>
    <h3 class="h-s" style="font-size:54px">${title}</h3>
    <p class="body">${text}</p>
    <div class="snip mt8">${snippet}</div>
  </div>`;

POSTS.push({
  id: "01", slug: "ai-generated-code-security-risks", type: "carousel", theme: "dark", tag: "Security",
  title: "AI-Generated Code: 5 Security Risks You Should Know",
  slides: [
    { body: `
      <span class="eyebrow">Field notes · Security</span>
      <h1 class="h-xl mt32">AI-generated code: <span class="acc">5 security risks</span> you should know</h1>
      <div class="grow"></div>
      ${win({ title: "src/lib/payments.ts", badge: "Illustrative", cls: "pop", body: code([
        [12, `<span class="k">import</span> Stripe <span class="k">from</span> <span class="s">"stripe"</span>;`],
        [13, ``],
        [14, `<span class="k">export const</span> stripe = <span class="k">new</span> Stripe(`],
        [15, `  <span class="r">"sk_live_51Hx…"</span>  <span class="c">// added by the agent</span>`, true],
        [16, `);`],
      ]) })}
      <p class="small mt24" style="display:flex;gap:14px;align-items:center">${icon("fail", 22, C.fail)}<span>A live secret key, one import away from the browser bundle.</span></p>
    ` },
    { body: `
      <div class="col" style="flex:1;justify-content:space-evenly">
        ${risk("01", "Secrets in the wrong place", "Agents paste API keys into client code and commit <b>.env</b> files. Anything shipped to the browser is public.",
          `<span class="m"># .env.local</span>\nNEXT_PUBLIC_<span class="r">OPENAI_API_KEY</span>=sk-proj-…\n<span class="m"># NEXT_PUBLIC_ = bundled into client JS</span>`)}
        ${risk("02", "Missing authorization checks", "The endpoint checks that you're logged in, not that the record is yours. Change an ID, read someone else's data.",
          `GET /api/invoices/<span class="y">1042</span>   <span class="s">200 OK</span>\n<span class="m"># …but invoice 1042 belongs to another user</span>`)}
      </div>` },
    { body: `
      <div class="col" style="flex:1;justify-content:space-evenly">
        ${risk("03", "Trusting user input", "String-built SQL and raw HTML rendering open the door to injection and cross-site scripting (XSS).",
          `&lt;div dangerouslySetInnerHTML={{\n  __html: <span class="r">comment.body</span> }} /&gt;  <span class="m">// user-controlled</span>`)}
        ${risk("04", "Dependencies nobody checked", "Models can suggest packages that don't exist (attackers register those names) or versions with known vulnerabilities.",
          `$ npm audit\n<span class="r">high</span>  Prototype Pollution · <span class="m">fix available</span>`)}
      </div>` },
    { body: `
      ${risk("05", "Insecure defaults", "Wide-open CORS, debug mode in production, database rules switched off “to make it work”, and error pages that print stack traces.",
        `Access-Control-Allow-Origin: <span class="r">*</span>\n<span class="m"># also check: row-level security, DEBUG, error output</span>`)}
      <div class="grow"></div>
      <div class="card hard" style="padding:36px 40px">
        <p class="eyebrow" style="font-size:24px">Before you ship</p>
        <ul class="ticks mt24" style="gap:16px">
          ${["Search the repo and the client bundle for keys", "Call every endpoint as a second user", "Turn on your database access rules", "Audit every dependency the agent added", "Review CORS, debug flags and error pages"]
            .map((t) => `<li style="font-size:29px">${icon("box", 22, C.acc)}<span>${t}</span></li>`).join("")}
        </ul>
      </div>` },
    { beam: "low", body: `
      <span class="eyebrow">One more thing</span>
      <h2 class="h-l mt32">Secure code that doesn't work <span class="mute">is still broken.</span></h2>
      <p class="lead mt40">A security review tells you what an attacker can do. It doesn't tell you whether sign-up, checkout and onboarding still work after the agent's last change.</p>
      <p class="lead mt24"><b>That's the part we're building Publishub for:</b> real user journeys, run in a real browser.</p>
      <div class="grow"></div>
      ${ctaBlock()}` },
  ],
});

/* ───────────────────────── 02 · Your App Compiles. Does It Actually Work? (static) ───────────────────────── */
POSTS.push({
  id: "02", slug: "your-app-compiles-does-it-work", type: "static", theme: "dark", tag: "Field notes",
  title: "Your App Compiles. Does It Actually Work?",
  slides: [
    { body: `
      <h1 class="h-xl" style="font-size:100px"><span class="mute">Your app compiles.</span><br>Does it actually work?<span class="cursor"></span></h1>
      <div class="grow"></div>
      <div style="position:relative;height:590px">
        ${win({ title: "terminal", style: "position:absolute;left:0;top:0;width:600px", body: `
          <div class="term">
            <div><span class="p">$</span> npm run build</div>
            <div class="ln">${icon("pass", 20, C.tPass)}<span class="ok">Compiled successfully</span></div>
            <div class="ln">${icon("pass", 20, C.tPass)}<span class="ok">No type errors</span></div>
            <div class="ln">${icon("pass", 20, C.tPass)}<span class="ok">Lint passed</span></div>
            <div class="ln">${icon("pass", 20, C.tPass)}<span class="ok">Deployed to preview</span></div>
            <div><span class="p">$</span> <span class="cursor" style="background:#6e74f7"></span></div>
          </div>` })}
        ${win({ url: "preview.yourapp.dev/checkout", cls: "pop", style: "position:absolute;right:0;top:110px;width:480px", body: `
          <div class="page">
            <p class="ttl">Payment details</p>
            <p class="lbl" style="margin-top:18px">Card number</p><div class="fld">4242 4242 4242 4242</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px"><div class="fld">12 / 28</div><div class="fld">123</div></div>
            <div class="flag" style="margin-top:28px"><div class="btn">Pay now</div></div>
            <p style="margin-top:22px;font-family:var(--mono);font-size:19px;color:#b42318">Click → nothing happens</p>
          </div>` })}
      </div>
      <p class="lead mt40" style="font-size:34px"><b>A green build proves the code compiles.</b> Only running the journey, the way a user would, proves it works.</p>
    ` },
  ],
});

/* ───────────────────────── 03 · 5 Signs Your AI-Built SaaS Isn't Ready to Launch ───────────────────────── */
const sign = (n, title, text) => `
  <div class="col" style="gap:18px">
    <div class="row center" style="gap:20px"><span class="num">${n}</span><span class="divider grow"></span>${icon("inconclusive", 26, C.warn)}</div>
    <h3 class="h-m" style="font-size:66px">${title}</h3>
    <p class="body">${text}</p>
  </div>`;

POSTS.push({
  id: "03", slug: "signs-your-saas-isnt-ready-to-launch", type: "carousel", theme: "light", tag: "Launch",
  title: "5 Signs Your AI-Built SaaS Isn't Ready to Launch",
  slides: [
    { body: `
      <span class="eyebrow">Pre-launch check</span>
      <h1 class="h-xl mt32">5 signs your AI&#8209;built SaaS <span class="acc">isn't ready</span> to launch</h1>
      <div class="grow"></div>
      <div class="card hard" style="padding:30px 36px">
        <div class="row center" style="justify-content:space-between"><span class="pix" style="font-size:26px;text-transform:uppercase;letter-spacing:.06em">launch-readiness.md</span><span class="badge warn">${icon("inconclusive", 18, C.warn)} 0 / 5 verified</span></div>
        <div class="divider mt24"></div>
        <div class="col mt24" style="gap:16px">
          ${["Edge cases tested", "Last AI change reviewed", "Fresh-browser sign-up", "Failures are visible", "Repeatable checks"].map((t, i) =>
            `<div class="row center" style="gap:18px;font-size:30px"><span class="num" style="font-size:24px;width:44px">0${i + 1}</span><span class="grow">${t}</span><span class="pix" style="color:var(--warn);font-size:24px">????</span></div>`).join("")}
        </div>
      </div>` },
    { body: `<div class="col" style="flex:1;justify-content:space-evenly">
        ${sign("01", "You've only tested the happy path.", "Real users mistype passwords, hit back in the middle of checkout and open your app on a phone. If you haven't, <b>you haven't tested it</b>.")}
        ${sign("02", "You can't say what the last AI change touched.", "If the diff was too long to read, <b>assume something outside the task changed</b>, and check the flows that matter.")}
      </div>` },
    { body: `<div class="col" style="flex:1;justify-content:space-evenly">
        ${sign("03", "Sign-up has never run in a fresh browser.", "Your session, your cached data and your admin account hide the bugs <b>a brand-new user hits first</b>.")}
        ${sign("04", "Failures happen silently.", "A button that does nothing. An API call that fails with no message. <b>Users don't report it. They leave.</b>")}
      </div>` },
    { body: `
      ${sign("05", "“It worked when I clicked around” is your test plan.", "Clicking around once isn't a check you can repeat after the next change. Or the one after that.")}
      <div class="grow"></div>
      <div class="card pop" style="padding:38px 42px;background:var(--surface)">
        <p class="eyebrow" style="font-size:24px">Nodded at two or more?</p>
        <p class="body mt16" style="color:var(--ink)">Don't push the launch back forever. Make your <b>critical journeys</b> repeatable first:</p>
        <div class="row mt24" style="gap:14px;flex-wrap:wrap">${["Sign up", "Log in", "The thing people pay for"].map((t) => `<span class="badge acc" style="font-size:24px">${t}</span>`).join("")}</div>
      </div>` },
    { beam: "low", body: `
      <span class="eyebrow">Launch with evidence</span>
      <h2 class="h-l mt32">Ship when you know it works, <span class="mute">not when it feels done.</span></h2>
      <p class="lead mt40">We're building Publishub to run your critical user journeys in a real browser after every change, and show you exactly which step broke.</p>
      <div class="grow"></div>
      ${ctaBlock()}` },
  ],
});


/* ───────────────────────── 04 · The Hidden Problem With Vibe Coding ───────────────────────── */
const files = (rows) => `<div class="term" style="font-size:25px;line-height:1.85">${rows.map(([f, d, mark]) =>
  `<div class="ln"><span class="${mark === "x" ? "no" : mark === "ok" ? "ok" : "m"}" style="width:30px">${mark === "x" ? "M" : mark === "ok" ? "M" : "M"}</span><span class="${mark === "x" ? "no" : ""}">${f}</span><span class="fill"></span><span class="m">${d}</span></div>`).join("")}</div>`;

POSTS.push({
  id: "04", slug: "hidden-problem-with-vibe-coding", type: "carousel", theme: "dark", tag: "Vibe coding",
  title: "The Hidden Problem With Vibe Coding",
  slides: [
    { body: `
      <span class="eyebrow">Field notes · Vibe coding</span>
      <h1 class="h-xl mt32">The hidden problem with <span class="acc">vibe coding</span></h1>
      <div class="grow"></div>
      <div class="col" style="gap:20px">
        <span class="who" style="align-self:flex-end">You</span>
        <div class="bubble you">Make the pricing cards stack on mobile.</div>
        <span class="who mt8">Agent</span>
        <div class="bubble agent">Done. Updated <b>14 files</b>. ${icon("pass", 22, C.pass)} <span style="color:var(--pass)">Build passed.</span></div>
      </div>
      <p class="small mt32">You asked for one thing. Did anything else change?</p>` },
    { body: `
      <div class="col" style="flex:1;justify-content:center">
      <span class="num">01</span>
      <h2 class="h-l mt24" style="font-size:104px">The speed is real.</h2>
      <p class="lead mt32" style="font-size:38px">You describe a feature and it exists minutes later. That part of vibe coding works, and it's why so many of us now build this way.</p>
      <div class="card mt64" style="padding:38px 44px">
        ${[["10:02", "Prompt", "Describe the change"], ["10:04", "Generate", "The agent writes the code"], ["10:06", "Preview", "It's live on a preview URL"]].map(([t, a, b], i) =>
          `<div class="row center" style="gap:28px;${i ? "margin-top:26px" : ""}"><span class="mono mute" style="font-size:26px;width:90px">${t}</span>${icon("pass", 24, C.pass)}<span style="font-size:32px;font-weight:600;width:200px">${a}</span><span class="body" style="font-size:29px">${b}</span></div>`).join("")}
      </div></div>` },
    { body: `
      <span class="num">02</span>
      <h2 class="h-m mt24">The hidden part: <span class="mute">agents touch more than the task.</span></h2>
      <div class="grow"></div>
      ${win({ title: "git diff --stat", badge: "Illustrative", body: files([
        ["components/PricingCard.tsx", "+48 −21", "ok"], ["components/PricingGrid.tsx", "+31 −9", "ok"], ["styles/globals.css", "+12 −4", ""],
        ["lib/plans.ts", "+6 −6", ""], ["checkout/CheckoutForm.tsx", "+19 −23", "x"], ["… 9 more files", "", ""]]) })}
      <p class="lead mt40">A fix in one file quietly breaks a flow somewhere else, <b>and the build stays green.</b></p>` },
    { beam: "low", body: `
      <span class="eyebrow">So what do you do?</span>
      <h2 class="h-l mt32">Writing code got faster. <span class="mute">Knowing it works didn't.</span></h2>
      <p class="lead mt40">The fix isn't to stop vibe coding. It's to <b>verify the app, not just the code</b>: run the journeys your users take, after every change.</p>
      <div class="grow"></div>
      ${ctaBlock()}` },
  ],
});

/* ───────────────────────── 05 · Why AI-Built Applications Need Automated Testing ───────────────────────── */
const step = (label, state) => `<div class="col center" style="gap:14px;width:180px">
  <div style="width:150px;height:150px;display:flex;align-items:center;justify-content:center;${state === "missing" ? "border:3px dashed var(--fail);" : "border:2px solid var(--line-strong);background:var(--card);"}">
    ${state === "missing" ? `<span class="pix" style="font-size:64px;color:var(--fail)">?</span>` : icon(state, 56, state === "pass" ? C.pass : C.acc)}</div>
  <span class="pix" style="font-size:26px;text-transform:uppercase;letter-spacing:.06em;${state === "missing" ? "color:var(--fail)" : ""}">${label}</span></div>`;
const arrow = `<div style="flex:1;height:2px;background:var(--line-strong);margin-top:75px;position:relative"><span style="position:absolute;right:-6px;top:-11px">${icon("arrow", 24, C.mute)}</span></div>`;
const reason = (n, title, text, practice) => `
  <div class="col" style="flex:1;justify-content:center">
  <span class="num">${n}</span>
  <h2 class="h-l mt24">${title}</h2>
  <p class="lead mt32" style="font-size:38px">${text}</p>
  <div class="card hard mt64" style="padding:38px 44px">
    <p class="pix" style="font-size:24px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)">In practice</p>
    <p class="mt16" style="font-size:38px;line-height:1.36;font-weight:500">${practice}</p>
  </div></div>`;

POSTS.push({
  id: "05", slug: "why-ai-built-apps-need-automated-testing", type: "carousel", theme: "dark", tag: "Testing",
  title: "Why AI-Built Applications Need Automated Testing",
  slides: [
    { body: `
      <span class="eyebrow">Field notes · Testing</span>
      <h1 class="h-xl mt32">Why AI&#8209;built apps need <span class="acc">automated testing</span></h1>
      <div class="grow"></div>
      <div class="row" style="align-items:flex-start;gap:0">${step("Prompt", "running")}${arrow}${step("Code", "pass")}${arrow}${step("Verify", "missing")}${arrow}${step("Ship", "running")}</div>
      <p class="lead mt48">Most AI workflows have a missing step. <b>Here are three reasons to add it.</b></p>` },
    { body: reason("01", "There's more code than you can review.", "An agent can write more in an afternoon than you can carefully read in a day. <b>Review alone can't keep up.</b>", "A “small” refactor touches 14 files. You skim three.") },
    { body: reason("02", "Regressions land outside the task.", "Agents edit shared components, helpers and styles. <b>The break shows up in a flow you never asked them to touch.</b>", "You fixed the navbar. Password reset stopped sending emails.") },
    { body: reason("03", "Manual checks don't repeat themselves.", "You test a flow once, it works, and you move on. <b>Every change after that is unchecked.</b>", "You click through sign-up on Monday. Four changes later, on Thursday, nobody has checked it again.") },
    { beam: "low", body: `
      <span class="eyebrow">The takeaway</span>
      <h2 class="h-l mt32">Test at the speed <span class="mute">you ship.</span></h2>
      <p class="lead mt40">Automated tests run the same steps every time. For AI-built apps, the most valuable ones <b>run real user journeys in a browser</b>, after every change.</p>
      <p class="lead mt24">That's what we're building Publishub to do.</p>
      <div class="grow"></div>
      ${ctaBlock()}` },
  ],
});

/* ───────────────────────── 06 · Building Software Is Easy. Making It Reliable Is Hard. (static) ───────────────────────── */
const matrix = () => {
  const journeys = ["Sign up", "Log in", "Checkout", "Reset password", "Invite teammate"];
  const changes = ["a1c9e2f", "4be07d1", "77f3a90", "c2d8e15", "9f2c1ab", "e05b4c7"];
  const state = (r, c) => (r === 2 && c >= 4 ? "fail" : r === 3 && c === 5 ? "warn" : "pass");
  const cell = (s) => `<div style="height:58px;display:flex;align-items:center;justify-content:center;background:${s === "fail" ? "var(--fail-soft)" : s === "warn" ? "var(--warn-soft)" : "var(--pass-soft)"};border:2px solid ${s === "fail" ? "var(--fail)" : "transparent"}">${icon(s === "fail" ? "fail" : s === "warn" ? "inconclusive" : "pass", 22, s === "fail" ? C.fail : s === "warn" ? C.warn : C.pass)}</div>`;
  return `<div style="display:grid;grid-template-columns:250px repeat(6,1fr);gap:8px;align-items:center">
    <span></span>${changes.map((h) => `<span class="mono mute" style="font-size:19px;text-align:center">${h}</span>`).join("")}
    ${journeys.map((j, r) => `<span style="font-size:26px;font-weight:550">${j}</span>${changes.map((_, c) => cell(state(r, c))).join("")}`).join("")}
  </div>`;
};
POSTS.push({
  id: "06", slug: "building-is-easy-reliability-is-hard", type: "static", theme: "light", tag: "Field notes",
  title: "Building Software Is Easy. Making It Reliable Is Hard.",
  slides: [
    { body: `
      <h1 class="h-xl" style="font-size:104px"><span class="mute">Building software is easy.</span> Making it reliable is hard.</h1>
      <div class="grow"></div>
      <div class="card hard" style="padding:34px 36px 30px">
        <div class="row center" style="justify-content:space-between;margin-bottom:24px"><span class="pix" style="font-size:24px;text-transform:uppercase;letter-spacing:.06em">Every journey × every change</span><span class="badge muted" style="font-size:18px">Illustrative</span></div>
        ${matrix()}
      </div>
      <p class="lead mt40" style="font-size:34px"><b>Shipping is one step.</b> Reliability is every journey, after every change, every time.</p>` },
  ],
});

/* ───────────────────────── 07 · What Happens When an AI Coding Agent Breaks Your App? ───────────────────────── */
const when = (t, title) => `<div class="row center" style="gap:18px"><span class="badge acc">${t}</span><span class="pix mute" style="font-size:22px;text-transform:uppercase;letter-spacing:.06em">Scenario</span></div>
  <h2 class="h-m mt24">${title}</h2>`;
POSTS.push({
  id: "07", slug: "when-an-ai-agent-breaks-your-app", type: "carousel", theme: "dark", tag: "Scenario",
  title: "What Happens When an AI Coding Agent Breaks Your App?",
  slides: [
    { body: `
      <span class="eyebrow">A two-day story</span>
      <h1 class="h-xl mt32">What happens when an AI coding agent <span class="acc">breaks your app?</span></h1>
      <div class="grow"></div>
      <div class="card" style="padding:28px 32px;display:flex;gap:24px;align-items:flex-start;border-color:var(--fail)">
        <div style="width:64px;height:64px;flex:none;background:var(--fail-soft);display:flex;align-items:center;justify-content:center">${icon("fail", 30, C.fail)}</div>
        <div><p class="pix" style="font-size:22px;color:var(--fail);text-transform:uppercase;letter-spacing:.06em">New email · Thursday 08:14</p>
        <p style="font-size:34px;font-weight:600;margin-top:8px">“Pay now doesn't do anything?”</p></div>
      </div>
      <p class="small mt24">Illustrative scenario. Swipe to see how it got there.</p>` },
    { body: `
      ${when("Tuesday · 10:02", "You ask for a small change.")}
      <div class="grow"></div>
      <div class="col" style="gap:20px">
        <span class="who" style="align-self:flex-end">You</span>
        <div class="bubble you">Make the pricing cards stack on mobile.</div>
        <span class="who mt8">Agent</span>
        <div class="bubble agent">Done. I also cleaned up the shared form helpers while I was there. ${icon("pass", 22, C.pass)} <span style="color:var(--pass)">Build passed.</span></div>
      </div>
      <div class="grow"></div>
      <p class="lead">“While I was there” is where most surprises come from.</p>` },
    { body: `
      ${when("Tuesday · 10:09", "It ships. The page you asked about looks perfect.")}
      <div class="grow"></div>
      <div class="row" style="gap:28px;align-items:flex-end">
        ${win({ url: "yourapp.com/pricing", style: "width:400px;flex:none", body: `<div class="page" style="padding:22px">
          ${["Starter", "Pro", "Team"].map((p, i) => `<div style="border:2px solid ${i === 1 ? "#6e74f7" : "#e1e2f5"};border-radius:8px;padding:16px 18px;margin-top:${i ? 12 : 0}px"><p style="font-weight:700;font-size:22px">${p}</p><div style="height:10px;width:60%;background:#e7e8fd;margin-top:10px"></div><div style="height:34px;background:${i === 1 ? "#6e74f7" : "#f4f4fe"};border-radius:5px;margin-top:12px"></div></div>`).join("")}</div>` })}
        <div class="col grow" style="gap:20px">
          ${["Cards stack on mobile", "You check it on your phone", "You move on to the next task"].map((t) => `<div class="row center" style="gap:16px;font-size:31px">${icon("pass", 24, C.pass)}<span>${t}</span></div>`).join("")}
        </div>
      </div>
      <div class="grow"></div>
      <p class="lead">Nobody opens checkout. <b>Why would you? You didn't change it.</b></p>` },
    { body: `
      ${when("Thursday · 08:14", "A user finds the bug for you.")}
      <p class="lead mt32">The “cleanup” broke the checkout form. No error on screen. Clicking <b>Pay now</b> simply does nothing.</p>
      <div class="grow"></div>
      ${win({ title: "browser console", badge: "Illustrative", body: `<div class="term" style="font-size:24px">
        <div class="no">TypeError: Cannot read properties of</div><div class="no">undefined (reading 'submit')</div><div class="m">    at CheckoutForm.tsx:42</div>
        <div class="mt16"><span class="m">POST /api/checkout</span> <span class="no">· never sent</span></div></div>` })}
      <div class="grow"></div>
      <p class="lead">Two days of checkouts lost, and <b>you only heard about it because one user wrote in.</b></p>` },
    { beam: "low", body: `
      <span class="eyebrow">What should have happened</span>
      <h2 class="h-m mt24">The break gets caught <span class="mute">on Tuesday, before it ships.</span></h2>
      <div class="mt40">${win({ title: "publishub verify", badge: "Demo content", cls: "pop", body: `<div class="term" style="font-size:24px">
        ${journey("pass", "Browse plans", "12.4s")}${journey("fail", "Checkout", "41.0s")}
        <div class="ln">${icon("fail", 20, C.tFail)}<span>Regression: Checkout passed on main</span></div></div>` })}</div>
      <div class="grow"></div>
      ${ctaBlock({ note: "Publishub is in development; this preview uses demo content. Joining the waitlist is free." })}` },
  ],
});
/* ───────────────────────── 08 · Manual Testing vs. Automated Browser Testing (static) ───────────────────────── */
POSTS.push({
  id: "08", slug: "manual-vs-automated-browser-testing", type: "static", theme: "light", tag: "Field notes",
  title: "Manual Testing vs. Automated Browser Testing",
  slides: [
    { body: `
      <h1 class="h-l" style="font-size:84px">Manual testing <span class="mute">vs.</span> automated browser testing</h1>
      <div class="grow"></div>
      <table class="vs" style="margin-top:44px">
        <thead><tr><th></th><th>Manual</th><th class="auto">Automated</th></tr></thead>
        <tbody>
          ${[["Runs", "When you remember", "After every change"],
             ["Covers", "The flows you think of today", "Every journey you've defined"],
             ["Steps", "Depend on how tired you are", "The same steps, every run"],
             ["Proof", "“Seemed fine to me”", "Failing step, screenshot and logs"],
             ["Cost", "Your time, on every change", "Set up once, then it runs"]]
            .map(([k, a, b]) => `<tr><td class="k">${k}</td><td class="manual">${a}</td><td class="auto"><span style="display:inline-flex;gap:14px;align-items:flex-start">${icon("pass", 22, C.pass)}<span>${b}</span></span></td></tr>`).join("")}
        </tbody>
      </table>
      <div class="grow"></div>
      <p class="lead" style="font-size:33px"><b>Keep manual testing for exploring.</b> Automate the journeys you can't afford to break.</p>` },
  ],
});

/* ───────────────────────── 09 · Introducing Publishub ───────────────────────── */
const PROBLEMS = [
  ["Broken functionality", "A change can compile, pass lint and still break a button, a form or an API call."],
  ["Regressions you didn't ask for", "Agents touch more than the task. A fix in one file quietly breaks a flow somewhere else."],
  ["Broken user journeys", "Sign-up, checkout and onboarding fail at step four, where unit tests rarely look."],
  ["Manual testing overhead", "Clicking through the app after every AI change eats the time the agent saved you."],
];
const STEPS = [
  ["Connect your project", "Point Publishub at your app, such as a preview deployment, and pick the user journeys that matter."],
  ["Verify application behavior", "Publishub runs those journeys in a real browser after a change, the way a user would."],
  ["Identify failures and regressions", "Each result is compared with the last version that worked, so you see what this change broke."],
  ["Get actionable evidence", "The failing step, a screenshot and a bug report you can hand straight back to your coding agent."],
];
const JOURNEYS = [["pass", "Sign up", "18.2s"], ["pass", "Log in", "9.1s"], ["pass", "Browse plans", "12.4s"], ["fail", "Checkout", "41.0s"], ["warn", "Update billing", "27.3s"], ["pass", "Reset password", "15.0s"], ["pass", "Invite teammate", "22.6s"]];
const demoNote = `<p class="disclaim">Illustrative preview with demo content. Publishub is in development, and the product may change.</p>`;
const verifyLog = (extra = "") => win({ title: "publishub verify", badge: "Demo content", cls: "pop", body: `<div class="term" style="font-size:25px;line-height:1.72">
  <div><span class="p">$</span> publishub verify --change 9f2c1ab</div>
  <div class="m">Refactor checkout form · AI-assisted · 14 files</div>
  <div class="ln mt8">${icon("running", 20, C.tAcc)}<span>Running 7 user journeys on preview-9f2c1ab</span></div>
  ${JOURNEYS.map((j) => journey(...j)).join("")}
  <div class="mt8"><span class="ok">5 passed</span> · <span class="no">1 failed</span> · <span class="wa">1 inconclusive</span></div>
  ${extra}</div>` });

POSTS.push({
  id: "09", slug: "introducing-publishub", type: "carousel", theme: "dark", tag: "Introducing",
  title: "Introducing Publishub: Test Your AI-Built Applications",
  slides: [
    { body: `
      <span class="pill" style="align-self:flex-start"><span class="sq"></span>Early access is open<span class="mute">· In development</span></span>
      <div class="grow"></div>
      <div>${H.mark(220)}</div>
      <p class="eyebrow mt48">Introducing Publishub</p>
      <h1 class="h-xl mt24" style="font-size:104px"><span class="mute">Your AI writes the code.</span> Who verifies it actually works?<span class="cursor"></span></h1>
      <div class="grow"></div>
      <p class="lead" style="font-size:34px">Verify AI-generated changes, catch regressions and ship with confidence. Built for developers shipping with <span class="mono" style="color:var(--ink);font-size:30px;white-space:nowrap">Claude Code · Cursor · Codex</span>.</p>` },
    { body: `
      <span class="eyebrow">The problem</span>
      <h2 class="h-m mt24">Generated code <span class="mute">isn't verified code.</span></h2>
      <div class="grow"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px;background:var(--line);border:2px solid var(--line);border-radius:10px;overflow:hidden">
        ${PROBLEMS.map(([t, d]) => `<div style="background:var(--card);padding:30px 30px 34px">${icon("fail", 26, C.fail)}<p style="font-size:32px;font-weight:650;letter-spacing:-0.02em;margin-top:18px;line-height:1.15">${t}</p><p class="small mt16" style="font-size:25px">${d}</p></div>`).join("")}
      </div>
      <div class="grow"></div>
      <p class="lead"><b>Writing code got faster. Knowing it works didn't.</b></p>` },
    { body: `
      <span class="eyebrow">How it will work</span>
      <h2 class="h-m mt24">From AI change to evidence <span class="mute">in four steps.</span></h2>
      <div class="col mt32" style="gap:16px;flex:1;justify-content:center">
        ${STEPS.map(([t, d], i) => `<div class="card" style="padding:22px 30px;display:flex;gap:26px;align-items:flex-start"><span class="num" style="width:56px;flex:none">0${i + 1}</span><div><p style="font-size:32px;font-weight:650;letter-spacing:-0.02em">${t}</p><p class="small" style="font-size:25px;margin-top:6px">${d}</p></div></div>`).join("")}
      </div>
      <p class="disclaim mt24">This is the workflow we're building. Supported setups and integrations aren't available yet.</p>` },
    { body: `
      <span class="eyebrow">A first look</span>
      <h2 class="h-m mt24">One change, seven journeys, <span class="mute">one regression.</span></h2>
      <div class="grow"></div>
      ${verifyLog(`<div class="ln">${icon("fail", 20, C.tFail)}<span>Regression: Checkout passed on main (a1c9e2f)</span></div>`)}
      <div class="grow"></div>
      ${demoNote}` },
    { beam: "low", body: `
      <span class="eyebrow">Early access</span>
      <h2 class="h-m mt24">Join free, <span class="mute">or become a Founding Customer.</span></h2>
      <div class="row mt48" style="gap:28px;align-items:stretch">
        <div class="card hard grow" style="padding:32px;flex:1">
          <p class="pix" style="font-size:30px">Free Waitlist</p><p style="font-size:60px;font-weight:800;letter-spacing:-0.04em;margin-top:12px">Free</p>
          <ul class="ticks mt24" style="gap:14px">${["Join for free", "Product updates", "Notified at launch", "No payment required"].map((t) => `<li style="font-size:26px">${icon("pass", 20, C.acc)}<span>${t}</span></li>`).join("")}</ul>
        </div>
        <div class="card pop grow" style="padding:32px;flex:1.15">
          <p class="pix" style="font-size:30px">Founding Customers</p><p style="font-size:60px;font-weight:800;letter-spacing:-0.04em;margin-top:12px;color:var(--pass)">$0 today</p>
          <ul class="ticks mt24" style="gap:14px">${["Founding price after launch", "Early access at launch", "Priority access", "Help shape the product"].map((t) => `<li style="font-size:26px">${icon("star", 20, C.acc)}<span>${t}</span></li>`).join("")}</ul>
        </div>
      </div>
      <div class="grow"></div>
      <div><span class="cta">getpublishub.com ${icon("arrow", 30, "currentColor")}</span></div>
      <p class="disclaim mt24">Publishub isn't available yet and has no launch date. Reserving doesn't give immediate access; the founding price is only charged after launch, with notice first.</p>` },
  ],
});

/* ───────────────────────── 10 · How Publishub Helps You Catch Broken User Journeys ───────────────────────── */
const node = (label, s) => `<div class="col center" style="gap:14px;width:150px">
  <div style="width:96px;height:96px;display:flex;align-items:center;justify-content:center;border:${s === "fail" ? "3px solid var(--fail);background:var(--fail-soft)" : s === "skip" ? "2px dashed var(--line-strong)" : "2px solid var(--line-strong);background:var(--card)"}">
    ${s === "skip" ? "" : icon(s, 40, s === "fail" ? C.fail : C.pass)}</div>
  <span style="font-size:24px;font-weight:600;text-align:center;${s === "fail" ? "color:var(--fail)" : s === "skip" ? "color:var(--muted)" : ""}">${label}</span></div>`;
const link = (bad) => `<div style="flex:1;height:0;border-top:${bad ? "3px dashed var(--line-strong)" : "3px solid var(--pass)"};margin-top:48px"></div>`;
const stepHead = (n, title, sub) => `<div class="row center" style="gap:18px"><span class="num">Step ${n}</span><span class="badge muted" style="font-size:18px">How it will work</span></div>
  <h2 class="h-m mt24">${title}</h2>${sub ? `<p class="lead mt24">${sub}</p>` : ""}`;

POSTS.push({
  id: "10", slug: "how-publishub-catches-broken-journeys", type: "carousel", theme: "dark", tag: "How it works",
  title: "How Publishub Helps You Catch Broken User Journeys",
  slides: [
    { body: `
      <span class="eyebrow">How it will work</span>
      <h1 class="h-xl mt32">How Publishub catches <span class="acc">broken user journeys</span></h1>
      <div class="grow"></div>
      <div class="card" style="padding:44px 36px 36px">
        <p class="pix mute" style="font-size:22px;text-transform:uppercase;letter-spacing:.06em">Journey · Checkout <span style="float:right">Demo content</span></p>
        <div class="row mt40" style="gap:0;align-items:flex-start">${node("Pricing", "pass")}${link()}${node("Start trial", "pass")}${link()}${node("Pay now", "fail")}${link(true)}${node("Welcome", "skip")}</div>
      </div>
      <p class="small mt24">Your users take journeys, not unit tests. So that's what Publishub will check.</p>` },
    { body: `
      ${stepHead("01", "Pick the journeys that matter.", "Point Publishub at your app, such as a preview deployment, and choose the flows you can't afford to break.")}
      <div class="grow"></div>
      <div class="row" style="flex-wrap:wrap;gap:18px">
        ${["Sign up", "Log in", "Browse plans", "Checkout", "Update billing", "Reset password", "Invite teammate"].map((j, i) =>
          `<span class="${i === 3 ? "card pop" : "card"}" style="padding:20px 28px;font-size:32px;font-weight:600;display:inline-flex;gap:14px;align-items:center">${icon("dot", 18, i === 3 ? C.acc : C.mute)}${j}</span>`).join("")}
      </div>
      <div class="grow"></div>
      ${demoNote}` },
    { body: `
      ${stepHead("02", "Run them in a real browser after a change.", "The same clicks and form fills a user would make, every time the code changes.")}
      <div class="grow"></div>
      ${win({ title: "publishub verify", badge: "Demo content", cls: "pop", body: `<div class="term" style="font-size:25px;line-height:1.72">
        <div class="ln">${icon("running", 20, C.tAcc)}<span class="grow">Starting Chromium · 1280×800</span><span class="ok">ok</span></div>
        <div class="ln">${icon("running", 20, C.tAcc)}<span>Running 7 user journeys on preview-9f2c1ab</span></div>
        ${JOURNEYS.map((j) => journey(...j)).join("")}</div>` })}
      <div class="grow"></div>
      ${demoNote}` },
    { body: `
      ${stepHead("03", "Compare with the last version that worked.", "A failure that passed before is a regression, so you know this change broke it.")}
      <div class="grow"></div>
      <div class="row" style="gap:24px;align-items:stretch">
        ${[["main", "a1c9e2f", "pass", "Checkout passed"], ["this change", "9f2c1ab", "fail", "Checkout failed"]].map(([b, h, s, t]) => `
          <div class="card ${s === "fail" ? "" : ""}" style="flex:1;padding:32px;${s === "fail" ? "border-color:var(--fail)" : ""}">
            <p class="pix mute" style="font-size:22px;text-transform:uppercase;letter-spacing:.06em">${b}</p>
            <p class="mono" style="font-size:30px;margin-top:8px">${h}</p>
            <div class="row center mt32" style="gap:16px">${icon(s, 34, s === "fail" ? C.fail : C.pass)}<span style="font-size:32px;font-weight:650;color:${s === "fail" ? "var(--fail)" : "var(--pass)"}">${t}</span></div>
          </div>`).join("")}
      </div>
      <div class="mt32" style="text-align:center"><span class="badge fail" style="font-size:28px;padding:8px 22px 10px">${icon("fail", 22, C.fail)} Regression · High severity</span></div>
      <div class="grow"></div>
      ${demoNote}` },
    { body: `
      ${stepHead("04", "Get evidence you can act on.")}
      <div class="grow"></div>
      <div class="card" style="padding:30px 34px">
        <p class="pix mute" style="font-size:22px;text-transform:uppercase;letter-spacing:.06em">Steps to reproduce</p>
        <div class="col mt16" style="gap:10px">
          ${[["pass", "Open /pricing"], ["pass", "Click “Start trial”"], ["pass", "Fill in the payment form"], ["fail", "Click “Pay now”: nothing happens"], ["skip", "See the welcome screen"]].map(([s, t], i) =>
            `<div class="row center" style="gap:16px;font-size:28px;${s === "fail" ? "color:var(--fail)" : s === "skip" ? "color:var(--muted)" : ""}"><span class="mono mute" style="width:30px;font-size:24px">${i + 1}.</span>${s === "skip" ? `<span style="width:20px;height:20px;border:2px solid var(--line-strong)"></span>` : icon(s, 20, s === "fail" ? C.fail : C.pass)}<span>${t}</span></div>`).join("")}
        </div>
      </div>
      <div class="row mt24" style="gap:24px;align-items:stretch">
        <div class="card" style="flex:1;padding:24px">
          <p class="pix mute" style="font-size:20px;text-transform:uppercase;letter-spacing:.06em">Screenshot · step 4</p>
          <div class="page mt16" style="padding:18px;border-radius:6px"><p style="font-weight:700;font-size:22px">Payment details</p><div class="fld" style="height:36px;margin-top:10px"></div><div class="flag" style="margin-top:20px"><div class="btn" style="height:44px;font-size:20px">Pay now</div></div></div>
        </div>
        <div class="card" style="flex:1.1;padding:24px;font-family:var(--mono);font-size:21px;line-height:1.5">
          <p class="pix mute" style="font-size:20px;text-transform:uppercase;letter-spacing:.06em;font-family:var(--pixel)">Console · Network</p>
          <p class="mt16" style="color:var(--fail)">TypeError: Cannot read properties of undefined (reading 'submit')</p>
          <p class="mute">at CheckoutForm.tsx:42</p>
          <p class="mt16">POST /api/checkout <span style="color:var(--fail)">not sent</span></p>
        </div>
      </div>
      <div class="grow"></div>
      <p class="lead" style="font-size:32px">Plus a bug report <b>you can hand straight back to your coding agent.</b></p>` },
    { beam: "low", body: `
      <span class="eyebrow">Get early access</span>
      <h2 class="h-l mt32">Find broken journeys <span class="mute">before your users do.</span></h2>
      <p class="lead mt40">Publishub is being designed to work alongside any AI coding tool, because it checks the running app, not the editor. Tell us which tool you use when you join and we'll prioritize it.</p>
      <div class="grow"></div>
      ${ctaBlock({ note: "Publishub is in development; the workflow may change. No integrations are available yet." })}` },
  ],
});
