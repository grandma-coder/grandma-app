-- Read-only checks for supabase/migrations/20261110120000_security_hardening.sql.
-- Run in the SQL editor AFTER applying. Every statement is a SELECT; nothing is written.
--
-- Manual tests (use two or three throwaway accounts, through the app or a client with each
-- user's JWT — NOT the service role, which bypasses all of this):
--
--  §1  As caregiver C with a REVOKED link (child_caregivers row, user_id = C):
--        update own row set status = 'pending'          → error (RLS WITH CHECK / guard)
--        update own row set status = 'accepted'         → error
--        update own row set permissions = '{...}'       → error
--      As caregiver C with an ACCEPTED link:
--        update own row set status = 'revoked'          → ok (leaving); access gone
--      As the parent: pause / edit / remove / resend in Care Circle still work.
--  §2  Private channel P owned by A; B is not a member, has no request:
--        B: select * from channel_posts where channel_id = P        → 0 rows
--        B: select * from polls where channel_id = P                → 0 rows
--        B: insert into channel_posts (channel_id = P, author_id = B, content = 'x') → RLS error
--        B: insert into channel_members (channel_id = P, user_id = B)              → RLS error
--        B: insert into channel_requests (channel_id = P, user_id = B, status = 'approved') → RLS error
--        B: request to join in the app; A approves; B opens the channel → B joins, sees posts
--        B (member of public channel Q): update channel_members set channel_id = P → error
--      Public channel: non-member can still read, reply in a thread; join/leave lines appear.
--      B leaves P → "B left the channel" line is posted, B no longer sees posts.
--  §3  Author X of a hidden channel post: update channel_posts set moderation_status = 'visible' → error
--      X: update channel_posts set reaction_count = 999 (own post)   → error
--      X: update post_reactions set post_id = <other post> (own reaction) → error
--      X: insert channel_posts (..., reaction_count = 50, is_pinned = true) → row saved with 0 / false
--      Reacting / liking / replying still moves the counts (triggers).
--  §4  A blocks B: B's garage posts + garage comments vanish for A; B can't like/comment A's
--      garage post (RLS error); B reacting to A's channel message creates no notification for A.
--  §5  Circle post author: delete own post → ok; delete someone else's → 0 rows.
--      Anyone signed in: report a circle post (content_type 'circle_post') → ok, author_id stored NULL.
--  §6  Channel owner A: rpc transfer_channel_ownership(P, B) with B a member → ok;
--      with a non-member → error; as B before the transfer → error.
--      Direct update channels set created_by = B → error.
--  §7  Owner at the seat cap (paywall on, premium_solo with 1 active caregiver): a second
--      caregiver opens a pending invite link → accept fails with "This care circle is full".
--      The same caregiver accepting another child of the same family → ok (no extra seat).

-- ── Policies this migration owns (expect one row each; no USING(true) on post tables) ──
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (tablename, policyname) IN (
    ('child_caregivers', 'child_caregivers_update_by_invitee'),
    ('channel_posts', 'channel_posts_read_visible'),
    ('channel_posts', 'channel_posts_insert'),
    ('channel_posts', 'channel_posts_update'),
    ('post_comments', 'post_comments_read_visible'),
    ('post_comments', 'post_comments_insert'),
    ('post_reactions', 'post_reactions_read'),
    ('post_reactions', 'post_reactions_manage'),
    ('polls', 'polls_read'),
    ('polls', 'polls_insert'),
    ('poll_options', 'poll_options_read'),
    ('poll_votes', 'poll_votes_read'),
    ('poll_votes', 'poll_votes_own'),
    ('channel_members', 'channel_members_insert'),
    ('channel_members', 'channel_members_update'),
    ('channel_members', 'channel_members_delete'),
    ('channel_requests', 'channel_requests_insert'),
    ('channels', 'channels_update'),
    ('garage_posts', 'garage_posts_read'),
    ('garage_post_comments', 'garage_post_comments_read'),
    ('garage_post_comments', 'garage_post_comments_insert'),
    ('garage_post_likes', 'garage_post_likes_insert'),
    ('circle_posts', 'circle_posts_delete_own'),
    ('content_reports', 'content_reports_create_own')
  )
ORDER BY tablename, policyname;

-- ── Leftover permissive policies that would re-open the holes (expect 0 rows) ──
-- Permissive policies OR together: any of these surviving defeats the new ones.
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    (tablename, policyname) IN (
      ('channel_posts', 'Anyone can read channel posts'),
      ('channel_posts', 'channel_posts_read'),
      ('channel_posts', 'Authenticated users can create posts'),
      ('channel_posts', 'Authors can update own posts'),
      ('post_comments', 'Anyone can read comments'),
      ('post_comments', 'post_comments_read'),
      ('post_comments', 'Users can create comments'),
      ('post_reactions', 'Anyone can read reactions'),
      ('post_reactions', 'Users can manage own reactions'),
      ('channel_members', 'Users can manage own membership'),
      ('care_circle', 'Members can accept invite')
    )
    -- any other permissive policy on these tables not created by this migration
    OR (tablename IN ('channel_posts', 'post_comments', 'post_reactions', 'polls', 'poll_options',
                      'poll_votes', 'channel_members', 'channel_requests', 'child_caregivers')
        AND cmd IN ('SELECT', 'INSERT', 'UPDATE', 'ALL')
        AND policyname NOT IN (
          'channel_posts_read_visible', 'channel_posts_insert', 'channel_posts_update',
          'post_comments_read_visible', 'post_comments_insert',
          'post_reactions_read', 'post_reactions_manage',
          'polls_read', 'polls_insert', 'poll_options_read', 'poll_options_insert',
          'poll_votes_read', 'poll_votes_own',
          'channel_members_read', 'Anyone can read memberships', 'channel_members_insert',
          'channel_members_update',
          'channel_requests_read', 'channel_requests_insert', 'channel_requests_update',
          'child_caregivers_update_by_inviter', 'child_caregivers_update_by_invitee',
          'Users can view caregiver links', 'Parents can create invites within tier limit'
        ))
  )
