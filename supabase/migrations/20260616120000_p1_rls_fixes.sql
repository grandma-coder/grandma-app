-- ════════════════════════════════════════════════════════════════════════════
-- P1 RLS Fixes — Pre-Friends-Test (tracker rows P1-15, P1-16, P1-17, P1-18)
-- Source: [[Pre-Friends-Test — Fix Tracker]]. Builds on 20260615120000 (P0).
--
-- P1-15  children has no DELETE policy → "remove child" silently fails (RLS
--        denies the delete) and the child reappears on refetch. Add a parent
--        DELETE policy.
--
-- P1-16  Caregivers can't SELECT child_logs in the migration model — the only
--        SELECT path is the owner FOR ALL policy, so a caregiver's activity feed
--        / analytics come back empty. Add a caregiver SELECT policy, reusing the
--        accepted + non-locked + non-paused predicate established in P0-1.
--
-- P1-17  Caregiver INSERT into child_logs ignores the log_activity permission —
--        a view-only caregiver can still write logs. Add the log_activity gate
--        to the WITH CHECK (matches the chat policy's permission gate). Preserves
--        the is_locked + _paused predicates added in P0-1.
--
-- P1-18  profiles_public view is granted to anon → every user's name/photo is
--        enumerable unauthenticated. Revoke anon; keep authenticated.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── P1-15: children DELETE ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "parents can delete children" ON children;
CREATE POLICY "parents can delete children" ON children
  FOR DELETE
  USING (parent_id = auth.uid());

-- ─── P1-16: caregiver SELECT on child_logs ──────────────────────────────────
-- Owner access stays via "Owner can manage child_logs" (FOR ALL). This adds a
-- read path for accepted, non-locked, non-paused caregivers.
DROP POLICY IF EXISTS "Caregiver select child_logs" ON child_logs;
CREATE POLICY "Caregiver select child_logs" ON child_logs
  FOR SELECT
  USING (
    child_id IN (
      SELECT child_id FROM child_caregivers
      WHERE user_id = auth.uid()
        AND status = 'accepted'
        AND is_locked = false
        AND COALESCE((permissions->>'_paused')::boolean, false) = false
    )
  );

-- ─── P1-17: log_activity gate on child_logs INSERT ──────────────────────────
-- Recreate the caregiver INSERT policy adding the log_activity permission gate.
-- Keeps the is_locked + _paused predicates from P0-1 (20260615120000).
DROP POLICY IF EXISTS "Insert child_logs" ON child_logs;
CREATE POLICY "Insert child_logs" ON child_logs
  FOR INSERT
  WITH CHECK (
    child_id IN (
      SELECT child_id FROM child_caregivers
      WHERE user_id = auth.uid()
        AND status = 'accepted'
        AND is_locked = false
        AND (permissions->>'log_activity')::boolean = true
        AND COALESCE((permissions->>'_paused')::boolean, false) = false
    )
  );

-- ─── P1-18: profiles_public not enumerable by anon ──────────────────────────
REVOKE SELECT ON profiles_public FROM anon;
-- (authenticated keeps its grant from 20260512120000_rls_hardening; re-assert
--  idempotently in case this runs on an environment that lacks it.)
GRANT SELECT ON profiles_public TO authenticated;

NOTIFY pgrst, 'reload schema';
