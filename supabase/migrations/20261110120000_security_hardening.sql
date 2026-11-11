-- ════════════════════════════════════════════════════════════════════════════
-- Security hardening — 2026-11-10 (post-beta RLS audit, round 3)
--
-- Reconstructed from the full migration history (later files override earlier
-- ones). One section per finding; each says which attack it closes.
--
--   §1  child_caregivers: a revoked caregiver could set their own row back to
--       'pending' (the token trigger mints a fresh token they can read through
--       their own SELECT policy) and accept it again — no seat check.
--   §2  Private channels were private only in the UI: anyone could read the
--       posts / comments / reactions / polls, post into them, insert their own
--       channel_members row, self-approve a join request, or move an existing
--       membership / post into a private channel by UPDATE-ing channel_id.
--   §3  Authors could un-hide moderated posts and write counters directly
--       (reaction_count, like_count …), and could re-point a reaction row at
--       another post to inflate counts (count triggers only fire on INSERT/DELETE).
--   §4  Blocking did not reach the Garage (posts / comments) or the trigger-made
--       notifications (likes, comments, joins, saves, replies).
--   §5  Circle posts: no DELETE policy, and content_reports rejected 'circle_post'.
--   §6  Channel ownership transfer was impossible (channels_update WITH CHECK
--       defaults to created_by = auth.uid(), so the new row always failed).
--   §7  Caregiver seat limits were only checked when the invite was created.
--
-- Conventions (same as 20261107120000_beta_security_hardening):
--   * Re-run safe: DROP … IF EXISTS + CREATE, CREATE OR REPLACE.
--   * Table-dependent blocks are DO blocks guarded by to_regclass and wrapped in
--     EXCEPTION WHEN OTHERS → RAISE WARNING. A WARNING in the output means that
--     fix did NOT land — read them.
--   * "Privileged caller" = current_user OR the JWT role is service_role /
--     postgres / supabase_admin. SECURITY DEFINER counter triggers run as their
--     owner (postgres), so they pass the column guards below.
--   * No data rewrites. Only CREATE POLICY / CREATE TRIGGER / one CHECK swap on
--     content_reports (added NOT VALID, then validated) — all short locks.
-- ════════════════════════════════════════════════════════════════════════════


-- ─── Shared helpers ─────────────────────────────────────────────────────────

-- Generic column guard. TG_ARGV[0] = jsonb object of column → value forced on
-- INSERT for non-privileged callers; TG_ARGV[1] = jsonb array of columns a
-- non-privileged caller may not change on UPDATE. Columns that don't exist on
-- the table are ignored (to_jsonb(...)->'missing' is NULL on both sides), so the
-- same guard is safe on environments that drifted from the repo.
CREATE OR REPLACE FUNCTION public.guard_protected_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  jwt_role   text  := COALESCE(auth.role(), '');
  v_defaults jsonb := COALESCE(NULLIF(TG_ARGV[0], ''), '{}')::jsonb;
  v_frozen   jsonb := COALESCE(NULLIF(TG_ARGV[1], ''), '[]')::jsonb;
  v_new      jsonb;
  v_old      jsonb;
  k          text;
BEGIN
  IF current_user IN ('service_role', 'postgres', 'supabase_admin')
     OR jwt_role IN ('service_role', 'postgres', 'supabase_admin')
  THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF v_defaults <> '{}'::jsonb THEN
      NEW := jsonb_populate_record(NEW, v_defaults);
    END IF;
    RETURN NEW;
  END IF;

  v_new := to_jsonb(NEW);
  v_old := to_jsonb(OLD);
  FOR k IN SELECT jsonb_array_elements_text(v_frozen) LOOP
    IF (v_new -> k) IS DISTINCT FROM (v_old -> k) THEN
      RAISE EXCEPTION '%.% can only be changed by the backend (role=%, jwt=%)',
        TG_TABLE_NAME, k, current_user, jwt_role
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

-- Channel access helpers. SECURITY DEFINER so policies can consult channels /
-- channel_members / channel_requests without recursing through their RLS.
-- Every helper answers only about the CALLER (auth.uid()) or about data the
-- caller can already see, so exposing them as RPCs leaks nothing new.
CREATE OR REPLACE FUNCTION public.channel_is_private(p_channel uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT c.channel_type = 'private' FROM channels c WHERE c.id = p_channel), false);
$$;

CREATE OR REPLACE FUNCTION public.is_channel_member(p_channel uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM channel_members m WHERE m.channel_id = p_channel AND m.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_channel_owner(p_channel uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM channels c WHERE c.id = p_channel AND c.created_by = auth.uid()
  );
$$;

-- Public channel → anyone signed in. Private channel → members + the owner.
CREATE OR REPLACE FUNCTION public.can_read_channel(p_channel uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT NOT public.channel_is_private(p_channel)
      OR public.is_channel_member(p_channel)
      OR public.is_channel_owner(p_channel);
$$;

CREATE OR REPLACE FUNCTION public.can_read_channel_post(p_post uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT public.can_read_channel(p.channel_id) FROM channel_posts p WHERE p.id = p_post), false);
$$;

CREATE OR REPLACE FUNCTION public.can_read_poll(p_poll uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT public.can_read_channel(p.channel_id) FROM polls p WHERE p.id = p_poll), false);
$$;

