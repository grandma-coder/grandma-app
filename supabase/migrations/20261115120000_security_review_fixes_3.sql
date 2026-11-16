-- Security review fixes, part 3 (2026-11-15) — findings from the live-catalog
-- RLS review that followed parts 1 and 2.
--   §1 author_name is server-set on community posts/comments; reply notifications
--      use the real profile name (no "Grandma Support replied…" spoofing)
--   §2 mention notifications are tied to a real post: body = that post's text,
--      recipient must be in its mentions, one notification per post+recipient
--   §3 scan_history: a caregiver's own scans of a child follow the care link
--   §4 profiles_public: only active care links; channel members only for
--      channels the caller can read
--   §5 get_caregiver_children: co-parents (role 'parent') see medical fields,
--      matching the children table policy
--   §6 anon: drop default write grants on community tables

-- ─── §1 Server-set author_name ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_author_name_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('service_role', 'postgres', 'supabase_admin')
     OR COALESCE(auth.role(), '') IN ('service_role', 'postgres', 'supabase_admin')
  THEN
    RETURN NEW;
  END IF;
  SELECT p.name INTO NEW.author_name FROM profiles p WHERE p.id = NEW.author_id;
  RETURN NEW;
END;
$$;

DO $do$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['channel_posts', 'garage_posts', 'garage_post_comments'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = t AND column_name = 'author_name')
    THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_set_author_name ON public.%I', t);
      EXECUTE format('CREATE TRIGGER trg_set_author_name BEFORE INSERT OR UPDATE OF author_name, author_id ON public.%I
                      FOR EACH ROW EXECUTE FUNCTION public.set_author_name_from_profile()', t);
    END IF;
  END LOOP;
END
$do$;

CREATE OR REPLACE FUNCTION public.notify_thread_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_author  uuid;
  ch_name        text;
  replier_name   text;
BEGIN
  IF NEW.reply_to_id IS NULL THEN RETURN NEW; END IF;
  SELECT cp.author_id, c.name
  INTO parent_author, ch_name
  FROM channel_posts cp
  JOIN channels c ON c.id = cp.channel_id
  WHERE cp.id = NEW.reply_to_id;
  IF parent_author IS NULL OR parent_author = NEW.author_id THEN RETURN NEW; END IF;
  IF public.users_blocked_either_way(parent_author, NEW.author_id) THEN RETURN NEW; END IF;
  SELECT name INTO replier_name FROM profiles WHERE id = NEW.author_id;
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (parent_author, 'reply',
          COALESCE(replier_name, 'Someone') || ' replied to your message in #' || COALESCE(ch_name, 'channel'),
          LEFT(NEW.content, 80),
          jsonb_build_object('channelId', NEW.channel_id, 'threadId', NEW.reply_to_id));
  RETURN NEW;
END;
$$;

-- ─── §2 create_notification: mentions bound to a post ───────────────────────
-- The app passes p_data.postId (the message it just sent). Body comes from that
-- post, the caller must be its author, the recipient must be in its mentions,
-- and each post notifies each recipient at most once.
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
  v_post_id      uuid;
  v_content      text;
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

  BEGIN
    v_post_id := NULLIF(p_data->>'postId', '')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    v_post_id := NULL;
  END;
  IF v_post_id IS NULL THEN
    RAISE EXCEPTION 'mention requires postId';
  END IF;

  IF to_regclass('public.user_blocks') IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_blocks
    WHERE (blocker_id = p_user_id AND blocked_id = v_caller)
       OR (blocker_id = v_caller AND blocked_id = p_user_id)
  ) THEN
    RAISE EXCEPTION 'no relationship to recipient';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM channel_members WHERE channel_id = p_channel_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'no relationship to recipient';
  END IF;

  SELECT cp.content INTO v_content
  FROM channel_posts cp
  WHERE cp.id = v_post_id
    AND cp.channel_id = p_channel_id
    AND cp.author_id = v_caller
    AND cp.created_at > now() - interval '10 minutes'
    AND p_user_id = ANY (COALESCE(cp.mentions, '{}'::uuid[]));
  IF NOT FOUND THEN
    RAISE EXCEPTION 'mention does not match a recent post by the caller';
  END IF;

  IF EXISTS (
    SELECT 1 FROM notifications
    WHERE user_id = p_user_id AND type = 'mention' AND data->>'postId' = v_post_id::text
  ) THEN
    RETURN NULL;  -- already notified for this post
  END IF;

  SELECT name INTO v_author FROM profiles WHERE id = v_caller;
  SELECT name INTO v_channel_name FROM channels WHERE id = p_channel_id;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    p_user_id,
    'mention',
    left(COALESCE(v_author, 'Someone') || ' mentioned you in #' || COALESCE(v_channel_name, 'a channel'), 140),
    left(v_content, 100),
    jsonb_build_object(
      'channelId', p_channel_id,
      'channelName', v_channel_name,
      'authorName', v_author,
      'postId', v_post_id,
      'kind', 'mention'
    )
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, jsonb, uuid) TO authenticated;

