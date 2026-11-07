# grandma command center

Internal, admin-only web console for **grandma.app** — see users, view metrics, send push notifications, and triage crashes. Reads/writes grandma's Supabase Postgres from a privileged server context. App users never see it.

**Live:** `admin.thegrandma.app` (also `grandma-command-center.vercel.app`) · **Repo:** `admin/` in `grandma-coder/grandma-app` (private); deploys through the Vercel project `grandma-command-center` (root directory `admin`)

---

## What it does (v1)

| Pillar | Route | Access | What |
|---|---|---|---|
| **Users** | `/users` | viewer+ (PII detail = admin) | Searchable/filterable user table; admin detail view (audit-logged); segments |
| **Metrics** | `/metrics` | viewer+ | KPIs (users/DAU/WAU/MAU/premium), signups+DAU area chart, activation funnel, mode split |
| **Push** | `/push` | send = admin | Compose → send notifications respecting per-category consent; campaign history; dead-token pruning |
| **Sentry** | `/sentry` | admin | Read-only crash triage (issues table, open-in-Sentry links) |

---

## Stack

Next.js 16 (App Router) · Clerk (auth) · tRPC v11 · Drizzle ORM + `postgres` driver · Tremor + Recharts · Tailwind v4 · Vitest · Vercel. Cloned from the patterns in `mother-internal-dashboard`.

## Architecture at a glance

```
Clerk (team identity + admin/viewer role)  ──┐
                                             ├─► the security boundary
CLERK_ALLOWED_EMAILS (team allowlist)      ──┘

tRPC procedures ── gate ──► Drizzle (postgres-js) ──► grandma's Supabase Postgres
  publicProcedure                                      (service-role: bypasses RLS
  protectedProcedure  (allowlisted viewer+)             BY DESIGN — admins see across
  adminProcedure / piiProcedure / sendProcedure         all users; nothing app-facing
                                                         can reach this app)
```

- **Two auth systems, never conflated.** Clerk = *who* (team). Service-role Postgres = *privileged data access*. The Clerk gate + email allowlist **is** the security wall.
- **Every PII view + every push send is written to `admin_audit_log`.**
- **Push respects `notification_prefs` (7 toggles) + `privacy_settings.marketing`** before sending; opt-outs are counted, never sent.

## Layout

```
app/
├── (app)/              authed shell (Central sidebar) — everything below is gated
│   ├── layout.tsx      sidebar + content grid
│   ├── page.tsx        overview + pillar cards
│   ├── users/          table + [id] detail
│   ├── metrics/        KPI/charts/funnel dashboard
│   ├── push/           compose + campaigns
│   └── sentry/         crash triage
├── sign-in/            Clerk sign-in (public)
└── api/{health,trpc,inngest}
components/CommandCenterSidebar.tsx   the Central shell nav
db/                     Drizzle client (service-role, pooler) + schema (grandma read tables + center-owned)
lib/
├── allowlist.ts · audit.ts
├── reporting/transforms.ts          pure metric shapers (+ tests)
├── expo/                            send-push-batch · resolve-tokens (consent) · deactivate-tokens
└── sentry-api.ts                    read-only Sentry client
server/
├── context.ts · trpc.ts             Clerk context + tiered procedures
└── routers/                         users · metrics · push · sentry
migrations/                          center-owned SQL (audit log, metrics RPCs, push campaigns)
.claude/skills/                      gcc-orchestrate/verify/review/pr/... (generated pipeline)
```

## Center-owned DB tables (in grandma's Supabase, center-only)

`admin_audit_log`, `push_campaigns`, `push_recipients` — all RLS-enabled with no policies (service-role only). Metrics use SQL RPC functions (`cc_get_daily_activity`, `cc_get_activation_funnel`, `cc_get_totals`, `cc_activity_days`).

**Reads** grandma's existing tables: `profiles`, `behaviors`, `push_tokens`, `child_logs`, `cycle_logs`, `pregnancy_logs`, `channel_posts`, `children`, `notifications`.

---

## Local development

```bash
pnpm install
cp .env.example .env.local     # then fill in the values (see below)
pnpm dev                       # http://localhost:3000
pnpm test                      # vitest (25 tests)
pnpm typecheck
pnpm build
```

### Environment (`.env.local`)

| Var | Needed for | Notes |
|---|---|---|
| `DATABASE_URL` | everything | grandma's Supabase **Transaction pooler** string (`…pooler.supabase.com:6543`, service-role). NOT the direct `db.*:5432` (fails on serverless). |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | auth | Dedicated grandma Clerk instance (not Mother's). |
| `CLERK_ALLOWED_EMAILS` | auth | Comma-separated team emails. Anyone not listed is rejected even if Clerk authenticates them. |
| `EXPO_ACCESS_TOKEN` | push | Optional for sending, recommended. |
| `SENTRY_AUTH_TOKEN` | sentry | Read scope, org `grandmaapp`. Sentry pillar is dormant without it. |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | future jobs | Not used by v1 (scheduling is a later add). |

### Granting admin

Roles live in Clerk `publicMetadata.role` (`admin` | `viewer`, default viewer). Grant admin:

```bash
clerk auth login
clerk api "/users/<USER_ID>/metadata" -X PATCH -d '{"public_metadata":{"role":"admin"}}'
```

Role is read **live** from Clerk each request, so changes take effect on the next request (no re-login).

---

## Deploy

Vercel auto-deploys on push to `main`. Set the same env vars in **Vercel → Settings → Environment Variables**, then redeploy. Always use the production alias `grandma-command-center.vercel.app` (per-commit preview URLs are snapshots).

## The build pipeline (`/gcc-*`)

`/orchestrator-builder` generated a per-repo skill family: `/gcc-orchestrate` (hub) → `verify` → `review` (correctness/security/reliability/maintainability/testing) → `pr` → `collision`/`publish`/`compound`. Config in `.claude/skills/orchestrate.config.yaml`. Run a task through it with `/gcc-orchestrate`.

---

## Go-live checklist (before wide use)

- [ ] `SENTRY_AUTH_TOKEN` set (local + Vercel) → Sentry pillar lights up
- [ ] APNs credentials configured for grandma-app (`eas credentials`) → real iOS push delivery
- [ ] Commit `supabase/migrations/20260717160000_push_tokens_active_lastseen.sql` in the **grandma-app** repo (already applied to the shared DB; the app repo's migration history should include it)
- [ ] App-side: set `push_tokens.last_seen_at = now()` on token registration (`lib/pushNotifications.ts`)
- [ ] Rotate the grandma DB password; update `DATABASE_URL` in `.env.local` + Vercel
- [ ] Switch Clerk from dev (`pk_test_`) to production keys (avoids the dev-browser handshake on the deployed domain)

## Extending

- **New pillar:** add `server/routers/<name>.ts` → register in `server/routers/index.ts` → add `app/(app)/<name>/page.tsx` → add to `PILLARS` + `READY` in `CommandCenterSidebar.tsx`.
- **New center table:** add SQL to `migrations/`, apply to the DB, add the Drizzle def to `db/schema/center.ts`.
- **Design tokens** live in `app/globals.css` (mirrored from mother-internal-dashboard's Central skin — navy `#14213D` accent). Use the utilities: `bg-card`, `text-fg-*`, `border-border-*`, `text-accent-*`, `.pill`, `.display`.

Roadmap ideas: scheduled/recurring push (Inngest), retention curves (`metrics_daily` rollup), user-segment push targeting from the Users table, feature flags / remote config (needs app-side wiring).
