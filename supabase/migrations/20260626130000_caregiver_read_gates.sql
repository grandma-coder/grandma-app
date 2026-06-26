-- U7 — Close the chat-read enforcement hole (R3).
--
-- The chat_messages SELECT policy ("own or caregiver messages",
-- 20260330010000_child_caregivers.sql:71, re-created in
-- 20260615120000_p0_security_fixes.sql:62) gates only on accepted + _paused.
-- The (permissions->>'chat')::boolean check exists ONLY in the INSERT policy.
-- So a caregiver with chat:false can READ the full Guru Grandma conversation
-- history for the child — which routinely contains health questions, symptoms,
-- and family detail — even though the owner withheld chat. This violates R3
-- ("withheld capability genuinely inaccessible at the data layer").
--
-- Fix: gate the caregiver SELECT branch on the chat flag (mirroring the INSERT
-- policy), while preserving unconditional owner access via an explicit
-- children.parent_id branch. The owner branch does NOT depend on the parent's
-- own child_caregivers self-row permissions, so a parent can never be locked
-- out of their own child's chat by a stray permissions blob.
--
-- `view` key: every PERMISSION_LEVELS preset (View Only / Contributor / Full)
-- sets view:true, so there is no access tier that grants any access without
-- view. Gating SELECT on view would be a structural no-op for every real
-- caregiver. `view` is therefore PRESENTATION-ONLY — a UI label, not a data
-- gate. No RLS change is made for it; this is recorded so UI and DB do not
-- appear to drift. (See KTD-2 in the plan.)

DROP POLICY IF EXISTS "own or caregiver messages" ON chat_messages;
CREATE POLICY "own or caregiver messages" ON chat_messages
  FOR SELECT
  USING (
    -- Owner: always reads their own child's chat, regardless of any permissions.
    child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
    OR
    -- Caregiver: must hold the chat capability and be accepted / non-locked /
    -- non-paused — same predicate the INSERT policy already enforces.
    child_id IN (
      SELECT child_id FROM child_caregivers
      WHERE user_id = auth.uid()
        AND status = 'accepted'
        AND COALESCE(is_locked, false) = false
        AND (permissions->>'chat')::boolean = true
        AND COALESCE((permissions->>'_paused')::boolean, false) = false
    )
  );

NOTIFY pgrst, 'reload schema';
