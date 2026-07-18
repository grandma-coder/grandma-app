-- Community engagement (Flo gap #33) — topic mute/hide.
--
-- Channels already support follow (channel_saves = favorite) and join
-- (channel_members). The missing capability is MUTE: hide a topic you don't want
-- to see. A muted channel is filtered out of discovery/lists client-side and can
-- be unmuted anytime (reversible, like Flo's mute-with-undo).

CREATE TABLE IF NOT EXISTS channel_mutes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_id, user_id)
);

ALTER TABLE channel_mutes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY channel_mutes_own ON channel_mutes FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_channel_mutes_user ON channel_mutes (user_id);

NOTIFY pgrst, 'reload schema';
