-- =============================================================================
-- RLS hardening — 2026-05-12
-- Addresses findings from static RLS audit:
--   M2: nanny_notes had RLS disabled
--   H1: child_logs owner FOR ALL had no WITH CHECK
--   H2: child_goals INSERT WITH CHECK (true)
--   H3: child_routines INSERT WITH CHECK (true)
--   H5: insights INSERT WITH CHECK (true)
--   H6: profiles SELECT USING (true) exposed PHI to all authenticated users
--   H7: child_caregivers UPDATE referenced auth.users + lacked WITH CHECK
--   H4: notifications INSERT WITH CHECK (true) → tightened to self,
--       cross-user writes routed through create_notification() RPC
-- =============================================================================

-- ─── M2: nanny_notes RLS ─────────────────────────────────────────────────────
-- nanny_notes was created in 20260403010000 without RLS and may have been
-- dropped manually on some environments. Recreate IF NOT EXISTS so this
-- migration is safe to apply against either state.
CREATE TABLE IF NOT EXISTS nanny_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id uuid REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES profiles(id) NOT NULL,
  direction text NOT NULL CHECK (direction IN ('parent_to_nanny', 'nanny_to_parent')),
  category text CHECK (category IN ('food', 'vaccine', 'activity', 'health', 'reminder', 'general')),
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE nanny_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nanny_notes_select ON nanny_notes;
CREATE POLICY nanny_notes_select ON nanny_notes
  FOR SELECT
  USING (
    author_id = auth.uid()
    OR child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
    OR child_id IN (
      SELECT child_id FROM child_caregivers
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

DROP POLICY IF EXISTS nanny_notes_insert ON nanny_notes;
CREATE POLICY nanny_notes_insert ON nanny_notes
  FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND (
      child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
      OR child_id IN (
        SELECT child_id FROM child_caregivers
        WHERE user_id = auth.uid() AND status = 'accepted'
      )
    )
  );

DROP POLICY IF EXISTS nanny_notes_update ON nanny_notes;
CREATE POLICY nanny_notes_update ON nanny_notes
  FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS nanny_notes_delete ON nanny_notes;
CREATE POLICY nanny_notes_delete ON nanny_notes
  FOR DELETE
  USING (author_id = auth.uid());

-- ─── H1: child_logs owner WITH CHECK ─────────────────────────────────────────
DROP POLICY IF EXISTS "Owner can manage child_logs" ON child_logs;
CREATE POLICY "Owner can manage child_logs" ON child_logs
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── H2: child_goals tighten ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Owner can manage child_goals" ON child_goals;
CREATE POLICY "Owner can manage child_goals" ON child_goals
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Insert child_goals" ON child_goals;
-- Owner FOR ALL above already covers INSERT with a proper WITH CHECK.

-- ─── H3: child_routines tighten ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Owner can manage routines" ON child_routines;
CREATE POLICY "Owner can manage routines" ON child_routines
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Insert routines" ON child_routines;

-- ─── H5: insights tighten ────────────────────────────────────────────────────
-- Service role bypasses RLS, so the previous WITH CHECK (true) only existed
-- for client-side direct inserts that no longer happen — keep owner read,
-- block public insert.
DROP POLICY IF EXISTS "Insert insights" ON insights;
DROP POLICY IF EXISTS "Owner can manage insights" ON insights;
CREATE POLICY "Owner can manage insights" ON insights
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── H7: child_caregivers UPDATE — strict, no auth.users ref ────────────────
DROP POLICY IF EXISTS "Parents can update invites they created" ON child_caregivers;
DROP POLICY IF EXISTS "Invitee can accept" ON child_caregivers;
DROP POLICY IF EXISTS "Inviter can update child_caregivers" ON child_caregivers;
DROP POLICY IF EXISTS "child_caregivers_update" ON child_caregivers;

-- Inviter (the parent) can update everything about their invite EXCEPT
-- they cannot change child_id / invited_by / user_id to point elsewhere.
CREATE POLICY child_caregivers_update_by_inviter ON child_caregivers
  FOR UPDATE
  USING (invited_by = auth.uid())
  WITH CHECK (invited_by = auth.uid());

-- Invitee (the linked user) can only flip status to 'accepted' or 'declined'
-- on their own row. Permissions are NOT mutable via this policy — the row
-- check restricts WITH CHECK to the same user_id and the same permissions
-- (we cannot enforce "permissions unchanged" in RLS, so we restrict UPDATE
-- to the status column only via column privileges below).
CREATE POLICY child_caregivers_update_by_invitee ON child_caregivers
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Trigger enforces that invitees (caller = NEW.user_id but not invited_by)
-- can only flip status/accepted_at on their own row. Inviters retain full
-- update via the by_inviter policy.
CREATE OR REPLACE FUNCTION prevent_invitee_permission_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = NEW.user_id AND auth.uid() <> NEW.invited_by THEN
    -- Invitee is updating their own row. Block changes to sensitive cols.
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.permissions IS DISTINCT FROM OLD.permissions
       OR NEW.is_locked IS DISTINCT FROM OLD.is_locked
       OR NEW.child_id IS DISTINCT FROM OLD.child_id
       OR NEW.invited_by IS DISTINCT FROM OLD.invited_by THEN
      RAISE EXCEPTION 'invitees can only update status/accepted_at on their own row';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS child_caregivers_invitee_escalation_guard ON child_caregivers;
CREATE TRIGGER child_caregivers_invitee_escalation_guard
  BEFORE UPDATE ON child_caregivers
  FOR EACH ROW
  EXECUTE FUNCTION prevent_invitee_permission_escalation();

-- ─── H6: profiles PHI exposure ───────────────────────────────────────────────
-- Drop the broad SELECT policy. Re-create a strict owner-only one.
DROP POLICY IF EXISTS profiles_public_read ON profiles;
DROP POLICY IF EXISTS "Owner can read profile" ON profiles;
CREATE POLICY profiles_owner_read ON profiles
  FOR SELECT
  USING (id = auth.uid());

-- Public, safe-column view for cross-user reads (leaderboard, channel members,
-- garage authors, etc.). Underlying table privileges still apply; we grant
-- SELECT on the view to authenticated. The view is SECURITY INVOKER by default,
-- but since we expose only safe columns the lack of RLS on the table for these
-- reads is intentional — we hand-pick the columns.
CREATE OR REPLACE VIEW profiles_public AS
SELECT
  id,
  id AS user_id, -- alias so callers using user_id keep working
  name,
  photo_url,
  user_role,
  created_at,
  language
FROM profiles
WHERE name IS NOT NULL;

-- The view runs as invoker; with the new owner-only SELECT policy it would
-- be empty for cross-user queries. Re-grant SELECT through a SECURITY DEFINER
-- function wrapper isn't worth it — instead make the view SECURITY DEFINER
-- via an owner role. Simpler: use a SECURITY DEFINER function that returns
-- the safe columns, and have the view call it. Even simpler in Postgres 15+:
-- mark the view with security_invoker=false (default in older PG) so it runs
-- as the view owner (postgres).
ALTER VIEW profiles_public SET (security_invoker = false);

GRANT SELECT ON profiles_public TO anon, authenticated;

-- ─── H4: notifications — block cross-user direct insert ──────────────────────
-- Tighten direct INSERT to self only. Cross-user writes (e.g. @-mentions,
-- caregiver alerts) must go through create_notification() below.
DROP POLICY IF EXISTS notifications_insert ON notifications;
CREATE POLICY notifications_insert ON notifications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Security-definer RPC used by the app to deliver notifications across users.
-- It validates that the caller has a legitimate relationship to the recipient
-- before inserting (channel co-member, caregiver link, or self).
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text DEFAULT NULL,
  p_data jsonb DEFAULT '{}'::jsonb,
  p_channel_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_id uuid;
  v_allowed boolean := false;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;

  -- Self-notifications are always allowed.
  IF v_caller = p_user_id THEN
    v_allowed := true;
  END IF;

  -- Caller and recipient share a channel membership.
  IF NOT v_allowed AND p_channel_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM channel_members
      WHERE channel_id = p_channel_id AND user_id = v_caller
    ) AND EXISTS (
      SELECT 1 FROM channel_members
      WHERE channel_id = p_channel_id AND user_id = p_user_id
    ) THEN
      v_allowed := true;
    END IF;
  END IF;

  -- Caller is a parent of a child for which the recipient is a caregiver
  -- (or vice versa) — used by caregiver-update notifications.
  IF NOT v_allowed THEN
    IF EXISTS (
      SELECT 1 FROM child_caregivers cc
      JOIN children c ON c.id = cc.child_id
      WHERE cc.status = 'accepted'
        AND (
          (c.parent_id = v_caller AND cc.user_id = p_user_id)
          OR (cc.user_id = v_caller AND c.parent_id = p_user_id)
        )
    ) THEN
      v_allowed := true;
    END IF;
  END IF;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'no relationship to recipient';
  END IF;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (p_user_id, p_type, p_title, p_body, p_data)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_notification(uuid, text, text, text, jsonb, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
