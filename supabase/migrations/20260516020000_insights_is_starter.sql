-- =============================================================================
-- insights.is_starter — boolean flag for AI-pre-data nudge rows
--
-- Background: the client previously detected "starter" insights (nudges shown
-- when the user has no logs yet) via a hardcoded title-match Set. That breaks
-- if the title gets translated server-side and is brittle to any copy change.
-- This migration adds an explicit boolean column and a back-compat backfill
-- for known starter titles.
-- =============================================================================

ALTER TABLE insights
  ADD COLUMN IF NOT EXISTS is_starter boolean NOT NULL DEFAULT false;

-- Backfill: any existing row whose title matches one of the known starter
-- nudges gets flagged. Keep the literal list inline; future inserts come
-- from generate-insights with the flag set directly.
UPDATE insights
SET is_starter = true
WHERE is_starter = false
  AND title IN (
    'Log your little one''s day',
    'Development insights await',
    'Every detail helps',
    'Start logging your cycle',
    'Better predictions ahead',
    'Log symptoms too',
    'Start your pregnancy journal',
    'Milestones are coming',
    'Track your appointments'
  );

CREATE INDEX IF NOT EXISTS idx_insights_user_starter
  ON insights (user_id, is_starter)
  WHERE archived = false;

NOTIFY pgrst, 'reload schema';
