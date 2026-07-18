-- Circles (community model: Option B) — anonymous topic forum, FOUNDATION.
--
-- Alongside the real-name care-circle channels, Circles is an anonymous,
-- topic-organized forum for the vulnerable posts people won't put their name to
-- ("I'm scared I'm a bad mother", "we've been trying 2 years"). This migration
-- ships the schema + read model only; posting/replying is a follow-up.
--
--   circles       — topic containers (curated), per journey.
--   circle_posts  — anonymous posts. author_id is stored (for moderation /
--                   own-content control) but NEVER exposed to other users; the
--                   client reads via a public view that drops author_id and
--                   surfaces a stable per-(circle,user) anonymous handle instead.
--   circle_handles— the stable "Anonymous Owl"-style alias a user carries within
--                   a given circle, so their posts are linkable to each other in
--                   that circle but not to their real account.
--
-- author_id is real (RLS + moderation need it); anonymity is enforced by the
-- READ PATH: circle_posts_public exposes handle, not author_id.

CREATE TABLE IF NOT EXISTS circles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  journey     text NOT NULL DEFAULT 'all' CHECK (journey IN ('pre-pregnancy', 'pregnancy', 'kids', 'all')),
  emoji       text,
  is_18_plus  boolean NOT NULL DEFAULT false,
  post_count  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS circle_handles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id  uuid NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  handle     text NOT NULL, -- e.g. 'Anonymous Owl'
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (circle_id, user_id)
);

CREATE TABLE IF NOT EXISTS circle_posts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id         uuid NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  author_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content           text NOT NULL,
  reply_to_id       uuid REFERENCES circle_posts(id) ON DELETE CASCADE,
  reaction_count    int NOT NULL DEFAULT 0,
  reply_count       int NOT NULL DEFAULT 0,
  moderation_status text NOT NULL DEFAULT 'visible' CHECK (moderation_status IN ('visible', 'hidden', 'removed')),
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_handles ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_posts ENABLE ROW LEVEL SECURITY;

-- Circles are public to read.
DO $$ BEGIN
  CREATE POLICY circles_read ON circles FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- A user manages only their own handle rows (created client-side on first post).
DO $$ BEGIN
  CREATE POLICY circle_handles_own ON circle_handles FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- circle_posts: direct table SELECT is NOT granted to clients — reads go through
-- circle_posts_public (below), which hides author_id. Authors can insert their
-- own posts (visible ones); moderation/removal is service-role.
DO $$ BEGIN
  CREATE POLICY circle_posts_insert ON circle_posts FOR INSERT
    WITH CHECK (auth.uid() = author_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- An author can read their OWN posts directly (to know what they wrote); the
-- anonymous public feed comes from the view.
DO $$ BEGIN
  CREATE POLICY circle_posts_read_own ON circle_posts FOR SELECT
    USING (auth.uid() = author_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Anonymous public read view ─────────────────────────────────────────────
-- Exposes the post + the author's per-circle handle, but NEVER author_id. This
-- is the ONLY cross-user read path for circle posts, so anonymity holds.
CREATE OR REPLACE VIEW circle_posts_public AS
SELECT
  p.id,
  p.circle_id,
  p.content,
  p.reply_to_id,
  p.reaction_count,
  p.reply_count,
  p.created_at,
  COALESCE(h.handle, 'Anonymous') AS handle
FROM circle_posts p
LEFT JOIN circle_handles h ON h.circle_id = p.circle_id AND h.user_id = p.author_id
WHERE p.moderation_status = 'visible';

ALTER VIEW circle_posts_public SET (security_invoker = false);
-- authenticated ONLY (not anon): these are the app's most sensitive posts
-- ("3am fears"); logged-out clients must not read them.
GRANT SELECT ON circle_posts_public TO authenticated;

CREATE INDEX IF NOT EXISTS idx_circle_posts_author ON circle_posts (author_id);
CREATE INDEX IF NOT EXISTS idx_circle_posts_reply ON circle_posts (reply_to_id);
CREATE INDEX IF NOT EXISTS idx_circle_handles_user ON circle_handles (user_id);
-- Partial index matching the view's actual filter (visible posts by circle+time).
CREATE INDEX IF NOT EXISTS idx_circle_posts_circle_visible
  ON circle_posts (circle_id, created_at DESC)
  WHERE moderation_status = 'visible';

-- ─── Seed curated circles (anonymous topics) ────────────────────────────────
DO $$
DECLARE
  c TEXT[];
  topics TEXT[][] := ARRAY[
    ARRAY['The Trying Years', 'When conception is taking longer than you hoped — you''re not alone.', 'pre-pregnancy', '🌙'],
    ARRAY['Pregnancy Fears', 'The anxious 3am thoughts you can''t say out loud.', 'pregnancy', '💭'],
    ARRAY['Am I a Good Parent?', 'The guilt, the doubt, the "is it just me?" — safe to say it here.', 'kids', '🫂'],
    ARRAY['Postpartum & Me', 'How you''re really doing after birth — beyond the baby.', 'kids', '🌷'],
    ARRAY['Relationship Real Talk', 'Partners, family, and the strain a new baby brings.', 'all', '💬'],
    ARRAY['No Judgment Zone', 'Anything you need to get off your chest, anonymously.', 'all', '🕊️']
  ];
BEGIN
  FOREACH c SLICE 1 IN ARRAY topics LOOP
    IF NOT EXISTS (SELECT 1 FROM circles WHERE name = c[1]) THEN
      INSERT INTO circles (name, description, journey, emoji)
      VALUES (c[1], c[2], c[3], c[4]);
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
