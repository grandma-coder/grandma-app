-- Onboarding P0 fixes (2026-05-15 audit).
--
-- 1. Ensure `behaviors` table exists (it's defined in supabase/schema.sql
--    but never had its own migration — so this migration is self-contained
--    and safe to run against a fresh DB).
-- 2. Add UNIQUE (user_id, type) to `behaviors` so onboarding can safely
--    upsert instead of insert (today, a re-run creates a duplicate row).
-- 3. Add `due_date` column to `profiles` so pregnancy onboarding can
--    persist the canonical due date in a queryable column (today it
--    only lives in a JSON blob inside `pregnancy_logs`).

-- ─── behaviors table (defensive create) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS behaviors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type        text NOT NULL CHECK (type IN ('cycle', 'pregnancy', 'kids')),
  active      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE behaviors ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can manage own behaviors"
    ON behaviors FOR ALL
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── behaviors uniqueness ──────────────────────────────────────────────────

-- Defensively dedupe any pre-existing duplicates so the unique index can
-- be created. Keeps the most recent (latest created_at) row per
-- (user_id, type), drops the rest.
DELETE FROM behaviors b
USING behaviors b2
WHERE b.user_id = b2.user_id
  AND b.type = b2.type
  AND b.created_at < b2.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS behaviors_user_type_unique
  ON behaviors (user_id, type);

-- ─── profiles.due_date ─────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS due_date DATE;

NOTIFY pgrst, 'reload schema';
