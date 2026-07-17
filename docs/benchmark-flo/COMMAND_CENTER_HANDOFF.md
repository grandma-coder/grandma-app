# Grandma Command Center — Vision Handoff

**For:** a fresh session dedicated to building the internal command center.
**Date:** 2026-07-16
**Author:** carried over from the Flo-benchmark / Phase-0 session.

> This is a **vision + architecture handoff**, not a spec. It exists so the next session starts with full context instead of a blank page. Read it, then decide scope with Igor.

---

## 1. What this is (and isn't)

**Is:** an internal, admin-only web dashboard where Igor (and the team) **see users, metrics, and control notifications** for grandma.app. A back-office / ops console.

**Is NOT:** an app feature. The app users never see this. It reads/writes the same Supabase project the app uses, but from a privileged, server-side context.

**Origin:** came up during Phase 0 / B3. Igor wants "a new command center from scratch to pull everything there — users info, metrics, push notifications, etc." (The `notifications` command-center idea in the app was a naming collision — this is a separate web app.)

---

## 2. The huge shortcut: you already have the blueprint

Igor runs **`~/dev/mother-internal-dashboard`** (`mother-management-reports`) — a production internal dashboard. **Do not invent a stack. Clone this one's patterns.** Its stack:

| Layer | Tech | Why it fits the command center |
|---|---|---|
| Framework | **Next.js 15** (App Router, React 19) | Server components read Postgres directly with service-role privilege |
| Auth | **Clerk** (`@clerk/nextjs`) | Gate the whole app to internal team emails — do NOT reuse app users' Supabase auth |
| API | **tRPC v11** (`server/routers`, `server/trpc.ts`) | Typed server procedures; same pattern for grandma queries |
| Data | **Drizzle ORM** (`drizzle-orm`, `drizzle.config.ts`, `DATABASE_URL`) | Point `DATABASE_URL` at grandma's Postgres; introspect the schema |
| Charts | **Tremor** (`@tremor/react`) + **Recharts** | Metrics dashboards out of the box (KPI cards, area/bar/line) |
| Jobs | **Inngest** (`jobs/`, `inngest:dev`) | Scheduled aggregations + the push-send pipeline |
| PDF | `@react-pdf/renderer` | Reuse for exports/reports if needed |
| Styling | Tailwind v4 + CVA + lucide | Same design primitives |

