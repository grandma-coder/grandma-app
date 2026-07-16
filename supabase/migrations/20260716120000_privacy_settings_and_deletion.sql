-- Phase 0 (Flo benchmark audit) — privacy + account-deletion foundations.
--
-- Fixes two broken/misleading features:
--   B2  profiles.privacy_settings: the Data & Privacy screen already READS
--       `profiles.privacy_settings` (defensively) but had nowhere to write —
--       updateSetting() was calling `.update({})`. This adds the column so the
--       toggles actually persist. Defaults mirror the client's DEFAULT_SETTINGS
--       (all sharing/AI/analytics ON, marketing OFF — privacy-first opt-out).
--   B1  account_deletion_requests: audit trail for the new `delete-account`
--       edge function. The actual purge runs server-side via
--       auth.admin.deleteUser() (cascades through ON DELETE CASCADE FKs); this
--       table records the request + outcome for support/compliance.
--
-- Idempotent + guarded per house style.

-- ─── B2: profiles.privacy_settings ─────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS privacy_settings JSONB NOT NULL DEFAULT '{
    "share_with_caregivers": true,
    "share_health_data": true,
    "share_photos": true,
    "ai_data_usage": true,
    "analytics": true,
    "marketing": false
  }'::jsonb;

-- ─── B1: account_deletion_requests ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  requested_at  timestamptz DEFAULT now(),
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'completed', 'failed')),
  completed_at  timestamptz,
  error         text
);

ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Owner can read/insert their own deletion requests. (The edge function uses
-- the service-role key and bypasses RLS to mark completed/failed.)
DO $$ BEGIN
  CREATE POLICY "own deletion requests read"
    ON account_deletion_requests FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "own deletion requests insert"
    ON account_deletion_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_user
  ON account_deletion_requests (user_id, requested_at DESC);

NOTIFY pgrst, 'reload schema';
