-- Security review fixes, part 2 (2026-11-14).
--   §1 create_notification: cross-user notifications are server-templated mentions only
--   §2 profiles_public: no longer a directory of every user
--   §3 child_caregivers: at most one invited co-parent (role 'parent') per child —
--      role 'parent' is seat-exempt, so unlimited parent-role invites bypassed seats

-- ─── §1 create_notification ─────────────────────────────────────────────────
-- Before: any co-member of a public channel could send any text as title/body
-- (in-app phishing: "Support: verify your account"). Now the only cross-user type
-- clients may send is 'mention'; title + data are built here from the caller's
-- real name and the channel, and the caller must have just posted in that channel.
-- Caregiver alerts are written by SECURITY DEFINER triggers, not this RPC.
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id    uuid,
  p_type       text,
  p_title      text,
  p_body       text DEFAULT NULL,
  p_data       jsonb DEFAULT '{}'::jsonb,
  p_channel_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller       uuid := auth.uid();
  v_id           uuid;
  v_author       text;
  v_channel_name text;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;

  -- Self-notifications (local reminders mirrored to the inbox): unchanged.
  IF v_caller = p_user_id THEN
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (p_user_id, p_type, left(p_title, 140), left(p_body, 280), COALESCE(p_data, '{}'::jsonb))
    RETURNING id INTO v_id;
    RETURN v_id;
  END IF;

  IF p_type <> 'mention' OR p_channel_id IS NULL THEN
    RAISE EXCEPTION 'notification type not allowed between users';
  END IF;

  IF to_regclass('public.user_blocks') IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_blocks
    WHERE (blocker_id = p_user_id AND blocked_id = v_caller)
       OR (blocker_id = v_caller AND blocked_id = p_user_id)
  ) THEN
    RAISE EXCEPTION 'no relationship to recipient';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM channel_members WHERE channel_id = p_channel_id AND user_id = v_caller)
     OR NOT EXISTS (SELECT 1 FROM channel_members WHERE channel_id = p_channel_id AND user_id = p_user_id)
  THEN
    RAISE EXCEPTION 'no relationship to recipient';
  END IF;

  -- A mention accompanies a message the caller just posted in this channel.
  IF NOT EXISTS (
    SELECT 1 FROM channel_posts
    WHERE channel_id = p_channel_id
      AND author_id = v_caller
      AND created_at > now() - interval '10 minutes'
  ) THEN
    RAISE EXCEPTION 'mention requires a recent post in the channel';
  END IF;

  SELECT name INTO v_author FROM profiles WHERE id = v_caller;
  SELECT name INTO v_channel_name FROM channels WHERE id = p_channel_id;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    p_user_id,
    'mention',
    left(COALESCE(v_author, 'Someone') || ' mentioned you in #' || COALESCE(v_channel_name, 'a channel'), 140),
    left(p_body, 100),
    jsonb_build_object(
      'channelId', p_channel_id,
      'channelName', v_channel_name,
      'authorName', v_author,
      'kind', 'mention'
    )
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, jsonb, uuid) TO authenticated;

-- ─── §2 profiles_public ─────────────────────────────────────────────────────
-- Before: id / name / photo / role / language of EVERY user with a name, to any
-- signed-in account — including people who never touched community features of
-- a fertility/pregnancy app. Now a profile is visible only if it's the caller,
-- the person has a community presence (channel member/creator, garage author),
-- or the two share a child (parent ↔ caregiver, co-caregivers).
-- Same columns, same order (CREATE OR REPLACE VIEW requirement).
CREATE OR REPLACE VIEW profiles_public AS
SELECT
  p.id,
  p.id AS user_id,
  p.name,
  p.photo_url,
  p.user_role,
  p.created_at,
  p.language,
  p.is_verified_expert,
  p.expert_title
