-- supabase/migrations/20260512130000_kids_vaccine_schedule.sql
-- Scheduled vaccine appointments per child + caregiver. Previously stored in
-- AsyncStorage, so:
--   - data was lost on uninstall / device wipe
--   - caregivers in the care circle couldn't see each other's scheduling
--   - we couldn't drive push reminders from the server
-- This table persists the schedule_key → date map; one row per
-- (child_id, schedule_key) so updates are clean upserts.

CREATE TABLE IF NOT EXISTS kids_vaccine_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  -- schedule_key is the namespaced vaccine identifier from the client
  -- (e.g. "US:Hepatitis B-0"). See KidsHome.tsx getNextDueVaccines.
  schedule_key TEXT NOT NULL,
  -- The scheduled appointment date (local calendar date as YYYY-MM-DD).
  scheduled_date DATE NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (child_id, schedule_key)
);

ALTER TABLE kids_vaccine_schedule ENABLE ROW LEVEL SECURITY;

-- Members of a child's care_circle (via child_caregivers) can read and write
-- scheduled appointments. Matches the pattern used by child_logs / children.
DROP POLICY IF EXISTS "caregivers select kids_vaccine_schedule" ON kids_vaccine_schedule;
CREATE POLICY "caregivers select kids_vaccine_schedule"
  ON kids_vaccine_schedule FOR SELECT
  USING (
    child_id IN (
      SELECT child_id FROM child_caregivers
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "caregivers insert kids_vaccine_schedule" ON kids_vaccine_schedule;
CREATE POLICY "caregivers insert kids_vaccine_schedule"
  ON kids_vaccine_schedule FOR INSERT
  WITH CHECK (
    child_id IN (
      SELECT child_id FROM child_caregivers
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "caregivers update kids_vaccine_schedule" ON kids_vaccine_schedule;
CREATE POLICY "caregivers update kids_vaccine_schedule"
  ON kids_vaccine_schedule FOR UPDATE
  USING (
    child_id IN (
      SELECT child_id FROM child_caregivers
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  )
  WITH CHECK (
    child_id IN (
      SELECT child_id FROM child_caregivers
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "caregivers delete kids_vaccine_schedule" ON kids_vaccine_schedule;
CREATE POLICY "caregivers delete kids_vaccine_schedule"
  ON kids_vaccine_schedule FOR DELETE
  USING (
    child_id IN (
      SELECT child_id FROM child_caregivers
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kids_vaccine_schedule_child
  ON kids_vaccine_schedule (child_id);
CREATE INDEX IF NOT EXISTS idx_kids_vaccine_schedule_date
  ON kids_vaccine_schedule (scheduled_date)
  WHERE scheduled_date >= CURRENT_DATE;

-- updated_at trigger
CREATE OR REPLACE FUNCTION touch_kids_vaccine_schedule_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS kids_vaccine_schedule_touch_updated_at ON kids_vaccine_schedule;
CREATE TRIGGER kids_vaccine_schedule_touch_updated_at
  BEFORE UPDATE ON kids_vaccine_schedule
  FOR EACH ROW EXECUTE FUNCTION touch_kids_vaccine_schedule_updated_at();
