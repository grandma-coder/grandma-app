-- Beta security hardening, part 2 (2026-11-07). Idempotent; each block guarded.
--
-- 1. children SELECT: a caregiver whose seat is LOCKED (billing downgrade) or PAUSED by the parent
--    no longer reads the child row (name, birth date, allergies, medications…). Accepted, active
--    caregivers keep reading it — their log form needs parent_id and notifications need the name.
--    Still open (post-beta): an active view-only caregiver can read the medical columns directly;
--    hiding columns per permission needs a schema + app change.
--
-- 2. create_notification: any channel co-member could push any title/body to any other member,
--    including someone who blocked them. Cross-user notifications are now limited to the types the
--    app actually sends between people (mention, reply, caregiver_update), respect user_blocks,
--    and cap title/body length. Self-notifications are unchanged.

-- ─── 1. children SELECT: exclude locked caregivers ─────────────────────────
DO $do$
BEGIN
  IF to_regclass('public.children') IS NULL OR to_regclass('public.child_caregivers') IS NULL THEN
    RAISE WARNING 'children policy skipped: table missing';
    RETURN;
  END IF;
  DROP POLICY IF EXISTS "own or caregiver children" ON children;
  CREATE POLICY "own or caregiver children" ON children
    FOR SELECT
    USING (
      parent_id = auth.uid()
      OR id IN (
        SELECT child_id FROM child_caregivers
        WHERE user_id = auth.uid()
          AND status = 'accepted'
          AND COALESCE(is_locked, false) = false
          AND COALESCE((permissions->>'_paused')::boolean, false) = false
      )
    );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'children policy NOT applied: %', SQLERRM;
END
$do$;

-- ─── 2. create_notification: types, blocks, length caps ────────────────────
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

  IF v_caller = p_user_id THEN
    v_allowed := true;
  ELSE
    -- Between people: only the kinds the app sends, never from someone the recipient blocked.
    IF p_type NOT IN ('mention', 'reply', 'caregiver_update') THEN
      RAISE EXCEPTION 'notification type not allowed between users';
    END IF;
    IF to_regclass('public.user_blocks') IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_blocks
      WHERE (blocker_id = p_user_id AND blocked_id = v_caller)
         OR (blocker_id = v_caller AND blocked_id = p_user_id)
    ) THEN
      RAISE EXCEPTION 'no relationship to recipient';
    END IF;

    -- Caller and recipient share a channel membership.
    IF p_channel_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM channel_members WHERE channel_id = p_channel_id AND user_id = v_caller
    ) AND EXISTS (
      SELECT 1 FROM channel_members WHERE channel_id = p_channel_id AND user_id = p_user_id
    ) THEN
      v_allowed := true;
    END IF;

    -- Parent ↔ active caregiver of the same child.
    IF NOT v_allowed AND EXISTS (
      SELECT 1 FROM child_caregivers cc
      JOIN children c ON c.id = cc.child_id
      WHERE cc.status = 'accepted'
        AND COALESCE(cc.is_locked, false) = false
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
  VALUES (p_user_id, p_type, left(p_title, 140), left(p_body, 280), COALESCE(p_data, '{}'::jsonb))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION create_notification(uuid, text, text, text, jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_notification(uuid, text, text, text, jsonb, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