-- ─── §3 scan_history: caregiver scans follow the care link ──────────────────
-- A caregiver's scans of a child are stored under the caregiver's user_id, so the
-- plain user_id branch let a locked/revoked caregiver keep reading them.
DROP POLICY IF EXISTS scan_history_select ON scan_history;
CREATE POLICY scan_history_select ON scan_history
  FOR SELECT
  USING (
    (user_id = auth.uid() AND child_id IS NULL)
    OR child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
    OR child_id IN (
      SELECT child_id FROM child_caregivers
      WHERE user_id = auth.uid()
        AND status = 'accepted'
        AND COALESCE(is_locked, false) = false
        AND COALESCE((permissions->>'_paused')::boolean, false) = false
    )
  );

-- ─── §4 profiles_public ─────────────────────────────────────────────────────
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
    -- member of a channel the caller can read (public, or private + caller is in it)
    OR EXISTS (SELECT 1 FROM channel_members m
               WHERE m.user_id = p.id AND public.can_read_channel(m.channel_id))
    OR EXISTS (SELECT 1 FROM channels ch
               WHERE ch.created_by = p.id AND public.can_read_channel(ch.id))
    OR EXISTS (SELECT 1 FROM garage_posts g WHERE g.author_id = p.id)
    OR EXISTS (SELECT 1 FROM garage_post_comments gc WHERE gc.author_id = p.id)
    OR EXISTS (
      -- share a child through ACTIVE links on both sides
      SELECT 1
      FROM children c
      WHERE (
          c.parent_id = p.id
          OR EXISTS (SELECT 1 FROM child_caregivers a
                     WHERE a.child_id = c.id AND a.user_id = p.id AND a.status = 'accepted'
                       AND COALESCE(a.is_locked, false) = false
                       AND COALESCE((a.permissions->>'_paused')::boolean, false) = false)
        )
        AND (
          c.parent_id = auth.uid()
          OR EXISTS (SELECT 1 FROM child_caregivers b
                     WHERE b.child_id = c.id AND b.user_id = auth.uid() AND b.status = 'accepted'
                       AND COALESCE(b.is_locked, false) = false
                       AND COALESCE((b.permissions->>'_paused')::boolean, false) = false)
        )
    )
  );

ALTER VIEW profiles_public SET (security_invoker = false);
REVOKE SELECT ON profiles_public FROM anon;
GRANT SELECT ON profiles_public TO authenticated;

-- ─── §5 get_caregiver_children: co-parents see medical fields ───────────────
CREATE OR REPLACE FUNCTION public.get_caregiver_children()
RETURNS TABLE(role caregiver_role, permissions jsonb, id uuid, parent_id uuid, name text, birth_date date,
              weight_kg numeric, height_cm numeric, sex text, dietary_restrictions text[],
              preferred_foods text[], disliked_foods text[], notes text, country_code text, photo_url text,
              blood_type text, conditions text[], medications text[], allergies text[], pediatrician jsonb)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cc.role,
    cc.permissions,
    c.id,
    c.parent_id,
    c.name,
    c.birth_date,
    c.weight_kg,
    c.height_cm,
    c.sex,
    c.dietary_restrictions,
    c.preferred_foods,
    c.disliked_foods,
    c.notes,
    c.country_code,
    c.photo_url,
    -- Medical visibility: parent / co-parent, OR caregiver granted emergency or
    -- edit_child (same rule as the children SELECT policy). Otherwise masked.
    CASE WHEN can_view_phi THEN c.blood_type   ELSE NULL END,
    CASE WHEN can_view_phi THEN c.conditions    ELSE '{}'::text[] END,
    CASE WHEN can_view_phi THEN c.medications   ELSE '{}'::text[] END,
    CASE WHEN can_view_phi THEN c.allergies     ELSE '{}'::text[] END,
    CASE WHEN can_view_phi THEN c.pediatrician  ELSE NULL END
  FROM child_caregivers cc
  JOIN children c ON c.id = cc.child_id
  CROSS JOIN LATERAL (
    SELECT (
      c.parent_id = auth.uid()
      OR cc.role = 'parent'
      OR COALESCE((cc.permissions->>'emergency')::boolean, false)
      OR COALESCE((cc.permissions->>'edit_child')::boolean, false)
    ) AS can_view_phi
  ) v
  WHERE cc.user_id = auth.uid()
    AND cc.status = 'accepted'
    AND COALESCE(cc.is_locked, false) = false
    AND COALESCE((cc.permissions->>'_paused')::boolean, false) = false;
$$;

-- ─── §6 anon: no write grants on community tables ───────────────────────────
DO $do$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['channels', 'channel_members', 'channel_posts', 'channel_ratings',
                           'channel_requests', 'channel_saves', 'channel_mutes',
                           'garage_posts', 'garage_post_comments', 'garage_post_likes', 'garage_post_saves',
                           'post_comments', 'post_reactions', 'post_saves', 'polls', 'poll_options', 'poll_votes',
                           'circles', 'circle_posts', 'circle_handles', 'circle_post_reactions']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.%I FROM anon', t);
    END IF;
  END LOOP;
END
$do$;

NOTIFY pgrst, 'reload schema';
