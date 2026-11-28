# Publishub

**Check that your AI-built app still works, before your users do.**

Publishub is an independent check for applications built with AI coding tools. The agent that wrote a change is usually the one asked whether it works; Publishub checks from the outside, in a real browser, and shows the evidence of what broke.

| Name | What it is | Status |
|---|---|---|
| **Publishub Check** | Free check of an app's public pages in a real browser (`/check`) | Available |
| **Publishub Monitor** | The same check every day, with an email only when a new problem shows up | Beta, free |
| **Founding Customers** | Reservation of the full product: critical flows set up 1:1 by the founder | $0 today |
| **[stillworks](https://github.com/valmirjunior2109-spec/stillworks)** | The open-source engine (MIT CLI and MCP server) you run yourself | Available |

Positioning, naming and voice: [`docs/marca/posicionamento.md`](docs/marca/posicionamento.md).

Website: [getpublishub.com](https://getpublishub.com/)

> **Status: pre-launch.** What this repository runs in production today: the landing page, **Publishub Check** (a real-browser pass over an app's public pages, with a report you can copy to your coding agent, "check again" comparison and safe sharing), **Publishub Monitor** (that check every day, alerting only on new problems), manual **verification requests** to the founder, the early-access **waitlist** with referrals, the **Founding Customers** reservation (Stripe, $0 charged before launch) and the owner's **admin** dashboard. User journeys with login (sign-up, login, checkout) are in development and not part of this repository yet; nothing below describes them as shipped.

---

## The problem

AI coding agents (Claude Code, Cursor, Codex, Lovable, Bolt and similar tools) write code fast, but a change can compile, pass lint and still break a button, a form, a sign-up or a checkout. The agent that wrote the change is usually the one asked whether it works, and manual click-through testing after every change eats the time the agent saved.

Publishub is meant to be an independent check, outside the agent: run the journeys that matter in a real browser after each change, compare with the last version that worked, and report the failing step with evidence you can hand back to your coding agent.

## Who it's for

- Indie hackers and vibe coders
- SaaS founders and technical founders
- Independent developers and small development teams
- Anyone shipping with Claude Code, Cursor, Codex, Lovable, Bolt or similar tools, without a dedicated QA team

## Planned core capabilities

These are the product's intended capabilities, as described on the landing page. They are **planned**, not available yet:

- Real browser-based execution of important user journeys
- Detection of broken application flows
- Identification of functional regressions, compared with the last version that worked
- Verification of AI-generated changes, independent of the tool that wrote them
- Actionable evidence: the failing step, a screenshot and a bug report

---

## Technology stack

| Layer | What |
|---|---|
| Web app | [Next.js](https://nextjs.org/) 16.3 (App Router), React 19, TypeScript, Tailwind CSS 3 (`frontend/`) |
| Database / auth | Supabase (Postgres; server routes use the `service_role` key; Supabase Auth only for `/admin`) |
| Payments | Stripe (Checkout in `setup` mode for Founding Customers; webhook for reservations and subscriptions) |
| Analytics | PostHog (optional) |
| Hosting | Vercel (`frontend/`) |

## Architecture

```text
Browser ──► Next.js on Vercel (frontend/)
             ├─ pages
             │   /                  landing page + waitlist + Founding Customers card (#pricing)
             │   /founding          Founding Customers page
             │   /check             Publishub Check (paste a URL) → /check/[id] report (?prev= compares with an earlier run)
             │   /check/shared      public result page for shared posts (counts only, noindex)
             │   /monitor/[id]      confirm or stop a Publishub Monitor (from the email links)
             │   /payment/success   after the Founding Customers Stripe Checkout
             │   /privacy, /terms   legal pages
             │   /admin             owner dashboard (Supabase login, gated by ADMIN_EMAIL)
             └─ API (Node runtime)
                 POST /api/check               start a free app check (public URLs only, 5/hour per IP)
                 GET  /api/check/[id]          the check report (the page polls it until done)
                 DELETE /api/check/[id]        deletes the report (only with the creator's delete token)
                 POST /api/check/[id]/recheck  "check again": a new run of the same URL (creator's token)
                 POST /api/monitors            turn on Publishub Monitor from a report (creator's token; email confirmation)
                 POST /api/monitors/[id]       confirm or stop a monitor (HMAC-signed link)
                 GET  /api/cron/monitors       daily Vercel cron (CRON_SECRET): starts a run per due monitor
                 POST /api/monitors/run        one monitor run, then compare and alert (CRON_SECRET)
                 POST /api/verification-request  ask the founder to check a flow (saved + emailed)
                 GET  /api/check/stats         aggregate counts of finished checks (no URLs)
                 POST /api/waitlist            join the waitlist (anti-spam, per-IP rate limit, referral code)
                 POST /api/waitlist/event      funnel events (page_view, cta_click, share_click)
                 POST /api/waitlist/context    optional context after joining (AI tool, flow, what you build)
                 POST /api/feedback            proposal feedback from the home page (saved + emailed)
                 POST /api/founding/checkout   Stripe Checkout (mode "setup", $0 charged)
                 GET  /api/founding/price      the Founding Customers price, read from Stripe (cached 1 h)
                 POST /api/stripe/webhook      Founding Customers reservations/subscriptions; legacy reservation bookkeeping
                 GET  /api/admin/waitlist      waitlist report (admin only)
                 GET  /api/admin/founding      Founding Customers report (admin only)
                 GET  /api/admin/verification-requests, /api/admin/monitors, /api/admin/feedback  (admin only)
                 GET  /api/admin/data          legacy $49 reservations, historical (admin only)
                 GET  /api/health              which env vars reached the server (yes/no only, never values)
                      │
                      ▼
             Supabase Postgres (RLS on, no policies: only the server's service_role reads and writes)
```

Key source locations (`frontend/src/`):

| Path | What |
|---|---|
| `app/page.tsx` | The landing page |
| `app/check/`, `components/check/` | The free app check page and report |
| `lib/check/` | The check engine: URL validation and SSRF protection (`url.ts`), the browser (`browser.ts`) and the checks (`run.ts`) |
| `lib/server/checks.ts` | Free checks in the database (create, run after the response, read) |
| `components/waitlist/` | Waitlist form, share box, header/footer, Founding Customers checkout button and price |
| `lib/waitlist.ts`, `lib/server/waitlist.ts` | Waitlist constants and server logic |
| `lib/founding.ts`, `lib/server/founding.ts` | Founding Customers terms, constants and Stripe event handling |
| `lib/server/stripe.ts` | Stripe client and the Founding Customers price lookup |
| `lib/server/legacy-reservations.ts` | Bookkeeping for the discontinued $49 reservations (see [Legacy](#legacy-code-and-data)) |
| `components/admin/` | The `/admin` dashboard |
| `scripts/founding-activate.mjs` | Launch-day script that turns Founding Customers reservations into subscriptions |
| `scripts/check-batch.ts` | Runs the free check on a list of your own app URLs and prints a CSV (writes nothing to the database) |
| `scripts/brand-logo.mjs` | Generates the pixel-art logo and favicon |

---

## Local development

Requirements: Node.js 20+ and npm.

```bash
cd frontend
cp .env.example .env.local      # then fill it in
npm ci
npm run dev                     # http://localhost:3000
```

Without Supabase and Stripe credentials the site still renders; the waitlist and checkout respond with an explicit "not configured" error (never a fake success).

### Environment configuration

All variables are documented in [`frontend/.env.example`](frontend/.env.example). `NEXT_PUBLIC_*` values are sent to the browser, so only public values go there.

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | yes | Canonical URL, `https://getpublishub.com` |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | no | Contact address shown on the site |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | no | Search Console verification token |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase project (the anon key is only used for the `/admin` login) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-only database access. Never prefix with `NEXT_PUBLIC_` |
| `SUPABASE_URL` | no | Defaults to `NEXT_PUBLIC_SUPABASE_URL` |
| `SCAN_HASH_SECRET` | no | Salt for the IP hash used by the waitlist rate limit (defaults to the service role key). The name is historical; keep the production value |
| `ADMIN_EMAIL` | yes | Email (or comma-separated emails) allowed into `/admin` |
| `STRIPE_SECRET_KEY` | yes | Stripe server key (Checkout Sessions write, Prices read) |
| `STRIPE_FOUNDING_WEBHOOK_SECRET` | yes | Signing secret of `https://getpublishub.com/api/stripe/webhook` |
| `STRIPE_FOUNDING_CUSTOMERS_PRICE_ID` | no | Overrides the production recurring price (e.g. a test-mode price) |
| `STRIPE_API_BASE` | no | Local tests with `stripe-mock` only. Never set in production |
| `CHECK_DEADLINE_MS` | no | Free check time budget (default 45000; the Vercel function allows 60 s) |
| `CHECK_GLOBAL_PER_HOUR` | no | Site-wide cap on free checks per hour (default 300) |
| `CHROME_EXECUTABLE_PATH` | no | Local Chrome/Edge for development and `check:batch`. Leave empty on Vercel (uses `@sparticuz/chromium`) |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | no | PostHog analytics |
| `RESEND_API_KEY` | no | Sends emails via Resend: feedback and verification requests to the founder, Publishub Monitor confirmations and alerts. Without it, those are only saved to the database (and the monitor can't confirm) |
| `FEEDBACK_FROM_EMAIL`, `FEEDBACK_TO_EMAIL` | no | Sender (verified domain) and destination of the founder's emails. Destination defaults to the first `ADMIN_EMAIL` |
| `CRON_SECRET` | for the monitor | Vercel sends it to the daily cron (`vercel.json → crons`). Without it, the cron is refused and no monitor runs |
| `MONITOR_FROM_EMAIL`, `MONITOR_MAX_PER_RUN` | no | Sender of the monitor emails (default `Publishub Monitor <alerts@getpublishub.com>`) and max monitors per cron run (default 25) |

## Testing

There is no automated test suite for the web app yet. The checks to run before every deploy:

```bash
cd frontend
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run build       # production build
```

Then smoke-test the running build (`npm run start`): `/`, `/pt`, `/check`, `/founding`, `/privacy`, `/terms`, `/admin`, the waitlist form, the Founding Customers button and `GET /api/health`. To run the check engine locally, set `CHROME_EXECUTABLE_PATH` and use `npm run check:batch -- <url>` (only public URLs are accepted).

The legacy Python backend has its own suite (`cd backend && pip install -r requirements-dev.txt && pytest`); see [Legacy](#legacy-code-and-data).

## Deployment

1. **Database first.** Apply new migrations in `supabase/migrations/` (Supabase SQL Editor or `supabase db push`) **before** deploying code that depends on them. Never edit a migration that has already been applied; add a new one.
2. **Vercel.** The project's root directory is `frontend/`. Set the environment variables above for Production (and Preview, with test-mode Stripe keys).
3. **Supabase Auth.** Add `https://getpublishub.com/admin` to Authentication → URL Configuration → Redirect URLs (for the admin sign-in link). The admin account must already exist.
4. **Stripe webhook.** Endpoint `https://getpublishub.com/api/stripe/webhook` with the events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid` and `invoice.payment_failed`. Keep `checkout.session.expired` and `charge.refunded` while legacy $49 reservations are still being refunded.
5. **Cron.** `vercel.json` schedules `/api/cron/monitors` daily at 10:23 UTC (Hobby plans allow one run a day). Set `CRON_SECRET` in Vercel, then redeploy.
6. After deploying, open `/api/health` to confirm every required variable reached the server.

---

## Publishub Check (`/check`)

The free check, and the main way people find Publishub: anyone pastes their app's URL and, in about a minute, gets a report. Migration: `supabase/migrations/20261123000000_growth_app_check_referrals.sql` (table `app_checks`).

- **What it does:** opens the URL in Chromium (`puppeteer-core`; `@sparticuz/chromium` on Vercel) on desktop and on a 390 px phone viewport, records uncaught JavaScript errors, console errors and failed requests, opens up to 3 internal pages (sign-up, login, pricing and dashboard links first), checks up to 25 internal links over HTTP, and takes two screenshots. Checks: page loads, HTTPS, JavaScript crashes, console errors, failed requests, internal links, key pages (including SPA "not found" screens), mobile fit, load time and link previews.
- **What it never does:** log in, submit forms, or open links that look like they change data (log out, delete…).
- **Safety:** only public `http(s)` URLs on standard ports with a domain name; the domain must resolve to public IPs (SSRF protection), and the browser blocks requests to private hosts. 5 checks per IP per hour and a site-wide hourly cap.
- **Flow:** `POST /api/check` validates and creates a `queued` row, then runs the check with `after()` inside the same 60 s function (`vercel.json` gives it 2048 MB). The report page polls `GET /api/check/[id]`. Checks stuck for 3 minutes become `failed`.
- **Reports** are private by unguessable link and `noindex`. The browser that ran the check gets a delete token (only its SHA-256 hash is stored, in `app_checks.delete_token_hash`) and shows "Delete this report", which calls `DELETE /api/check/[id]` and removes the row with its screenshots. The report ends with the waitlist form (`form = "check"`, app URL prefilled), a link to Founding Customers and share buttons that link to `/check`, not to the report.
- **Aggregate stats:** `GET /api/check/stats` returns only counts from `public.app_check_stats()` (checks done, how many had a failure, the most common failing check), cached for 10 minutes. The home page and `/check` show them once there are at least 25 finished checks. Migration: `20261124000000_check_trust_stats.sql`.
- **The report** groups problems by type (crashes, failed requests, broken pages, other), each with the route, the evidence and where to start. Everything shown, copied or shared goes through `lib/check/redact.ts` (emails, tokens, keys, query values and UUIDs are removed). 401/403 pages count as "blocks automated browsers or needs a login", not as broken.
- **"Copy report for Claude / Cursor"** builds a structured prompt with a signature link (`utm_source=agent_report`). **"Check again after fixing"** re-runs the same URL (creator's token) and opens the new report with `?prev=`, which compares both runs (fixed, still there, new) and turns sharing into a "win" post (`/check/shared?fx=`).
- **Verification requests:** the report ends with "Ask me to check my flow": flow, whether the app has paying users, email and note. Saved in `verification_requests` and emailed to the founder (migration `20261128000000_verification_requests.sql`; `/admin` lists apps with paying users first).
- **Batch:** `npm run check:batch -- urls.txt > results.csv` runs the same check on a list of your own apps. Publishub never checks other people's apps on its own. See [`marketing/growth-playbook.md`](marketing/growth-playbook.md).

## Publishub Monitor (beta)

The first continuous feature: the same check of an app's public pages, every day, with an email only when a new problem shows up. Migration: `20261128100000_monitors.sql` (table `monitors`, `app_checks.monitor_id`).

- **Turning it on:** from a report, only in the browser that ran the check (`POST /api/monitors` with the delete token). The monitor is `pending` until the person clicks the confirmation link (double opt-in), so nobody can sign up someone else's email. Limits: 3 monitors per email, 5 created per IP per day.
- **Links:** confirm and stop links carry an HMAC of the monitor id (`sign("monitor", id)`) and open `/monitor/[id]`, where a button does the action, so email link prefetchers can't toggle anything.
- **Running:** the daily cron (`/api/cron/monitors`, `CRON_SECRET`) picks due monitors (`next_run_at`), creates a check per monitor and calls `/api/monitors/run` for each one, since a check takes most of a 60 s function. The run compares with the previous result (`newProblems` in `lib/server/monitors.ts`): only new crashes, failed requests or broken pages send an alert; general warnings don't, and a run that failed entirely keeps the previous baseline.
- **Stats:** monitor runs are excluded from the public counts (`app_check_stats`).
- **Where to see it:** the "Daily monitors" panel in `/admin`.

## Waitlist

The waitlist lives on the landing page (`/`). Migrations: `supabase/migrations/20261108100000_waitlist.sql` and, for referrals and the app URL, `20261123000000_growth_app_check_referrals.sql`.

**Referrals:** every signup gets a referral code (`waitlist.ref_code`) and a personal link (`/?ref=CODE`). The code is kept in the visitor's browser for 30 days, so a friend who joins later still counts. Position = order of arrival minus 10 spots per friend who joined (`waitlist_position`). A referral doesn't count when the friend signs up from the same network (IP hash) as the referrer. The API now calls `waitlist_join_ref`, which returns the status, code, position and referral count; the old `waitlist_join` stays for compatibility.

| Table / function | What it does |
|---|---|
| `waitlist` | email (unique, case-insensitive), name, ai_tool, app_url, ref_code, invited_by, UTM fields, referrer domain, form, ip_hash, created_at |
| `waitlist_events` | the funnel: `page_view`, `cta_click`, `signup`, `share_click`, with UTM, referrer domain and IP hash |
| `waitlist_join_ref(...)` | joins (with app URL and referral code); returns `{status, ref_code, position, referrals, total}`; status is `joined`, `duplicate` or `rate_limited` (5 new sign-ups per IP per hour) |
| `waitlist_join(...)` | the original join, kept for compatibility |
| `waitlist_track(...)` | records a browser event (up to 120 per IP per 10 minutes) |
| `waitlist_report(since)` | the `/admin` report: totals (including referrals and free checks), conversion by source, campaigns, clicks, tools, top referrers and the list |

**Anti-spam:** a hidden honeypot field, a minimum time between page load and submit, an `Origin` check and the per-IP limit. IPs are never stored, only a salted hash.

**Where to see it:** the "Waitlist" panel in `/admin` (24 h, 72 h, 7 days or all; CSV export), or in SQL: `select jsonb_pretty(public.waitlist_report(now() - interval '72 hours'));`

**PostHog events:** `waitlist_cta_clicked`, `waitlist_joined`, `waitlist_share_clicked`, `app_check_started`, `app_check_viewed`, `app_check_shared` and, from the server, `app_check_completed`. The database count is the source of truth. Launch copy and UTM links: [`marketing/waitlist-launch/`](marketing/waitlist-launch/README.md). Growth playbook: [`marketing/growth-playbook.md`](marketing/growth-playbook.md).

## Founding Customers (pre-launch reservation)

The product doesn't exist yet, so **nothing is charged before launch**. The Founding Customers card is in the landing page's pricing section (`#pricing`).

**Today: the reservation**
- The button calls `POST /api/founding/checkout`, which opens Stripe Checkout in **`mode: "setup"`**: Stripe stores the card (authorized for future charges) and creates the customer. **$0 is charged and no subscription is created.** Card only.
- The webhook (`checkout.session.completed` in setup mode) records the reservation in `public.founding_commitments` with status `reserved`, the customer, the SetupIntent, the price and UTM.
- The Price ID (`price_1UaLsA2cdYlX3v8aM3XWVcLT`, or `STRIPE_FOUNDING_CUSTOMERS_PRICE_ID`) is stored in the reservation metadata. Checkout verifies it is recurring and shows the amount.
- The terms live in `FOUNDING_TERMS` (`src/lib/founding.ts`): **7 days'** notice before the first charge, first payment refundable on request within **14 days**. The card, Checkout, success page and `/terms#founding-customers` all read from there.

**At launch: activation** (`frontend/scripts/founding-activate.mjs`)
1. Dry run (creates nothing, lists the emails): `node scripts/founding-activate.mjs --first-charge=YYYY-MM-DD`.
2. Email that list with the first charge date (at least 7 days later), the amount and how to cancel.
3. Run again with `--confirm`. For each reservation with a confirmed card, it creates the Stripe subscription with the **price stored on the reservation**, the saved card and `trial_end` = the announced date. The reservation becomes `activated`.
   - Refuses a date less than 7 days away. One subscription per person (duplicates are listed for manual cleanup). Re-running doesn't duplicate (checks existing subscriptions plus an idempotency key).
   - Needs a key with Subscriptions write and SetupIntents read.
4. From then on, the webhook tracks the subscription in `public.founding_subscriptions` (`customer.subscription.*`, `invoice.paid`, `invoice.payment_failed`); an out-of-order older event never overwrites a newer status.

**Cancelling before launch** (on request, by email): remove the customer's card in Stripe, then
`update public.founding_commitments set status = 'canceled', canceled_at = now() where lower(email) = '...';`

**Reports:** `select jsonb_pretty(public.founding_commitments_report());` or the "Founding Customers" panel in `/admin`.

---

## Brand

The name always comes with the tagline where people don't know the brand yet ("Publishub: check that your AI-built app still works, before your users do."), and each product has its own name (Publishub Check, Publishub Monitor, stillworks). Rules in [`docs/marca/posicionamento.md`](docs/marca/posicionamento.md); in code, `SITE_TAGLINE` and `PRODUCT_NAMES` in `frontend/src/lib/site.ts`.

The logo is the 8-bit pixel-art "P" with a `</>` screen, in black `#020002`, white `#FFFFFF` and indigo `#6E74F7`. Color tokens are at the top of `frontend/src/app/globals.css`; dark theme is the default. Fonts: Geist (text), Geist Mono (code) and Pixelify Sans (the name, labels and badges only). To change the logo, edit `frontend/scripts/brand-logo.mjs` and run `node scripts/brand-logo.mjs`. Exported files (SVG, PNG, with and without the tagline) and usage rules: [`docs/marca/logo/`](docs/marca/logo/README.md).

---

## Legacy code and data

Publishub has pivoted twice. Earlier products are kept for history and are **not** part of the current product:

| Where | What |
|---|---|
| `frontend/legacy/` | The earlier short-form video retention analysis site. Outside the build, lint and typecheck. Its old URLs redirect to `/` (`frontend/next.config.ts`). |
| `backend/` | The FastAPI API of the video product (Gemini, the old Stripe plans, emails). Not called by the current site. Left unchanged until it is decommissioned. |
| `frontend-legacy/` | The site from before 13 Sep 2026. |

**Discontinued: the accessibility scanner for Shopify stores.** Its code (scanner engine, report pages, scan APIs, worker and CLI, and the `axe-core` dependency) has been removed. `puppeteer-core` and `@sparticuz/chromium` were removed with it and later re-added for the free app check. What remains, on purpose:

- **URLs:** `/scanner`, `/shopify-ada-compliance-checker` and `/accessibility-statement` permanently redirect to `/`; `/pricing` redirects to `/#pricing`. Report URLs (`/scan/...`) and `/reserve/success` return 404.
- **Data:** migration `20261122000000_archive_accessibility_scanner.sql` moves `scans`, `scan_pages` and `issues` from `public` to a `legacy_archive` schema with no API access; nothing is deleted. The original migration `20261107000000_accessibility_scanner.sql` is kept as applied history. A commented-out purge block at the end of the new migration permanently deletes the archive once you decide to.
- **Payments:** `public.reservations` (one-time $49 "Founding plan" reservations of the scanner) stays in `public`, is listed read-only in `/admin` as "Legacy reservations", and the webhook keeps recording expirations and refunds for it (`lib/server/legacy-reservations.ts`). This is unrelated to Founding Customers.
- **Leads:** the scanner's columns on `public.leads` (`store_url`, `scan_id`, `source`) are kept so no data is lost; `leads` is shared with the legacy backend.
