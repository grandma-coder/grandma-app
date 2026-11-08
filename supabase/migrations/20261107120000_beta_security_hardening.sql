-- ════════════════════════════════════════════════════════════════════════════
-- Beta security hardening — 2026-11-07 (pre-beta RLS audit)
--
-- Closes the findings of the read-only RLS audit that are safe to fix in SQL
-- alone. Each block below says, in plain English, which attack it closes.
--
--   C1  child_caregivers: an inviter could rewrite their own invite row to point
--       at another family's child / themselves / accepted / full permissions.
--   H2  leaderboard_scores: any signed-in user could list every user's name,
--       photo and pregnancy/cycle/child activity counts.
--   H3  profiles.is_verified_expert / expert_title: users could self-award the
--       verified-expert badge through their own profile UPDATE.
--   M3  scan_history INSERT: OR-ed WITH CHECK let a user file scans under another
--       user's id (against their own child) or under their id against any child.
--   M4  kids_vaccine_schedule / nanny_notes / kids_reminders: caregiver branches
--       ignored the lock (downgrade) and pause flags.
--   M1  community tables still readable by the anon key (no login).
--   Low active_seats_for(uuid) callable by anyone (caregiver-count probe).
--
-- Deferred (documented in docs/beta/2026-11-07-beta-readiness-plan.md §2):
--   H1 children SELECT exposes medical columns to caregivers, H4 tables not
--   created in repo migrations, M2 create_notification RPC, M5 privacy toggles,
--   storage garage buckets.
--
-- Conventions:
--   * Re-run safe: DROP … IF EXISTS + CREATE, CREATE OR REPLACE, guarded renames.
--   * Every table-dependent block is a DO block guarded by to_regclass and wrapped
--     in EXCEPTION WHEN OTHERS → RAISE WARNING, so one missing table cannot abort
--     the rest of the migration. Read the WARNING lines in the output: a warning
--     means that fix did NOT land.
--   * "Privileged caller" = the same dual check as guard_subscription_tier
--     (20260626160000): current_user OR the JWT role (auth.role()) is one of
--     service_role / postgres / supabase_admin. Guard functions are SECURITY
--     INVOKER so current_user reflects the real caller.
--   * Lock/pause predicate, verbatim from P0/P2 (20260615120000, 20260616130000):
--       AND COALESCE(is_locked, false) = false
--       AND COALESCE((permissions->>'_paused')::boolean, false) = false
-- ════════════════════════════════════════════════════════════════════════════


-- ─── C1: child_caregivers — inviter can no longer hijack an invite row ──────
-- Attack: child_caregivers_update_by_inviter only checked invited_by = auth.uid()
-- on the NEW row. A parent could PATCH their own (pending) invite row to
--   child_id = <another family's child>, user_id = <self>, status = 'accepted',
--   permissions = everything
-- and instantly gain caregiver access to a stranger's child. Two layers:
--   (1) the policy WITH CHECK now also requires the row's child to be the
--       caller's own child, and
--   (2) a BEFORE UPDATE trigger freezes the identity columns (child_id,
--       invited_by, user_id) and the seat lock (is_locked) for non-privileged
--       callers, and refuses client-side transitions INTO status 'accepted'.
-- The app only ever UPDATEs role / status ('pending', 'revoked') / permissions
-- (app/profile/care-circle.tsx, app/manage-caregivers.tsx). Accepting an invite
-- goes through the accept-invite edge function with the service role, and seat
-- locking runs from the revenuecat-webhook (service role) — both stay allowed.
-- Blocking client-side "→ accepted" also closes two side doors: a revoked
-- caregiver flipping their own row back to accepted via the invitee policy, and
-- an inviter reinstating a revoked caregiver without the seat-limit check.
-- Narrow exception: a parent linking THEMSELVES to THEIR OWN child (user_id =
-- invited_by = caller, child unchanged and owned by caller) — the dev-panel
-- "Backfill caregiver links" repair (lib/devSeed.ts) does exactly that; it grants
-- nothing the parent doesn't already have.

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

  self_link := caller IS NOT NULL
    AND NEW.child_id IS NOT DISTINCT FROM OLD.child_id
    AND NEW.user_id = caller
    AND NEW.invited_by = caller
    AND EXISTS (SELECT 1 FROM children c WHERE c.id = NEW.child_id AND c.parent_id = caller);

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
    RAISE WARNING 'C1 skipped: public.child_caregivers does not exist';
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS child_caregivers_update_by_inviter ON public.child_caregivers';
  EXECUTE $p$
    CREATE POLICY child_caregivers_update_by_inviter ON public.child_caregivers
      FOR UPDATE
      USING (invited_by = auth.uid())
      WITH CHECK (
        invited_by = auth.uid()
        AND child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
      )
  $p$;

  EXECUTE 'DROP TRIGGER IF EXISTS child_caregivers_identity_guard ON public.child_caregivers';
  EXECUTE $t$
    CREATE TRIGGER child_caregivers_identity_guard
      BEFORE UPDATE ON public.child_caregivers
      FOR EACH ROW
      EXECUTE FUNCTION guard_child_caregivers_identity()
  $t$;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'C1 (child_caregivers) NOT applied: %', SQLERRM;
