-- Auto-update like_count and comment_count on garage_posts via triggers

-- Like count: increment on insert, decrement on delete
CREATE OR REPLACE FUNCTION update_garage_like_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE garage_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE garage_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_garage_like_count ON garage_post_likes;
CREATE TRIGGER trg_garage_like_count
  AFTER INSERT OR DELETE ON garage_post_likes
  FOR EACH ROW EXECUTE FUNCTION update_garage_like_count();

-- Comment count: increment on insert, decrement on delete
CREATE OR REPLACE FUNCTION update_garage_comment_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE garage_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE garage_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_garage_comment_count ON garage_post_comments;
CREATE TRIGGER trg_garage_comment_count
  AFTER INSERT OR DELETE ON garage_post_comments
  FOR EACH ROW EXECUTE FUNCTION update_garage_comment_count();
