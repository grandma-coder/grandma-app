-- Remote feature flags, flipped from the grandma command center (Feature flags page).
-- The app reads them on launch; edge functions check them server-side so old app builds
-- can't keep calling a switched-off feature. Missing row or read error = OFF (fail closed).
CREATE TABLE IF NOT EXISTS public.feature_flags (
  key        TEXT PRIMARY KEY CHECK (key ~ '^[a-z][a-z0-9_]{1,62}$'),
  enabled    BOOLEAN NOT NULL DEFAULT false,
  note       TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Flags are not secret: any app session (signed in or not) may read them. Writes: service role only.
DROP POLICY IF EXISTS feature_flags_read ON public.feature_flags;
CREATE POLICY feature_flags_read ON public.feature_flags FOR SELECT TO anon, authenticated USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.feature_flags FROM anon, authenticated;

-- "Talk to Grandma" (Claude via grandma-chat / nana-chat): OFF to avoid API cost.
INSERT INTO public.feature_flags (key, enabled, note)
VALUES ('grandma_chat', false, 'Talk to Grandma AI chat (Anthropic API). Off = hidden in the app and refused by the edge functions.')
ON CONFLICT (key) DO NOTHING;

-- Daily Rewards (points, streaks, badges, leaderboard): OFF for launch.
INSERT INTO public.feature_flags (key, enabled, note)
VALUES ('daily_rewards', false, 'Daily Rewards: points, streaks, badges and leaderboard. Off = hidden in the app.')
ON CONFLICT (key) DO NOTHING;
