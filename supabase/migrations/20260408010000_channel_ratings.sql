-- Channel ratings & reviews
CREATE TABLE IF NOT EXISTS channel_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

-- Add avg rating + review count to channels
ALTER TABLE channels ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(2,1) DEFAULT 0;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS rating_count INT DEFAULT 0;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_channel_ratings_channel ON channel_ratings(channel_id);

-- RLS
ALTER TABLE channel_ratings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "channel_ratings_read" ON channel_ratings FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "channel_ratings_insert" ON channel_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "channel_ratings_update" ON channel_ratings FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "channel_ratings_delete" ON channel_ratings FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Trigger to auto-update avg_rating and rating_count on channels
CREATE OR REPLACE FUNCTION update_channel_rating() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE channels SET
      avg_rating = (SELECT ROUND(AVG(rating)::numeric, 1) FROM channel_ratings WHERE channel_id = NEW.channel_id),
      rating_count = (SELECT COUNT(*) FROM channel_ratings WHERE channel_id = NEW.channel_id)
    WHERE id = NEW.channel_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE channels SET
      avg_rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 1) FROM channel_ratings WHERE channel_id = OLD.channel_id), 0),
      rating_count = (SELECT COUNT(*) FROM channel_ratings WHERE channel_id = OLD.channel_id)
    WHERE id = OLD.channel_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_channel_rating ON channel_ratings;
CREATE TRIGGER trg_channel_rating
  AFTER INSERT OR UPDATE OR DELETE ON channel_ratings
  FOR EACH ROW EXECUTE FUNCTION update_channel_rating();
