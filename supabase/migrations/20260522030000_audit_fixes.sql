-- =============================================================================
-- Audit fixes — addresses CRITICAL and HIGH issues from the migration retro
-- See conversation 2026-05-22 for the audit punch list.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- C7 — notify_channel_save reads channels.owner_id (doesn't exist; col is created_by)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_channel_save() RETURNS trigger AS $$
DECLARE
  v_owner_id uuid;
  v_channel_name text;
  v_saver_name text;
BEGIN
  SELECT created_by, name INTO v_owner_id, v_channel_name
    FROM channels WHERE id = NEW.channel_id;

  IF v_owner_id IS NULL OR v_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(name, 'Someone') INTO v_saver_name
    FROM profiles WHERE id = NEW.user_id;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    v_owner_id,
    'channel',
    v_saver_name || ' saved #' || v_channel_name,
    'Your channel is getting noticed!',
    jsonb_build_object('channelId', NEW.channel_id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- C8 — trigger functions querying profiles WHERE user_id = ... (col is id)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_garage_like() RETURNS trigger AS $$
DECLARE
  post_owner UUID;
  post_caption TEXT;
  liker_name TEXT;
BEGIN
  SELECT author_id, LEFT(caption, 60) INTO post_owner, post_caption
  FROM garage_posts WHERE id = NEW.post_id;

  IF post_owner = NEW.user_id THEN RETURN NEW; END IF;

  SELECT name INTO liker_name FROM profiles WHERE id = NEW.user_id;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    post_owner,
    'like',
    COALESCE(liker_name, 'Someone') || ' liked your post',
    post_caption,
    jsonb_build_object('postId', NEW.post_id, 'type', 'garage')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION notify_channel_join() RETURNS trigger AS $$
DECLARE
  ch_owner UUID;
  ch_name TEXT;
  joiner_name TEXT;
BEGIN
  SELECT created_by, name INTO ch_owner, ch_name
  FROM channels WHERE id = NEW.channel_id;

  IF ch_owner IS NULL OR ch_owner = NEW.user_id THEN RETURN NEW; END IF;

  SELECT name INTO joiner_name FROM profiles WHERE id = NEW.user_id;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    ch_owner,
    'channel',
    COALESCE(joiner_name, 'Someone') || ' joined #' || ch_name,
    NULL,
    jsonb_build_object('channelId', NEW.channel_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION notify_channel_reaction() RETURNS trigger AS $$
DECLARE
  msg_author UUID;
  msg_content TEXT;
  ch_name TEXT;
  reactor_name TEXT;
BEGIN
  SELECT cp.author_id, LEFT(cp.content, 60), c.name
  INTO msg_author, msg_content, ch_name
  FROM channel_posts cp
  JOIN channels c ON c.id = cp.channel_id
  WHERE cp.id = NEW.post_id;

  IF msg_author = NEW.user_id THEN RETURN NEW; END IF;

  SELECT name INTO reactor_name FROM profiles WHERE id = NEW.user_id;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    msg_author,
    'like',
    COALESCE(reactor_name, 'Someone') || ' liked your message in #' || COALESCE(ch_name, 'channel'),
    msg_content,
    jsonb_build_object('channelId', (SELECT channel_id FROM channel_posts WHERE id = NEW.post_id))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- H4 — channels_insert too permissive; require auth.uid() = created_by
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "channels_insert" ON channels;
CREATE POLICY "channels_insert" ON channels
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- -----------------------------------------------------------------------------
-- H5 — channel_requests SELECT was USING (true); scope to requester + channel owner
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "channel_requests_read" ON channel_requests;
CREATE POLICY "channel_requests_read" ON channel_requests
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM channels
      WHERE channels.id = channel_requests.channel_id
        AND channels.created_by = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- H8 — pregnancy_logs.log_type CHECK constraint was dropped; restore with full list
-- Source of truth: CLAUDE.md pregnancy_logs documentation
-- -----------------------------------------------------------------------------
ALTER TABLE pregnancy_logs DROP CONSTRAINT IF EXISTS pregnancy_logs_log_type_check;
ALTER TABLE pregnancy_logs ADD CONSTRAINT pregnancy_logs_log_type_check
  CHECK (log_type IN (
    'symptom',
    'weight',
    'kick_count',
    'contraction',
    'mood',
    'appointment',
    'note',
    'sleep',
    'water',
    'exercise',
    'vitamins',
    'kegel',
    'nutrition'
  ));

-- -----------------------------------------------------------------------------
-- M5 — cycle_logs schema reconciliation
-- 20260403010000 created the table with (log_date, log_type), but the app
-- and all subsequent migrations (20260420010000, 20260522022918) assume
-- (date, type). On any DB where the early migration applied, the table is
-- silently the wrong shape and all pre-pregnancy queries fail.
-- This block normalizes the schema in place.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cycle_logs' AND column_name = 'log_date'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cycle_logs' AND column_name = 'date'
  ) THEN
    ALTER TABLE cycle_logs RENAME COLUMN log_date TO date;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cycle_logs' AND column_name = 'log_type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cycle_logs' AND column_name = 'type'
  ) THEN
    ALTER TABLE cycle_logs RENAME COLUMN log_type TO type;
  END IF;
END $$;

-- Drop any stale CHECK that referenced log_type, then add the canonical one
ALTER TABLE cycle_logs DROP CONSTRAINT IF EXISTS cycle_logs_log_type_check;
ALTER TABLE cycle_logs DROP CONSTRAINT IF EXISTS cycle_logs_type_check;
ALTER TABLE cycle_logs ADD CONSTRAINT cycle_logs_type_check
  CHECK (type IN (
    'period_start', 'period_end', 'ovulation', 'symptom',
    'basal_temp', 'intercourse', 'cervical_mucus', 'mood',
    'energy', 'weight', 'note',
    'lh', 'opk_scan'
  ));

ALTER TABLE cycle_logs ADD COLUMN IF NOT EXISTS scan_url text;

CREATE INDEX IF NOT EXISTS idx_cycle_logs_user_date ON cycle_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_cycle_logs_user_type_date ON cycle_logs(user_id, type, date DESC);

-- -----------------------------------------------------------------------------
-- Cleanup: notifications with NULL user_id from the broken notify_channel_save
-- trigger (C7). Those rows were never deliverable.
-- -----------------------------------------------------------------------------
DELETE FROM notifications WHERE user_id IS NULL;

COMMIT;

NOTIFY pgrst, 'reload schema';
