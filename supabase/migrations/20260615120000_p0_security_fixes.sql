-- ════════════════════════════════════════════════════════════════════════════
-- P0 Security Fixes — Pre-Friends-Test (tracker rows P0-1, P0-6, P0-7)
-- Source: [[Pre-Friends-Test — Fix Tracker]]
--
-- P0-6  insights: drop the still-live `Service can insert insights` policy that
--       carries WITH CHECK (true). rls_hardening dropped the wrong policy names,
--       so cross-user insight injection is still possible for the `authenticated`
--       role. (The edge function uses the service role, which bypasses RLS, so
--       removing this client-facing policy is safe.)
--
-- P0-1  Paused caregiver: pause writes permissions._paused=true but no RLS policy
--       reads it, so a paused caregiver keeps full child read/write. Re-create
--       every caregiver-access policy that grants via child_caregivers so it also
--       requires permissions._paused IS NOT true (and keeps the existing
--       is_locked gate where present). Faithful 1:1 rewrites of the live policies
--       — only the paused predicate is added; owner clauses and permission flags
--       are preserved exactly.
--
-- P0-7  Legacy care_circle self-escalation: the `Members can accept invite`
--       UPDATE policy lets a member rewrite their own role/permissions/children.
--       The live app uses child_caregivers (already guarded by
--       prevent_invitee_permission_escalation), so care_circle is legacy — but if
--       the table still exists we lock its member-self-update to status only via a
--       BEFORE UPDATE trigger. Guarded by to_regclass so it's a no-op if the table
--       was already dropped.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── P0-6: insights — remove the permissive client insert policy ────────────
-- The owner FOR ALL policy ("Owner can manage insights") from rls_hardening
-- already covers legitimate client access. This drop closes the injection hole.
DROP POLICY IF EXISTS "Service can insert insights" ON insights;
DROP POLICY IF EXISTS "Insert insights" ON insights;

-- Ensure the strict owner policy exists even if rls_hardening was skipped here.
DROP POLICY IF EXISTS "Owner can manage insights" ON insights;
CREATE POLICY "Owner can manage insights" ON insights
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── P0-1: paused-caregiver enforcement ─────────────────────────────────────
-- A paused link sets permissions._paused = true. Add that predicate to every
-- policy whose caregiver branch reads child_caregivers. Reusable expression:
--   AND COALESCE((permissions->>'_paused')::boolean, false) = false

-- children SELECT — parent OR accepted, non-paused caregiver.
DROP POLICY IF EXISTS "own or caregiver children" ON children;
CREATE POLICY "own or caregiver children" ON children
  FOR SELECT
  USING (
    parent_id = auth.uid()
    OR id IN (
      SELECT child_id FROM child_caregivers
      WHERE user_id = auth.uid()
        AND status = 'accepted'
        AND COALESCE((permissions->>'_paused')::boolean, false) = false
    )
  );

-- chat_messages SELECT — accepted, non-paused caregiver.
DROP POLICY IF EXISTS "own or caregiver messages" ON chat_messages;
CREATE POLICY "own or caregiver messages" ON chat_messages
  FOR SELECT
  USING (
    child_id IN (
      SELECT child_id FROM child_caregivers
      WHERE user_id = auth.uid()
        AND status = 'accepted'
        AND COALESCE((permissions->>'_paused')::boolean, false) = false
    )
  );

-- chat_messages INSERT — accepted, non-locked, non-paused caregiver with chat perm.
-- (Matches the live subscription_tiers version; adds the _paused predicate.)
DROP POLICY IF EXISTS "insert messages" ON chat_messages;
CREATE POLICY "insert messages" ON chat_messages
  FOR INSERT
  WITH CHECK (
    child_id IN (
      SELECT child_id FROM child_caregivers
      WHERE user_id = auth.uid()
        AND status = 'accepted'
        AND is_locked = false
        AND (permissions->>'chat')::boolean = true
        AND COALESCE((permissions->>'_paused')::boolean, false) = false
    )
  );

-- child_logs INSERT — accepted, non-locked, non-paused caregiver.
-- (Matches the live subscription_tiers version; adds the _paused predicate.
-- The log_activity-permission gate is tracked separately as P1-17.)
DROP POLICY IF EXISTS "Insert child_logs" ON child_logs;
CREATE POLICY "Insert child_logs" ON child_logs
  FOR INSERT
  WITH CHECK (
    child_id IN (
      SELECT child_id FROM child_caregivers
      WHERE user_id = auth.uid()
        AND status = 'accepted'
        AND is_locked = false
        AND COALESCE((permissions->>'_paused')::boolean, false) = false
    )
  );

-- scan_history SELECT — owner / own-child / accepted, non-paused caregiver.
-- (Matches the live scan_history_user_id version; adds the _paused predicate.)
DROP POLICY IF EXISTS scan_history_select ON scan_history;
CREATE POLICY scan_history_select ON scan_history
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
    OR child_id IN (
      SELECT child_id FROM child_caregivers
      WHERE user_id = auth.uid()
        AND status = 'accepted'
        AND COALESCE((permissions->>'_paused')::boolean, false) = false
    )
  );

-- (scan_history INSERT grants only via user_id / own children — no caregiver
--  branch — so pausing a caregiver already blocks it; left unchanged.)

-- ─── P0-7: legacy care_circle member self-escalation guard ──────────────────
-- Only act if the legacy table still exists. The trigger blocks a member
-- (member_user_id = caller, but not the owner) from changing anything other than
-- their acceptance status on their own row.
DO $$
BEGIN
  IF to_regclass('public.care_circle') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Members can accept invite" ON care_circle';
    EXECUTE $p$
      CREATE POLICY "Members can accept invite" ON care_circle
        FOR UPDATE
        USING (auth.uid() = member_user_id)
        WITH CHECK (auth.uid() = member_user_id)
    $p$;

    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION prevent_care_circle_member_escalation()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $body$
      BEGIN
        -- Member updating their own row (and not the owner): only status may change.
        IF auth.uid() = NEW.member_user_id AND auth.uid() <> NEW.owner_id THEN
          IF NEW.role            IS DISTINCT FROM OLD.role
             OR NEW.permissions     IS DISTINCT FROM OLD.permissions
             OR NEW.children_access IS DISTINCT FROM OLD.children_access
             OR NEW.access_type     IS DISTINCT FROM OLD.access_type
             OR NEW.access_end      IS DISTINCT FROM OLD.access_end
             OR NEW.owner_id        IS DISTINCT FROM OLD.owner_id
             OR NEW.member_user_id  IS DISTINCT FROM OLD.member_user_id THEN
            RAISE EXCEPTION 'care_circle members may only update their acceptance status';
          END IF;
        END IF;
        RETURN NEW;
      END;
      $body$;
    $fn$;

    EXECUTE 'DROP TRIGGER IF EXISTS care_circle_member_escalation_guard ON care_circle';
    EXECUTE $t$
      CREATE TRIGGER care_circle_member_escalation_guard
        BEFORE UPDATE ON care_circle
        FOR EACH ROW
        EXECUTE FUNCTION prevent_care_circle_member_escalation()
    $t$;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
