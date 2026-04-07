-- ============================================================
-- Garage Social Feed — Instagram-style posts with media
-- ============================================================

-- Posts table
CREATE TABLE IF NOT EXISTS garage_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT,
  caption TEXT,
  media JSONB NOT NULL DEFAULT '[]'::jsonb,       -- [{url, type: 'photo'|'video', width?, height?}]
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  like_count INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Likes
CREATE TABLE IF NOT EXISTS garage_post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES garage_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Comments
CREATE TABLE IF NOT EXISTS garage_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES garage_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bookmarks / Saves
CREATE TABLE IF NOT EXISTS garage_post_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES garage_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Indexes
CREATE INDEX idx_garage_posts_author ON garage_posts(author_id);
CREATE INDEX idx_garage_posts_created ON garage_posts(created_at DESC);
CREATE INDEX idx_garage_posts_category ON garage_posts(category);
CREATE INDEX idx_garage_post_likes_post ON garage_post_likes(post_id);
CREATE INDEX idx_garage_post_likes_user ON garage_post_likes(user_id);
CREATE INDEX idx_garage_post_comments_post ON garage_post_comments(post_id);
CREATE INDEX idx_garage_post_saves_user ON garage_post_saves(user_id);

-- RLS
ALTER TABLE garage_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE garage_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE garage_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE garage_post_saves ENABLE ROW LEVEL SECURITY;

-- Posts: anyone can read, auth users can create, owners can update/delete
CREATE POLICY "garage_posts_read" ON garage_posts FOR SELECT USING (true);
CREATE POLICY "garage_posts_insert" ON garage_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "garage_posts_update" ON garage_posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "garage_posts_delete" ON garage_posts FOR DELETE USING (auth.uid() = author_id);

-- Likes: anyone can read, auth users manage own
CREATE POLICY "garage_post_likes_read" ON garage_post_likes FOR SELECT USING (true);
CREATE POLICY "garage_post_likes_insert" ON garage_post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "garage_post_likes_delete" ON garage_post_likes FOR DELETE USING (auth.uid() = user_id);

-- Comments: anyone can read, auth users can create, owners can delete
CREATE POLICY "garage_post_comments_read" ON garage_post_comments FOR SELECT USING (true);
CREATE POLICY "garage_post_comments_insert" ON garage_post_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "garage_post_comments_delete" ON garage_post_comments FOR DELETE USING (auth.uid() = author_id);

-- Saves: users manage own
CREATE POLICY "garage_post_saves_read" ON garage_post_saves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "garage_post_saves_insert" ON garage_post_saves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "garage_post_saves_delete" ON garage_post_saves FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket for garage media (reuse existing or create)
INSERT INTO storage.buckets (id, name, public) VALUES ('garage-media', 'garage-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "garage_media_read" ON storage.objects FOR SELECT USING (bucket_id = 'garage-media');
CREATE POLICY "garage_media_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'garage-media' AND auth.role() = 'authenticated');
CREATE POLICY "garage_media_delete" ON storage.objects FOR DELETE USING (bucket_id = 'garage-media' AND auth.uid() = owner);
