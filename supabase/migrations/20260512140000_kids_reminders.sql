-- supabase/migrations/20260512140000_kids_reminders.sql
-- Reminders for kids-mode caregivers ("buy diapers", "vaccine appt Fri", etc).
-- Previously lived in AsyncStorage; moving to Supabase so:
--   - data survives uninstall
--   - care_circle members see each other's reminders
--   - server-side push reminders become possible
--   - drift between local and notifications.data stops

CREATE TABLE IF NOT EXISTS kids_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Who created the reminder. owning user_id is required for the simple-RLS
  -- path (account-scoped) plus an optional child_id for caregivers + scoping.
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  text TEXT NOT NULL CHECK (length(text) <= 500),
  done BOOLEAN NOT NULL DEFAULT FALSE,
  flagged BOOLEAN NOT NULL DEFAULT FALSE,
  due_date DATE,
  due_time TEXT,          -- HH:MM (24h) — optional
  archived_at TIMESTAMPTZ, -- set when done flips true
  -- Loose link to the matching `notifications` row (kept as text not FK so
  -- a deleted notification doesn't cascade-delete the reminder).
  notif_id UUID,
  sort_order REAL NOT NULL DEFAULT 0, -- drag-reorder support
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE kids_reminders ENABLE ROW LEVEL SECURITY;

-- A user can read and write their own reminders, plus any reminder linked
-- to a child they have caregiver access to (so a nanny sees the parent's
-- reminder list for the kid they care for).
DROP POLICY IF EXISTS "kids_reminders select" ON kids_reminders;
CREATE POLICY "kids_reminders select"
  ON kids_reminders FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      child_id IS NOT NULL
      AND child_id IN (
        SELECT child_id FROM child_caregivers
        WHERE user_id = auth.uid() AND status = 'accepted'
      )
    )
  );

DROP POLICY IF EXISTS "kids_reminders insert" ON kids_reminders;
CREATE POLICY "kids_reminders insert"
  ON kids_reminders FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      child_id IS NULL
      OR child_id IN (
        SELECT child_id FROM child_caregivers
        WHERE user_id = auth.uid() AND status = 'accepted'
      )
    )
  );

DROP POLICY IF EXISTS "kids_reminders update" ON kids_reminders;
CREATE POLICY "kids_reminders update"
  ON kids_reminders FOR UPDATE
  USING (
    auth.uid() = user_id
    OR (
      child_id IS NOT NULL
      AND child_id IN (
        SELECT child_id FROM child_caregivers
        WHERE user_id = auth.uid() AND status = 'accepted'
      )
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR (
      child_id IS NOT NULL
      AND child_id IN (
        SELECT child_id FROM child_caregivers
        WHERE user_id = auth.uid() AND status = 'accepted'
      )
    )
  );

DROP POLICY IF EXISTS "kids_reminders delete" ON kids_reminders;
CREATE POLICY "kids_reminders delete"
  ON kids_reminders FOR DELETE
  USING (
    auth.uid() = user_id
    OR (
      child_id IS NOT NULL
      AND child_id IN (
        SELECT child_id FROM child_caregivers
        WHERE user_id = auth.uid() AND status = 'accepted'
      )
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kids_reminders_user_done
  ON kids_reminders (user_id, done, sort_order);
CREATE INDEX IF NOT EXISTS idx_kids_reminders_child
  ON kids_reminders (child_id, done, sort_order)
  WHERE child_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kids_reminders_due
  ON kids_reminders (due_date)
  WHERE done = FALSE AND due_date IS NOT NULL;

-- updated_at trigger
CREATE OR REPLACE FUNCTION touch_kids_reminders_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS kids_reminders_touch_updated_at ON kids_reminders;
CREATE TRIGGER kids_reminders_touch_updated_at
  BEFORE UPDATE ON kids_reminders
  FOR EACH ROW EXECUTE FUNCTION touch_kids_reminders_updated_at();
