-- Group notification templates by behavior + mark live vs planned.
--
-- Adds `behavior` (pre_pregnancy | pregnancy | kids | general) and `status`
-- (live = the grandma app fires this event today, even if under a generic type
-- key; planned = a real, sensible event not wired in the app yet). Backfills the
-- existing 14, then seeds the full per-behavior set the notifiable-event audit
-- surfaced. Idempotent.

ALTER TABLE public.notification_templates
  ADD COLUMN IF NOT EXISTS behavior TEXT NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS status   TEXT NOT NULL DEFAULT 'planned';

-- ── Backfill the existing 14 with behavior + real live/planned status ─────────
-- live = a generator in lib/notificationEngine.ts (or a DB trigger) fires the
-- underlying event today; planned = declared but no code path.
UPDATE public.notification_templates SET behavior='pregnancy', status='live'    WHERE type='pregnancy_week';
UPDATE public.notification_templates SET behavior='pre_pregnancy', status='live' WHERE type='cycle_fertile';
UPDATE public.notification_templates SET behavior='kids',      status='live'    WHERE type='milestone';
UPDATE public.notification_templates SET behavior='general',   status='live'    WHERE type='appointment_reminder';
UPDATE public.notification_templates SET behavior='general',   status='live'    WHERE type='channel_post';        -- fires as aggregate 'channel'
UPDATE public.notification_templates SET behavior='general',   status='live'    WHERE type='channel_reply';
UPDATE public.notification_templates SET behavior='general',   status='live'    WHERE type='mention';
UPDATE public.notification_templates SET behavior='general',   status='live'    WHERE type='channel_digest';
UPDATE public.notification_templates SET behavior='general',   status='live'    WHERE type='channel_digest_single';
UPDATE public.notification_templates SET behavior='general',   status='live'    WHERE type='care_circle_update';
UPDATE public.notification_templates SET behavior='general',   status='planned' WHERE type='care_circle_invite';  -- invite flow inserts no notification
UPDATE public.notification_templates SET behavior='general',   status='planned' WHERE type='daily_reminder';      -- local schedule only, no feed row
UPDATE public.notification_templates SET behavior='general',   status='planned' WHERE type='invite_friends';      -- no code
UPDATE public.notification_templates SET behavior='kids',      status='planned' WHERE type='vaccine_due';         -- declared, never generated

