-- Phase 3 (community engagement) — polls.
--
-- A poll belongs to a channel_post (so it lives in the feed like any message).
-- One poll per post; 2–5 options; one vote per user per poll (swappable).
--
--   polls        — question + the post it's attached to.
--   poll_options — the choices (ordered).
--   poll_votes   — one row per (poll, user); UNIQUE so a user can change but not
--                  stack votes.

-- polls / poll_options are immutable after creation (no UPDATE/DELETE policy by
-- design — editing a live poll would corrupt already-cast percentages).
CREATE TABLE IF NOT EXISTS polls (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES channel_posts(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  author_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question   text NOT NULL,
  closes_at  timestamptz, -- null = never closes
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id)
);

CREATE TABLE IF NOT EXISTS poll_options (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id    uuid NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  label      text NOT NULL,
  position   int NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id    uuid NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id  uuid NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id)
);

ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- Polls + options are readable by anyone (community content); created only by
-- the poll author (matches channel_posts insert semantics).
DO $$ BEGIN
  CREATE POLICY polls_read ON polls FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY polls_insert ON polls FOR INSERT WITH CHECK (auth.uid() = author_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY poll_options_read ON poll_options FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Options are inserted by the poll's author AND only before any votes exist, so
-- an author can't reshape the option set after voting starts.
DO $$ BEGIN
  CREATE POLICY poll_options_insert ON poll_options FOR INSERT
    WITH CHECK (
      EXISTS (SELECT 1 FROM polls p WHERE p.id = poll_id AND p.author_id = auth.uid())
      AND NOT EXISTS (SELECT 1 FROM poll_votes v WHERE v.poll_id = poll_options.poll_id)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Vote counts are public (live %); a user manages only their own vote row. The
-- WITH CHECK also (a) ties option_id to poll_id — no cross-poll vote-stuffing —
-- and (b) rejects votes on a closed poll.
DO $$ BEGIN
  CREATE POLICY poll_votes_read ON poll_votes FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY poll_votes_own ON poll_votes FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (
      auth.uid() = user_id
      AND EXISTS (SELECT 1 FROM poll_options o WHERE o.id = option_id AND o.poll_id = poll_votes.poll_id)
      AND EXISTS (SELECT 1 FROM polls p WHERE p.id = poll_votes.poll_id AND (p.closes_at IS NULL OR p.closes_at > now()))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_polls_post ON polls (post_id);
CREATE INDEX IF NOT EXISTS idx_polls_channel ON polls (channel_id);
CREATE INDEX IF NOT EXISTS idx_polls_author ON polls (author_id);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON poll_options (poll_id, position);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes (poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_option ON poll_votes (option_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user ON poll_votes (user_id);

NOTIFY pgrst, 'reload schema';
