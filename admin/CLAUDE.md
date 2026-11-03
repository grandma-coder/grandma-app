# grandma-command-center — Claude context

Internal admin console for **grandma.app**. Next.js 16 + Clerk + tRPC v11 + Drizzle (over grandma's Supabase Postgres) + Tremor/Recharts, deployed on Vercel. Four pillars: **Users · Metrics · Push · Sentry**. See `README.md` for the full picture.

> ⚠️ Next 16 has breaking changes vs. older Next — see `AGENTS.md`. Middleware is `proxy.ts` (not `middleware.ts`).

---

## The security model — non-negotiable

Two auth systems, never conflated:
- **Clerk** = team identity + role. `CLERK_ALLOWED_EMAILS` allowlist + Clerk gate **is the security boundary.**
- **Service-role Postgres** (`db/index.ts`) bypasses RLS **by design** so admins see across all users. It is server-only — **never** import `db` or any `lib/*` with `import "server-only"` into a client component.

Rules that must hold:
- Roles: Clerk `publicMetadata.role` ∈ `{admin, viewer}` (default viewer), read **live** from Clerk each request (see `server/context.ts`) so revocations take effect immediately.
- tRPC gates (`server/trpc.ts`): `publicProcedure` · `protectedProcedure` (allowlisted viewer+) · `adminProcedure` · `piiProcedure` (PII reads) · `sendProcedure` (push sends). PII reads + sends are admin-only.
- **Every PII detail view and every push send calls `writeAudit(...)`** → `admin_audit_log`.
- **Push respects consent before sending** (`lib/expo/resolve-tokens.ts`): content categories → matching `notification_prefs` toggle; `broadcast` → `privacy_settings.marketing`. Opt-outs are counted, never sent.

---

## Conventions

- **DB driver:** `postgres` (postgres-js) via Drizzle. `db.execute<T>(sql\`…\`)` returns a **RowList — iterate with `Array.from(res)`**, NOT `res.rows` (that's the pg/neon shape). `T` needs an index signature (`{ …; [k: string]: unknown }`).
- **`DATABASE_URL` must be the Supabase transaction pooler** (`…pooler.supabase.com:6543`), not the direct `db.*:5432` (fails on Vercel serverless / IPv6).
- **`profiles.id` IS the auth user UUID** (grandma convention — no `user_id` on profiles). Email lives on `profiles.email`. `children.parent_id`, `channel_posts.author_id` (not `user_id`).
- **Enum columns** (`subscription_tier`) need `::text` casts in raw SQL.
- **Migrations** live in `migrations/` (center-owned tables) and are applied by running the SQL against `DATABASE_URL`. Center tables get RLS enabled + no policies (service-role only).
- **Grandma-app coordination:** the only change to the grandma-app repo is additive `push_tokens` columns — don't touch grandma-app otherwise.
- **Design tokens** in `app/globals.css` (mother-dashboard "Central" skin, navy `#14213D`). Use utilities `bg-card`/`text-fg-*`/`border-border-*`/`text-accent-*`/`.pill`/`.display` — don't hardcode hex.
- **Tests:** Vitest, scoped to `{app,lib,server,components,jobs,db}/**` (excludes `.claude/`). `server-only` is stubbed via `test/stubs/`. Keep pure logic (transforms, consent, terminal-codes) unit-tested.
- Verify DB-touching changes against the live DB with a throwaway script before committing (the pattern used throughout the build).

## Adding a pillar

`server/routers/<name>.ts` → register in `server/routers/index.ts` → `app/(app)/<name>/page.tsx` (+ client component) → add to `PILLARS` and `READY` in `components/CommandCenterSidebar.tsx`.

## Commands

`pnpm dev` · `pnpm test` · `pnpm typecheck` · `pnpm build`. Push to `main` → Vercel auto-deploys. Git user for this repo is `grandma-coder` (SSH alias `github-grandma`); `gh` must be switched to the `grandma-coder` account for repo ops.

## Build pipeline

`/gcc-orchestrate` runs implement→verify→review→pr through the generated `.claude/skills/gcc-*` family (config: `.claude/skills/orchestrate.config.yaml`).
