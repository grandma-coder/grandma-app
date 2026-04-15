-- supabase/migrations/20260415000000_pregnancy_profile.sql

-- Add birth preferences as JSONB to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS birth_preferences JSONB DEFAULT '{}';

-- Add baby position to children table (for pre-birth tracking)
ALTER TABLE children
  ADD COLUMN IF NOT EXISTS baby_position TEXT DEFAULT 'unknown'
  CHECK (baby_position IN ('cephalic','breech','transverse','unknown'));

-- Ensure pregnancy_logs table exists (idempotent — creates it if the earlier migration didn't apply cleanly)
CREATE TABLE IF NOT EXISTS pregnancy_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  log_type TEXT NOT NULL CHECK (log_type IN ('symptom', 'weight', 'kick_count', 'contraction', 'mood', 'appointment', 'note')),
  value TEXT,
  severity TEXT CHECK (severity IN ('mild', 'moderate', 'strong')),
  duration_seconds INT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backfill updated_at for any rows in existing tables that predate this migration
ALTER TABLE pregnancy_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Enable RLS if not already enabled
ALTER TABLE pregnancy_logs ENABLE ROW LEVEL SECURITY;

-- Policy: users manage their own pregnancy logs
-- DROP + CREATE is idempotent and ensures WITH CHECK is always present (fixes weak USING-only policies)
DROP POLICY IF EXISTS "Users can manage own pregnancy_logs" ON pregnancy_logs;
CREATE POLICY "Users can manage own pregnancy_logs"
  ON pregnancy_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Composite index for all pregnancy log queries (user + type + date)
CREATE INDEX IF NOT EXISTS idx_pregnancy_logs_user_type_date
  ON pregnancy_logs (user_id, log_type, log_date DESC);

-- Index for date-only queries on pregnancy_logs
CREATE INDEX IF NOT EXISTS idx_pregnancy_logs_user_date
  ON pregnancy_logs (user_id, log_date DESC);
