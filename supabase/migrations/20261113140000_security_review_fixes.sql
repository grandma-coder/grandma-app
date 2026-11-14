-- Security review fixes (2026-11-13).
--
-- Closes the database-side findings of the 2026-11-13 whole-app security review:
--   §1  Billing columns: guard subscription_status (+ new subscription_event_ms) and INSERT (self-grant premium)
--   §2  child_caregivers INSERT: a non-self-link row is always a pending invite
--   §3  children: caregiver direct-table reads require emergency / edit_child (PHI columns);
--       everyone else reads the masked get_caregiver_children() RPC
--   §4  child_logs: a row can only point at a child the writer may log for
--   §5  kids_reminders: caregiver writes need log_activity; owner column frozen
--   §6  garage-media / garage-photos storage: no public listing, uploads path-bound
--   §7  channel_members: membership of private channels no longer world-readable
--   §8  anon role: revoke reads on community tables
--   §9  scan_history: locked caregivers lose read
--   §10 SECURITY DEFINER functions: pin search_path
--   §11 ai_request_log + reserve_ai_call(): server-side AI quota / rate limit
--
-- Idempotent. Each section is independent; a failure raises (no swallowed DO
-- blocks) so a partial apply is visible.

-- ─── §1 Billing columns ─────────────────────────────────────────────────────
-- subscription_event_ms: last RevenueCat event applied (webhook ignores older
-- ones so an out-of-order RENEWAL can't re-grant premium). Backend-only, guarded below.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_event_ms bigint;

CREATE OR REPLACE FUNCTION guard_subscription_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  jwt_role text := COALESCE(auth.role(), '');
BEGIN
  IF current_user IN ('service_role', 'postgres', 'supabase_admin')
     OR jwt_role IN ('service_role', 'postgres', 'supabase_admin')
  THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- A client-created profile always starts free; billing upgrades it.
    NEW.subscription_tier := 'free';
    IF NEW.subscription_status IS NOT NULL THEN
      NEW.subscription_status := 'free';
    END IF;
    NEW.subscription_event_ms := NULL;
    RETURN NEW;
  END IF;

  IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
     OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.subscription_event_ms IS DISTINCT FROM OLD.subscription_event_ms
  THEN
    RAISE EXCEPTION
      'subscription_tier / subscription_status / subscription_event_ms can only be changed by the billing backend (role=%, jwt=%)',
      current_user, jwt_role
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_subscription_tier ON profiles;
CREATE TRIGGER trg_guard_subscription_tier
  BEFORE INSERT OR UPDATE OF subscription_tier, subscription_status, subscription_event_ms ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION guard_subscription_tier();

-- ─── §2 child_caregivers INSERT guard ───────────────────────────────────────
-- The INSERT policy only checks invited_by + child ownership, so a parent could
-- insert { user_id: <anyone>, status: 'accepted' } and link a stranger without
-- consent. Only the parent's own self-link may be inserted as accepted; any other
-- row is forced to a pending invite (accepted later by accept-invite, service role).
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

  NEW.user_id     := NULL;
  NEW.status      := 'pending';
  NEW.accepted_at := NULL;
  NEW.is_locked   := false;
  RETURN NEW;
END;
$$;

-- Name sorts before the token-lifecycle / seat triggers so they see the forced values.
DROP TRIGGER IF EXISTS a_child_caregivers_insert_guard ON child_caregivers;
CREATE TRIGGER a_child_caregivers_insert_guard
  BEFORE INSERT ON child_caregivers
  FOR EACH ROW
  EXECUTE FUNCTION guard_child_caregivers_insert();

-- ─── §3 children: PHI columns only for emergency / edit_child caregivers ────
-- Masking lived only in get_caregiver_children(); a view-only caregiver could
-- select blood_type / allergies / medications / conditions / pediatrician straight
-- from the table. The app loads caregiver children through the (masked) RPC.
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
        AND (
          role = 'parent'
          OR COALESCE((permissions->>'emergency')::boolean, false)
          OR COALESCE((permissions->>'edit_child')::boolean, false)
        )
    )
  );