ORDER BY tablename, policyname;

-- ── Triggers (expect: guard on each table that exists, seat trigger, identity guard) ──
SELECT c.relname AS table_name, t.tgname, pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal
  AND t.tgname IN (
    'trg_guard_protected_columns',
    'child_caregivers_identity_guard',
    'child_caregivers_seat_limit_on_accept',
    'trg_enforce_seat_limit',
    'trg_content_reports_anonymise_circle'
  )
ORDER BY c.relname, t.tgname;

-- ── Functions: definer flag, search_path, who can execute ──
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS args,
       p.prosecdef AS security_definer,
       p.proconfig AS config,
       pg_get_userbyid(p.proowner) AS owner,
       has_function_privilege('anon', p.oid, 'EXECUTE')          AS anon_exec,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'guard_protected_columns', 'guard_child_caregivers_identity',
    'channel_is_private', 'is_channel_member', 'is_channel_owner', 'can_read_channel',
    'can_read_channel_post', 'can_read_poll', 'has_channel_request', 'has_blocked_me',
    'users_blocked_either_way', 'circle_post_reportable', 'content_reports_anonymise_circle',
    'transfer_channel_ownership', 'caregiver_accept_exceeds_seats', 'enforce_seat_limit_on_accept',
    'effective_seat_limit', 'notify_garage_like', 'notify_garage_comment', 'notify_garage_save',
    'notify_channel_join', 'notify_channel_reaction', 'notify_thread_reply',
    'notify_post_comment', 'notify_channel_save'
  )
ORDER BY p.proname;
-- Expect: users_blocked_either_way + caregiver_accept_exceeds_seats → auth_exec = false.
-- Owner of the SECURITY DEFINER count triggers (channel_posts_bump_reaction_count,
-- update_garage_like_count, …) must be postgres / supabase_admin, or the column guard will
-- reject their counter writes:
SELECT p.proname, pg_get_userbyid(p.proowner) AS owner, p.prosecdef
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('channel_posts_bump_reaction_count', 'update_channel_reply_count',
                    'update_channel_member_count', 'update_garage_like_count',
                    'update_garage_comment_count', 'increment_garage_share_count',
                    'circles_bump_post_count', 'circle_posts_bump_reaction_count',
                    'circle_posts_bump_reply_count');

-- ── content_reports accepts circle_post ──
SELECT conname, convalidated, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.content_reports'::regclass AND contype = 'c';

-- ── circle_posts_public has is_mine, no author_id ──
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'circle_posts_public'
ORDER BY ordinal_position;

-- ── Data to eyeball (pre-existing rows the new rules don't retro-fix) ──
-- Approved join requests nobody resolved (likely self-approved through the old INSERT policy).
SELECT r.id, r.channel_id, r.user_id, r.status, r.resolved_by, r.resolved_at, c.created_by AS owner
FROM channel_requests r JOIN channels c ON c.id = r.channel_id
WHERE r.status = 'approved' AND (r.resolved_by IS NULL OR r.resolved_at IS NULL);

-- Private-channel members with no approved request who aren't the owner (joined via the old hole).
SELECT m.channel_id, m.user_id, c.name, c.created_by
FROM channel_members m JOIN channels c ON c.id = m.channel_id
WHERE c.channel_type = 'private'
  AND m.user_id IS DISTINCT FROM c.created_by
  AND NOT EXISTS (
    SELECT 1 FROM channel_requests r
    WHERE r.channel_id = m.channel_id AND r.user_id = m.user_id AND r.status = 'approved'
  );

-- Caregiver links back to pending/accepted after having been accepted+revoked can't be told
-- apart from history; instead list owners currently over their cap (persons, not rows).
SELECT cc.invited_by, p.subscription_tier,
       count(DISTINCT COALESCE(cc.user_id::text, cc.id::text)) AS active_people,
       public.effective_seat_limit(p.subscription_tier) AS cap
FROM child_caregivers cc JOIN profiles p ON p.id = cc.invited_by
WHERE cc.status = 'accepted' AND COALESCE(cc.is_locked, false) = false AND cc.role <> 'parent'
GROUP BY cc.invited_by, p.subscription_tier
HAVING count(DISTINCT COALESCE(cc.user_id::text, cc.id::text)) > public.effective_seat_limit(p.subscription_tier);

-- Posts whose stored counters disagree with the source rows (drift is not recomputed here).
SELECT p.id, p.reaction_count, count(r.id) AS actual
FROM channel_posts p LEFT JOIN post_reactions r ON r.post_id = p.id
GROUP BY p.id, p.reaction_count
HAVING p.reaction_count <> count(r.id)
LIMIT 50;
