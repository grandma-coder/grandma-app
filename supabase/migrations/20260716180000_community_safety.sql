-- Phase 1 (trust & safety) — community safety spine.
--
-- Non-negotiable before any UGC surface scales (App Store + legal requirement):
--   1. user_blocks       — a user blocks another user (reversible).
--   2. content_reports   — a user reports a piece of content (polymorphic: works
--                          for channel posts, comments, garage listings) with a
--                          reason + moderation status. Feeds a future mod queue.
--   3. moderation_status — a column on each UGC table so content can be hidden /
--                          removed without deleting the row (audit + appeals).
--   4. RLS               — enforce it server-side: a viewer never sees content
--                          that is removed, nor content authored by someone they
--                          have blocked. (Flo filters blocked authors on the
--                          client; we do it in the database — the superset move.)
--
-- Built model-independent so it serves BOTH today's real-name care-circle chat
-- and the future anonymous topic forum (community-model decision: Option B).
--
-- Idempotent + guarded per house style.

-- ─── 1. user_blocks ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_blocks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id  uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  blocked_id  uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CONSTRAINT no_self_block CHECK (blocker_id <> blocked_id)
);

ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- A user manages (creates, reads, deletes) only their own blocks.
DO $$ BEGIN
  CREATE POLICY user_blocks_owner
    ON user_blocks FOR ALL
    USING (auth.uid() = blocker_id)
    WITH CHECK (auth.uid() = blocker_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks (blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks (blocked_id);

-- ─── 2. content_reports ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS content_reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  -- Polymorphic target: which UGC table + row id was reported.
  content_type  text NOT NULL CHECK (content_type IN ('channel_post', 'post_comment', 'garage_listing')),
  content_id    uuid NOT NULL,
  author_id     uuid,  -- author of the reported content (nullable if unknown)
  reason        text NOT NULL CHECK (reason IN (
                  'spam', 'harassment', 'hate', 'misinformation',
                  'inappropriate', 'self_harm', 'other'
                )),
  details       text,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  created_at    timestamptz DEFAULT now(),
  reviewed_at   timestamptz,
  -- One report per (reporter, content) — re-reporting the same item is a no-op.
  UNIQUE (reporter_id, content_type, content_id)
);

ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

-- A user can file a report and read their own reports. Only the moderation
-- backend (service-role key, bypasses RLS) reads all reports / updates status.
DO $$ BEGIN
  CREATE POLICY content_reports_create_own
    ON content_reports FOR INSERT
    WITH CHECK (auth.uid() = reporter_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY content_reports_read_own
    ON content_reports FOR SELECT
    USING (auth.uid() = reporter_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_reports_target ON content_reports (content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter ON content_reports (reporter_id);

-- ─── 3. moderation_status on UGC tables ────────────────────────────────────
-- visible = normal · hidden = temporarily withheld (appealable) · removed = gone

ALTER TABLE channel_posts
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'visible'
    CHECK (moderation_status IN ('visible', 'hidden', 'removed'));

ALTER TABLE post_comments
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'visible'
    CHECK (moderation_status IN ('visible', 'hidden', 'removed'));

-- garage_listings may not exist in every environment (schema drift: the create
-- migration is recorded as applied on remote but the table isn't present).
-- Guard every garage statement on the table actually existing so this migration
-- is environment-safe. The block filter still applies wherever it does exist.
DO $$ BEGIN
  IF to_regclass('public.garage_listings') IS NOT NULL THEN
    ALTER TABLE garage_listings
      ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'visible'
        CHECK (moderation_status IN ('visible', 'hidden', 'removed'));
  END IF;
END $$;

-- ─── 4. RLS: hide removed content + content from blocked users ──────────────
-- The original tables have a permissive "anyone can read" SELECT policy. Replace
-- each with one that additionally (a) hides non-visible content unless you're the
-- author, and (b) hides content authored by someone the viewer has blocked.

-- 'removed' = gone even for the author (legal takedown); 'hidden' = author can
-- still see it (appeal path). Non-authors only ever see 'visible'.

-- channel_posts
DROP POLICY IF EXISTS "Anyone can read channel posts" ON channel_posts;
DO $$ BEGIN
  CREATE POLICY channel_posts_read_visible
    ON channel_posts FOR SELECT
    USING (
      (moderation_status = 'visible'
        OR (moderation_status = 'hidden' AND auth.uid() = author_id))
      AND NOT EXISTS (
        SELECT 1 FROM user_blocks b
        WHERE b.blocker_id = auth.uid() AND b.blocked_id = channel_posts.author_id
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- post_comments
DROP POLICY IF EXISTS "Anyone can read comments" ON post_comments;
DO $$ BEGIN
  CREATE POLICY post_comments_read_visible
    ON post_comments FOR SELECT
    USING (
      (moderation_status = 'visible'
        OR (moderation_status = 'hidden' AND auth.uid() = author_id))
      AND NOT EXISTS (
        SELECT 1 FROM user_blocks b
        WHERE b.blocker_id = auth.uid() AND b.blocked_id = post_comments.author_id
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- garage_listings — the existing policy already gates on the marketplace status
-- (active vs sold/archived); preserve that AND layer the moderation + block
-- filter on top. The real policy name is "Anyone can read active listings".
-- Guarded on table existence (see note above).
DO $$ BEGIN
  IF to_regclass('public.garage_listings') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Anyone can read active listings" ON garage_listings;
    BEGIN
      CREATE POLICY garage_listings_read_visible
        ON garage_listings FOR SELECT
        USING (
          -- owner always sees their own; others see active + visible only
          (auth.uid() = user_id
            OR (status = 'active' AND moderation_status = 'visible'))
          AND NOT EXISTS (
            SELECT 1 FROM user_blocks b
            WHERE b.blocker_id = auth.uid() AND b.blocked_id = garage_listings.user_id
          )
        );
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    CREATE INDEX IF NOT EXISTS idx_garage_listings_moderation ON garage_listings (moderation_status);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_channel_posts_moderation ON channel_posts (moderation_status);

NOTIFY pgrst, 'reload schema';
