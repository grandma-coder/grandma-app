-- Notifications upgrade — adds scheduling to push_campaigns, plus two new
-- command-center-owned tables: notification_templates (editable {{var}} copy for
-- event-driven pushes) and notification_copy_settings (the AI "suggest copy"
-- system prompt). Ported from Aura's admin notifications system, adapted to
-- grandma's event vocabulary.
--
-- Idempotent + safe to re-run.

-- ── 1. push_campaigns: scheduling + cron bookkeeping ─────────────────────────
-- status already text (draft|sending|sent|failed today); we add 'scheduled' and
-- 'cancelled' at the app layer — no enum change needed. scheduled_at drives the
-- Vercel Cron dispatcher; the cron_* columns record dispatch attempts + errors.
ALTER TABLE public.push_campaigns
  ADD COLUMN IF NOT EXISTS scheduled_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cron_attempts     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cron_last_error   TEXT,
  ADD COLUMN IF NOT EXISTS cron_processed_at TIMESTAMPTZ;

-- Partial index: the dispatcher only ever scans due scheduled rows.
CREATE INDEX IF NOT EXISTS idx_push_campaigns_scheduled
  ON public.push_campaigns (scheduled_at)
  WHERE status = 'scheduled';

-- ── 2. notification_templates ────────────────────────────────────────────────
-- Editable copy for automated, event-driven pushes. Keyed by `type` (natural
-- key). {{variable}} placeholders are interpolated by lib/notifications/render.ts.
-- The app never creates types via the UI — only edits the seeded set.
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type           TEXT NOT NULL UNIQUE,
  title_template TEXT NOT NULL,
  body_template  TEXT NOT NULL,
  description    TEXT,
  variables      TEXT[] NOT NULL DEFAULT '{}',
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by     TEXT
);

COMMENT ON TABLE public.notification_templates IS
  'Editable push notification message templates. Admins edit wording from the command center.';

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
-- Command-center tables are reached only via the service-role Postgres client
-- (which bypasses RLS by design); no user-facing policy is intended.

-- Seed grandma's event vocabulary. ON CONFLICT DO NOTHING so re-runs and manual
-- edits are preserved.
INSERT INTO public.notification_templates (type, title_template, body_template, description, variables) VALUES
  ('channel_post',       '📣 New in {{channelName}}', '{{actorName}} posted in {{channelName}}',          'When someone posts in a channel you follow',           ARRAY['actorName','channelName']),
  ('channel_reply',      '💬 New reply',              '{{actorName}} replied to your post',                'When someone replies to your channel post',            ARRAY['actorName','channelName']),
  ('mention',            '📣 You were mentioned',     '{{actorName}} mentioned you',                       'When someone mentions you in a post or reply',         ARRAY['actorName']),
  ('channel_digest',     '{{count}} new posts',       'Tap to catch up in your channels',                  'Daily digest when unread posts span multiple channels', ARRAY['count']),
  ('channel_digest_single','{{count}} new in {{channelName}}', 'Tap to catch up',                          'Daily digest when all unread posts are in one channel', ARRAY['count','channelName']),
  ('care_circle_invite', '💛 Care circle invite',     '{{actorName}} invited you to their care circle',    'When someone invites you to their care circle',        ARRAY['actorName']),
  ('care_circle_update', '💛 Care circle update',      '{{actorName}} shared an update',                     'When a caregiver shares an update (e.g. nanny note)',   ARRAY['actorName']),
  ('appointment_reminder','🗓️ Appointment soon',       '{{title}} on {{when}}',                             'Reminder ahead of a scheduled appointment',            ARRAY['title','when']),
  ('milestone',          '✨ New milestone',           '{{childName}} reached {{milestone}}',               'When a child hits a tracked growth milestone',         ARRAY['childName','milestone']),
  ('pregnancy_week',     '🤰 Week {{week}}',           'A new week of your pregnancy — see what''s new',     'Weekly pregnancy progress nudge',                      ARRAY['week']),
  ('cycle_fertile',      '🌱 Fertile window',          'Your fertile window is starting',                   'Pre-pregnancy fertile-window reminder',                ARRAY[]::text[]),
  ('daily_reminder',     '🔔 Daily check-in',          'A gentle nudge to log today',                       'Generic daily logging nudge',                          ARRAY[]::text[]),
  ('vaccine_due',        '💉 Vaccine due',             '{{childName}} has a vaccine due: {{vaccine}}',       'When a vaccination is coming due',                     ARRAY['childName','vaccine']),
  ('invite_friends',     'Invite a friend',           'Share grandma.app and help another parent',         'Onboarding nudge to invite friends',                   ARRAY[]::text[])
ON CONFLICT (type) DO NOTHING;

-- ── 3. notification_copy_settings ────────────────────────────────────────────
-- Key/value store for the AI "suggest copy" system prompt. Absence of the
-- 'suggest_system_prompt' row = use the built-in default (see
-- lib/notifications/default-suggest-prompt.ts). Empty value is never stored
-- (the row is deleted instead, reverting to default).
CREATE TABLE IF NOT EXISTS public.notification_copy_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

ALTER TABLE public.notification_copy_settings ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
