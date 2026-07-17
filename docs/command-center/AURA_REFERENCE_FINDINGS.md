# Aura — Reference Findings for grandma-command-center

**Date:** 2026-07-16
**Purpose:** Deep analysis of `~/dev/aura` (the `aura-monorepo`) to mine generic, copyable patterns for grandma's internal command center. Companion to `EXECUTION_PLAN.md`. Distilled from three parallel code-analysis passes.

> **How to read this:** each subsystem separates **GENERIC (copy)** from **Aura-specific (skip/adapt)**. File paths are all under `~/dev/aura`. Where a path is "the gem," it's the single highest-value file to open first.

---

## 0. The big picture — where things actually live in Aura

Aura is a pnpm monorepo: `apps/mobile` (Expo), `apps/engine` (Next.js backend **+ admin dashboard**), `apps/studio` (a lightweight *creator-facing* app), `apps/render`, `apps/storybook`, and `packages/*` (`@aura/database`, `@aura/shared`, `@degen/icons`, ui). One root `supabase/`.

**Two corrections to naive assumptions:**
1. **`apps/studio` is NOT the admin console.** It's a per-user, session-gated app (anon key + RLS, no roles, no allowlist, no service-role). It's a good *shell* reference only.
2. **The real "command center" is `apps/engine`** under `app/admin/**` (UI), `app/api/admin/**` (APIs), `lib/inngest/**` (jobs), `supabase/migrations/**` (aggregation SQL). This is the subsystem grandma's command center most resembles.

**Privileged data access** lives in `packages/database` (service-role / raw-`pg`), used by the engine, **not** by studio.

---

## 1. Auth, app shell & data-access (from `apps/studio` + `packages/database`)

### GENERIC — copy
- **SSR Supabase auth trio** (`apps/studio/lib/supabase/{server,client}.ts` + `middleware.ts`): `@supabase/ssr` `createServerClient`/`createBrowserClient` with cookie adapters. Anon key.
- **Two-layer defense-in-depth gate:** middleware refreshes session + redirects (`middleware.ts`), AND the authed layout re-verifies via a DAL (`lib/auth/dal.ts` → `getUserOrRedirect()`, wrapped in `React.cache` so repeated calls hit the auth server once). Never rely on middleware alone.
- **Open-redirect guard** (`lib/auth/safe-path.ts` → `isSafeRedirectPath`/`safeNext`): rejects `//evil.com`, `/\evil.com`. **Copy verbatim.**
- **Route-group shell:** `app/(app)/` (authed, sidebar+header) vs `app/(auth)/` (login, no chrome); root `page.tsx` is a pure redirector; root layout sets `robots:{index:false}`.
- **Config-driven sidebar** (`app/(app)/_components/AppSidebar.tsx`): a static `NAV_ITEMS[]` + `usePathname()` prefix-matcher for active state. Most directly copyable nav mechanic.
- **Server-only query modules** (`lib/queries/*.ts`): `import "server-only"`, a `SELECT` constant, snake→camel typed-DTO mappers, called from RSC with `Promise.all`. Defense-in-depth: RLS **and** explicit `.eq('user_id', …)`.
- **`_components/`, `_actions/` colocation** (underscore = not a route).

### The privileged data layer (`packages/database`) — copy the shape
- **`client.ts` client taxonomy:** `createBrowserClient` (anon), `createServerClient`/`createAdminClient` (**service_role, bypasses RLS**), `createAnonymousServerClient`, `createAuthenticatedClient(jwt)` (RLS-as-that-user), `createReadClient`. Throws if `SUPABASE_SERVICE_ROLE_KEY` unset; dev stack-trace warning if service-role is used from a user-facing route. **Reading `auth.users`** (normally RLS-blocked) is trivial with the service-role/raw-pg path — no SECURITY DEFINER RPC needed.
- **`db.ts` `DatabaseController`:** raw `pg.Pool` over Supavisor (pooler). `db.query()` = service-role, no RLS. `db.forUser(userId)` = runs each query inside `BEGIN` + `set_config('request.jwt.claim.sub',…)` so RLS resolves as that user without minting a JWT. Prod hardening worth stealing: one Pool per URL, `SET LOCAL statement_timeout` per statement (required in Supavisor *transaction* mode), read-only single retry (writes never retry), slow-query log >200ms, L1 `db.cached(key,ttl,fetch)`.
- **Shared DB types:** `packages/database/types.ts` is **generated** via `supabase gen types typescript --linked > packages/database/types.ts` (root script `db:types`), consumed as `@aura/database/types`.

