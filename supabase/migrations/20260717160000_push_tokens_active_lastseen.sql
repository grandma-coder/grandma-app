-- push_tokens: add is_active + last_seen_at (command-center dead-token pruning).
--
-- The internal command center sends remote push via the Expo Push API and needs
-- to deactivate tokens that Expo reports as permanently dead (DeviceNotRegistered,
-- InvalidPushToken, MismatchSenderId) so broadcasts don't keep hitting them.
--   • is_active   — flipped to false when Expo returns a terminal error for the
--                   token; sends resolve only WHERE is_active. Defaults true so
--                   every existing + future token is live until proven dead.
--   • last_seen_at — bumped by the app on each (re)registration so we can spot
--                    stale tokens. Defaults now() for existing rows.
--
-- Additive + idempotent per house style.

ALTER TABLE push_tokens
  ADD COLUMN IF NOT EXISTS is_active   boolean     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz          DEFAULT now();

-- Partial index: the send path scans active tokens by user.
CREATE INDEX IF NOT EXISTS idx_push_tokens_active_user
  ON push_tokens (user_id) WHERE is_active;

NOTIFY pgrst, 'reload schema';
