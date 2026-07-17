# grandma-command-center — v1 Execution Plan

**Date:** 2026-07-16
**Companion docs:** `COMMAND_CENTER_HANDOFF.md` (vision), `AURA_REFERENCE_FINDINGS.md` (copyable patterns)
**Status:** plan — locked scope, awaiting build kickoff.

> An internal, admin-only web console to **see users, view metrics, and control push notifications** for grandma.app. Reads/writes grandma's Supabase Postgres from a privileged server context. App users never see it.

---

## 0. Locked decisions (settled with Igor)

| # | Decision | Choice |
|---|---|---|
| 1 | **Repo** | **Standalone `grandma-command-center`** (not a monorepo migration). grandma-app has 584 relative-import files → migration too costly. Structured so it can be *absorbed* into a monorepo later at no extra cost (isolated `db/` folder). |
| 2 | **Access** | **Me + team, with roles** — `admin` vs `viewer` tiers (clone `mother-internal-dashboard`'s Clerk `publicMetadata.role` gate). |
| 3 | **Push infra** | **Inngest job in the command center** → Expo Push API directly (batch, receipts, prune, write `notifications` rows). |
| 4 | **Metrics depth** | **Full funnels + retention from day one** (+ KPIs). Requires real aggregation. |
| 5 | **App control** | **Observe + notify only for v1.** Feature flags / remote config / content curation = Phase 7+ (deferred). |

### Stack (cloned from `mother-internal-dashboard`, one deliberate delta)
Next.js 15 (App Router, RSC) · Clerk (`@clerk/nextjs`) · tRPC v11 · Drizzle ORM · Tremor + Recharts · Inngest · Tailwind v4 · Vercel. **Delta:** mother-dashboard uses the **Neon** driver; grandma is **Supabase Postgres**, so `db/` uses the `postgres`/`pg` driver against Supabase's pooler (see Phase 1).

### Two auth systems — keep them straight (this is the security model)
- **Clerk** authenticates *admins* (the team). This + the role gate **IS the security boundary.**
- The DB connection uses a **service-role / direct-Postgres** credential that **bypasses RLS** — by design, so admins see across all users. Nothing app-user-facing can reach this app.
- Every PII view and every push send is **audit-logged**.

---

## Data grounding (verified against grandma's real schema)

Tables the center **reads:** `profiles` (id=auth UUID; `journey_mode`, `subscription_tier ∈ {free,premium_solo,premium_family}`, `created_at`, `language`, `due_date`, `notification_prefs` JSONB, `privacy_settings` JSONB, `consented_at`), `behaviors`, `push_tokens`, `child_logs`, `cycle_logs`, `pregnancy_logs`, `channel_posts`, `channel_ratings`, `garage_*`, `notifications`, `account_deletion_requests`, `children`.

Tables the center **owns** (new, created by its own migrations into grandma's Supabase): `metrics_daily`, `push_campaigns`, `push_recipients`, `admin_audit_log`. (Naming mirrors Aura's `admin_push_notifications` but adapted.)

**Two schema realities that shape the metrics (no magic columns exist):**
1. **No `last_active`/`last_seen` column.** "Active on day D" must be **derived** = the user authored ≥1 row that day in the activity signal (see below).
2. **No onboarding/activation flag.** Funnel stages must be **derived** from existing columns.

**Definitions locked for v1** (documented so they're not hand-wavy):
- **Activity signal** (the "action" UNION, à la Aura): a row created that day in `child_logs ∪ cycle_logs ∪ pregnancy_logs ∪ channel_posts`. (Excludes `notifications` — those are system-generated, not user actions.)
- **DAU/WAU/MAU** = distinct users with ≥1 activity-signal row in the day/7-day/30-day window.
- **Onboarded** = `profiles.journey_mode IS NOT NULL` AND a `behaviors` row exists.
- **Activated** = ≥1 activity-signal row **ever** (the user *chose* to log something — the Aura "pick a user-initiated event" lesson).
- **Subscribed** = `subscription_tier <> 'free'`.
- **Retention DN** = for signup-cohort day C, distinct users with an activity-signal row on day C+N ÷ cohort size (same-day excluded; window reads one extra day so the last cohort can register its return).
- **Mode split** = count by `journey_mode`.

---

## Phase 1 — Scaffold + DB connection *(foundation; nothing else until green)*

**Goal:** an empty, deployable Next 15 app that can query grandma's Postgres.

1. `create-next-app` (App Router, TS, Tailwind v4). Add: `@clerk/nextjs`, `@trpc/{server,client,react-query}`, `@tanstack/react-query`, `drizzle-orm`, `postgres`, `@tremor/react`, `recharts`, `inngest`, `superjson`, `zod`, `lucide-react`, `date-fns`.
2. **`db/` (isolated for future monorepo lift):**
   - `db/index.ts` — Drizzle over the `postgres` driver against **Supabase's connection pooler** (transaction mode, port 6543) using a privileged Postgres role. Lazy singleton + `Proxy` (mother-dashboard pattern). `SET statement_timeout` per the pooler's transaction-mode requirement.
   - `db/schema/grandma.ts` — Drizzle definitions for the **read** tables (introspect via `drizzle-kit introspect` OR generate from `supabase gen types` and hand-map). Include a view/access to `auth.users` for `email` (service-role can read it).
   - `db/schema/center.ts` — the new center-owned tables.
   - `db/shared-types.ts` — `NotificationPrefs` + `DEFAULT_NOTIFICATION_PREFS`, **mirrored from grandma-app's `lib/pushNotifications.ts`** (single reconciliation point).
3. Env: `DATABASE_URL` (Supabase pooler, service-role), `CLERK_*`, `EXPO_ACCESS_TOKEN`, `INNGEST_*`, `SENTRY_*`. Commit `.env.example`.
4. Deploy skeleton to Vercel (private).

**Exit:** a `/health` route runs `SELECT count(*) FROM profiles` and returns a number.

---

## Phase 2 — Auth gate + role model *(the security boundary — must be solid before any data UI)*

**Goal:** only allowlisted team members reach the console; role tiers enforced server-side.

1. **`middleware.ts`** — `clerkMiddleware` + `auth.protect()` on everything except `/sign-in`, `/api/inngest`, `/api/webhooks`. (Clone mother-dashboard's matcher, incl. the `/api/inngest` exclusion note.)
2. **Role model** — Clerk `publicMetadata.role ∈ {admin, viewer}`. `server/context.ts` resolves the live role from Clerk on each request (mother-dashboard pattern: read fresh, don't trust the cached JWT claim, so role changes take effect next request).
3. **`server/trpc.ts`** — `publicProcedure`, `protectedProcedure` (any signed-in allowlisted user = viewer+), `adminProcedure` (role==admin). **Add a step-up gate `piiProcedure`/`sendProcedure`** for PII reads + push sends (admin-only), mirroring mother-dashboard's finance step-up idea.
4. **Allowlist** — team emails in Clerk (invite-only org) + a defensive server check: reject any authenticated user whose email isn't on the allowlist even if Clerk lets them in.
5. **`admin_audit_log`** migration + `lib/audit.ts` — write `{ actor_email, action, target, meta, at }` on every PII view + every send. (Aura's studio has no gate to copy — this is built fresh from mother-dashboard's shape.)

**Role split for v1:** `admin` = everything (Users incl. PII, Metrics, Push compose+send, Sentry). `viewer` = Metrics + user *counts/segments* (no PII detail, no sends).

**Exit:** signed-out → redirect to sign-in; a non-allowlisted Google account is rejected; a `viewer` gets FORBIDDEN on an `adminProcedure`; every allowed page loads empty shells.

---

## Phase 3 — Users pillar *(fastest win; proves the data connection end-to-end)*

**Goal:** searchable user table + detail view.

1. **`server/routers/users.ts`:**
   - `list({ mode?, tier?, language?, signupRange?, activity?, search?, cursor })` — paginated `profiles` join `auth.users` (email), with derived `last_active` (max activity-signal date) + `logs_count` + `children_count`. Keyset pagination.
   - `detail(userId)` — profile, children, subscription, per-table log counts, last-active, `notification_prefs`, `privacy_settings`, device count from `push_tokens`. **`piiProcedure` + audit-log the view.**
   - `segments()` — canned filters: "all pregnancy", "inactive 14d+", "TTC/pre-preg", "kids 0–1y", "premium".
2. **UI** `app/(dashboard)/users/` — Tremor `Table` + filter bar + search; `users/[id]/page.tsx` detail. Config-driven sidebar (Aura `NAV_ITEMS` pattern). `viewer` sees the table with PII columns masked; `admin` sees full detail.
3. Server-only query modules returning typed camelCase DTOs (Aura `lib/queries/*` pattern).

**Exit:** the real user list renders, filters/search work, an admin opens a detail view and it's audit-logged; a viewer can't see PII.

---

## Phase 4 — Metrics pillar (KPIs + funnels + retention) *(the analytics value)*

**Architecture decision — LIVE-RPC vs rollup table.** Aura runs **live SQL** for everything except trending. For grandma v1 we adopt a **hybrid**, justified by scale:
- **Live SQL RPCs** for headline KPIs + funnels over the selected window (simple, always fresh; grandma's user base is small enough that `COUNT(DISTINCT) FILTER` over the log tables is cheap).
- **One `metrics_daily` rollup + nightly Inngest job** for the **retention curves + the DAU timeseries**, because retention recomputed live over all cohorts gets expensive fast and is the one thing that benefits from precompute. (Best of both; matches Aura's "live by default, rollup the heavy trend.")

1. **SQL functions** (new migrations into grandma's Supabase, adapting Aura's funnel/retention templates to grandma's activity signal):
   - `cc_get_daily_activity(since, until)` → DAU/WAU/MAU timeseries + new signups/day + mode split.
   - `cc_get_activation_funnel(since, until)` → signed_up → onboarded → activated → subscribed (grandma's derived definitions).
   - `cc_get_dn_retention(since, until, n)` → cohort retention.
   - All follow the cohort-CTE + UNION-ALL-action + `FILTER` per stage shape.
2. **`server/routers/metrics.ts`** — thin routes: auth-gate → resolve range → `Promise.all(currentRPC, priorWindowRPC)` → transform → JSON. **Copy `lib/reporting/transforms.ts` from Aura** (`ratePct`, `wowPct`, `processDailyActivity` gap-fill, `computeFunnelStages`, `processDnRetention`) — adapt names, keep the logic + tests.
3. **`jobs/metrics-rollup.ts`** (Inngest, nightly cron) — computes retention + DAU history into `metrics_daily`. Use Aura's `compute-skill-rankings` template: each step in `step.run`, cutoffs frozen inside a step, chunked upsert `onConflict`, RPC errors throw (retry, don't persist zeros).
4. **UI** `app/(dashboard)/metrics/` — tabbed (Overview · Funnels · Retention · Community). **URL-driven date range** (Aura `period.ts` + `ReportingRangePicker`) so ranges are shareable; **WoW delta badges** (current vs prior window). Tremp KPI cards + Recharts area/line/funnel; retention as a cohort grid.

**Exit:** headline KPIs + at least one funnel + a retention curve render for a chosen date range with WoW deltas; the nightly rollup populates `metrics_daily`; numbers reconcile against a manual SQL spot-check.

---

## Phase 5 — Push pillar (compose → send → history) *(the headline feature)*

This is where Aura gives the most: it has a **complete admin push-campaign system** to adapt. grandma's advantage: richer 7-toggle `notification_prefs` (vs Aura's single boolean).

### 5a. Send infrastructure (port Aura's trio, adapt to grandma)
1. `lib/expo/send-push-batch.ts` — port Aura's `send-push-batch.ts`: batch 100, `Authorization: Bearer ${EXPO_ACCESS_TOKEN}`, `exp.host/--/api/v2/push/send`, parse tickets, terminal-error detection (`packages/shared/types/push.ts` → grandma copy).
2. `lib/expo/resolve-tokens.ts` — `resolveTokensForUser` + `streamActiveTokens` (keyset, pages of 1000). **This is grandma's pref choke point:** join `profiles`, and filter by `notification_prefs` **per campaign category** (map campaign→toggle: e.g. an "insights" campaign respects `notification_prefs.insights`; a generic broadcast respects a v1 default such as `daily_reminder`/an opt-in flag — TBD exact mapping in build, see Open Q1). Also honor `privacy_settings` (marketing consent).
3. `lib/expo/deactivate-tokens.ts` — flip dead tokens (`DeviceNotRegistered|InvalidPushToken|MismatchSenderId`), chunked `.in()` at 100.
4. `jobs/push-receipts.ts` (Inngest, every minute OR after each send) — poll `getReceipts`, deactivate delivery-failed tokens. (grandma's `push_tokens` lacks `is_active`/`last_seen_at` — **add them via migration** to match Aura's prune model.)

### 5b. Campaign model + send pipeline
5. Migrations: **`push_campaigns`** (`title, body, data jsonb, deep_link, category, target_type('all'|'segment'|'user'), target_spec jsonb, status('draft'|'scheduled'|'sending'|'sent'|'cancelled'|'failed'), scheduled_at, sent_at, sent_count, failed_count, skipped_optout_count, created_by, error_message`) + **`push_recipients`** (per-recipient log: campaign_id, user_id, token, status, ticket_id, error). Also add `is_active`+`last_seen_at` to `push_tokens`.
6. **`server/routers/push.ts`** (all `sendProcedure`/admin + audit):
   - `createCampaign` / `updateDraft` / `deleteOrCancel`.
   - `sendCampaign(id)` — atomic `→sending`; resolve audience via `resolve-tokens` (respecting prefs); `send-push-batch`; **write a `notifications` row per recipient** (so it appears in the app's in-app feed); record `sent_count`/`failed_count`/`skipped_optout_count`; `→sent`. Accept admin session OR service-role bearer (so the scheduler can invoke it — Aura pattern).
   - `list()` / `history(id)` — campaigns + per-recipient outcomes.
7. `jobs/push-schedule.ts` (Inngest cron every minute) — pick `status='scheduled' AND scheduled_at<=now()` → invoke `sendCampaign`.
8. **UI** `app/(dashboard)/push/` — compose dialog (title/body char counts, category select, deep-link builder, audience = All / segment / single user via the Users search, "Send now" vs "Schedule"), campaigns table with status, history/detail with delivered/failed/opt-out-skipped counts. Adapt Aura's `push-notifications/*` components.

**Build order within Phase 5 (each independently testable):** send-to-one (test on Igor's own token) → send-to-segment → schedule → receipts/prune.

**Exit:** Igor composes a push, sends it to his own device, it arrives, a `notifications` row shows in the app feed, the campaign logs `sent_count=1`; then a segment send respects `notification_prefs` (an opted-out user is skipped and counted); a scheduled send fires via cron; dead tokens get pruned.

---

## Phase 6 — Sentry surface (crash triage) *(net-new — nothing to copy from Aura)*

**Goal:** read grandma's Sentry issues in the console so crashes are triageable without leaving the command center.

1. `lib/sentry-api.ts` — Sentry REST API client (or the Sentry MCP) against org **`grandmaapp`**, project **`react-native`**. Auth via `SENTRY_AUTH_TOKEN` (read-only). List issues (unresolved, by frequency/last-seen), issue detail, event counts.
2. **`server/routers/sentry.ts`** (`adminProcedure`) — `issues({ query, range })`, `issue(id)`.
3. **UI** `app/(dashboard)/sentry/` — issues table (title, count, users affected, last seen, level) + detail with a deep-link out to Sentry. Optionally a KPI tile on the Metrics overview: "crashes last 24h."

> Aura confirms there's **no existing admin-reads-Sentry code anywhere** to copy; this is built from the Sentry API directly. Keep it read-only.

**Exit:** the console lists grandma's live unresolved Sentry issues with counts; clicking through deep-links to Sentry.

---

## Phase 7+ — Deferred (post-v1)

- **App control:** feature flags / remote config / daily-message curation. Requires **app-side wiring** (a config/flags table the Expo app reads) that doesn't exist today — a joint change across both repos.
- **Per-category push prefs UX** beyond v1 mapping; quiet hours.
- **Data exports / DSAR tooling** in the console (grandma already has app-side DSAR; a console view is a natural add).
- **Monorepo absorption** — if code-sharing between app and center grows, fold this repo in as `apps/command-center` (cheap because `db/` is already isolated).

---

## Build sequencing (dependency order)

```
P1 Scaffold+DB ──► P2 Auth gate ──► P3 Users ──► P4 Metrics
                                      │            │
                                      └──► P5 Push ─┘ (P5 uses P3's user search for audience)
                                                   └──► P6 Sentry (independent; any time after P2)
```
P1→P2 are strictly sequential (foundation). P3, P4, P6 can proceed in parallel after P2. P5 depends on P3 (audience picker reuses the Users search) but its send-infra (5a) can be built in parallel with P3/P4.

---

## Security checklist (must hold at every phase)
- [ ] Clerk gate + email allowlist is the ONLY door; service-role never exposed to the client bundle.
- [ ] `piiProcedure`/`sendProcedure` step-up for PII + sends; `viewer` can't reach them.
- [ ] Every PII detail view and every send is written to `admin_audit_log`.
- [ ] Push respects `notification_prefs` + `privacy_settings` before sending; opt-outs counted, not sent.
- [ ] `/api/inngest` + `/api/webhooks` excluded from Clerk, self-verified (signing key / secret).
- [ ] No grandma health/child PII logged to Sentry or console logs.

## Open questions to resolve during build
1. **Campaign→pref mapping:** grandma's 7 toggles are semantic (daily_reminder, insights, appointments, cycle_predictions, milestones, care_circle) with no generic "marketing/broadcast" toggle. Decide the v1 mapping: add a broadcast/marketing toggle to `notification_prefs`, or map each campaign to one of the existing 7. (Affects a grandma-app migration.)
2. **`push_tokens` migration:** add `is_active` + `last_seen_at` (needed for Aura's prune model) — a grandma-app migration, coordinate with the app.
3. **Metrics driver:** confirm the hybrid (live-RPC + `metrics_daily` for retention/DAU) vs all-live; revisit if the user base grows.
4. **Clerk org:** new Clerk instance for grandma, or a new org in the existing Mother Clerk? (Isolation vs setup cost.)
