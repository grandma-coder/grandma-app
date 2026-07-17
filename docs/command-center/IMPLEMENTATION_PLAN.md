# grandma-command-center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone, Clerk-gated internal web console (`grandma-command-center`) that lets the team see users, view metrics/funnels/retention, send + schedule push notifications (respecting user prefs), and triage Sentry crashes — reading/writing grandma.app's Supabase Postgres from a privileged server context.

**Architecture:** A separate Next.js 15 (App Router) repo cloned from `mother-internal-dashboard`'s patterns, deployed on Vercel. Clerk authenticates the *team* (the security boundary); the DB connection uses a service-role Postgres credential that bypasses RLS by design (admins see across all users). tRPC v11 typed data layer, Drizzle over the Supabase pooler, Tremor+Recharts dashboards, Inngest for the metrics rollup + push send/schedule/receipt jobs. Reusable subsystems are ported from Aura (`~/dev/aura`) per `AURA_REFERENCE_FINDINGS.md`.

**Tech Stack:** Next.js 15, React 19, TypeScript (strict), Clerk (`@clerk/nextjs`), tRPC v11, Drizzle ORM + `postgres` driver, Tremor + Recharts, Inngest, Tailwind v4, Zod, superjson, TanStack Query v5, Vitest. Node ≥ 20, pnpm.

## Global Constraints

- **Two auth systems, never conflated:** Clerk = admin identity + role gate (THE security boundary). Service-role Postgres = privileged data access (bypasses RLS by design). Nothing app-user-facing can reach this app.
- **Service-role credentials are server-only** — never imported into a client component or shipped in the browser bundle. Enforce with `import "server-only"` in every DB/query module.
- **`profiles.id` IS the auth user UUID** — filter `.eq('id', userId)`, there is no `user_id` column on `profiles`. (grandma convention.)
- **Local dates for day-bucketing** — bucket activity by local day, not UTC, to match grandma's logging convention (evening logs west of UTC).
- **Every PII detail view and every push send is written to `admin_audit_log`.** No exceptions.
- **Push respects `notification_prefs` (7-toggle JSONB) + `privacy_settings` before sending.** Opt-outs are counted (`skipped_optout_count`), never sent.
- **No grandma health/child PII in Sentry, logs, or error messages.**
- **grandma-app stays untouched** except the two coordinated migrations flagged in Phase 5/Open-Questions (add `is_active`+`last_seen_at` to `push_tokens`; decide the broadcast pref toggle). Those are separate, reviewed grandma-app PRs.
- **New DB tables owned by the center** are created via migrations into grandma's Supabase but are center-only: `metrics_daily`, `push_campaigns`, `push_recipients`, `admin_audit_log`.
- TypeScript strict; no `any`. tRPC v11 object syntax. Zustand not used here (server-state via tRPC+RQ).

---

## Verified definitions (grounded in grandma's real schema — no magic columns)

grandma has **no `last_active` column** and **no onboarding/activation flag**. All engagement metrics are derived:

- **Activity signal** = a row created on day D in `child_logs ∪ cycle_logs ∪ pregnancy_logs ∪ channel_posts` (system-generated `notifications` excluded).
- **DAU / WAU / MAU** = distinct users with ≥1 activity-signal row in the 1 / 7 / 30-day window.
- **Onboarded** = `profiles.journey_mode IS NOT NULL` AND a `behaviors` row exists.
- **Activated** = ≥1 activity-signal row ever (a user-*chosen* action — the Aura "don't use an app-forced event" lesson).
- **Subscribed** = `profiles.subscription_tier <> 'free'` (enum: `free|premium_solo|premium_family`).
- **Retention DN** = for signup-cohort day C, distinct users with an activity-signal row on day C+N ÷ cohort size (same-day excluded; window reads one extra day past the end).
- **Mode split** = count by `profiles.journey_mode`.

---

## File structure (locked before tasks)

