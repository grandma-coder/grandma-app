-- ════════════════════════════════════════════════════════════════════════════
-- P2 RLS / DB hardening — Pre-Friends-Test (P2-38, P2-40, P2-42, P2-43, P2-44/P3-118)
-- Source: [[Pre-Friends-Test — Fix Tracker]]. Pure SQL, idempotent.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── P2-38: pregnancy_routines.user_id NOT NULL ─────────────────────────────
-- Clean any orphaned NULL rows first so the constraint can apply, then enforce.
DELETE FROM pregnancy_routines WHERE user_id IS NULL;
ALTER TABLE pregnancy_routines ALTER COLUMN user_id SET NOT NULL;

-- ─── P2-40: child_logs INSERT can't forge user_id / logged_by ───────────────
-- The caregiver INSERT policy authorizes WHICH child you may log against, but
-- not the owner columns. A caregiver could set user_id to an arbitrary value.
-- Force them server-side: user_id = the child's parent, logged_by = the caller.
CREATE OR REPLACE FUNCTION enforce_child_log_owner_cols()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent uuid;
BEGIN
  SELECT parent_id INTO v_parent FROM children WHERE id = NEW.child_id;
  -- user_id always reflects the owning parent; logged_by always the caller.
  NEW.user_id := COALESCE(v_parent, NEW.user_id);
  NEW.logged_by := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS child_logs_enforce_owner_cols ON child_logs;
CREATE TRIGGER child_logs_enforce_owner_cols
  BEFORE INSERT ON child_logs
  FOR EACH ROW
  EXECUTE FUNCTION enforce_child_log_owner_cols();

-- ─── P2-42: kids_vaccine_schedule write perms + DELETE restriction ──────────
-- Writes should require the log_activity (or edit_child) permission, and a
-- DELETE should be limited to the row's creator or the child's parent — not any
-- accepted caregiver. Recreate the write policies accordingly.
DROP POLICY IF EXISTS "caregivers insert kids_vaccine_schedule" ON kids_vaccine_schedule;
CREATE POLICY "caregivers insert kids_vaccine_schedule"
  ON kids_vaccine_schedule FOR INSERT
  WITH CHECK (
    child_id IN (
      SELECT child_id FROM child_caregivers
      WHERE user_id = auth.uid()
        AND status = 'accepted'
        AND COALESCE(is_locked, false) = false
        AND COALESCE((permissions->>'_paused')::boolean, false) = false
        AND (
          (permissions->>'log_activity')::boolean = true
          OR (permissions->>'edit_child')::boolean = true
        )
    )
  );

DROP POLICY IF EXISTS "caregivers update kids_vaccine_schedule" ON kids_vaccine_schedule;
CREATE POLICY "caregivers update kids_vaccine_schedule"
  ON kids_vaccine_schedule FOR UPDATE
  USING (
    child_id IN (
      SELECT child_id FROM child_caregivers
      WHERE user_id = auth.uid()
        AND status = 'accepted'
        AND COALESCE(is_locked, false) = false
        AND COALESCE((permissions->>'_paused')::boolean, false) = false
        AND (
          (permissions->>'log_activity')::boolean = true
          OR (permissions->>'edit_child')::boolean = true
        )
    )
  )
  WITH CHECK (
    child_id IN (
      SELECT child_id FROM child_caregivers
      WHERE user_id = auth.uid()
        AND status = 'accepted'
        AND COALESCE(is_locked, false) = false
        AND COALESCE((permissions->>'_paused')::boolean, false) = false
        AND (
          (permissions->>'log_activity')::boolean = true
          OR (permissions->>'edit_child')::boolean = true
        )
    )
  );

-- DELETE: only the creator of the row or the child's parent.
DROP POLICY IF EXISTS "caregivers delete kids_vaccine_schedule" ON kids_vaccine_schedule;
CREATE POLICY "creator or parent delete kids_vaccine_schedule"
  ON kids_vaccine_schedule FOR DELETE
  USING (
    created_by = auth.uid()
    OR child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
  );

-- ─── P2-43: leaderboard_scores must aggregate across all users ──────────────
-- A plain (SECURITY INVOKER) view runs its per-user log aggregations under the
-- querying user's RLS, so child_logs/pregnancy_logs/cycle_logs counts come back
-- as 0 for everyone but the caller. Run the view as its owner (definer) so the
-- aggregations see all rows — same fix rls_hardening used for profiles_public.
-- The view only exposes name/photo + counts, which is the point of a public
-- leaderboard.
ALTER VIEW leaderboard_scores SET (security_invoker = false);

-- ─── P2-44 / P3-118: increment_garage_share_count requires auth ─────────────
-- Cheap defense-in-depth on the SECURITY DEFINER vanity counter: reject anon.
CREATE OR REPLACE FUNCTION public.increment_garage_share_count(post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'must be authenticated';
  END IF;
  UPDATE public.garage_posts
  SET share_count = COALESCE(share_count, 0) + 1
  WHERE id = post_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_garage_share_count(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
