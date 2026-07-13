-- Daily Message becomes per-mode: a user enrolled in more than one behavior
-- (e.g. pregnancy + cycle) draws an INDEPENDENT card per mode per day. Before
-- this, UNIQUE(user_id, date) meant one shared row across every behavior, so a
-- pregnancy card would surface on the cycle home and vice-versa.

ALTER TABLE daily_messages
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'pregnancy';

-- Existing rows predate the cycle bank, so they belong to pregnancy — the
-- DEFAULT already backfilled them. Drop the default now that the column is
-- populated; the app always writes an explicit mode going forward.
ALTER TABLE daily_messages ALTER COLUMN mode DROP DEFAULT;

-- Swap the uniqueness key from (user, date) to (user, date, mode). The old
-- constraint is auto-named daily_messages_user_id_date_key by Postgres.
ALTER TABLE daily_messages DROP CONSTRAINT IF EXISTS daily_messages_user_id_date_key;
ALTER TABLE daily_messages
  ADD CONSTRAINT daily_messages_user_id_date_mode_key UNIQUE (user_id, date, mode);

NOTIFY pgrst, 'reload schema';