```
grandma-command-center/
├── db/                          ← isolated so it can lift into a monorepo packages/database later
│   ├── index.ts                 Drizzle client over Supabase pooler (service-role), lazy singleton + Proxy
│   ├── schema/
│   │   ├── grandma.ts           Drizzle defs for READ tables (profiles, behaviors, push_tokens, *_logs, …) + auth.users view
│   │   ├── center.ts            Drizzle defs for OWNED tables (metrics_daily, push_campaigns, push_recipients, admin_audit_log)
│   │   └── index.ts             re-export both
│   └── shared-types.ts          NotificationPrefs + DEFAULT_NOTIFICATION_PREFS (mirrors grandma-app/lib/pushNotifications.ts)
├── server/
│   ├── context.ts               Clerk auth() → { userEmail, userId, role }, live role resolve
│   ├── trpc.ts                  publicProcedure, protectedProcedure, adminProcedure, piiProcedure, sendProcedure
│   ├── routers/
│   │   ├── index.ts             appRouter
│   │   ├── users.ts             list / detail / segments
│   │   ├── metrics.ts           kpis / funnel / retention / community
│   │   ├── push.ts              createCampaign / sendCampaign / list / history
│   │   └── sentry.ts            issues / issue
│   └── __tests__/
├── lib/
│   ├── audit.ts                 writeAudit({ actorEmail, action, target, meta })
│   ├── allowlist.ts             team-email allowlist + isAllowed()
│   ├── reporting/transforms.ts  ported from Aura: ratePct, wowPct, gapFillDaily, computeFunnelStages, processDnRetention (+ tests)
│   ├── expo/
│   │   ├── send-push-batch.ts   ported from Aura: batch 100 → exp.host, ticket parse
│   │   ├── resolve-tokens.ts    resolveTokensForUser / streamActiveTokens + PREF FILTER (grandma choke point)
│   │   └── deactivate-tokens.ts prune dead tokens
│   └── sentry-api.ts            read-only Sentry REST client (org grandmaapp / project react-native)
├── jobs/
│   ├── client.ts                Inngest client
│   ├── metrics-rollup.ts        nightly: retention + DAU history → metrics_daily
│   ├── push-schedule.ts         every-minute: scheduled campaigns → sendCampaign
│   └── push-receipts.ts         poll Expo receipts → deactivate delivery-failed tokens
├── app/
│   ├── (auth)/sign-in/[[...sign-in]]/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx           Clerk-gated shell + sidebar (config-driven NAV_ITEMS)
│   │   ├── users/               table + [id] detail
│   │   ├── metrics/             tabbed: Overview · Funnels · Retention · Community
│   │   ├── push/                compose dialog + campaigns table + history
│   │   └── sentry/              issues table + detail
│   ├── api/trpc/[trpc]/route.ts
│   ├── api/inngest/route.ts     serve(jobs)
│   └── api/health/route.ts
├── migrations/                  SQL for center-owned tables + cc_* RPC functions
├── middleware.ts                clerkMiddleware + protect (excludes /api/inngest, /sign-in)
├── drizzle.config.ts            schemaFilter includes 'public' AND 'auth'
├── .claude/skills/              ← generated by /orchestrator-builder in Phase 1.5
└── .env.example
```

---

## Phase 1 — Scaffold + DB connection

**Deliverable:** a deployable empty Next 15 app whose `/api/health` runs `SELECT count(*) FROM profiles` against grandma's Postgres and returns a number.

### Task 1.1: Initialize the repo + dependencies

**Files:** Create `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind` config, `.gitignore`, `.env.example`.

- [ ] **Step 1:** `pnpm create next-app@latest grandma-command-center --ts --app --tailwind --eslint --src-dir=false --import-alias "@/*"`
- [ ] **Step 2:** Add deps:
```bash
pnpm add @clerk/nextjs @trpc/server @trpc/client @trpc/react-query @tanstack/react-query drizzle-orm postgres @tremor/react recharts inngest superjson zod lucide-react date-fns server-only
pnpm add -D drizzle-kit vitest @types/node
```
- [ ] **Step 3:** Create `.env.example` with: `DATABASE_URL` (Supabase pooler, service-role), `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_ALLOWED_EMAILS`, `EXPO_ACCESS_TOKEN`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG=grandmaapp`, `SENTRY_PROJECT=react-native`. Commit.
- [ ] **Step 4:** `git init && git add -A && git commit -m "chore: scaffold grandma-command-center (Next 15 + deps)"`

### Task 1.2: Drizzle client over the Supabase pooler

**Files:** Create `db/index.ts`, `drizzle.config.ts`, `db/schema/grandma.ts` (minimal — just `profiles` for now), `db/schema/index.ts`.

**Interfaces:**
- Produces: `export const db` (Drizzle instance), `export const profiles` (table).

- [ ] **Step 1:** Write `db/index.ts` — lazy singleton + Proxy (mother-dashboard pattern), using the `postgres` driver:
```ts
import "server-only"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

