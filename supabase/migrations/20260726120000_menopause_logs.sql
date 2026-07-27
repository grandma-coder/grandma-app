-- Menopause behavior (E1) — symptom/event logs, profile stage columns, and
-- widen the behaviors.type CHECK to admit 'menopause' (surfaced by U1 review:
-- U6 onboarding writes behaviors.type='menopause', which the old CHECK rejected).

CREATE TABLE IF NOT EXISTS menopause_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date       date NOT NULL,                 -- local date (toDateStr), not UTC
  type       text NOT NULL,                 -- symptom id / 'period' / 'note'
  value      text,                          -- free/enum text (e.g. flow level)
  severity   smallint,                      -- 1..5 for symptoms, null for events
  notes      text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE menopause_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "menopause_logs owner" ON menopause_logs;
CREATE POLICY "menopause_logs owner" ON menopause_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Composite index serves the analytics hot path (WHERE user_id = ? AND date
-- BETWEEN ? AND ?), mirroring cycle_logs/pregnancy_logs; created_at for recency.
CREATE INDEX IF NOT EXISTS idx_menopause_logs_user_date  ON menopause_logs (user_id, date);
CREATE INDEX IF NOT EXISTS idx_menopause_logs_created_at ON menopause_logs (created_at);

-- Keep updated_at fresh on edits, reusing the shared trigger fn
-- (20260617140000_log_updated_at.sql) — matches cycle_logs/pregnancy_logs.
DROP TRIGGER IF EXISTS set_menopause_logs_updated_at ON menopause_logs;
CREATE TRIGGER set_menopause_logs_updated_at
  BEFORE UPDATE ON menopause_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Stage machine source of truth (single location — profiles).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS menopause_stage  text;   -- 'peri' | 'meno' | 'post'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_period_date date;

-- Admit the menopause behavior into the behaviors CHECK. Stored 1:1 as
-- 'menopause' (unlike pre-pregnancy, which stores as 'cycle'). The original
-- constraint is an inline unnamed column CHECK → Postgres auto-names it
-- behaviors_type_check; drop-if-exists keeps this idempotent.
ALTER TABLE behaviors DROP CONSTRAINT IF EXISTS behaviors_type_check;
ALTER TABLE behaviors ADD CONSTRAINT behaviors_type_check
  CHECK (type IN ('cycle', 'pregnancy', 'kids', 'menopause'));

NOTIFY pgrst, 'reload schema';
