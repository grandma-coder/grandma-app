-- Circles: reactions + reply-count maintenance.
--
-- REACTIONS: a single "heart" per (post, user). We store the reactor's user_id
-- for the UNIQUE constraint + RLS, but it is NEVER exposed cross-user — the
-- public feed only ever tells YOU whether YOU reacted (has_reacted), computed
-- against auth.uid() inside the security-definer view. reaction_count is the
-- only aggregate anyone else sees.
--
-- REPLY COUNT: circle_posts.reply_count on a parent is kept accurate by a
-- trigger over child rows (reply_to_id = parent), visible-only. Symmetric to the
-- circles.post_count trigger shipped in 20260718120000.

-- ─── reactions table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS circle_post_reactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES circle_posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

ALTER TABLE circle_post_reactions ENABLE ROW LEVEL SECURITY;

-- A user manages only their own reaction rows. No cross-user SELECT is granted,
-- so no one can enumerate who reacted — anonymity holds.
DO $$ BEGIN
  CREATE POLICY circle_post_reactions_own ON circle_post_reactions FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_circle_post_reactions_post ON circle_post_reactions (post_id);
CREATE INDEX IF NOT EXISTS idx_circle_post_reactions_user ON circle_post_reactions (user_id);

-- ─── reaction_count trigger ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION circle_posts_bump_reaction_count() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE circle_posts SET reaction_count = reaction_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE circle_posts SET reaction_count = GREATEST(0, reaction_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_circle_reaction_count ON circle_post_reactions;
CREATE TRIGGER trg_circle_reaction_count
  AFTER INSERT OR DELETE ON circle_post_reactions
  FOR EACH ROW EXECUTE FUNCTION circle_posts_bump_reaction_count();

-- ─── reply_count trigger (on circle_posts, for replies) ─────────────────────
-- A reply is a circle_posts row with reply_to_id set. Keep the PARENT's
-- reply_count accurate for visible replies only. Mirrors the post_count logic.
CREATE OR REPLACE FUNCTION circle_posts_bump_reply_count() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  old_counts boolean := FALSE;
  new_counts boolean := FALSE;
BEGIN
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    old_counts := (OLD.reply_to_id IS NOT NULL AND OLD.moderation_status = 'visible');
  END IF;
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    new_counts := (NEW.reply_to_id IS NOT NULL AND NEW.moderation_status = 'visible');
  END IF;

  IF TG_OP = 'INSERT' AND new_counts THEN
    UPDATE circle_posts SET reply_count = reply_count + 1 WHERE id = NEW.reply_to_id;
  ELSIF TG_OP = 'DELETE' AND old_counts THEN
    UPDATE circle_posts SET reply_count = GREATEST(0, reply_count - 1) WHERE id = OLD.reply_to_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.reply_to_id IS NOT DISTINCT FROM NEW.reply_to_id THEN
      IF new_counts AND NOT old_counts THEN
        UPDATE circle_posts SET reply_count = reply_count + 1 WHERE id = NEW.reply_to_id;
      ELSIF old_counts AND NOT new_counts THEN
        UPDATE circle_posts SET reply_count = GREATEST(0, reply_count - 1) WHERE id = NEW.reply_to_id;
      END IF;
    ELSE
      IF old_counts THEN
        UPDATE circle_posts SET reply_count = GREATEST(0, reply_count - 1) WHERE id = OLD.reply_to_id;
      END IF;
      IF new_counts THEN
        UPDATE circle_posts SET reply_count = reply_count + 1 WHERE id = NEW.reply_to_id;
      END IF;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_circle_reply_count ON circle_posts;
CREATE TRIGGER trg_circle_reply_count
  AFTER INSERT OR UPDATE OR DELETE ON circle_posts
  FOR EACH ROW EXECUTE FUNCTION circle_posts_bump_reply_count();

-- ─── public view: append has_reacted (per-caller, never cross-user) ─────────
-- has_reacted is appended at the TAIL of the column list, so CREATE OR REPLACE
-- VIEW works (no DROP needed — preserves grants, avoids dependency-drop risk).
-- security_invoker stays false so the whole feed is readable, but the
-- has_reacted subquery is scoped to the CALLER's auth.uid(), so it only ever
-- reveals your own reaction.
CREATE OR REPLACE VIEW circle_posts_public AS
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
  ) AS has_reacted
FROM circle_posts p
LEFT JOIN circle_handles h ON h.circle_id = p.circle_id AND h.user_id = p.author_id
WHERE p.moderation_status = 'visible';

ALTER VIEW circle_posts_public SET (security_invoker = false);
GRANT SELECT ON circle_posts_public TO authenticated;

-- Reconcile counts from existing rows (idempotent recompute).
UPDATE circle_posts p SET reaction_count = COALESCE(sub.n, 0)
FROM (SELECT post_id, COUNT(*) n FROM circle_post_reactions GROUP BY post_id) sub
WHERE p.id = sub.post_id;
UPDATE circle_posts p SET reaction_count = 0
WHERE NOT EXISTS (SELECT 1 FROM circle_post_reactions r WHERE r.post_id = p.id)
  AND p.reaction_count <> 0;

UPDATE circle_posts p SET reply_count = COALESCE(sub.n, 0)
FROM (
  SELECT reply_to_id, COUNT(*) n FROM circle_posts
  WHERE reply_to_id IS NOT NULL AND moderation_status = 'visible'
  GROUP BY reply_to_id
) sub
WHERE p.id = sub.reply_to_id;
UPDATE circle_posts p SET reply_count = 0
WHERE NOT EXISTS (
  SELECT 1 FROM circle_posts c
  WHERE c.reply_to_id = p.id AND c.moderation_status = 'visible'
) AND p.reply_count <> 0;

NOTIFY pgrst, 'reload schema';
