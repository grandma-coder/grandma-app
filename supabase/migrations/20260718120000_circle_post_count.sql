-- Circles: keep circles.post_count accurate as anonymous posts arrive.
-- The circles list orders by post_count, so a stale count degrades discovery.
-- We count only TOP-LEVEL, VISIBLE posts (replies and hidden/removed posts don't
-- inflate the headline number). A trigger keeps it race-free — the client never
-- writes post_count directly.
--
-- Covers all the ways the count can move:
--   INSERT of a visible top-level post            → +1
--   DELETE of a visible top-level post            → -1
--   UPDATE that flips visibility on a top-level   → ±1
--   (replies — reply_to_id NOT NULL — never count)

CREATE OR REPLACE FUNCTION circles_bump_post_count() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  old_counts boolean := FALSE;  -- did the OLD row count toward post_count?
  new_counts boolean := FALSE;  -- does the NEW row count?
BEGIN
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    old_counts := (OLD.reply_to_id IS NULL AND OLD.moderation_status = 'visible');
  END IF;
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    new_counts := (NEW.reply_to_id IS NULL AND NEW.moderation_status = 'visible');
  END IF;

  IF TG_OP = 'INSERT' AND new_counts THEN
    UPDATE circles SET post_count = post_count + 1 WHERE id = NEW.circle_id;
  ELSIF TG_OP = 'DELETE' AND old_counts THEN
    UPDATE circles SET post_count = GREATEST(0, post_count - 1) WHERE id = OLD.circle_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- circle_id is immutable in practice, but guard anyway.
    IF OLD.circle_id = NEW.circle_id THEN
      IF new_counts AND NOT old_counts THEN
        UPDATE circles SET post_count = post_count + 1 WHERE id = NEW.circle_id;
      ELSIF old_counts AND NOT new_counts THEN
        UPDATE circles SET post_count = GREATEST(0, post_count - 1) WHERE id = NEW.circle_id;
      END IF;
    ELSE
      IF old_counts THEN
        UPDATE circles SET post_count = GREATEST(0, post_count - 1) WHERE id = OLD.circle_id;
      END IF;
      IF new_counts THEN
        UPDATE circles SET post_count = post_count + 1 WHERE id = NEW.circle_id;
      END IF;
    END IF;
  END IF;

  RETURN NULL; -- AFTER trigger; return value ignored
END;
$$;

DROP TRIGGER IF EXISTS trg_circles_post_count ON circle_posts;
CREATE TRIGGER trg_circles_post_count
  AFTER INSERT OR UPDATE OR DELETE ON circle_posts
  FOR EACH ROW EXECUTE FUNCTION circles_bump_post_count();

-- Reconcile any drift from posts inserted before this trigger existed.
UPDATE circles c SET post_count = COALESCE(sub.n, 0)
FROM (
  SELECT circle_id, COUNT(*) AS n
  FROM circle_posts
  WHERE reply_to_id IS NULL AND moderation_status = 'visible'
  GROUP BY circle_id
) sub
WHERE c.id = sub.circle_id;

-- Zero out circles that now have no visible top-level posts.
UPDATE circles c SET post_count = 0
WHERE NOT EXISTS (
  SELECT 1 FROM circle_posts p
  WHERE p.circle_id = c.id AND p.reply_to_id IS NULL AND p.moderation_status = 'visible'
) AND c.post_count <> 0;

NOTIFY pgrst, 'reload schema';
