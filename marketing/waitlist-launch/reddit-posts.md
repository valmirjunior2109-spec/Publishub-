# Reddit

**Read each subreddit's rules before posting.** Many developer communities ban self-promotion or only allow it in a weekly thread. Where links aren't allowed, post only the discussion (post 1) without the link, and reply with it only if someone asks.

Places to check (rules change, verify each one):
- Self-promotion usually allowed: r/SideProject, r/alphaandbetausers, r/indiehackers.
- Discussion only, check the rules: r/ClaudeAI, r/cursor, r/ChatGPTCoding, r/webdev (usually in the Showoff Saturday thread).

One subreddit per day, never the same text in several subs on the same day. Replace `SUB` in the link with the subreddit name, for example `utm_content=sideproject`.

---

## 1. Discussion: verifying AI-generated code

**Title:** How do you verify that your app still works after an AI agent changes it?

> I've been shipping most of my code with AI coding agents lately, and the writing part is fast. What hasn't gotten faster is knowing whether the app still works afterwards.
>
> A few things I keep running into:
>
> - The agent says it's done and the tests pass, but a user flow is broken (sign-up, checkout, a settings form).
> - It edits files I didn't ask it to touch, and something unrelated regresses.
> - I end up clicking through the whole app after every change, which eats the time I saved.
>
> Curious how others handle this:
>
> 1. Do you run end-to-end tests (Playwright, Cypress) after every agent change, or only before deploying?
> 2. Do you ask the agent to test its own work? Does that catch real problems?
> 3. What's the worst regression an AI change slipped past you?
>
> I'm working on a tool for this, but I'm mostly trying to understand how people do it today.

If the rules allow it, add at the end: *"If you want to follow what I'm building: https://getpublishub.com/?utm_source=reddit&utm_medium=community&utm_campaign=waitlist_launch&utm_content=SUB"*

---

## 2. Early-access announcement (only where self-promotion is allowed)

**Title:** I'm building a tool to verify AI-generated code changes before they ship. Looking for early users.

> Hi all. I'm building Publishub, a verification tool for apps built with AI coding agents like Claude Code, Cursor and Codex.
>
> **The problem:** AI writes code fast, but generated code isn't verified code. Changes compile and tests pass while a real user journey breaks: checkout, sign-up, onboarding.
>
> **What it will do:** connect your project, run your key user journeys in a real browser after a change, compare with the last version that worked, and give you evidence when something breaks: the failing step, a screenshot and a bug report you can hand back to your agent.
>
> **Where it is:** in development. No integrations are live yet. I'm opening a free early-access waitlist to build it with the people who'll use it.
>
> Waitlist: https://getpublishub.com/?utm_source=reddit&utm_medium=community&utm_campaign=waitlist_launch&utm_content=SUB
>
> I'd especially like to hear which journeys break most often for you, and which AI tool you use.