-- Does p_user have a join request for p_channel in one of p_statuses?
-- Answers only to the requester themself or the channel owner.
CREATE OR REPLACE FUNCTION public.has_channel_request(p_channel uuid, p_user uuid, p_statuses text[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
     AND (auth.uid() = p_user OR public.is_channel_owner(p_channel))
     AND EXISTS (
       SELECT 1 FROM channel_requests r
       WHERE r.channel_id = p_channel AND r.user_id = p_user AND r.status = ANY (p_statuses)
     );
$$;

-- Has p_user blocked the CALLER? (Only ever reveals blocks against yourself —
-- which a failed write would reveal anyway.)
CREATE OR REPLACE FUNCTION public.has_blocked_me(p_user uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_blocks b WHERE b.blocker_id = p_user AND b.blocked_id = auth.uid()
  );
$$;

-- Either user blocked the other. Internal only (notification triggers); not an RPC.
CREATE OR REPLACE FUNCTION public.users_blocked_either_way(p_a uuid, p_b uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p_a IS NOT NULL AND p_b IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_blocks b
    WHERE (b.blocker_id = p_a AND b.blocked_id = p_b)
       OR (b.blocker_id = p_b AND b.blocked_id = p_a)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.channel_is_private(uuid)                FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_channel_member(uuid)                 FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_channel_owner(uuid)                  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_read_channel(uuid)                  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_read_channel_post(uuid)             FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_read_poll(uuid)                     FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_channel_request(uuid, uuid, text[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_blocked_me(uuid)                    FROM PUBLIC, anon;
-- Policies run with the caller's privileges, so authenticated needs EXECUTE.
GRANT EXECUTE ON FUNCTION public.channel_is_private(uuid)                TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_channel_member(uuid)                 TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_channel_owner(uuid)                  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_read_channel(uuid)                  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_read_channel_post(uuid)             TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_read_poll(uuid)                     TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_channel_request(uuid, uuid, text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_blocked_me(uuid)                    TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.users_blocked_either_way(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.users_blocked_either_way(uuid, uuid) TO service_role;


-- ─── §1: child_caregivers — a caregiver can only LEAVE their own link ───────
-- Found: child_caregivers_update_by_invitee (20260512120000) is
--   USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid()),
-- and guard_child_caregivers_identity (20261108120000) only refuses a client
-- transition INTO 'accepted'. prevent_invitee_permission_escalation freezes
-- role / permissions / is_locked / child_id / invited_by but not status. So a
-- revoked caregiver PATCHes status = 'pending' → manage_invite_token_lifecycle
-- mints a fresh token → they read it via "Users can view caregiver links"
-- (user_id = auth.uid()) → call accept-invite → access back, no seat check.
-- Now:
--   (a) the invitee policy's WITH CHECK only admits status 'revoked' (leaving) or
--       'declined' (not an invite_status label today — compared as text so it
--       starts working if the label is ever added);
--   (b) the identity guard additionally refuses, for a caregiver editing their
--       own row (caller = user_id, caller ≠ invited_by, not the parent self-link
--       repair), ANY column change other than status, and any status other than
--       revoked/declined. Accepting stays service-role only (accept-invite).
-- App impact: none. Every client UPDATE of child_caregivers is inviter-side
-- (app/profile/care-circle.tsx pause / remove / edit / resend / re-invite;
-- lib/devSeed.ts parent self-link). There is no caregiver-side "leave" UI yet;
-- when one ships it should send { status: 'revoked' } only.

CREATE OR REPLACE FUNCTION guard_child_caregivers_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  jwt_role  text    := COALESCE(auth.role(), '');
  caller    uuid    := auth.uid();
  self_link boolean;
BEGIN
  -- Backend paths (service_role edge functions, webhooks, migrations) pass.
  IF current_user IN ('service_role', 'postgres', 'supabase_admin')
     OR jwt_role IN ('service_role', 'postgres', 'supabase_admin')
  THEN
    RETURN NEW;
  END IF;

  -- COALESCE: on a pending invite user_id is NULL (see 20261108120000).
  self_link := COALESCE(
    caller IS NOT NULL
    AND NEW.child_id IS NOT DISTINCT FROM OLD.child_id
    AND NEW.user_id = caller
    AND NEW.invited_by = caller
    AND EXISTS (SELECT 1 FROM children c WHERE c.id = NEW.child_id AND c.parent_id = caller),
    false);

  -- NEW (§1): the caregiver themself, on their own row. They may only leave.
  IF NOT self_link
     AND caller IS NOT NULL
     AND OLD.user_id = caller
     AND OLD.invited_by IS DISTINCT FROM caller
  THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NEW.status::text NOT IN ('revoked', 'declined')
    THEN
      RAISE EXCEPTION
        'a caregiver can only leave their own care link (status revoked/declined); invites are accepted through the accept-invite flow'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF (to_jsonb(NEW) - 'status' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'updated_at') THEN
      RAISE EXCEPTION
        'a caregiver can only change the status of their own care link'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  IF (NEW.child_id   IS DISTINCT FROM OLD.child_id
      OR NEW.invited_by IS DISTINCT FROM OLD.invited_by
      OR NEW.user_id    IS DISTINCT FROM OLD.user_id)
     AND NOT self_link
  THEN
    RAISE EXCEPTION
      'child_caregivers.child_id / invited_by / user_id can only be changed by the backend (role=%, jwt=%)',
      current_user, jwt_role
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.is_locked IS DISTINCT FROM OLD.is_locked THEN
    RAISE EXCEPTION
      'child_caregivers.is_locked is managed by the billing backend (role=%, jwt=%)',
      current_user, jwt_role
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.status = 'accepted'
     AND OLD.status IS DISTINCT FROM 'accepted'
     AND NOT self_link
  THEN
    RAISE EXCEPTION
      'invites can only be accepted through the accept-invite flow (role=%, jwt=%)',
      current_user, jwt_role
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

DO $do$
BEGIN
  IF to_regclass('public.child_caregivers') IS NULL THEN
    RAISE WARNING '§1 skipped: public.child_caregivers does not exist';
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS child_caregivers_update_by_invitee ON public.child_caregivers';
  EXECUTE $p$
    CREATE POLICY child_caregivers_update_by_invitee ON public.child_caregivers
      FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (
        user_id = auth.uid()
        AND status::text IN ('revoked', 'declined')
      )
  $p$;

  -- The trigger already exists (20261107120000); recreate so a DB that missed
  -- that migration still gets the guard.
  EXECUTE 'DROP TRIGGER IF EXISTS child_caregivers_identity_guard ON public.child_caregivers';
  EXECUTE $t$
    CREATE TRIGGER child_caregivers_identity_guard
      BEFORE UPDATE ON public.child_caregivers
      FOR EACH ROW
      EXECUTE FUNCTION guard_child_caregivers_identity()
  $t$;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '§1 (child_caregivers) NOT applied: %', SQLERRM;
END $do$;

-- Legacy care_circle (schema.sql only, unused by the app — the live system is
-- child_caregivers): "Members can accept invite" let a member rewrite their own
-- row (status, permissions, children_access). No code path uses it.
DO $do$
BEGIN
  IF to_regclass('public.care_circle') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Members can accept invite" ON public.care_circle';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '§1 (care_circle legacy member update) NOT applied: %', SQLERRM;
END $do$;


-- ─── §2: private channels — enforced in the database ────────────────────────
-- Found (live policy set after 20260718200000):
--   channel_posts   SELECT channel_posts_read_visible  (visibility + blocks only)
--                   INSERT channel_posts_insert / "Authenticated users can create posts" (author only)
--                   UPDATE channel_posts_update / "Authors can update own posts" (author only → can move channel_id)
--   post_comments   SELECT post_comments_read_visible; INSERT author only (two policies)
--   post_reactions  SELECT USING (true) ×2; FOR ALL USING (user_id = auth.uid()) ×2
--   polls / poll_options / poll_votes  SELECT USING (true)
--   channel_members INSERT channel_members_insert (user_id = auth.uid()) AND
--                   "Users can manage own membership" FOR ALL (same) → join any channel;
--                   UPDATE own row unrestricted → re-point channel_id at a private channel
--   channel_requests INSERT only checks user_id → a requester could insert status 'approved'
-- Now: reads of a private channel's posts / comments / reactions / polls need
-- membership (or ownership); posting / commenting / reacting / voting there needs
-- membership; a membership row for a private channel needs an APPROVED request
-- (or the owner adding someone who asked); requests are always created
-- 'pending'; channel_id / user_id / post_id are frozen on UPDATE. Public
-- channels behave exactly as before (non-members can still read and reply).
-- App impact: lib/channelPosts.ts leaveChannel now posts the "left" line before
-- deleting the membership (a non-member can no longer post into a private channel).

DO $do$
BEGIN
  IF to_regclass('public.channel_posts') IS NULL OR to_regclass('public.channels') IS NULL THEN
    RAISE WARNING '§2 channel_posts skipped: table missing';
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS "Anyone can read channel posts" ON public.channel_posts';
  EXECUTE 'DROP POLICY IF EXISTS channel_posts_read ON public.channel_posts';
  EXECUTE 'DROP POLICY IF EXISTS channel_posts_read_visible ON public.channel_posts';
  EXECUTE $p$
    CREATE POLICY channel_posts_read_visible ON public.channel_posts
      FOR SELECT
      USING (
        (moderation_status = 'visible'
          OR (moderation_status = 'hidden' AND auth.uid() = author_id))
        AND NOT EXISTS (
          SELECT 1 FROM user_blocks b
          WHERE b.blocker_id = auth.uid() AND b.blocked_id = channel_posts.author_id
        )
        AND public.can_read_channel(channel_id)
      )
  $p$;

  EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.channel_posts';
  EXECUTE 'DROP POLICY IF EXISTS channel_posts_insert ON public.channel_posts';
  EXECUTE $p$
    CREATE POLICY channel_posts_insert ON public.channel_posts
      FOR INSERT
      WITH CHECK (
        auth.uid() = author_id
        AND public.can_read_channel(channel_id)
      )
  $p$;

  EXECUTE 'DROP POLICY IF EXISTS "Authors can update own posts" ON public.channel_posts';
  EXECUTE 'DROP POLICY IF EXISTS channel_posts_update ON public.channel_posts';
  EXECUTE $p$
    CREATE POLICY channel_posts_update ON public.channel_posts
      FOR UPDATE
      USING (auth.uid() = author_id)
      WITH CHECK (auth.uid() = author_id)
  $p$;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '§2 (channel_posts) NOT applied: %', SQLERRM;
END $do$;

DO $do$
BEGIN
  IF to_regclass('public.post_comments') IS NULL THEN
    RAISE WARNING '§2 post_comments skipped: table missing';
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS "Anyone can read comments" ON public.post_comments';
  EXECUTE 'DROP POLICY IF EXISTS post_comments_read ON public.post_comments';
  EXECUTE 'DROP POLICY IF EXISTS post_comments_read_visible ON public.post_comments';
  EXECUTE $p$
    CREATE POLICY post_comments_read_visible ON public.post_comments
      FOR SELECT
      USING (
        (moderation_status = 'visible'
          OR (moderation_status = 'hidden' AND auth.uid() = author_id))
        AND NOT EXISTS (
          SELECT 1 FROM user_blocks b
          WHERE b.blocker_id = auth.uid() AND b.blocked_id = post_comments.author_id
        )
        AND public.can_read_channel_post(post_id)
      )
  $p$;

  EXECUTE 'DROP POLICY IF EXISTS "Users can create comments" ON public.post_comments';
  EXECUTE 'DROP POLICY IF EXISTS post_comments_insert ON public.post_comments';
  EXECUTE $p$
    CREATE POLICY post_comments_insert ON public.post_comments
      FOR INSERT
      WITH CHECK (
        auth.uid() = author_id
        AND public.can_read_channel_post(post_id)
      )
  $p$;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '§2 (post_comments) NOT applied: %', SQLERRM;
END $do$;

DO $do$
BEGIN
  IF to_regclass('public.post_reactions') IS NULL THEN
    RAISE WARNING '§2 post_reactions skipped: table missing';
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS "Anyone can read reactions" ON public.post_reactions';
  EXECUTE 'DROP POLICY IF EXISTS post_reactions_read ON public.post_reactions';
  EXECUTE $p$
    CREATE POLICY post_reactions_read ON public.post_reactions
      FOR SELECT
      USING (public.can_read_channel_post(post_id))
  $p$;

  EXECUTE 'DROP POLICY IF EXISTS "Users can manage own reactions" ON public.post_reactions';
  EXECUTE 'DROP POLICY IF EXISTS post_reactions_manage ON public.post_reactions';
  EXECUTE $p$
    CREATE POLICY post_reactions_manage ON public.post_reactions
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (
        auth.uid() = user_id
        AND public.can_read_channel_post(post_id)
      )
  $p$;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '§2 (post_reactions) NOT applied: %', SQLERRM;
END $do$;

DO $do$
BEGIN
  IF to_regclass('public.polls') IS NULL
     OR to_regclass('public.poll_options') IS NULL
     OR to_regclass('public.poll_votes') IS NULL
  THEN
    RAISE WARNING '§2 polls skipped: table missing';
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS polls_read ON public.polls';
  EXECUTE $p$
    CREATE POLICY polls_read ON public.polls
      FOR SELECT
      USING (public.can_read_channel(channel_id))
  $p$;

  -- The poll must hang off the author's own post in the SAME channel (otherwise a
  -- poll could claim a private channel_id while sitting on a public post).
  EXECUTE 'DROP POLICY IF EXISTS polls_insert ON public.polls';
  EXECUTE $p$
    CREATE POLICY polls_insert ON public.polls
      FOR INSERT
      WITH CHECK (
        auth.uid() = author_id
        AND public.can_read_channel(channel_id)
        AND EXISTS (
          SELECT 1 FROM channel_posts p
          WHERE p.id = polls.post_id
            AND p.author_id = auth.uid()
            AND p.channel_id = polls.channel_id
        )
      )
  $p$;

  EXECUTE 'DROP POLICY IF EXISTS poll_options_read ON public.poll_options';
  EXECUTE $p$
    CREATE POLICY poll_options_read ON public.poll_options
      FOR SELECT
      USING (public.can_read_poll(poll_id))
  $p$;

  EXECUTE 'DROP POLICY IF EXISTS poll_votes_read ON public.poll_votes';
  EXECUTE $p$
    CREATE POLICY poll_votes_read ON public.poll_votes
      FOR SELECT
      USING (public.can_read_poll(poll_id))
  $p$;

  EXECUTE 'DROP POLICY IF EXISTS poll_votes_own ON public.poll_votes';
  EXECUTE $p$
    CREATE POLICY poll_votes_own ON public.poll_votes
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (
        auth.uid() = user_id
        AND public.can_read_poll(poll_id)
        AND EXISTS (SELECT 1 FROM poll_options o WHERE o.id = option_id AND o.poll_id = poll_votes.poll_id)
        AND EXISTS (SELECT 1 FROM polls p WHERE p.id = poll_votes.poll_id AND (p.closes_at IS NULL OR p.closes_at > now()))
      )
  $p$;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '§2 (polls) NOT applied: %', SQLERRM;
END $do$;

DO $do$
BEGIN
  IF to_regclass('public.channel_members') IS NULL OR to_regclass('public.channel_requests') IS NULL THEN
    RAISE WARNING '§2 channel_members skipped: table missing';
    RETURN;
  END IF;

  -- FOR ALL USING (user_id = auth.uid()) — its implicit WITH CHECK let anyone
  -- insert themselves into any channel. Its read/update/delete halves are covered
  -- by the channel_members_read / _update / _delete policies below.
  EXECUTE 'DROP POLICY IF EXISTS "Users can manage own membership" ON public.channel_members';

  EXECUTE 'DROP POLICY IF EXISTS channel_members_insert ON public.channel_members';
  EXECUTE $p$
    CREATE POLICY channel_members_insert ON public.channel_members
      FOR INSERT
      WITH CHECK (
        -- joining yourself: public channel, your own channel, or an approved request
        (
          auth.uid() = user_id
          AND (
            NOT public.channel_is_private(channel_id)
            OR public.is_channel_owner(channel_id)
            OR public.has_channel_request(channel_id, user_id, ARRAY['approved'])
          )
        )
        -- the owner adding someone who asked to join
        OR (
          public.is_channel_owner(channel_id)
          AND public.has_channel_request(channel_id, user_id, ARRAY['pending', 'approved'])
        )
      )
  $p$;

  EXECUTE 'DROP POLICY IF EXISTS channel_members_update ON public.channel_members';
  EXECUTE $p$
    CREATE POLICY channel_members_update ON public.channel_members
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id)
  $p$;

  EXECUTE 'DROP POLICY IF EXISTS channel_members_delete ON public.channel_members';
  EXECUTE $p$
    CREATE POLICY channel_members_delete ON public.channel_members
      FOR DELETE
      USING (auth.uid() = user_id)
  $p$;

  -- Keep the existing public membership read (unchanged semantics) if a DB only
  -- ever had the legacy name.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'channel_members'
      AND policyname IN ('channel_members_read', 'Anyone can read memberships')
  ) THEN
    EXECUTE 'CREATE POLICY channel_members_read ON public.channel_members FOR SELECT USING (true)';
  END IF;

  -- Membership rows can't be re-pointed at another channel / user.
  EXECUTE 'DROP TRIGGER IF EXISTS trg_guard_protected_columns ON public.channel_members';
  EXECUTE $t$
    CREATE TRIGGER trg_guard_protected_columns
      BEFORE INSERT OR UPDATE ON public.channel_members
      FOR EACH ROW
      EXECUTE FUNCTION public.guard_protected_columns('{}', '["channel_id", "user_id"]')
  $t$;

  -- Requests are always born 'pending'; only the owner resolves them
  -- (channel_requests_update, unchanged), and nobody re-points them.
  EXECUTE 'DROP POLICY IF EXISTS channel_requests_insert ON public.channel_requests';
  EXECUTE $p$
    CREATE POLICY channel_requests_insert ON public.channel_requests
      FOR INSERT
      WITH CHECK (
        auth.uid() = user_id
        AND status = 'pending'
        AND resolved_at IS NULL
        AND resolved_by IS NULL
      )
  $p$;

  EXECUTE 'DROP TRIGGER IF EXISTS trg_guard_protected_columns ON public.channel_requests';
  EXECUTE $t$
    CREATE TRIGGER trg_guard_protected_columns
      BEFORE INSERT OR UPDATE ON public.channel_requests
      FOR EACH ROW
      EXECUTE FUNCTION public.guard_protected_columns('{}', '["channel_id", "user_id"]')
  $t$;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '§2 (channel_members / channel_requests) NOT applied: %', SQLERRM;
END $do$;


-- ─── §3: moderation + counter columns are backend-only ──────────────────────
-- Found: channel_posts_update / garage_posts_update / "Owner can manage own
-- listings" are author-scoped with no column limits, so an author could set
-- moderation_status = 'visible' on a hidden post, write reaction_count /
-- like_count / share_count, self-pin (is_pinned) or self-feature (is_featured),
-- and set any of them on INSERT. channels_update let the owner write
-- member_count. post_reactions / circle_post_reactions are FOR ALL policies, so a
-- user could UPDATE their reaction's post_id to another post: the count triggers
-- only fire on INSERT/DELETE, so react → move → react again inflated the first
-- post's count without bound.
-- Now: guard_protected_columns on each table — on INSERT the listed columns are
-- forced to their defaults, on UPDATE they (plus identity columns) are frozen for
-- non-privileged callers. The SECURITY DEFINER count triggers / RPCs
-- (channel_posts_bump_reaction_count, update_channel_reply_count,
-- update_garage_like_count, increment_garage_share_count, circles_bump_*,
-- update_channel_member_count) run as postgres and keep working.
-- App impact: none — no client writes these columns (grep: only reads + local
-- optimistic state). Existing drifted counts are NOT recomputed (no data rewrite).
DO $do$
DECLARE
  spec record;
BEGIN
  FOR spec IN
    SELECT * FROM (VALUES
      ('channel_posts',
       '{"moderation_status":"visible","reaction_count":0,"comment_count":0,"reply_count":0,"is_pinned":false}',
       '["moderation_status","reaction_count","comment_count","reply_count","is_pinned","channel_id","author_id"]'),
      ('post_comments',
       '{"moderation_status":"visible"}',
       '["moderation_status","post_id","author_id"]'),
      ('circle_posts',
       '{"moderation_status":"visible","reaction_count":0,"reply_count":0}',
       '["moderation_status","reaction_count","reply_count","circle_id","author_id","reply_to_id"]'),
      ('garage_posts',
       '{"moderation_status":"visible","like_count":0,"comment_count":0,"share_count":0,"is_featured":false}',
       '["moderation_status","like_count","comment_count","share_count","is_featured","author_id"]'),
      ('garage_listings',
       '{"moderation_status":"visible"}',
       '["moderation_status","user_id"]'),
      ('channels',
       '{"member_count":0}',
       '["member_count","created_by"]'),
      ('post_reactions',
       '{}',
       '["post_id","user_id"]'),
      ('circle_post_reactions',
       '{}',
       '["post_id","user_id"]'),
      ('garage_post_likes',
       '{}',
       '["post_id","user_id"]')
    ) AS t(tbl, defaults, frozen)
  LOOP
    BEGIN
      IF to_regclass(format('public.%I', spec.tbl)) IS NULL THEN
        RAISE NOTICE '§3: public.% does not exist, skipped', spec.tbl;
        CONTINUE;
      END IF;
      EXECUTE format('DROP TRIGGER IF EXISTS trg_guard_protected_columns ON public.%I', spec.tbl);
      EXECUTE format(
        'CREATE TRIGGER trg_guard_protected_columns BEFORE INSERT OR UPDATE ON public.%I '
        'FOR EACH ROW EXECUTE FUNCTION public.guard_protected_columns(%L, %L)',
        spec.tbl, spec.defaults, spec.frozen);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '§3: guard on public.% NOT applied: %', spec.tbl, SQLERRM;
    END;
  END LOOP;
END $do$;


-- ─── §4: blocking reaches the Garage and trigger-made notifications ─────────
-- Found: garage_posts_read / garage_post_comments_read are USING (true); only
-- garage_listings filtered blocked authors. The notify_* triggers
-- (20260409010000 / 20260412010000 / 20260522030000) insert notifications with
-- no user_blocks check (create_notification already has one — 20261107130000).
-- Now: blocked authors' garage posts + comments are hidden from the blocker
-- (same one-way rule as channel posts); someone you blocked can't like / comment
-- on your garage post; every actor-driven notify_* trigger skips the
-- notification when either side has blocked the other. Bodies are otherwise the
-- latest versions from the repo; notify_post_comment also reads NEW.author_id
-- (post_comments has no user_id column — the old body raised on every insert).
DO $do$
BEGIN
  IF to_regclass('public.garage_posts') IS NULL OR to_regclass('public.user_blocks') IS NULL THEN
    RAISE WARNING '§4 garage_posts skipped: table missing';
  ELSE
    EXECUTE 'DROP POLICY IF EXISTS garage_posts_read ON public.garage_posts';
    EXECUTE $p$
      CREATE POLICY garage_posts_read ON public.garage_posts
        FOR SELECT
        USING (
          NOT EXISTS (
            SELECT 1 FROM user_blocks b
            WHERE b.blocker_id = auth.uid() AND b.blocked_id = garage_posts.author_id
          )
        )
    $p$;
  END IF;

  IF to_regclass('public.garage_post_comments') IS NOT NULL AND to_regclass('public.garage_posts') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS garage_post_comments_read ON public.garage_post_comments';
    EXECUTE $p$
      CREATE POLICY garage_post_comments_read ON public.garage_post_comments
        FOR SELECT
        USING (
          NOT EXISTS (
            SELECT 1 FROM user_blocks b
            WHERE b.blocker_id = auth.uid() AND b.blocked_id = garage_post_comments.author_id
          )
        )
    $p$;

    EXECUTE 'DROP POLICY IF EXISTS garage_post_comments_insert ON public.garage_post_comments';
    EXECUTE $p$
      CREATE POLICY garage_post_comments_insert ON public.garage_post_comments
        FOR INSERT
        WITH CHECK (
          auth.uid() = author_id
          AND NOT public.has_blocked_me((SELECT gp.author_id FROM garage_posts gp WHERE gp.id = garage_post_comments.post_id))
        )
    $p$;
  END IF;

  IF to_regclass('public.garage_post_likes') IS NOT NULL AND to_regclass('public.garage_posts') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS garage_post_likes_insert ON public.garage_post_likes';
    EXECUTE $p$
      CREATE POLICY garage_post_likes_insert ON public.garage_post_likes
        FOR INSERT
        WITH CHECK (
          auth.uid() = user_id
          AND NOT public.has_blocked_me((SELECT gp.author_id FROM garage_posts gp WHERE gp.id = garage_post_likes.post_id))
        )
    $p$;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '§4 (garage policies) NOT applied: %', SQLERRM;
END $do$;

CREATE OR REPLACE FUNCTION notify_garage_like() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  post_owner UUID;
  post_caption TEXT;
  liker_name TEXT;
BEGIN
  SELECT author_id, LEFT(caption, 60) INTO post_owner, post_caption
  FROM garage_posts WHERE id = NEW.post_id;
  IF post_owner IS NULL OR post_owner = NEW.user_id THEN RETURN NEW; END IF;
  IF public.users_blocked_either_way(post_owner, NEW.user_id) THEN RETURN NEW; END IF;
  SELECT name INTO liker_name FROM profiles WHERE id = NEW.user_id;
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (post_owner, 'like', COALESCE(liker_name, 'Someone') || ' liked your post', post_caption,
          jsonb_build_object('postId', NEW.post_id, 'type', 'garage'));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_garage_comment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  post_owner UUID;
  post_caption TEXT;
  commenter_name TEXT;
BEGIN
  SELECT author_id, LEFT(caption, 60) INTO post_owner, post_caption
  FROM garage_posts WHERE id = NEW.post_id;
  IF post_owner IS NULL OR post_owner = NEW.author_id THEN RETURN NEW; END IF;
  IF public.users_blocked_either_way(post_owner, NEW.author_id) THEN RETURN NEW; END IF;
  commenter_name := COALESCE(NEW.author_name, 'Someone');
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (post_owner, 'reply', commenter_name || ' commented on your post', LEFT(NEW.content, 80),
          jsonb_build_object('postId', NEW.post_id, 'type', 'garage'));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_garage_save() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_post_author_id uuid;
  v_saver_name text;
BEGIN
  SELECT author_id INTO v_post_author_id FROM garage_posts WHERE id = NEW.post_id;
  IF v_post_author_id IS NULL OR v_post_author_id = NEW.user_id THEN RETURN NEW; END IF;
  IF public.users_blocked_either_way(v_post_author_id, NEW.user_id) THEN RETURN NEW; END IF;
  SELECT COALESCE(name, 'Someone') INTO v_saver_name FROM profiles WHERE id = NEW.user_id;
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (v_post_author_id, 'like', COALESCE(v_saver_name, 'Someone') || ' saved your garage post',
          'Your post is popular!', jsonb_build_object('postId', NEW.post_id));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_channel_join() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ch_owner UUID;
  ch_name TEXT;
  joiner_name TEXT;
BEGIN
  SELECT created_by, name INTO ch_owner, ch_name FROM channels WHERE id = NEW.channel_id;
  IF ch_owner IS NULL OR ch_owner = NEW.user_id THEN RETURN NEW; END IF;
  IF public.users_blocked_either_way(ch_owner, NEW.user_id) THEN RETURN NEW; END IF;
  SELECT name INTO joiner_name FROM profiles WHERE id = NEW.user_id;
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (ch_owner, 'channel', COALESCE(joiner_name, 'Someone') || ' joined #' || ch_name, NULL,
          jsonb_build_object('channelId', NEW.channel_id));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_channel_reaction() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  msg_author UUID;
  msg_content TEXT;
  ch_name TEXT;
  reactor_name TEXT;
BEGIN
  SELECT cp.author_id, LEFT(cp.content, 60), c.name
  INTO msg_author, msg_content, ch_name
  FROM channel_posts cp
  JOIN channels c ON c.id = cp.channel_id
  WHERE cp.id = NEW.post_id;
  IF msg_author IS NULL OR msg_author = NEW.user_id THEN RETURN NEW; END IF;
  IF public.users_blocked_either_way(msg_author, NEW.user_id) THEN RETURN NEW; END IF;
  SELECT name INTO reactor_name FROM profiles WHERE id = NEW.user_id;
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (msg_author, 'like',
          COALESCE(reactor_name, 'Someone') || ' liked your message in #' || COALESCE(ch_name, 'channel'),
          msg_content,
          jsonb_build_object('channelId', (SELECT channel_id FROM channel_posts WHERE id = NEW.post_id)));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_thread_reply() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  parent_author UUID;
  parent_content TEXT;
  ch_name TEXT;
  replier_name TEXT;
BEGIN
  IF NEW.reply_to_id IS NULL THEN RETURN NEW; END IF;
  SELECT cp.author_id, LEFT(cp.content, 60), c.name
  INTO parent_author, parent_content, ch_name
  FROM channel_posts cp
  JOIN channels c ON c.id = cp.channel_id
  WHERE cp.id = NEW.reply_to_id;
  IF parent_author IS NULL OR parent_author = NEW.author_id THEN RETURN NEW; END IF;
  IF public.users_blocked_either_way(parent_author, NEW.author_id) THEN RETURN NEW; END IF;
  replier_name := COALESCE(NEW.author_name, 'Someone');
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (parent_author, 'reply',
          replier_name || ' replied to your message in #' || COALESCE(ch_name, 'channel'),
          LEFT(NEW.content, 80),
          jsonb_build_object('channelId', NEW.channel_id, 'threadId', NEW.reply_to_id));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_post_comment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_post_author_id uuid;
  v_commenter_name text;
BEGIN
  SELECT author_id INTO v_post_author_id FROM channel_posts WHERE id = NEW.post_id;
  IF v_post_author_id IS NULL OR v_post_author_id = NEW.author_id THEN RETURN NEW; END IF;
  IF public.users_blocked_either_way(v_post_author_id, NEW.author_id) THEN RETURN NEW; END IF;
  SELECT COALESCE(name, 'Someone') INTO v_commenter_name FROM profiles WHERE id = NEW.author_id;
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (v_post_author_id, 'reply', COALESCE(v_commenter_name, 'Someone') || ' commented on your post',
          LEFT(COALESCE(NEW.content, ''), 80),
          jsonb_build_object('postId', NEW.post_id, 'commentId', NEW.id));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_channel_save() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner_id uuid;
  v_channel_name text;
  v_saver_name text;
BEGIN
  SELECT created_by, name INTO v_owner_id, v_channel_name FROM channels WHERE id = NEW.channel_id;
  IF v_owner_id IS NULL OR v_owner_id = NEW.user_id THEN RETURN NEW; END IF;
  IF public.users_blocked_either_way(v_owner_id, NEW.user_id) THEN RETURN NEW; END IF;
  SELECT COALESCE(name, 'Someone') INTO v_saver_name FROM profiles WHERE id = NEW.user_id;
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (v_owner_id, 'channel', COALESCE(v_saver_name, 'Someone') || ' saved #' || v_channel_name,
          'Your channel is getting noticed!', jsonb_build_object('channelId', NEW.channel_id));
  RETURN NEW;
END;
$$;


-- ─── §5: circle posts — authors delete their own, anyone in the circle reports
-- Found: circle_posts has only INSERT (author) and SELECT-own policies — no
-- DELETE. content_reports.content_type CHECK allows only channel_post /
-- post_comment / garage_listing. Circles are open to every signed-in user (the
-- read path is circle_posts_public), so "circle member" = authenticated.
-- Now:
--   * circle_posts_delete_own: an author deletes their own post. Replies to it go
--     too (reply_to_id ON DELETE CASCADE — existing schema); counts stay right via
--     the existing SECURITY DEFINER triggers.
--   * content_reports accepts 'circle_post' (constraint swapped NOT VALID, then
--     validated). A circle report must target a visible circle post, and its
--     author_id is forced NULL: the reporter can read their own report row, so
--     storing the author there would de-anonymise the poster. Moderation resolves
--     the author from content_id with the service role.
--   * circle_posts_public gains is_mine (true only for the caller's own posts —
--     reveals nothing cross-user) so the app can offer "Delete" on own posts.
-- Channel reports keep their existing rules (reporter = caller).
DO $do$
BEGIN
  IF to_regclass('public.circle_posts') IS NULL THEN
    RAISE WARNING '§5 circle_posts skipped: table missing';
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS circle_posts_delete_own ON public.circle_posts';
  EXECUTE $p$
    CREATE POLICY circle_posts_delete_own ON public.circle_posts
      FOR DELETE
      USING (auth.uid() = author_id)
  $p$;

  IF to_regclass('public.circle_handles') IS NOT NULL AND to_regclass('public.circle_post_reactions') IS NOT NULL THEN
    -- Same column list as 20260718140000 with is_mine appended at the tail, so
    -- CREATE OR REPLACE keeps grants and dependants.
    EXECUTE $v$
      CREATE OR REPLACE VIEW public.circle_posts_public AS
      SELECT
        p.id,
        p.circle_id,
        p.content,
        p.reply_to_id,
        p.reaction_count,
        p.reply_count,
        p.created_at,
        COALESCE(h.handle, 'Anonymous') AS handle,
        EXISTS (
          SELECT 1 FROM circle_post_reactions r
          WHERE r.post_id = p.id AND r.user_id = auth.uid()
        ) AS has_reacted,
        (p.author_id = auth.uid()) AS is_mine
      FROM circle_posts p
      LEFT JOIN circle_handles h ON h.circle_id = p.circle_id AND h.user_id = p.author_id
      WHERE p.moderation_status = 'visible'
    $v$;
    EXECUTE 'ALTER VIEW public.circle_posts_public SET (security_invoker = false)';
    EXECUTE 'REVOKE ALL ON public.circle_posts_public FROM PUBLIC, anon';
    EXECUTE 'GRANT SELECT ON public.circle_posts_public TO authenticated';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '§5 (circle_posts delete / view) NOT applied: %', SQLERRM;
END $do$;

CREATE OR REPLACE FUNCTION public.circle_post_reportable(p_post uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM circle_posts p WHERE p.id = p_post AND p.moderation_status = 'visible'
  );
$$;
REVOKE EXECUTE ON FUNCTION public.circle_post_reportable(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.circle_post_reportable(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.content_reports_anonymise_circle()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.content_type = 'circle_post' THEN
    NEW.author_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DO $do$
DECLARE
  con record;
BEGIN
  IF to_regclass('public.content_reports') IS NULL THEN
    RAISE WARNING '§5 content_reports skipped: table missing';
    RETURN;
  END IF;

  -- Drop whichever CHECK currently constrains content_type (name may differ by env).
  FOR con IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.content_reports'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%content_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.content_reports DROP CONSTRAINT %I', con.conname);
  END LOOP;
  EXECUTE $c$
    ALTER TABLE public.content_reports
      ADD CONSTRAINT content_reports_content_type_check
      CHECK (content_type IN ('channel_post', 'post_comment', 'garage_listing', 'circle_post'))
      NOT VALID
  $c$;
  EXECUTE 'ALTER TABLE public.content_reports VALIDATE CONSTRAINT content_reports_content_type_check';

  EXECUTE 'DROP POLICY IF EXISTS content_reports_create_own ON public.content_reports';
  EXECUTE $p$
    CREATE POLICY content_reports_create_own ON public.content_reports
      FOR INSERT
      WITH CHECK (
        auth.uid() = reporter_id
        AND (content_type <> 'circle_post' OR public.circle_post_reportable(content_id))
      )
  $p$;

  EXECUTE 'DROP TRIGGER IF EXISTS trg_content_reports_anonymise_circle ON public.content_reports';
  EXECUTE $t$
    CREATE TRIGGER trg_content_reports_anonymise_circle
      BEFORE INSERT OR UPDATE ON public.content_reports
      FOR EACH ROW
      EXECUTE FUNCTION public.content_reports_anonymise_circle()
  $t$;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '§5 (content_reports) NOT applied: %', SQLERRM;
END $do$;


-- ─── §6: channel ownership transfer ─────────────────────────────────────────
-- Found: channels_update is USING (auth.uid() = created_by) with no WITH CHECK,
-- so the new row must ALSO have created_by = auth.uid() — every transfer failed
-- (lib/channelPosts.ts transferChannelOwnership surfaced it as "not applied").
-- §3 now also freezes created_by for clients. Transfers go through this RPC:
-- caller must be the current owner, the new owner must be a current member and
-- not the caller. Row-locks the channel so two concurrent transfers serialize.
-- App impact: lib/channelPosts.ts transferChannelOwnership calls the RPC.
CREATE OR REPLACE FUNCTION public.transfer_channel_ownership(p_channel_id uuid, p_new_owner uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_owner  uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'auth required' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT created_by INTO v_owner FROM channels WHERE id = p_channel_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'channel not found' USING ERRCODE = 'no_data_found';
  END IF;
  IF v_owner IS DISTINCT FROM v_caller THEN
    RAISE EXCEPTION 'only the channel owner can transfer ownership' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_new_owner IS NULL OR p_new_owner = v_caller THEN
    RAISE EXCEPTION 'choose another member to become the owner' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM channel_members WHERE channel_id = p_channel_id AND user_id = p_new_owner
  ) THEN
    RAISE EXCEPTION 'the new owner must be a member of the channel' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  UPDATE channels SET created_by = p_new_owner WHERE id = p_channel_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.transfer_channel_ownership(uuid, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.transfer_channel_ownership(uuid, uuid) TO authenticated, service_role;

DO $do$
BEGIN
  IF to_regclass('public.channels') IS NULL THEN
    RAISE WARNING '§6 skipped: public.channels does not exist';
    RETURN;
  END IF;
  -- Explicit WITH CHECK (same predicate it had implicitly) — documents that a
  -- direct UPDATE can never hand the channel to someone else.
  EXECUTE 'DROP POLICY IF EXISTS channels_update ON public.channels';
  EXECUTE $p$
    CREATE POLICY channels_update ON public.channels
      FOR UPDATE
      USING (auth.uid() = created_by)
      WITH CHECK (auth.uid() = created_by)
  $p$;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '§6 (channels_update) NOT applied: %', SQLERRM;
END $do$;


-- ─── §7: caregiver seat limit on the ACCEPT path ────────────────────────────
-- Found: enforce_seat_limit_on_insert (20261102200000) runs only BEFORE INSERT.
-- A pending invite counts as no seat, so an owner at the cap could keep issuing
-- invites (or re-pending revoked rows) and every one of them could be accepted.
-- Now: BEFORE UPDATE OF status trigger — any transition into 'accepted' for a
-- non-parent, unlocked row re-checks the cap under the same per-owner row lock
-- the insert trigger takes (profiles FOR UPDATE), so concurrent accepts
-- serialize. A seat is a PERSON: a caregiver who already holds an active seat
-- with this owner (another child of the same family) takes no new seat — that's
-- what lets accept-invite accept a multi-child invite's sibling rows. Uses
-- effective_seat_limit() (paywall flag OFF → Family cap for everyone).
-- caregiver_accept_exceeds_seats() is also callable by the service role so the
-- edge function can return a clear error before attempting the update.
CREATE OR REPLACE FUNCTION public.caregiver_accept_exceeds_seats(p_invited_by uuid, p_user_id uuid, p_row_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier  subscription_tier;
  v_limit int;
  v_used  int;
BEGIN
  SELECT subscription_tier INTO v_tier FROM profiles WHERE id = p_invited_by;
  v_limit := public.effective_seat_limit(COALESCE(v_tier, 'free'::subscription_tier));

  IF p_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM child_caregivers
    WHERE invited_by = p_invited_by
      AND user_id = p_user_id
      AND status = 'accepted'
      AND COALESCE(is_locked, false) = false
      AND role <> 'parent'
      AND id IS DISTINCT FROM p_row_id
  ) THEN
    RETURN false;
  END IF;

  SELECT count(DISTINCT COALESCE(user_id::text, id::text)) INTO v_used
  FROM child_caregivers
  WHERE invited_by = p_invited_by
    AND status = 'accepted'
    AND COALESCE(is_locked, false) = false
    AND role <> 'parent'
    AND id IS DISTINCT FROM p_row_id;

  RETURN v_used >= v_limit;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.caregiver_accept_exceeds_seats(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.caregiver_accept_exceeds_seats(uuid, uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.enforce_seat_limit_on_accept()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM 'accepted'
     OR OLD.status = 'accepted'
     OR NEW.role = 'parent'
     OR COALESCE(NEW.is_locked, false)
  THEN
    RETURN NEW;
  END IF;

  -- Serialize with invites and other accepts for the same owner.
  PERFORM 1 FROM profiles WHERE id = NEW.invited_by FOR UPDATE;

  IF public.caregiver_accept_exceeds_seats(NEW.invited_by, NEW.user_id, NEW.id) THEN
    RAISE EXCEPTION 'seat_limit_exceeded' USING
      ERRCODE = 'P0001',
      HINT = 'The care circle is full. The owner can free a seat or upgrade.';
  END IF;

  RETURN NEW;
END;
$$;

DO $do$
BEGIN
  IF to_regclass('public.child_caregivers') IS NULL THEN
    RAISE WARNING '§7 skipped: public.child_caregivers does not exist';
    RETURN;
  END IF;
  EXECUTE 'DROP TRIGGER IF EXISTS child_caregivers_seat_limit_on_accept ON public.child_caregivers';
  EXECUTE $t$
    CREATE TRIGGER child_caregivers_seat_limit_on_accept
      BEFORE UPDATE OF status ON public.child_caregivers
      FOR EACH ROW
      EXECUTE FUNCTION public.enforce_seat_limit_on_accept()
  $t$;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '§7 (seat limit on accept) NOT applied: %', SQLERRM;
END $do$;


NOTIFY pgrst, 'reload schema';