**Structure to mirror** (from the mother dashboard):
- `app/(dashboard)/*` — the authed console routes
- `server/routers/*` + `server/trpc.ts` + `server/context.ts` — typed data layer
- `services/data-hub` — cross-source data aggregation service pattern
- `jobs/*` (e.g. `ai-hub-aggregate.ts`, `*-daily-digest.ts`) — scheduled metric rollups; **the push-send job mirrors these**
- `lib/db/schema/*` — Drizzle schema (introspect grandma's tables here)

**Decision for the next session:** new repo, OR a new section inside `mother-internal-dashboard`? Leaning **new repo** (`grandma-command-center`) so grandma's PII/health data isn't co-mingled with Mother-internal ops — but reuse the mother dashboard as a scaffold/template. Confirm with Igor.

---

## 3. What it connects to (already built — the foundation is READY)

Phase 0 deliberately laid the command center's data foundation. These exist in grandma's Supabase **right now**:

| Table / column | What the center does with it |
|---|---|
| `profiles` (id, name, dob, journey_mode, due_date, language, created_at…) | **Users** view — who signed up, what mode, demographics |
| `profiles.notification_prefs` (JSONB) | **Respect prefs before sending** — never push to someone who opted out |
| `profiles.privacy_settings` (JSONB) | Honor analytics/marketing consent in metrics + sends |
| **`push_tokens`** (user_id, token, platform, device_name) | **Send push** — the Expo push tokens per device. THE key table for the "control notifications" goal |
| `behaviors` | Segment users by journey (pre-preg / pregnancy / kids) |
| `children`, `child_logs`, `cycle_logs`, `pregnancy_logs` | **Engagement metrics** — DAU, logs/user, retention by mode |
| `notifications` (existing in-app feed table) | Log every send here too, so the app's feed + the center stay in sync |
| `channel_posts`, `channel_ratings` | Community activity metrics |
| `account_deletion_requests` | Compliance / churn view |

**The push loop already has both ends:** the app registers tokens (`lib/pushNotifications.ts` → `push_tokens`) and honors prefs (`profiles.notification_prefs`). The command center just needs the **send half**.

---

## 4. Core capabilities (v1 scope suggestion)

Build in this order — each is independently valuable:

### 4a. Users
- Searchable/filterable table of `profiles` (by mode, signup date, activity, language)
- Detail view: profile, children count, last-active, logs count, subscription tier
- Segments: "all pregnancy-mode", "inactive 14d+", "TTC", "kids 0–1y"

### 4b. Metrics (Tremor/Recharts)
- **North-star KPIs:** total users, DAU/WAU/MAU, new signups (by day), mode split
- **Engagement:** logs per user, logging-completion rate, retention curves by mode
- **Funnel:** onboarding completion, activation (first log), subscription conversion
- **Community:** posts/day, active channels
- Powered by **Inngest scheduled jobs** that roll up raw tables into a `metrics_daily` table (don't compute heavy aggregates on every page load — mirror `jobs/ai-hub-aggregate.ts`)

### 4c. Push notifications (the headline feature)
- **Compose + send:** title/body/deep-link → pick an audience (all / segment / single user)
- **Respects prefs:** query `push_tokens` JOIN `profiles`, filter by `notification_prefs` before sending
- **Send via Expo Push API** (`https://exp.host/--/api/v2/push/send`) — batch tokens, handle receipts/errors (prune dead tokens)
- **Also write a `notifications` row** per recipient so it appears in the app's in-app feed
- **Scheduled + recurring:** an Inngest job for "send at time X" / campaigns
- **History:** every campaign logged (sent count, delivered, failed, opt-out skips)

### 4d. (Later) Content / config control
- Feature flags, daily-message curation, remote-config for the app — a natural extension once the core exists.

---

## 5. Architecture sketch

```
[grandma Supabase / Postgres]  ← single source of truth (app + center share it)
        ▲   ▲
        │   │ Drizzle (DATABASE_URL, service-role — bypasses RLS by design)
        │   │
   [App]│   │[Command Center — Next.js 15]
  registers │   ├─ app/(dashboard)  — Clerk-gated, team-only
  tokens,   │   ├─ server/routers   — tRPC: users, metrics, push
  honors    │   ├─ services         — data-hub-style aggregation
  prefs     │   ├─ jobs (Inngest)   — metric rollups + push send/schedule
            │   └─ Expo Push API ───┼──push──▶ [user devices]
            └───────────────────────┘
```

**Security posture (non-negotiable — this holds real health + child data):**
- Center uses a **service-role / direct Postgres connection** → it bypasses RLS. That's the point (admins see across users), but it means **the Clerk gate + team-email allowlist IS the security boundary.** Lock it down hard.
- No app user can reach it (separate auth, separate deploy, ideally separate repo).
- Audit every send + every PII view.
- Treat exports of user data as sensitive (you built DSAR in the app for a reason).

---

## 6. Build order for the next session

1. **Scaffold** — clone the mother-dashboard patterns into `grandma-command-center` (Next 15 + Clerk + tRPC + Drizzle + Tremor). Point `DATABASE_URL` at grandma's Postgres; `drizzle-kit introspect` the schema.
2. **Auth gate** — Clerk + team-email allowlist. Nothing else until this is solid.
3. **Users view** — read-only table + detail (fastest win, proves the data connection).
4. **Metrics v1** — a few KPI cards + signups/DAU charts; add the Inngest rollup job.
5. **Push v1** — compose → send-to-one (test on Igor's own token) → send-to-segment. Respect prefs. Log to `notifications` + a campaigns table.
6. **Push v2** — scheduling, recurring campaigns, receipt handling / dead-token pruning.

---

## 7. Open questions to settle with Igor first

1. **Repo:** new `grandma-command-center` (recommended) vs. a section in `mother-internal-dashboard`?
2. **Who gets access** — just Igor, or the team? (Clerk allowlist.)
3. **Push send infra:** Expo Push API directly from an Inngest job (simplest, recommended) vs. routing through a Supabase edge function (keeps all server logic in one place)?
4. **Metrics depth for v1:** just headline KPIs, or full funnels/retention from day one?
5. **Does it also need to CONTROL the app** (feature flags, remote config, daily-message curation) — or is v1 purely observe + notify?

---

## 8. Pointers back into grandma-app

- Push foundation: `lib/pushNotifications.ts` (token registration, prefs shape `NotificationPrefs`, `DEFAULT_NOTIFICATION_PREFS`)
- Prefs/token schema: `supabase/migrations/20260716140000_notification_prefs_and_push_tokens.sql`
- In-app notification feed + engine: `app/notifications.tsx`, `lib/notificationEngine.ts`, `notifications` table
- The full product plan this sits alongside: `docs/benchmark-flo/SUPERSET_GAP_AUDIT.md`
- Expo push token format: `ExponentPushToken[...]` — send via `https://exp.host/--/api/v2/push/send`

---

**Bottom line for the next session:** you're not starting from zero. The app side of the push loop is done, the data foundation exists in Postgres, and Igor already runs a battle-tested internal-dashboard stack to clone. Scaffold from `mother-internal-dashboard`, gate it with Clerk, and the first real milestone (users table + send-a-push-to-yourself) is days, not weeks.
