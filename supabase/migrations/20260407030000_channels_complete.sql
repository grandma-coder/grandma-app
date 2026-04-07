-- ============================================================
-- Complete Channels System — tables, threading, mentions, unread, seed data
-- ============================================================

-- ─── Core tables (if not exists) ──────────────────────────────────────────

-- Ensure channels table exists
CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'community',
  channel_type TEXT NOT NULL DEFAULT 'public',
  created_by UUID REFERENCES auth.users(id),
  member_count INT NOT NULL DEFAULT 0,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure channel_members exists
CREATE TABLE IF NOT EXISTS channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

-- Channel posts (messages)
CREATE TABLE IF NOT EXISTS channel_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  photos TEXT[] DEFAULT '{}',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  reaction_count INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE channel_posts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "channel_posts_read" ON channel_posts FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "channel_posts_insert" ON channel_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "channel_posts_update" ON channel_posts FOR UPDATE USING (auth.uid() = author_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "channel_posts_delete" ON channel_posts FOR DELETE USING (auth.uid() = author_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Post reactions
CREATE TABLE IF NOT EXISTS post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES channel_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL DEFAULT 'heart',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "post_reactions_read" ON post_reactions FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "post_reactions_manage" ON post_reactions FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Post comments
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES channel_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "post_comments_read" ON post_comments FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "post_comments_insert" ON post_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add new columns to channel_posts for threading + mentions
ALTER TABLE channel_posts ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES channel_posts(id) ON DELETE SET NULL;
ALTER TABLE channel_posts ADD COLUMN IF NOT EXISTS mentions UUID[] DEFAULT '{}';
ALTER TABLE channel_posts ADD COLUMN IF NOT EXISTS reply_count INT NOT NULL DEFAULT 0;

-- Ensure author_name exists on channel_posts
ALTER TABLE channel_posts ADD COLUMN IF NOT EXISTS author_name TEXT;

-- Unread tracking on channel_members
ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ DEFAULT now();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_channel_posts_reply_to ON channel_posts(reply_to_id) WHERE reply_to_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_channel_posts_channel_created ON channel_posts(channel_id, created_at);
CREATE INDEX IF NOT EXISTS idx_channel_members_user ON channel_members(user_id);

-- RLS for channels
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "channels_read" ON channels FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "channels_insert" ON channels FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "channels_update" ON channels FOR UPDATE USING (auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS for channel_members
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "channel_members_read" ON channel_members FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "channel_members_insert" ON channel_members FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "channel_members_delete" ON channel_members FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "channel_members_update" ON channel_members FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Trigger: auto-increment reply_count on parent post when a reply is added
CREATE OR REPLACE FUNCTION update_channel_reply_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.reply_to_id IS NOT NULL THEN
    UPDATE channel_posts SET reply_count = reply_count + 1 WHERE id = NEW.reply_to_id;
  ELSIF TG_OP = 'DELETE' AND OLD.reply_to_id IS NOT NULL THEN
    UPDATE channel_posts SET reply_count = GREATEST(reply_count - 1, 0) WHERE id = OLD.reply_to_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_channel_reply_count ON channel_posts;
CREATE TRIGGER trg_channel_reply_count
  AFTER INSERT OR DELETE ON channel_posts
  FOR EACH ROW EXECUTE FUNCTION update_channel_reply_count();

-- Trigger: auto-update member_count on channels when members join/leave
CREATE OR REPLACE FUNCTION update_channel_member_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE channels SET member_count = member_count + 1 WHERE id = NEW.channel_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE channels SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.channel_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_channel_member_count ON channel_members;
CREATE TRIGGER trg_channel_member_count
  AFTER INSERT OR DELETE ON channel_members
  FOR EACH ROW EXECUTE FUNCTION update_channel_member_count();

-- ─── Seed default channels ────────────────────────────────────────────────
INSERT INTO channels (name, description, category, channel_type, member_count) VALUES
  ('Fertility & TTC', 'Trying to conceive? Share tips, ask questions, and support each other on the fertility journey.', 'fertility', 'public', 0),
  ('Pregnancy Journey', 'Week-by-week updates, symptoms, cravings, and everything pregnancy.', 'pregnancy', 'public', 0),
  ('Birth Stories', 'Share your birth experience and read others — every story matters.', 'pregnancy', 'public', 0),
  ('Newborn Essentials', 'What do you really need for a newborn? Gear reviews, must-haves, and hacks.', 'parenting', 'public', 0),
  ('Sleep Training', 'Methods, schedules, and moral support for getting everyone more sleep.', 'parenting', 'public', 0),
  ('Feeding & Nutrition', 'Breastfeeding, formula, baby-led weaning, toddler meals — all things feeding.', 'feeding', 'public', 0),
  ('Toddler Milestones', 'Walking, talking, tantrums — celebrate and navigate the toddler years together.', 'milestones', 'public', 0),
  ('Cycle Wellness', 'Track, understand, and optimize your menstrual cycle and hormonal health.', 'wellness', 'public', 0),
  ('Parenting Wins', 'Big or small — share your victories and cheer each other on!', 'community', 'public', 0),
  ('Local Meetups', 'Find parents near you for playdates, walks, coffee, and community.', 'community', 'public', 0)
ON CONFLICT DO NOTHING;