const DATABASE_URL = process.env.DATABASE_URL
let _db: ReturnType<typeof drizzle<typeof schema>> | undefined
function getDb() {
  if (!_db) {
    if (!DATABASE_URL) throw new Error("DATABASE_URL is not set")
    // Supabase pooler (transaction mode, :6543) — prepare:false is required.
    const client = postgres(DATABASE_URL, { prepare: false })
    _db = drizzle(client, { schema })
  }
  return _db
}
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, p: string | symbol) { return Reflect.get(getDb(), p) },
})
```
- [ ] **Step 2:** Write `db/schema/grandma.ts` — define `profiles` (id uuid pk, name text, journeyMode text, subscriptionTier text, language text, createdAt timestamptz, notificationPrefs jsonb, privacySettings jsonb, dueDate date). Re-export from `db/schema/index.ts`.
- [ ] **Step 3:** Write `drizzle.config.ts` — dialect postgresql, `schema: './db/schema/index.ts'`, `schemaFilter: ['public','auth']` (we read `auth.users`), `dbCredentials.url` from env.
- [ ] **Step 4:** Commit: `git commit -am "feat(db): drizzle client over supabase pooler + profiles schema"`

### Task 1.3: Health route proves the connection

**Files:** Create `app/api/health/route.ts`.

- [ ] **Step 1:** Write the route:
```ts
import { db } from "@/db"
import { profiles } from "@/db/schema"
import { count } from "drizzle-orm"
import { NextResponse } from "next/server"
export async function GET() {
  const [{ value }] = await db.select({ value: count() }).from(profiles)
  return NextResponse.json({ ok: true, profiles: value })
}
```
- [ ] **Step 2:** With a real `.env.local` pointed at grandma's Supabase pooler, run `pnpm dev` and `curl localhost:3000/api/health`. Expected: `{"ok":true,"profiles":<n>}` where n>0.
- [ ] **Step 3:** Commit: `git commit -am "feat: /api/health proves grandma db connection"`.
- [ ] **Step 4:** Push to a new private GitHub repo; import to Vercel (private), set env vars, confirm the deployed `/api/health` returns a count.

**Phase 1 exit:** deployed app returns a live profiles count. STOP — do not proceed until green.

---

## Phase 1.5 — Generate the orchestration family (`/orchestrator-builder`)

**Deliverable:** a committed `<prefix>-orchestrate/verify/review/pr/collision/...` skill family in the new repo, so every subsequent phase runs through a consistent implement→verify→review→PR pipeline.

> This runs *inside* `grandma-command-center` (it needs a real repo to scan). Do it after Phase 1 so detection sees `package.json`, git history, and the stack.

- [ ] **Step 1:** From the new repo root, invoke `/orchestrator-builder`. Let it run Phase A detection.
- [ ] **Step 2:** In its Phase B confirm, set: `skill_prefix = gcc` (grandma-command-center; verify no collision), `default_branch = main`, `ticket.system = none` (slug-based work ids), `pr.tool = gh`, review personas = `correctness, security, reliability, maintainability, testing` (security emphasized — this app holds PII), `restricted_areas = [migrations/, lib/expo/, server/trpc.ts, middleware.ts, .env*, .github/workflows]`, `build.multi_workspace = false`, `build.preflight = ["pnpm lint","pnpm build","pnpm typecheck"]`, `publish.target = skeleton` → space **Grandma (space-90a3cabe)**, models = balanced preset.
- [ ] **Step 3:** Let it generate + validate; run the generated doctor. Resolve any critical ✗.
- [ ] **Step 4:** Commit the generated `.claude/skills/` with the repo's own commit workflow.

**Phase 1.5 exit:** `/gcc-orchestrate` (or chosen prefix) is runnable; doctor reports ready. Subsequent phases each go through it.

---

## Phase 2 — Auth gate + role model (the security boundary)

**Deliverable:** only allowlisted team emails reach the console; `admin` vs `viewer` enforced server-side; audit log writes.

### Task 2.1: Clerk middleware gate
**Files:** Create `middleware.ts`, `app/(auth)/sign-in/[[...sign-in]]/page.tsx`, wrap `app/layout.tsx` in `<ClerkProvider>`.
**Interfaces:** Produces: a gated app — every route except `/sign-in`, `/api/inngest`, `/api/health` requires a Clerk session.

- [ ] **Step 1:** Write `middleware.ts` cloning mother-dashboard: `clerkMiddleware` + `auth.protect()`; `createRouteMatcher` public = `['/sign-in(.*)','/api/inngest(.*)','/api/health']`; matcher excludes `_next`, static, and `/api/inngest`.
- [ ] **Step 2:** Add `<ClerkProvider>` to root layout; add the sign-in catch-all page.
- [ ] **Step 3:** Manual test: signed-out visit to `/users` → redirects to `/sign-in`. Commit.

### Task 2.2: Context + role resolution + allowlist
**Files:** Create `server/context.ts`, `lib/allowlist.ts`.
**Interfaces:** Produces: `createContext()` → `{ userEmail, userId, role: 'admin'|'viewer'|null }`; `isAllowed(email)`.

- [ ] **Step 1:** `lib/allowlist.ts` — parse `CLERK_ALLOWED_EMAILS` (comma-sep) into a Set; `isAllowed(email)`.
- [ ] **Step 2:** `server/context.ts` — `auth()` from Clerk, read live `publicMetadata.role` (fresh from `clerkClient().users.getUser`, mother-dashboard pattern), reject if `!isAllowed(email)`. Default role `viewer`.
- [ ] **Step 3:** Write a unit test for `isAllowed` (allowed email → true; unknown → false). Run, pass, commit.

### Task 2.3: tRPC procedures with tiered gates
**Files:** Create `server/trpc.ts`, `server/routers/index.ts`, `app/api/trpc/[trpc]/route.ts`, client provider.
**Interfaces:** Produces: `router`, `publicProcedure`, `protectedProcedure`, `adminProcedure`, `piiProcedure`, `sendProcedure`, `appRouter`, `AppRouter`.

- [ ] **Step 1:** `server/trpc.ts` — initTRPC with superjson; `protectedProcedure` (throws UNAUTHORIZED if no userId); `adminProcedure`/`piiProcedure`/`sendProcedure` (throw FORBIDDEN unless role==='admin'). Clone mother-dashboard's middleware shape.
- [ ] **Step 2:** Empty `appRouter` in `routers/index.ts`; wire `app/api/trpc/[trpc]/route.ts` + a `ping: publicProcedure` returning `'pong'`.
- [ ] **Step 3:** Write a test: calling an `adminProcedure` with a viewer context throws FORBIDDEN. Run, pass, commit.

### Task 2.4: Audit log table + helper
**Files:** Create `migrations/0001_admin_audit_log.sql`, `db/schema/center.ts`, `lib/audit.ts`.
**Interfaces:** Produces: `writeAudit({ actorEmail, action, target, meta })`; `adminAuditLog` table.

- [ ] **Step 1:** SQL migration: `admin_audit_log (id uuid pk default gen_random_uuid(), actor_email text not null, action text not null, target text, meta jsonb, at timestamptz default now())`. Apply to grandma's Supabase. (RLS not required — center-owned, service-role only; but enable RLS with no policies so nothing else can read it.)
- [ ] **Step 2:** Drizzle def in `db/schema/center.ts`; re-export.
- [ ] **Step 3:** `lib/audit.ts` — `writeAudit(...)` inserts a row (best-effort, never throws into the caller). Test: a call inserts one row. Run, pass, commit.

**Phase 2 exit:** signed-out → sign-in; non-allowlisted email rejected; viewer gets FORBIDDEN on adminProcedure; audit helper writes rows.

---

## Phase 3 — Users pillar (proves the vertical slice)

**Deliverable:** searchable/filterable user table + admin detail view (audit-logged; viewer sees masked PII).

### Task 3.1: Extend grandma read schema
**Files:** Modify `db/schema/grandma.ts` (add `behaviors`, `pushTokens`, `childLogs`, `cycleLogs`, `pregnancyLogs`, `channelPosts`, `children`, and an `authUsers` view mapping `auth.users(id,email,created_at)`).
- [ ] **Step 1:** Add the Drizzle table/view defs (types only — introspect column names via `drizzle-kit introspect` first to confirm). Commit.

### Task 3.2: users.list
**Files:** Create `server/routers/users.ts`; add to `appRouter`; `lib/queries/users.ts` (`server-only`).
**Interfaces:** Produces `users.list({ mode?, tier?, language?, search?, cursor? })` → `{ rows: UserRow[], nextCursor }` where `UserRow = { id, email, name, journeyMode, tier, language, createdAt, lastActive, logsCount }`.
- [ ] **Step 1:** Write the failing test: `users.list` with a mode filter returns only that mode (against a seeded/known dataset or a mocked db). 
- [ ] **Step 2:** Implement the query — join profiles + authUsers(email), derived `lastActive` = max(created_at) across the four activity tables, `logsCount` = sum. Keyset pagination on `created_at,id`. `protectedProcedure` (viewer may list).
- [ ] **Step 3:** Run, pass, commit.

### Task 3.3: users.detail (PII, gated + audited)
**Files:** Modify `server/routers/users.ts`.
**Interfaces:** Produces `users.detail(userId)` → full profile + children + per-table log counts + prefs + device count. `piiProcedure`.
- [ ] **Step 1:** Test: `users.detail` on an admin ctx returns the profile AND writes one `admin_audit_log` row; on a viewer ctx throws FORBIDDEN.
- [ ] **Step 2:** Implement; call `writeAudit({ action:'user.detail.view', target:userId })` on success.
- [ ] **Step 3:** Run, pass, commit.

### Task 3.4: users.segments + UI
**Files:** Modify `users.ts`; create `app/(dashboard)/users/page.tsx`, `users/[id]/page.tsx`, `(dashboard)/layout.tsx` (sidebar).
- [ ] **Step 1:** `segments()` — canned filters (pregnancy / inactive-14d / TTC / kids-0-1 / premium). Test one segment's predicate. 
- [ ] **Step 2:** Build the table UI (Tremor Table + filter bar + search), config-driven sidebar `NAV_ITEMS` (Aura pattern), and the detail page (admin: full; viewer: PII columns masked via role check).
- [ ] **Step 3:** Manual verify against real data; commit.

**Phase 3 exit:** real user list renders + filters/search work; admin opens a detail (audit row written); viewer can't see PII.

---

## Phase 4 — Metrics pillar (KPIs + funnels + retention)

**Architecture:** hybrid — **live SQL RPCs** for KPIs + funnels over the selected window; **one `metrics_daily` rollup + nightly Inngest job** for retention curves + DAU history (the expensive-to-recompute parts). Ports Aura's `transforms.ts` + funnel/retention SQL shapes.

> **Open question to settle before pinning code:** confirm the hybrid vs all-live (Open Q3). Tasks below assume hybrid.

### Task 4.1: Port reporting transforms (pure, tested)
**Files:** Create `lib/reporting/transforms.ts` + `lib/reporting/__tests__/transforms.test.ts` (port from Aura `apps/engine/lib/reporting/transforms.ts`).
**Interfaces:** Produces `ratePct`, `wowPct`, `gapFillDaily`, `computeFunnelStages`, `processDnRetention`.
- [ ] **Step 1:** Copy Aura's functions, strip Aura-specific ones (gen/skill). Port their tests verbatim where they cover kept functions.
- [ ] **Step 2:** Run `pnpm vitest lib/reporting` — all pass. Commit. *(These are pure functions — highest-value, lowest-risk copy.)*

### Task 4.2: SQL RPCs for KPIs + activation funnel
**Files:** Create `migrations/0002_cc_metrics_rpcs.sql`.
**Interfaces:** Produces `cc_get_daily_activity(since,until)`, `cc_get_activation_funnel(since,until)`.
- [ ] **Step 1:** Write the SQL adapting Aura's cohort-CTE + UNION-ALL-action + `FILTER` shape to grandma's activity signal + derived stage definitions (signed_up→onboarded→activated→subscribed). Apply to Supabase.
- [ ] **Step 2:** Manual SQL spot-check: run each RPC, reconcile counts against a hand-written query. Commit.

### Task 4.3: metrics router
**Files:** Create `server/routers/metrics.ts`; add to appRouter.
**Interfaces:** Produces `metrics.kpis(range)`, `metrics.funnel(range)`, `metrics.retention(range)`, `metrics.community(range)`. Each does `Promise.all(currentRPC, priorWindowRPC)` → transform → JSON.
- [ ] **Step 1:** Test `metrics.kpis` shapes the RPC rows via `gapFillDaily` + attaches WoW deltas.
- [ ] **Step 2:** Implement all four (`protectedProcedure` — viewers may see metrics). Run, pass, commit.

### Task 4.4: metrics_daily rollup job
**Files:** Create `jobs/client.ts`, `jobs/metrics-rollup.ts`, `app/api/inngest/route.ts`, `migrations/0003_metrics_daily.sql`.
**Interfaces:** Produces the Inngest client + `metricsRollup` fn (nightly cron) filling `metrics_daily`.
- [ ] **Step 1:** SQL: `metrics_daily (day date pk, dau int, wau int, mau int, new_signups int, mode_split jsonb, retention jsonb, computed_at timestamptz)`. Apply.
- [ ] **Step 2:** Inngest client (`jobs/client.ts`) + `metrics-rollup.ts` using Aura's `compute-skill-rankings` template (each step in `step.run`, cutoffs frozen in-step, chunked upsert `onConflict`, RPC errors throw). Serve at `/api/inngest`.
- [ ] **Step 3:** Run locally with `npx inngest-cli dev`; trigger the fn; confirm `metrics_daily` rows appear. Commit.

### Task 4.5: Metrics UI
**Files:** Create `app/(dashboard)/metrics/*` (tabbed), `components/reporting/period.ts` (port Aura URL-range), `components/reporting/RangePicker.tsx`, chart cards.
- [ ] **Step 1:** Port `period.ts` (URL `?since/&until/&days`). Build the tabbed page (Overview·Funnels·Retention·Community) with Tremp KPI cards + Recharts + WoW badges; retention as a cohort grid reading `metrics_daily`.
- [ ] **Step 2:** Manual verify numbers reconcile with the SQL spot-check. Commit.

**Phase 4 exit:** KPIs + ≥1 funnel + retention render for a chosen range with WoW deltas; nightly rollup populates `metrics_daily`.

---

## Phase 5 — Push pillar (compose → send → schedule → prune)

> **Two grandma-app migrations must land first (coordinated, separate PRs):** (a) add `is_active boolean default true` + `last_seen_at timestamptz` to `push_tokens`; (b) resolve the broadcast pref toggle (Open Q1). Do NOT start 5b until (a) is merged.

**Ports Aura's admin push-campaign system + send/receipt/prune trio; grandma adds richer 7-toggle pref enforcement at the token-resolution choke point.**

### Task 5a.1: Port the Expo send trio
**Files:** Create `lib/expo/send-push-batch.ts`, `resolve-tokens.ts`, `deactivate-tokens.ts`, `lib/expo/types.ts` (terminal codes), + tests.
**Interfaces:** Produces `sendPushBatch(messages)`, `resolveTokensForUser(userId, category)`, `streamActiveTokens(target, category)`, `deactivateTokens(tokens)`.
- [ ] **Step 1:** Port `send-push-batch.ts` (batch 100, Bearer `EXPO_ACCESS_TOKEN`, `exp.host/--/api/v2/push/send`, ticket parse, never throws) + `deactivate-tokens.ts` (terminal codes, chunk 100). Port terminal-code detection.
- [ ] **Step 2:** Port `resolve-tokens.ts` AND add grandma's pref filter: join `profiles`, filter `notification_prefs[category]` + `privacy_settings` before returning tokens; return skip-count. Test: an opted-out user yields zero tokens + counts as skipped.
- [ ] **Step 3:** Run, pass, commit.

### Task 5b.1: Campaign schema + router + send
**Files:** Create `migrations/0004_push_campaigns.sql`, extend `db/schema/center.ts`, `server/routers/push.ts`.
**Interfaces:** Produces `push_campaigns` + `push_recipients` tables; `push.createCampaign`, `push.sendCampaign(id)`, `push.list`, `push.history(id)`.
- [ ] **Step 1:** SQL for both tables (fields per EXECUTION_PLAN §5b). Apply.
- [ ] **Step 2:** `push.sendCampaign` (`sendProcedure` + audit): atomic `→sending`, resolve audience via `streamActiveTokens` (prefs respected), `sendPushBatch`, write a `notifications` row per recipient (in-app feed), record `sent_count/failed_count/skipped_optout_count`, `→sent`. Accept admin session OR service-role bearer.
- [ ] **Step 3:** Test send-to-one against a real token (Igor's device) — arrives; `notifications` row appears; campaign logs `sent_count=1`. Commit.

### Task 5b.2: Schedule + receipts jobs
**Files:** Create `jobs/push-schedule.ts`, `jobs/push-receipts.ts`; register in `/api/inngest`.
- [ ] **Step 1:** `push-schedule.ts` (every-minute cron) picks `status='scheduled' AND scheduled_at<=now()` → invokes `sendCampaign`. `push-receipts.ts` polls Expo `getReceipts` → `deactivateTokens` for delivery-failed.
- [ ] **Step 2:** Test a scheduled send fires; a dead token is pruned. Commit.

### Task 5b.3: Push UI
**Files:** Create `app/(dashboard)/push/*` (compose dialog, campaigns table, history/detail). Adapt Aura's `push-notifications/*` components.
- [ ] **Step 1:** Compose dialog (title/body char counts, category select, deep-link builder, audience = All / segment / single-user via Users search, Send-now vs Schedule); campaigns table; history with delivered/failed/opt-out-skipped counts.
- [ ] **Step 2:** End-to-end manual: compose → send to segment → prefs respected (opt-out skipped+counted) → schedule fires. Commit.

**Phase 5 exit:** compose→send→arrive→in-app-feed row; segment send respects prefs; scheduled send fires; dead tokens pruned.

---

## Phase 6 — Sentry surface (crash triage; net-new, read-only)

**Deliverable:** list grandma's live unresolved Sentry issues in the console.

### Task 6.1: Sentry read client + router
**Files:** Create `lib/sentry-api.ts`, `server/routers/sentry.ts`.
**Interfaces:** Produces `listIssues({query,range})`, `getIssue(id)`; `sentry.issues`, `sentry.issue` (`adminProcedure`).
- [ ] **Step 1:** `lib/sentry-api.ts` — read-only Sentry REST client (org `grandmaapp`, project `react-native`, `SENTRY_AUTH_TOKEN`); list unresolved issues by frequency/last-seen.
- [ ] **Step 2:** Router (`adminProcedure`). Test with a mocked fetch → shapes issues. Run, pass, commit.

### Task 6.2: Sentry UI
**Files:** Create `app/(dashboard)/sentry/page.tsx` (+ detail).
- [ ] **Step 1:** Issues table (title, count, users affected, last seen, level) + deep-link out to Sentry; optional "crashes 24h" tile on Metrics Overview.
- [ ] **Step 2:** Manual verify against live Sentry. Commit.

**Phase 6 exit:** console lists live unresolved Sentry issues with counts; click-through deep-links to Sentry.

---

## Deferred (Phase 7+)
App control (feature flags / remote config / daily-message curation — needs app-side wiring); per-category pref UX + quiet hours; DSAR/export console view; monorepo absorption (cheap — `db/` already isolated).

## Open questions (settle before the dependent phase)
1. **Campaign→pref mapping** (blocks Phase 5b): grandma's 7 toggles have no generic "broadcast/marketing" toggle. Add one to `notification_prefs`, or map each campaign to an existing category. → grandma-app migration.
2. **`push_tokens` `is_active`+`last_seen_at`** (blocks Phase 5b): grandma-app migration, coordinate with the app.
3. **Metrics driver** (affects Phase 4): confirm hybrid (live-RPC + `metrics_daily`) vs all-live.
4. **Clerk org** (affects Phase 2): new Clerk instance for grandma vs new org in existing Mother Clerk.

## Build sequencing
P1 → P1.5 → P2 are sequential (foundation). After P2: P3, P4, P6 parallelize; P5 depends on P3 (audience picker) + the two grandma-app migrations. Every phase after 1.5 runs through the generated `/gcc-orchestrate` pipeline.
