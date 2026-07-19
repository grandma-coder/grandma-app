-- Channel logic fixes surfaced by the deep review:
--   1. channels had NO RLS DELETE policy → the host's "Delete channel forever"
--      matched 0 rows silently and the UI navigated away as if it worked.
--   2. The community-safety migration dropped a policy by the WRONG name
--      ("Anyone can read channel posts") — the real one is "channel_posts_read"
--      (USING true), so it stayed active alongside channel_posts_read_visible.
--      Result: blocked/hidden/removed posts were NOT hidden (block was defeated).
--   3. channel_posts.reaction_count had no trigger (only circle_posts got one),
--      so reaction counts drifted / reset to stale values on every refetch.

-- ── 1. channels DELETE policy — only the creator can delete their channel ─────
DO $$ BEGIN
  CREATE POLICY "channels_delete" ON channels FOR DELETE
    USING (auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. Drop the stale permissive read policy that defeated block/moderation ───
-- channel_posts_read_visible (from 20260716180000) already provides the correct
-- visibility-aware SELECT; this leftover USING(true) policy OR'd with it and
-- re-exposed everything. post_comments had the same superseding policy created,
-- so drop its stale twin too if present.
DROP POLICY IF EXISTS "channel_posts_read" ON channel_posts;
DROP POLICY IF EXISTS "post_comments_read" ON post_comments;

-- ── 3. channel_posts.reaction_count trigger ──────────────────────────────────
-- post_reactions is UNIQUE(post_id, user_id): one reaction row per user per post,
-- so reaction_count = number of reaction rows for that post. Insert/delete only —
-- setReaction() in lib/channelPosts.ts UPDATEs the `reaction` column in place when
-- a user switches type, which doesn't change the row count, so no AFTER UPDATE
-- trigger is needed for count correctness.
CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON post_reactions(post_id);

CREATE OR REPLACE FUNCTION channel_posts_bump_reaction_count() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE channel_posts SET reaction_count = reaction_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE channel_posts SET reaction_count = GREATEST(0, reaction_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_channel_reaction_count ON post_reactions;
CREATE TRIGGER trg_channel_reaction_count
  AFTER INSERT OR DELETE ON post_reactions
  FOR EACH ROW EXECUTE FUNCTION channel_posts_bump_reaction_count();

-- Reconcile any drift from before the trigger existed (idempotent recompute).
UPDATE channel_posts p SET reaction_count = COALESCE(sub.n, 0)
FROM (SELECT post_id, COUNT(*) n FROM post_reactions GROUP BY post_id) sub
WHERE p.id = sub.post_id;
UPDATE channel_posts p SET reaction_count = 0
WHERE NOT EXISTS (SELECT 1 FROM post_reactions r WHERE r.post_id = p.id)
  AND p.reaction_count <> 0;

NOTIFY pgrst, 'reload schema';
