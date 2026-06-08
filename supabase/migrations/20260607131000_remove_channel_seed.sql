-- ============================================================
-- Remove all seeded channels + seeded messages
-- ============================================================
-- The Channels feature shipped with demo data seeded across three
-- migrations (20260407030000_channels_complete, 20260408020000_seed_more_channels,
-- 20260408040000_seed_channels_and_messages): ~85 fake channels and 80+
-- fake messages authored by fictional personas (BoundaryQueen, SleepMama, …).
--
-- This migration deletes that demo data so Channels starts as a clean,
-- real-user-only system. It is idempotent and safe to re-run.
--
-- Seed identification:
--   • Seed channels   → created_by IS NULL  AND  created_at < 2026-04-10
--   • Seed messages   → author_id = the placeholder UUID used by the seed
--                       migration, OR they belong to a seed channel
--
-- IMPORTANT — why the created_at bound:
--   Migration 20260524000000_cascade_user_delete.sql retrofitted
--   channels.created_by with `ON DELETE SET NULL`. That means a REAL channel
--   whose creator account was later deleted ALSO has created_by IS NULL.
--   `created_by IS NULL` alone is therefore NOT a safe seed marker. The three
--   seed migrations all ran on 2026-04-07/08 (the channels table did not
--   exist before then), so bounding to created_at < '2026-04-10' isolates the
--   seed rows and protects real channels from any deleted user.
--
-- Deletion order: dependent rows (posts, members, ratings, saves, requests)
-- are deleted explicitly BEFORE the channels. The live channel_posts table
-- was created (20260405010000) without an enforced FK to channels, so a
-- channel delete would NOT cascade to its posts — explicit deletion is
-- required, not just defensive.
--
-- No explicit BEGIN/COMMIT: the Supabase CLI wraps each migration file in its
-- own transaction. A bare BEGIN/COMMIT here would commit that outer
-- transaction early and drop the ON COMMIT DROP temp table mid-migration.

-- 1. Capture the set of seed channel ids once (time-bounded — see header).
CREATE TEMP TABLE _seed_channel_ids ON COMMIT DROP AS
SELECT id FROM channels
WHERE created_by IS NULL
  AND created_at < '2026-04-10T00:00:00Z';

-- 2. Delete seed posts: authored by the seed placeholder UUID, or living in a
--    seed channel. Reactions/comments cascade off channel_posts(id).
DELETE FROM channel_posts
WHERE author_id = '6c2f2688-3667-4e21-ac02-04301b0dc19c'::uuid
   OR channel_id IN (SELECT id FROM _seed_channel_ids);

-- 3. Membership rows for seed channels.
DELETE FROM channel_members
WHERE channel_id IN (SELECT id FROM _seed_channel_ids);

-- 4. Ratings + saves + requests for seed channels. These DO cascade off
--    channels (ON DELETE CASCADE), so this is belt-and-suspenders; guarded
--    with to_regclass so the migration still applies on a DB that hasn't
--    created these tables yet.
DO $$
BEGIN
  IF to_regclass('public.channel_ratings') IS NOT NULL THEN
    DELETE FROM channel_ratings
    WHERE channel_id IN (SELECT id FROM _seed_channel_ids);
  END IF;
  IF to_regclass('public.channel_saves') IS NOT NULL THEN
    DELETE FROM channel_saves
    WHERE channel_id IN (SELECT id FROM _seed_channel_ids);
  END IF;
  IF to_regclass('public.channel_requests') IS NOT NULL THEN
    DELETE FROM channel_requests
    WHERE channel_id IN (SELECT id FROM _seed_channel_ids);
  END IF;
END $$;

-- 5. Finally, the seed channels themselves.
DELETE FROM channels
WHERE id IN (SELECT id FROM _seed_channel_ids);

NOTIFY pgrst, 'reload schema';