-- ── Seed the gap templates (behavior + status set explicitly) ─────────────────
INSERT INTO public.notification_templates (type, title_template, body_template, description, variables, behavior, status) VALUES
  -- PRE-PREGNANCY
  ('cycle_ovulation',      '🌷 Ovulation today', 'Your most fertile 24 hours are here. If you''re trying, this is your window.',              'Ovulation day reached (fires as milestone today)',            ARRAY['ovulationDay'],              'pre_pregnancy', 'live'),
  ('cycle_period_soon',    '🩸 Period due in {{daysUntilPeriod}} days', 'A little PMS is normal, love. Rest up and keep what you need close by.',   'Period predicted within 1-2 days (fires as reminder today)',  ARRAY['daysUntilPeriod'],           'pre_pregnancy', 'live'),
  ('cycle_period_late',    '🌙 Period is {{lateDays}} days late', 'Could be nothing, could be something. If you''re hoping, it might be time for a test.', 'Period late (fires as insight today)',           ARRAY['lateDays'],                  'pre_pregnancy', 'live'),
  ('cycle_log_reminder',   '🌱 Missed you these {{days}} days', 'Pop in a quick log — BBT, mood, or a symptom — so your predictions stay sharp.',      'No cycle logs in 5+ days (fires as missing_data today)',       ARRAY['days'],                      'pre_pregnancy', 'live'),
  -- PREGNANCY
  ('pregnancy_due_soon',   '👶 {{days}} days until your due date', 'Hospital bag packed? Stay close to home and trust your body.',                     'Due date within 14 days (fires as reminder today)',           ARRAY['days'],                      'pregnancy', 'live'),
  ('pregnancy_log_reminder','📝 No logs in {{days}} days', 'Log a symptom, mood, or weight to keep your week-by-week journey on track.',                'No pregnancy logs in 3+ days (fires as missing_data today)',   ARRAY['days'],                      'pregnancy', 'live'),
  ('pregnancy_symptom_alert','💜 Strong symptoms logged', '{{symptomList}} — if it persists or worsens, please contact your provider.',                'Severe symptom logged in last 24h (fires as health_alert)',   ARRAY['symptomList'],               'pregnancy', 'live'),
  ('kick_count_low',       '👣 Kicks lower than usual', 'Today: {{todayKicks}} vs {{avgOlder}} average. Try lying on your left side and count again.', 'Week 28+ kicks below 50% of 7-day avg (fires as health_alert)', ARRAY['todayKicks','avgOlder'],     'pregnancy', 'live'),
  ('pregnancy_appointment','🗓️ Your {{apptName}} is coming up', '{{prepNote}}',                                                                          'ACOG appointment schedule (data exists, not pushed yet)',      ARRAY['apptName','week','prepNote'], 'pregnancy', 'planned'),
  ('kick_count_reminder',  '👣 Time to count kicks, mama', 'Settle in somewhere cozy and count 10 little movements. I''ll wait.',                       'Daily kick-count prompt (not wired yet)',                     ARRAY['week'],                      'pregnancy', 'planned'),
  ('affirmation_daily',    '💜 A little something for today', '{{affirmation}}',                                                                        'Daily affirmation (display-only today, not pushed)',          ARRAY['affirmation'],               'pregnancy', 'planned'),
  ('weight_log_nudge',     '⚖️ Hop on the scale when you can', 'A weekly weight helps us watch that bump grow right on track.',                          'Weekly weight nudge (not wired yet)',                         ARRAY['week'],                      'pregnancy', 'planned'),
  ('birth_plan_reminder',  '📋 Around week 32, let''s plan the birth', 'Jot down your wishes for the big day — one page your doctor will actually read.',    'Birth-plan nudge (not wired yet)',                            ARRAY[]::text[],                    'pregnancy', 'planned'),
  -- KIDS
  ('wellness_drop',        '{{childName}}''s {{pillar}} needs attention', '{{pillar}} score is {{score}}/10, down {{trend}}% this week.',                'Pillar score below 4 (fires today)',                          ARRAY['childName','pillar','score','trend'], 'kids', 'live'),
  ('wellness_improve',     '{{childName}}''s {{pillar}} is improving!', '{{pillar}} score rose to {{score}}/10 — up {{trend}}% this week.',              'Pillar trend up (fires today)',                               ARRAY['childName','pillar','score','trend'], 'kids', 'live'),
  ('missing_data',         '📋 No logs for {{childName}} in {{days}} days', 'Regular logging helps Grandma spot patterns and give better insights.',      'No child logs in 24h+ (fires today)',                         ARRAY['childName','days'],          'kids', 'live'),
  ('routine_missed',       '⏰ {{childName}}: {{routineName}} not logged', 'Scheduled at {{time}} — tap to log it now.',                                  'Active routine past its time (fires today)',                  ARRAY['childName','routineName','time'], 'kids', 'live'),
  ('health_alert',         '🌡️ {{childName}}: high temperature', '{{temp}}°C on {{date}}. Monitor closely and consult a doctor if it persists.',        'Temperature log >= 38C (fires today)',                        ARRAY['childName','temp','date'],   'kids', 'live'),
  ('goal_achieved',        '🎉 {{childName}} hit the {{metric}} goal!', '{{value}} today (goal: {{target}}). Lovely work!',                             'Sleep/activity daily target met (fires today)',               ARRAY['childName','metric','value','target'], 'kids', 'live'),
  ('streak',               '🔥 {{streak}}-day streak for {{childName}}!', 'You''ve logged {{childName}}''s activities {{streak}} days in a row.',         'Log streak milestone (fires today)',                          ARRAY['childName','streak'],        'kids', 'live'),
  ('streak_broken',        '{{childName}}''s streak paused', 'No logs yesterday. Log something today to start a new one!',                              'Streak broken (fires today)',                                 ARRAY['childName'],                 'kids', 'live'),
  ('growth_leap',          '✨ {{childName}} may be entering a leap', 'Fussy days ahead, but big development too — {{leapSkill}} is coming. Extra cuddles help.', 'Wonder Weeks leap (data exists, not pushed)',        ARRAY['childName','leapNumber','leapSkill'], 'kids', 'planned'),
  ('medicine_reminder',    '💊 Medicine time for {{childName}}', '{{medName}} — {{dose}}. Tap when it''s given so we keep the record straight.',          'Medicine schedule (not wired yet)',                           ARRAY['childName','medName','dose','time'], 'kids', 'planned'),
  ('feeding_reminder',     '🍼 {{childName}} might be getting hungry', 'It''s been a while since the last feed — want to log one?',                        'Per-type feeding reminder (only generic routine today)',      ARRAY['childName','lastFedHours'],  'kids', 'planned'),
  -- GENERAL
  ('daily_summary',        '📊 Today''s recap: {{total}} activities', '{{typeBreakdown}}. Great tracking day!',                                          'End-of-day recap when >=1 log (fires today)',                 ARRAY['total','typeBreakdown'],     'general', 'live'),
  ('insight',              '💡 New insight: {{title}}', '{{body}}',                                                                                       'New insights row in 24h (fires today)',                       ARRAY['title','body'],              'general', 'live'),
  ('like',                 '❤️ {{name}} liked your message', '{{name}} liked your message in {{channelName}}.',                                          'Reaction/like/save on a post (DB trigger, fires today)',      ARRAY['name','channelName'],        'general', 'live'),
  ('channel_join',         '👋 {{name}} joined {{channelName}}', 'Your channel is getting noticed!',                                                     'Someone joins/saves your channel (DB trigger, fires today)',  ARRAY['name','channelName'],        'general', 'live'),
  ('weekly_report',        '📖 Your week, all wrapped up', '{{logCount}} logs, best in {{topPillar}}, one thing to watch: {{focusArea}}.',              'Data-driven weekly report (local static copy only today)',    ARRAY['logCount','topPillar','focusArea'], 'general', 'planned'),
  ('subscription_expiring','🧡 Your membership renews soon', 'On {{renewalDate}} — nothing to do, just a heads up. Manage anytime in settings.',        'Renewal notice (RevenueCat webhook writes no notification)',  ARRAY['renewalDate','tier'],        'general', 'planned')
ON CONFLICT (type) DO NOTHING;

NOTIFY pgrst, 'reload schema';