END $do$;


-- ─── H2: leaderboard_scores — callers see only their own row ────────────────
-- Attack: leaderboard_scores runs with its owner's rights (security_invoker =
-- false, needed so the per-user counts aggregate across RLS) and is granted to
-- authenticated, so any signed-in user could SELECT * and enumerate every user's
-- name, photo and pregnancy / cycle / child log counts (health-adjacent data).
-- App reality for beta: lib/badgeSync.ts reads only the caller's own row; the
-- leaderboard list (lib/leaderboard.ts) sits behind a flag that is OFF.
-- Fix without touching the view body:
--   * rename the full view to leaderboard_scores_all and revoke it from every
--     client role (owner rights kept so the aggregation still works);
--   * recreate leaderboard_scores as a thin wrapper that returns only the row
--     whose user_id = auth.uid(). The wrapper also runs with owner rights
--     (security_invoker = false) because clients can no longer read _all.
--   * current_user inside a view is still the CALLER, so backend roles
--     (postgres / service_role / supabase_admin — e.g. the admin dashboard's
--     total_points lookup in admin/server/routers/users.ts) keep seeing all rows.
-- When the public leaderboard ships, replace the wrapper with an opt-in view
-- (or point lib/leaderboard.ts at a SECURITY DEFINER RPC that returns only
-- opted-in users) — do NOT simply re-grant _all.
DO $do$
BEGIN
  -- Rename once. On re-run _all already exists and the wrapper is left alone.
  IF to_regclass('public.leaderboard_scores_all') IS NULL
     AND to_regclass('public.leaderboard_scores') IS NOT NULL
  THEN
    EXECUTE 'ALTER VIEW public.leaderboard_scores RENAME TO leaderboard_scores_all';
  END IF;

  IF to_regclass('public.leaderboard_scores_all') IS NULL THEN
    RAISE WARNING 'H2 skipped: neither leaderboard_scores nor leaderboard_scores_all exists';
    RETURN;
  END IF;

  -- Full view: owner rights (aggregates across users), no client access.
  EXECUTE 'ALTER VIEW public.leaderboard_scores_all SET (security_invoker = false)';
  EXECUTE 'REVOKE ALL ON public.leaderboard_scores_all FROM PUBLIC, anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.leaderboard_scores_all TO service_role';

  -- Wrapper: same columns, one row per caller.
  EXECUTE $v$
    CREATE OR REPLACE VIEW public.leaderboard_scores
    WITH (security_invoker = false) AS
    SELECT *
    FROM public.leaderboard_scores_all
    WHERE user_id = auth.uid()
       OR current_user IN ('postgres', 'service_role', 'supabase_admin')
  $v$;

  -- Supabase default privileges grant new public objects to anon; take it back.
  EXECUTE 'REVOKE ALL ON public.leaderboard_scores FROM PUBLIC, anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.leaderboard_scores TO authenticated, service_role';

  EXECUTE $c$
    COMMENT ON VIEW public.leaderboard_scores IS
      'Caller-only wrapper over leaderboard_scores_all (owner rights). Returns the row where user_id = auth.uid(); backend roles see all. Do not grant leaderboard_scores_all to clients.'
  $c$;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'H2 (leaderboard_scores) NOT applied: %', SQLERRM;
END $do$;


-- ─── H3: profiles — verified-expert badge is backend-only ───────────────────
-- Attack: is_verified_expert / expert_title live on profiles, and the owner
-- UPDATE policy doesn't restrict columns, so any user could PATCH their own row
-- to is_verified_expert = true, expert_title = 'Pediatrician' and show a
-- verified badge on every community post (profiles_public exposes both columns).
-- Same for a client-side profile INSERT/upsert (app/profile/personal.tsx upserts
-- profiles). Fix, modelled on guard_subscription_tier:
--   * UPDATE that changes either column → rejected unless privileged caller;
--   * INSERT by a non-privileged caller → both columns forced to their defaults
--     (silently, so a normal sign-up/upsert never fails).
-- Verification is granted by the admin dashboard / service role — unaffected.

