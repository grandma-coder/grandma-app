-- ============================================================
-- System messages for join/leave + private channel request flow
-- ============================================================

-- 1) Add message_type to channel_posts for system messages
ALTER TABLE channel_posts ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'user';
-- message_type: 'user' (normal), 'system_join', 'system_leave'

-- 2) Allow system messages to have empty author (inserted by app on behalf of system)
-- We'll use the joining/leaving user as author_id so we know who it was

-- 3) Private channel join requests
CREATE TABLE IF NOT EXISTS channel_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, denied
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  UNIQUE(channel_id, user_id)
);

ALTER TABLE channel_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can read requests (needed for UI checks)
DO $$ BEGIN
  CREATE POLICY "channel_requests_read" ON channel_requests FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can insert their own requests
DO $$ BEGIN
  CREATE POLICY "channel_requests_insert" ON channel_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Channel owner can update requests (approve/deny)
DO $$ BEGIN
  CREATE POLICY "channel_requests_update" ON channel_requests FOR UPDATE USING (
    EXISTS (SELECT 1 FROM channels WHERE id = channel_requests.channel_id AND created_by = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can delete their own pending requests (cancel)
DO $$ BEGIN
  CREATE POLICY "channel_requests_delete" ON channel_requests FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_channel_requests_channel ON channel_requests(channel_id, status);
CREATE INDEX IF NOT EXISTS idx_channel_requests_user ON channel_requests(user_id, status);