### Aura-specific — skip
`mintServiceToken` (their legacy auth), EU read-replica routing, the `engine` bearer-forwarding fetcher (only if you front a separate API), `mintServiceToken`. **studio has NO admin/role gate** — grandma must build its own (see plan).

---

## 2. Push notifications — Aura's admin campaign system (the closest reference)

Provider: **Expo Push API** (`https://exp.host/--/api/v2/push/send`). Two-step ticket→receipt model fully implemented incl. dead-token pruning. **Strongest reuse candidate in the whole repo.**

### GENERIC — copy almost as-is
- **`push_tokens` schema + RLS** (`supabase/migrations/20260422215737_create_push_tokens.sql`): `expo_push_token`, `platform`, **`app_env` (local|staging|production)**, `bundle_id`, `device_name`, `is_active`, `last_seen_at`, `unique(expo_push_token)`, partial index `(user_id,app_env) where is_active`. Owner RLS; service_role bypasses. **Multi-device + per-env isolation** (a staging build never gets prod pushes) is the key idea. *(grandma's existing `push_tokens` is simpler — see plan for the delta.)*
- **The send/receipt/prune trio** (the gem cluster):
  - `supabase/functions/_shared/expo-batch.ts` (Deno) / `apps/engine/lib/push/send-push-batch.ts` (Node) — batch 100/req, `Authorization: Bearer ${EXPO_ACCESS_TOKEN}`, parse tickets → persist `push_notification_receipts`, terminal errors → deactivate. **Never throws.**
  - `supabase/functions/_shared/resolve-tokens.ts` — `resolveTokensForUser()` (single) + `streamActiveTokens()` (broadcast, keyset-paginated pages of 1000, memory-bounded).
  - `supabase/functions/_shared/deactivate-tokens.ts` — flips `is_active=false`, chunked `.in()` at 100 (PostgREST URL limit).
  - `supabase/functions/process-push-receipts/index.ts` — **receipt poller**, pg_cron every minute, `getReceipts` in batches of 1000, keyset pagination, 45s budget; deactivates tokens whose *delivery* (not ticket) failed. **This closes the loop** — tickets usually say ok; real failure shows in the receipt.
  - Terminal codes (`packages/shared/types/push.ts`): `DeviceNotRegistered | InvalidPushToken | MismatchSenderId` (`TERMINAL_TOKEN_ERRORS`, `isTerminalTokenError`).
- **The admin campaign feature = a mini command center** (copy the whole shape):
  - **`admin_push_notifications` table** (`supabase/migrations/20260402123620_...`): `title, body, data jsonb, target_type('all'|'specific'), target_user_ids uuid[], status('draft'|'scheduled'|'sending'|'sent'|'cancelled'|'failed'), scheduled_at, sent_at, sent_count, error_message, cron_attempts/…`.
  - **Compose UI:** `apps/engine/app/admin/push-notifications/*` — `notification-dialog.tsx` (title/body char counts, All vs specific UUIDs, deep-link builder, schedule-for-later, "Save & Send Now"), `data-table.tsx`, `columns.tsx`, `templates-tab.tsx`.
  - **APIs:** `app/api/admin/notifications/route.ts` (GET/POST), `[id]/route.ts` (PATCH edit / DELETE cancel), `[id]/send/route.ts` (atomically `→sending`, stream tokens by target, `sendPushBatch`, record `sent_count`; **accepts admin session OR service-role bearer** so cron can invoke it).
  - **Scheduled dispatch:** pg_cron `process_scheduled_admin_pushes()` picks `status='scheduled' AND scheduled_at<=now()`.
  - **Engagement reporting:** `push_notification_sends` + taps stamped via `/api/v1/notifications/opened` (`analytics_id` echoed into `data`).
- **Trigger plumbing (generic):** DB-webhook→edge→batch, and cron-via-Vault→edge→batch (`net.http_post` from a Postgres function reading secrets from Supabase Vault).

### Preferences / opt-outs — Aura is WEAKER than grandma here
Aura enforces a **single global boolean** `profiles.push_notifications_enabled` at token-resolution time (both `resolveTokensForUser` and `streamActiveTokens` filter it). **No per-category prefs, no quiet hours.** grandma already has a richer 7-toggle `notification_prefs` JSONB — so grandma is *ahead*; the choke point to enforce them is the token-resolution step (mirror Aura's, add the category→toggle mapping there).

### Aura-specific — skip
Legacy `profiles.expo_push_token` fallback; the `PushNotificationType` union + skill/gen/social deep-link targets; `count_unseen_gens` badge RPC; AI copy-suggestion route; CTR `push_notification_sends` analytics (optional nice-to-have).

---

## 3. Metrics / analytics (from `apps/engine`)

### Architecture: LIVE SQL-RPC, not precomputed rollups
Aura computes dashboards **live per page load via Postgres RPCs** (`supabase.rpc('get_daily_activity',…)`), each defined as a SQL function in `supabase/migrations/`. Routes are thin: **auth-gate → parse range → call RPC(s) → transform → JSON**. **There is essentially NO `*_daily`/rollup/snapshot cache table** for the dashboards — the sole exception is `skill_ranking_stats` (trending), filled hourly by a cron. `performance_metrics` is a raw sample table aggregated live.

> **Decision input for grandma:** live-RPC is simpler and always-fresh but recomputes each load; a `metrics_daily` rollup is more scalable but adds a job + staleness. See the plan's Phase 4 tradeoff.

### GENERIC — copy
- **`apps/engine/lib/reporting/transforms.ts` — the highest-value file to copy.** Pure, unit-tested shapers: `ratePct`, `priorRatePctOrNull`, `wowPct`, `dayWindowKeys`, `processDailyActivity` (gap-fills every day so charts have no holes), `computeFunnelStages` (adds `step_conversion_pct`, clamps ÷0 to null), `processD1Retention`, `processDnRetention`, `processActiveUsers`, `processSessionTime`, `processPushEngagement`. Split = **SQL returns raw rows → pure TS transform → route returns JSON** (testable, portable).
- **URL-driven date range** (`components/admin/reporting/period.ts`): `resolveReportingRange`, `presetToRange`, `rangeToDays` read `?since/&until/&days/&period` so ranges are shareable; `ReportingRangePicker` is copyable. **Prior-window delta convention:** every headline tile fetches current + equal-length preceding window in one `Promise.all` for a WoW badge.
- **Chart shell:** Recharts wrapped shadcn-style at `components/ui/chart.tsx` (`ChartContainer`/`ChartTooltip`/`ChartConfig`, themed via `var(--chart-1)`). Simple metrics = shadcn `Table` + stat `Card` tiles, not charts.
- **Funnel/retention SQL templates** (adapt the "action" signal):
  - **Common action signal** = UNION of raw activity tables; cohort anchored on `profiles.created_at` (UTC day).
  - **Activation funnel** (`…activation_funnel_self_initiated_gen.sql`): stages signed_up → onboarded (`onboarding_completed_at IS NOT NULL`) → activated (`first_self_gen_at`) → second_gen → retained_d7. **Lesson:** they use `first_self_gen_at` not `first_gen_at` because a mandatory onboarding "gift" gen made `first_gen_at` ~100% and destroyed the signal — *pick an activation event the user chose, not one the app forced.*
  - **D1/DN retention** (`…add_d1_retention_rpc.sql`, `…add_dn_retention_rpc.sql`): per signup-cohort-day C, distinct users with an action on day C+N ÷ cohort size; same-day doesn't count; reads one extra day past the window so the last cohort can detect its return.
  - **DAU** (`…unify_dau_definition_in_get_daily_activity.sql`): distinct users with ANY of the action signals that day (explicitly unified to end ambiguity).
  - SQL shape: cohort CTE + UNION-ALL action signal + `FILTER (WHERE …)` per stage + `CROSS JOIN LATERAL VALUES` to emit one row per stage.
- **First-party event pipeline (self-hosted Mixpanel-lite):** `mobile_events`/`web_events` tables (`user_id, anonymous_id, event_name, properties jsonb, occurred_at`), client capture `lib/analytics/track.ts` (`trackWebEvent` fire-and-forget `keepalive`, `getAnonymousId` 2-yr cookie), server capture `lib/events/emit-server-event.ts`. RPCs aggregate these live. *(Optional for grandma v1 — grandma can derive metrics from existing domain tables first.)*

### Aura-specific — skip
gens/skills/tokens/God Mode metric semantics; Meta Ads spend sync; Mixpanel on mobile (parallel sink, not the dashboard source); the gift-gen activation nuance (but keep the *lesson*).

---

## 4. Background jobs / scheduling (from `apps/engine`)

Two systems: **Inngest (primary, event + cron)** and **pg_cron→edge-functions (secondary, DB-adjacent timers)**. No `vercel.json` crons — Inngest owns time-triggering.

### GENERIC — copy
- **Inngest setup trio:**
  - `lib/inngest/client.ts` — `new Inngest({ id, schemas: EventSchemas().fromRecord<Events>(), middleware:[logger, sentry] })`; all event names typed in one `Events` map; env-overridable concurrency/throttle (`userThrottle()` keyed on `event.data.userId`).
  - `app/api/inngest/route.ts` — one `serve({ client, functions:[…] })` registers everything.
  - `lib/inngest/registry.ts` — declarative id/cron/concurrency array powering an in-app `/admin/inngest` dashboard.
- **Cron job template — `lib/inngest/functions/compute-skill-rankings.ts`** (also the rollup-table blueprint): `{cron:"0 * * * *"}`, `retries:2`, `concurrency:{limit:1}` (singleton). Each side-effect in its own `step.run` (memoized checkpoints; retries resume mid-job). **Determinism gotcha handled:** `Date.now()` window cutoffs computed *inside* a `step.run` and returned, so replays don't drift. Chunked upsert (100) `onConflict` + orphan cleanup. RPC errors `throw` so Inngest retries rather than persisting a zero-filled snapshot.
- **Event job template — `lib/inngest/functions/first-gen-nudge.ts`:** `{event:"user/onboarding.completed"}` → `step.sleep("wait-1h","1h")` (durable delayed job, survives restarts) → **atomic DB claim** (`UPDATE … WHERE …_sent_at IS NULL … RETURNING id`) as an exactly-once guard vs duplicate events → send → **release-claim compensation** if the side-effect finds 0 devices.
- **pg_cron→edge bridge** (`…add_skill_drop_notifications_cron.sql`): `cron.schedule` → SQL fn with early-exit `EXISTS` guard → `net.http_post` to edge fn, secrets from `vault.decrypted_secrets`.
- **Testing pattern:** extract pure logic out of the Inngest handler into exported helpers (`checkFirstGenNudgeEligibility`, `computeScore`) so vitest exercises logic without step machinery; `vi.mock("../client")` stubs `createFunction`; chainable Supabase stub. Local: `pnpm dev:inngest` (`inngest-cli dev`) + `pnpm dev:engine`.

### Aura-specific — skip
The specific detector layer (OOM/auth-attack/cost-drain), PagerDuty wiring, gen-lifecycle cleanup sweeps.

---

## 5. Sentry — what Aura does (and doesn't)

- **Init (GENERIC boilerplate):** engine = `@sentry/nextjs` 4 config files (`sentry.{client,server,edge}.config.ts` + `instrumentation.ts`) + `withSentryConfig` in `next.config.ts` (source maps, `tunnelRoute:"/monitoring"` ad-blocker bypass). Mobile = `apps/mobile/src/services/sentry.ts` — **DSN-dormant no-op when absent** (clean local dev), `beforeSend` demotes HttpClient 5xx/4xx unhandled→handled+warning and scopes to the engine origin only, typed `captureWithContext(err,{feature,screen,handled,level,fingerprint})` wrapper.
- **Admin surface that READS Sentry data: does NOT exist.** No Sentry Web API client, no MCP. The only outbound reference is `lib/monitoring/links.ts → sentryIssueUrl(eventId)` which just **builds a deep-link** to attach to Slack alerts. Data flows *into* Sentry only.
- **Crash→notification pipeline exists but is self-hosted**, not Sentry-driven: app telemetry (`mobile_events`) → Postgres → Inngest/cron detector → Slack/PagerDuty, with a Sentry deep-link for convenience.

> **Implication for grandma:** an admin surface that *reads* Sentry issues is **net-new** — nothing in Aura to copy. grandma would build it from the Sentry REST API or the Sentry MCP (grandma's Sentry org = `grandmaapp`, project = `react-native`). See plan Phase 6.

---

## 6. Master copy-list (priority order)

| # | Want | Copy from (`~/dev/aura`) |
|---|---|---|
| 1 | Pure metric shapers (rate/WoW/funnel/retention/gap-fill) + tests | `apps/engine/lib/reporting/transforms.ts` |
| 2 | Expo send + receipt-poll + prune trio | `supabase/functions/_shared/{expo-batch,resolve-tokens,deactivate-tokens}.ts`, `supabase/functions/process-push-receipts/index.ts`, `packages/shared/types/push.ts` |
| 3 | Whole admin push-campaign feature | `admin_push_notifications` migration + `apps/engine/app/admin/push-notifications/*` + `app/api/admin/notifications/**` |
| 4 | Funnel/retention/DAU SQL templates | `supabase/migrations/*funnel*.sql`, `*retention*.sql`, `*daily_activity*.sql` |
| 5 | URL-driven shareable date range + WoW delta | `components/admin/reporting/period.ts`, `ReportingRangePicker` |
| 6 | Recharts+shadcn chart shell | `components/ui/chart.tsx` + `components/admin/reporting/cards/*` |
| 7 | Inngest client/registry/serve trio | `lib/inngest/{client,registry}.ts`, `app/api/inngest/route.ts` |
| 8 | Cron→rollup job template | `lib/inngest/functions/compute-skill-rankings.ts` |
| 9 | Event→sleep→atomic-claim job template | `lib/inngest/functions/first-gen-nudge.ts` |
| 10 | SSR auth trio + two-layer gate + open-redirect guard | `apps/studio/lib/supabase/*`, `middleware.ts`, `lib/auth/{dal,safe-path}.ts` |
| 11 | Privileged service-role / raw-pg data layer | `packages/database/{client,db}.ts` |
| 12 | Sentry mobile config (DSN-dormant, beforeSend, captureWithContext) | `apps/mobile/src/services/sentry.ts` |

**Net gaps to build fresh (nothing to copy):** admin authorization/allowlist gate (studio has none — clone `mother-internal-dashboard`'s role gate instead); admin surface that *reads* Sentry issues; per-category push-pref enforcement (grandma's 7-toggle prefs are richer than Aura's single boolean — map them at the token-resolution choke point).
