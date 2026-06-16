-- P2-31: Remove the insecure child_caregivers INSERT policy.
--
-- 20260405040000_fix_caregiver_rls.sql created
--   "Parents can create invites"  WITH CHECK (invited_by = auth.uid())
-- which checks only that the caller is the inviter — NOT that they own the
-- child. 20260421010000_subscription_tiers.sql later added the correct
--   "Parents can create invites within tier limit"
--     WITH CHECK (invited_by = auth.uid()
--                 AND child_id IN (SELECT id FROM children WHERE parent_id = auth.uid()))
-- but only dropped the ORIGINAL policy name ("Parents can create invites for
-- their children"), leaving the insecure "Parents can create invites" policy
-- live. Postgres OR's permissive INSERT policies, so the insecure one still
-- allows a user to insert a caregiver row for ANY child_id (granting themselves
-- access to a child they don't own) as long as invited_by = auth.uid().
--
-- Drop it so only the child-ownership + tier-limited policy governs INSERT.

DROP POLICY IF EXISTS "Parents can create invites" ON child_caregivers;

-- Belt-and-suspenders: ensure the secure policy exists (it is created by
-- 20260421010000; recreate idempotently in case this migration runs against a
-- DB where that one was rolled back or never applied).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'child_caregivers'
      AND policyname = 'Parents can create invites within tier limit'
  ) THEN
    CREATE POLICY "Parents can create invites within tier limit"
      ON child_caregivers FOR INSERT
      WITH CHECK (
        invited_by = auth.uid()
        AND child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
      );
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
