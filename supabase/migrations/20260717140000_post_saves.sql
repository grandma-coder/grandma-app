-- Phase 3 (community engagement) — per-post bookmarks.
--
-- channel_saves exists for saving whole CHANNELS; this adds saving an
-- individual POST so users can bookmark helpful answers to revisit. Owner-only
-- RLS; one save per (post, user). Mirrors channel_saves / garage_post_saves.

CREATE TABLE IF NOT EXISTS post_saves (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES channel_posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

ALTER TABLE post_saves ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "post_saves_read" ON post_saves FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "post_saves_insert" ON post_saves FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "post_saves_delete" ON post_saves FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_post_saves_user ON post_saves (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_saves_post ON post_saves (post_id);

NOTIFY pgrst, 'reload schema';