CREATE OR REPLACE FUNCTION guard_expert_verification()
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
    NEW.is_verified_expert := false;
    NEW.expert_title := NULL;
  ELSIF NEW.is_verified_expert IS DISTINCT FROM OLD.is_verified_expert
     OR NEW.expert_title IS DISTINCT FROM OLD.expert_title
  THEN
    RAISE EXCEPTION
      'expert verification can only be changed by the backend (role=%, jwt=%)',
      current_user, jwt_role
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

DO $do$
BEGIN
  IF to_regclass('public.profiles') IS NULL
     OR (
       SELECT count(*) FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'profiles'
         AND column_name IN ('is_verified_expert', 'expert_title')
     ) < 2
  THEN
    RAISE WARNING 'H3 skipped: profiles.is_verified_expert / expert_title not present';
    RETURN;
  END IF;

  EXECUTE 'DROP TRIGGER IF EXISTS trg_guard_expert_verification ON public.profiles';
  EXECUTE $t$
    CREATE TRIGGER trg_guard_expert_verification
      BEFORE INSERT OR UPDATE OF is_verified_expert, expert_title ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION guard_expert_verification()
  $t$;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'H3 (expert verification guard) NOT applied: %', SQLERRM;
END $do$;


-- ─── M3: scan_history INSERT — AND, not OR ──────────────────────────────────
-- Attack: WITH CHECK was `user_id = auth.uid() OR child_id IN (own children)`.
-- So a user could insert scans attributed to ANOTHER user's id (inflating their
-- free-scan count toward the paywall, or planting rows in their history) as long
-- as child_id was one of the caller's own children — or attach their own scan to
-- ANY child_id in the database.
-- Now the row must always belong to the caller, and a child (if any) must be
-- the caller's own child OR a child they actively care for with log permission.
-- The caregiver branch is kept on purpose: app/scan.tsx inserts
-- { user_id: me, child_id: activeChild } and a caregiver's activeChild comes
-- from get_caregiver_children.
DO $do$
BEGIN
  IF to_regclass('public.scan_history') IS NULL THEN
    RAISE WARNING 'M3 skipped: public.scan_history does not exist';
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS scan_history_insert ON public.scan_history';
  EXECUTE $p$
    CREATE POLICY scan_history_insert ON public.scan_history
      FOR INSERT
      WITH CHECK (
        user_id = auth.uid()
        AND (
          child_id IS NULL
          OR child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
          OR child_id IN (
            SELECT child_id FROM child_caregivers
            WHERE user_id = auth.uid()
              AND status = 'accepted'
              AND COALESCE(is_locked, false) = false
              AND COALESCE((permissions->>'_paused')::boolean, false) = false
              AND (permissions->>'log_activity')::boolean = true
          )
        )
      )
  $p$;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'M3 (scan_history_insert) NOT applied: %', SQLERRM;
END $do$;


-- ─── M4a: kids_vaccine_schedule SELECT — honour lock + pause ────────────────
-- Attack: a caregiver the parent has paused (or whose seat was locked after a
-- downgrade) could still read the child's vaccine appointments, because the
-- SELECT policy only checked status = 'accepted'. INSERT / UPDATE already carry
-- the predicate (P2-42) and DELETE is creator-or-parent, so only SELECT changes.
-- Parents read through their own role='parent' link, which is never locked or
-- paused.
DO $do$
BEGIN
  IF to_regclass('public.kids_vaccine_schedule') IS NULL THEN
    RAISE WARNING 'M4a skipped: public.kids_vaccine_schedule does not exist';
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS "caregivers select kids_vaccine_schedule" ON public.kids_vaccine_schedule';
  EXECUTE $p$
    CREATE POLICY "caregivers select kids_vaccine_schedule" ON public.kids_vaccine_schedule
      FOR SELECT
      USING (
        child_id IN (
          SELECT child_id FROM child_caregivers
          WHERE user_id = auth.uid()
            AND status = 'accepted'
            AND COALESCE(is_locked, false) = false
            AND COALESCE((permissions->>'_paused')::boolean, false) = false
        )
      )
  $p$;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'M4a (kids_vaccine_schedule) NOT applied: %', SQLERRM;
END $do$;