-- profile_avatars_linked_read joined children under the caller's RLS; the
-- caregiver→parent branch now uses a definer helper so §3 doesn't break it.
CREATE OR REPLACE FUNCTION public.is_active_caregiver_of_parent(p_parent uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM child_caregivers cc
    JOIN children c ON c.id = cc.child_id
    WHERE c.parent_id = p_parent
      AND cc.user_id = auth.uid()
      AND cc.status = 'accepted'
      AND COALESCE(cc.is_locked, false) = false
      AND COALESCE((cc.permissions->>'_paused')::boolean, false) = false
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_active_caregiver_of_parent(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_caregiver_of_parent(uuid) TO authenticated;

DROP POLICY IF EXISTS "profile_avatars_linked_read" ON storage.objects;
CREATE POLICY "profile_avatars_linked_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'profile-avatars'
    AND (
      -- parent reading an accepted caregiver's avatar
      EXISTS (
        SELECT 1 FROM child_caregivers cc
        JOIN children c ON c.id = cc.child_id
        WHERE cc.user_id::text = (storage.foldername(name))[1]
          AND c.parent_id = auth.uid()
          AND cc.status = 'accepted'
          AND COALESCE(cc.is_locked, false) = false
          AND COALESCE((cc.permissions->>'_paused')::boolean, false) = false
      )
      -- caregiver reading the parent's avatar
      OR public.is_active_caregiver_of_parent(((storage.foldername(name))[1])::uuid)
    )
  );

-- ─── §4 child_logs: child_id bound on INSERT and UPDATE ─────────────────────
DROP POLICY IF EXISTS "Owner can manage child_logs" ON child_logs;
CREATE POLICY "Owner can manage child_logs" ON child_logs
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND (
      child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
      OR child_id IN (
        SELECT child_id FROM child_caregivers
        WHERE user_id = auth.uid()
          AND status = 'accepted'
          AND COALESCE(is_locked, false) = false
          AND COALESCE((permissions->>'_paused')::boolean, false) = false
          AND (role = 'parent' OR COALESCE((permissions->>'log_activity')::boolean, false))
      )
    )
  );

-- ─── §5 kids_reminders: caregiver writes need log_activity ──────────────────
DO $do$
BEGIN
  IF to_regclass('public.kids_reminders') IS NULL THEN
    RAISE NOTICE '§5 skipped: public.kids_reminders does not exist';
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS "kids_reminders insert" ON public.kids_reminders';
  EXECUTE $p$
    CREATE POLICY "kids_reminders insert" ON public.kids_reminders
      FOR INSERT
      WITH CHECK (
        auth.uid() = user_id
        AND (
          child_id IS NULL
          OR child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
          OR child_id IN (
            SELECT child_id FROM child_caregivers
            WHERE user_id = auth.uid()
              AND status = 'accepted'
              AND COALESCE(is_locked, false) = false
              AND COALESCE((permissions->>'_paused')::boolean, false) = false
              AND (role = 'parent' OR COALESCE((permissions->>'log_activity')::boolean, false))
          )
        )
      )
  $p$;

  EXECUTE 'DROP POLICY IF EXISTS "kids_reminders update" ON public.kids_reminders';
  EXECUTE $p$
    CREATE POLICY "kids_reminders update" ON public.kids_reminders
      FOR UPDATE
      USING (
        auth.uid() = user_id
        OR (
          child_id IS NOT NULL
          AND child_id IN (
            SELECT child_id FROM child_caregivers
            WHERE user_id = auth.uid()
              AND status = 'accepted'
              AND COALESCE(is_locked, false) = false
              AND COALESCE((permissions->>'_paused')::boolean, false) = false
              AND (role = 'parent' OR COALESCE((permissions->>'log_activity')::boolean, false))
          )
        )
      )
      WITH CHECK (
        auth.uid() = user_id
        OR (
          child_id IS NOT NULL
          AND child_id IN (
            SELECT child_id FROM child_caregivers
            WHERE user_id = auth.uid()
              AND status = 'accepted'
              AND COALESCE(is_locked, false) = false
              AND COALESCE((permissions->>'_paused')::boolean, false) = false
              AND (role = 'parent' OR COALESCE((permissions->>'log_activity')::boolean, false))
          )
        )
      )
  $p$;

  EXECUTE 'DROP POLICY IF EXISTS "kids_reminders delete" ON public.kids_reminders';
  EXECUTE $p$
    CREATE POLICY "kids_reminders delete" ON public.kids_reminders
      FOR DELETE
      USING (
        auth.uid() = user_id
        OR (
          child_id IS NOT NULL
          AND child_id IN (
            SELECT child_id FROM child_caregivers
            WHERE user_id = auth.uid()
              AND status = 'accepted'
              AND COALESCE(is_locked, false) = false
              AND COALESCE((permissions->>'_paused')::boolean, false) = false
              AND (role = 'parent' OR COALESCE((permissions->>'log_activity')::boolean, false))
          )
        )
      )
  $p$;
END
$do$;

CREATE OR REPLACE FUNCTION guard_kids_reminders_owner()
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
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'kids_reminders.user_id cannot be changed'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

DO $do$
BEGIN
  IF to_regclass('public.kids_reminders') IS NULL THEN RETURN; END IF;
  EXECUTE 'DROP TRIGGER IF EXISTS trg_guard_kids_reminders_owner ON public.kids_reminders';
  EXECUTE 'CREATE TRIGGER trg_guard_kids_reminders_owner BEFORE UPDATE ON public.kids_reminders
           FOR EACH ROW EXECUTE FUNCTION guard_kids_reminders_owner()';
