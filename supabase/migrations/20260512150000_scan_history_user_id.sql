-- =============================================================================
-- scan_history: add user_id column to support pregnancy / pre-pregnancy users
-- who have no child row. Free-scan paywall counts scans per-user; without this
-- column those users persisted nothing and got unlimited free scans.
-- =============================================================================

ALTER TABLE scan_history
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill existing rows from the child's parent_id.
UPDATE scan_history sh
SET user_id = c.parent_id
FROM children c
WHERE sh.user_id IS NULL
  AND sh.child_id = c.id;

CREATE INDEX IF NOT EXISTS idx_scan_history_user_id ON scan_history(user_id);

-- Update RLS: rows are now reachable via user_id OR via care-circle on child_id.
DROP POLICY IF EXISTS "own or caregiver scans" ON scan_history;
CREATE POLICY scan_history_select ON scan_history
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
    OR child_id IN (
      SELECT child_id FROM child_caregivers
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "insert scans" ON scan_history;
CREATE POLICY scan_history_insert ON scan_history
  FOR INSERT
  WITH CHECK (
    -- Either the caller is the user_id on the row, or they're inserting
    -- against one of their own children.
    user_id = auth.uid()
    OR (
      child_id IS NOT NULL
      AND child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
    )
  );

NOTIFY pgrst, 'reload schema';