-- ─── M4b: nanny_notes SELECT / INSERT — honour lock + pause ─────────────────
-- Attack: a paused or locked caregiver could keep reading the parent↔nanny
-- notes thread for the child and keep posting new notes into it. Owner clauses
-- (author_id, parent's own child) are unchanged; UPDATE / DELETE are author-only
-- and untouched.
DO $do$
BEGIN
  IF to_regclass('public.nanny_notes') IS NULL THEN
    RAISE WARNING 'M4b skipped: public.nanny_notes does not exist';
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS nanny_notes_select ON public.nanny_notes';
  EXECUTE $p$
    CREATE POLICY nanny_notes_select ON public.nanny_notes
      FOR SELECT
      USING (
        author_id = auth.uid()
        OR child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
        OR child_id IN (
          SELECT child_id FROM child_caregivers
          WHERE user_id = auth.uid()
            AND status = 'accepted'
            AND COALESCE(is_locked, false) = false
            AND COALESCE((permissions->>'_paused')::boolean, false) = false
        )
      )
  $p$;

  EXECUTE 'DROP POLICY IF EXISTS nanny_notes_insert ON public.nanny_notes';
  EXECUTE $p$
    CREATE POLICY nanny_notes_insert ON public.nanny_notes
      FOR INSERT
      WITH CHECK (
        author_id = auth.uid()
        AND (
          child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
          OR child_id IN (
            SELECT child_id FROM child_caregivers
            WHERE user_id = auth.uid()
              AND status = 'accepted'
              AND COALESCE(is_locked, false) = false
              AND COALESCE((permissions->>'_paused')::boolean, false) = false
          )
        )
      )
  $p$;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'M4b (nanny_notes) NOT applied: %', SQLERRM;
END $do$;


-- ─── M4c: kids_reminders — honour lock + pause on every caregiver branch ────
-- Attack: a paused or locked caregiver could still read, create, edit and
-- delete the family's child-linked reminders. Owner branch (auth.uid() =
-- user_id) is unchanged everywhere; the UPDATE WITH CHECK keeps it so the
-- writer can always edit their own reminders, and keeps the (now gated)
-- caregiver branch so an active caregiver can still tick a parent's reminder
-- done (components/home/KidsHome.tsx).
DO $do$
BEGIN
  IF to_regclass('public.kids_reminders') IS NULL THEN
    RAISE WARNING 'M4c skipped: public.kids_reminders does not exist';
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS "kids_reminders select" ON public.kids_reminders';
  EXECUTE $p$
    CREATE POLICY "kids_reminders select" ON public.kids_reminders
      FOR SELECT
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
          )
        )
      )
  $p$;

  EXECUTE 'DROP POLICY IF EXISTS "kids_reminders insert" ON public.kids_reminders';
  EXECUTE $p$
    CREATE POLICY "kids_reminders insert" ON public.kids_reminders
      FOR INSERT
      WITH CHECK (
        auth.uid() = user_id
        AND (
          child_id IS NULL
          OR child_id IN (
            SELECT child_id FROM child_caregivers
            WHERE user_id = auth.uid()
              AND status = 'accepted'
              AND COALESCE(is_locked, false) = false
              AND COALESCE((permissions->>'_paused')::boolean, false) = false
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
          )
        )
      )
  $p$;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'M4c (kids_reminders) NOT applied: %', SQLERRM;
END $do$;


-- ─── M1: community tables — no reads with the anon key ──────────────────────
-- Attack: the anon key ships inside the app, so anyone could read channel
-- memberships, poll votes, reactions, posts, comments and ratings without
-- logging in (same class of leak 20261102180000 closed for the public views).
-- The app only reads these after sign-in. Each table is revoked independently;
-- a missing table is skipped with a NOTICE.
DO $do$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'channel_members', 'poll_votes', 'post_reactions',
    'channel_posts', 'post_comments', 'channel_ratings'
  ]
  LOOP
    BEGIN
      IF to_regclass(format('public.%I', t)) IS NULL THEN
        RAISE NOTICE 'M1: public.% does not exist, skipped', t;
      ELSE
        EXECUTE format('REVOKE SELECT ON public.%I FROM anon', t);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'M1: REVOKE on public.% NOT applied: %', t, SQLERRM;
    END;
  END LOOP;
END $do$;


-- ─── Low: active_seats_for(uuid) — not a public RPC ─────────────────────────
-- Attack: SECURITY DEFINER and executable by PUBLIC/anon, so anyone could call
-- /rpc/active_seats_for with any user id and learn how many active caregivers
-- that account has. Nothing in the app, edge functions or admin calls it; its
-- only caller is lock_excess_seats_on_downgrade(), which fires on a
-- subscription_tier change — only the service role / postgres can make one
-- (guard_subscription_tier) — so no grant to authenticated is needed.
DO $do$
BEGIN
  IF to_regprocedure('public.active_seats_for(uuid)') IS NULL THEN
    RAISE WARNING 'Low skipped: public.active_seats_for(uuid) does not exist';
    RETURN;
  END IF;

  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.active_seats_for(uuid) FROM PUBLIC, anon, authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.active_seats_for(uuid) TO service_role';
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Low (active_seats_for) NOT applied: %', SQLERRM;
END $do$;


NOTIFY pgrst, 'reload schema';