FROM profiles p
WHERE p.name IS NOT NULL
  AND auth.uid() IS NOT NULL
  AND (
    p.id = auth.uid()
    OR EXISTS (SELECT 1 FROM channel_members m WHERE m.user_id = p.id)
    OR EXISTS (SELECT 1 FROM channels ch WHERE ch.created_by = p.id)
    OR EXISTS (SELECT 1 FROM garage_posts g WHERE g.author_id = p.id)
    OR EXISTS (SELECT 1 FROM garage_post_comments gc WHERE gc.author_id = p.id)
    OR EXISTS (
      -- share a child: each side is the child's parent or an accepted caregiver
      SELECT 1
      FROM children c
      WHERE (
          c.parent_id = p.id
          OR EXISTS (SELECT 1 FROM child_caregivers a
                     WHERE a.child_id = c.id AND a.user_id = p.id AND a.status = 'accepted')
        )
        AND (
          c.parent_id = auth.uid()
          OR EXISTS (SELECT 1 FROM child_caregivers b
                     WHERE b.child_id = c.id AND b.user_id = auth.uid() AND b.status = 'accepted')
        )
    )
  );

ALTER VIEW profiles_public SET (security_invoker = false);
REVOKE SELECT ON profiles_public FROM anon;
GRANT SELECT ON profiles_public TO authenticated;

-- ─── §3 One invited co-parent per child ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.child_has_other_coparent(p_child uuid, p_exclude uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM child_caregivers cc
    JOIN children c ON c.id = cc.child_id
    WHERE cc.child_id = p_child
      AND cc.role = 'parent'
      AND cc.id IS DISTINCT FROM p_exclude
      AND cc.status::text IN ('pending', 'accepted')
      AND cc.user_id IS DISTINCT FROM c.parent_id   -- not the owner's self-link
  );
$$;
-- Called from the SECURITY INVOKER guards below, i.e. as the client role.
REVOKE EXECUTE ON FUNCTION public.child_has_other_coparent(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.child_has_other_coparent(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION guard_child_caregivers_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  jwt_role text := COALESCE(auth.role(), '');
  caller   uuid := auth.uid();
BEGIN
  IF current_user IN ('service_role', 'postgres', 'supabase_admin')
     OR jwt_role IN ('service_role', 'postgres', 'supabase_admin')
  THEN
    RETURN NEW;
  END IF;

  IF caller IS NOT NULL
     AND NEW.user_id = caller
     AND NEW.invited_by = caller
     AND EXISTS (SELECT 1 FROM children c WHERE c.id = NEW.child_id AND c.parent_id = caller)
  THEN
    RETURN NEW;  -- parent self-link
  END IF;

  IF NEW.role = 'parent' AND public.child_has_other_coparent(NEW.child_id, NEW.id) THEN
    RAISE EXCEPTION 'this child already has a co-parent invited'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  NEW.user_id     := NULL;
  NEW.status      := 'pending';
  NEW.accepted_at := NULL;
  NEW.is_locked   := false;
  RETURN NEW;
END;
$$;

-- Role changes to 'parent' on an existing invite (UPDATE path) obey the same rule.
CREATE OR REPLACE FUNCTION guard_child_caregivers_coparent_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('service_role', 'postgres', 'supabase_admin')
     OR COALESCE(auth.role(), '') IN ('service_role', 'postgres', 'supabase_admin')
  THEN
    RETURN NEW;
  END IF;
  IF NEW.role = 'parent'
     AND OLD.role IS DISTINCT FROM 'parent'
     AND public.child_has_other_coparent(NEW.child_id, NEW.id)
  THEN
    RAISE EXCEPTION 'this child already has a co-parent invited'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS child_caregivers_coparent_update_guard ON child_caregivers;
CREATE TRIGGER child_caregivers_coparent_update_guard
  BEFORE UPDATE OF role ON child_caregivers
  FOR EACH ROW
  EXECUTE FUNCTION guard_child_caregivers_coparent_update();

NOTIFY pgrst, 'reload schema';

-- ─── §4 legacy-quarantine bucket ────────────────────────────────────────────
-- Pre-2026-06 child memory / kids-log / pregnancy-meal photos were left in the
-- PUBLIC garage-photos bucket (memories/, kids-logs/, pregnancy-meals/). No row
-- references them any more; they are moved here (private, no policies → service
-- role only) instead of being deleted, so they can be restored if ever needed.
INSERT INTO storage.buckets (id, name, public)
VALUES ('legacy-quarantine', 'legacy-quarantine', false)
ON CONFLICT (id) DO UPDATE SET public = false;
