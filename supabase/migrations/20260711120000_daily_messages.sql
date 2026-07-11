-- Daily Message: one drawn card per user per day.
-- Stores only ids; card/question CONTENT lives in the app banks.
CREATE TABLE IF NOT EXISTS daily_messages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date         DATE        NOT NULL,
  question_id  TEXT        NOT NULL,
  option_index INT         NOT NULL,
  card_id      TEXT        NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, date)
);

ALTER TABLE daily_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_messages_owner" ON daily_messages
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS daily_messages_user_id_idx    ON daily_messages (user_id);
CREATE INDEX IF NOT EXISTS daily_messages_created_at_idx ON daily_messages (created_at);

NOTIFY pgrst, 'reload schema';