END
$do$;

-- ─── §6 garage-media / garage-photos storage ────────────────────────────────
-- Objects are served by public URL (bucket public = true), which doesn't need a
-- SELECT policy. The old USING(bucket_id ...) policy only enabled LISTING the
-- buckets — including legacy child/avatar photos — with the anon key.
-- Owners keep SELECT (storage remove()/upsert need it).
DROP POLICY IF EXISTS "garage_media_read" ON storage.objects;
CREATE POLICY "garage_media_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id IN ('garage-media', 'garage-photos') AND owner = auth.uid());

DROP POLICY IF EXISTS "garage_media_upload" ON storage.objects;
CREATE POLICY "garage_media_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('garage-media', 'garage-photos')
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        (storage.foldername(name))[1] IN ('posts', 'channels')
        AND (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );

-- ─── §7 channel_members: private-channel membership readable only to members ─
DROP POLICY IF EXISTS "channel_members_read" ON channel_members;
DROP POLICY IF EXISTS "Anyone can read memberships" ON channel_members;
CREATE POLICY "channel_members_read" ON channel_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_read_channel(channel_id));

-- ─── §8 anon: no community reads without a session ──────────────────────────
DO $do$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['garage_posts', 'garage_post_likes', 'garage_post_comments',
                           'garage_listings', 'channels', 'channel_members', 'circles']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('REVOKE SELECT ON public.%I FROM anon', t);
    END IF;
  END LOOP;
END
$do$;

-- ─── §9 scan_history: locked caregivers lose read ───────────────────────────
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
        AND COALESCE(is_locked, false) = false
        AND COALESCE((permissions->>'_paused')::boolean, false) = false
    )
  );

-- ─── §10 Pin search_path on SECURITY DEFINER functions missing it ───────────
DO $do$
DECLARE f regprocedure;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.proname IN ('enforce_seat_limit_on_insert', 'active_seats_for',
                        'update_garage_like_count', 'update_garage_comment_count',
                        'update_channel_reply_count', 'update_channel_member_count',
                        'update_channel_rating', 'notify_caregiver_log')
      AND NOT EXISTS (
        SELECT 1 FROM unnest(COALESCE(p.proconfig, '{}')) c WHERE c LIKE 'search_path=%'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', f);
  END LOOP;
END
$do$;

-- ─── §11 Server-side AI quota ───────────────────────────────────────────────
-- Every paid AI edge function reserves a slot here (service role) BEFORE calling
-- Anthropic. Replaces the scan quota that counted client-inserted scan_history.
CREATE TABLE IF NOT EXISTS ai_request_log (
  id         bigserial PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fn         text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_request_log_user_fn_created
  ON ai_request_log (user_id, fn, created_at DESC);
ALTER TABLE ai_request_log ENABLE ROW LEVEL SECURITY;
-- No policies: service role only.
REVOKE ALL ON ai_request_log FROM anon, authenticated;

-- Returns 'ok' (slot recorded) or the limit that was hit: 'hour' | 'day' | 'lifetime'.
-- A NULL limit means "no limit". p_prior_count adds usage recorded elsewhere
-- (scan_history rows from before this table existed) to the lifetime count.
CREATE OR REPLACE FUNCTION public.reserve_ai_call(
  p_user_id        uuid,
  p_fn             text,
  p_hour_limit     int,
  p_day_limit      int,
  p_lifetime_limit int DEFAULT NULL,
  p_prior_count    int DEFAULT 0
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n int;
BEGIN
  -- Serialise per user+fn so parallel requests can't overshoot the limit.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_fn, 0));

  IF p_lifetime_limit IS NOT NULL THEN
    SELECT count(*) INTO n FROM ai_request_log WHERE user_id = p_user_id AND fn = p_fn;
    IF GREATEST(n, COALESCE(p_prior_count, 0)) >= p_lifetime_limit THEN
      RETURN 'lifetime';
    END IF;
  END IF;

  IF p_hour_limit IS NOT NULL THEN
    SELECT count(*) INTO n FROM ai_request_log
    WHERE user_id = p_user_id AND fn = p_fn AND created_at > now() - interval '1 hour';
    IF n >= p_hour_limit THEN RETURN 'hour'; END IF;
  END IF;

  IF p_day_limit IS NOT NULL THEN
    SELECT count(*) INTO n FROM ai_request_log
    WHERE user_id = p_user_id AND fn = p_fn AND created_at > now() - interval '1 day';
    IF n >= p_day_limit THEN RETURN 'day'; END IF;
  END IF;

  INSERT INTO ai_request_log (user_id, fn) VALUES (p_user_id, p_fn);
  RETURN 'ok';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.reserve_ai_call(uuid, text, int, int, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_call(uuid, text, int, int, int, int) TO service_role;

NOTIFY pgrst, 'reload schema';

