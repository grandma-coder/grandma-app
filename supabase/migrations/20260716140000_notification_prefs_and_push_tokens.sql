-- Phase 0 / B3 — notification foundation (command-center-ready).
--
-- Two pieces so notifications become real AND a future internal command center
-- can drive them:
--   1. profiles.notification_prefs — the 7 toggles move from dead AsyncStorage
--      (read nowhere) to a queryable JSONB column. Both on-device local
--      scheduling AND server-side sending read these, so prefs actually gate
--      delivery. Defaults mirror the app's NOTIFICATION_SETTINGS.
--   2. push_tokens — Expo push tokens per device, so the command center (or the
--      notification engine) can send remote push. Multi-device: one row per
--      (user, token).
--
-- Idempotent + guarded per house style.

-- ─── 1. profiles.notification_prefs ────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notification_prefs JSONB NOT NULL DEFAULT '{
    "daily_reminder": true,
    "daily_reminder_time": "20:00",
    "insights": true,
    "weekly_summary": false,
    "appointments": true,
    "cycle_predictions": true,
    "milestones": false,
    "care_circle": true
  }'::jsonb;

-- ─── 2. push_tokens ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS push_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token       text NOT NULL,
  platform    text CHECK (platform IN ('ios', 'android', 'web')),
  device_name text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, token)
);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Owner can manage their own tokens. (The command center / engine uses the
-- service-role key and bypasses RLS to read all tokens for sending.)
DO $$ BEGIN
  CREATE POLICY "own push tokens"
    ON push_tokens FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens (user_id);

NOTIFY pgrst, 'reload schema';
