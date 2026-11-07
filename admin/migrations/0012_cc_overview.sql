-- Executive overview RPC — one call powering the home dashboard.
--
-- Returns a single JSON blob of top-line app health: users + growth,
-- engagement (DAU/WAU/MAU + stickiness), lifecycle (active/dormant/churned),
-- correct multi-behavior counts (from the behaviors table, not journey_mode),
-- subscription mix, and community/content totals. Read-only, STABLE.
--
-- Note: "last active" = GREATEST of activity MAX(created_at) + push_tokens
-- last_seen (same signal as the user detail page). Idempotent.

CREATE OR REPLACE FUNCTION public.cc_get_overview()
RETURNS jsonb LANGUAGE sql STABLE AS $$
  WITH la AS (  -- last-active per user across activity + device last-seen
    SELECT p.id,
      GREATEST(
        COALESCE((SELECT max(created_at) FROM child_logs      x WHERE x.user_id = p.id), 'epoch'::timestamptz),
        COALESCE((SELECT max(created_at) FROM cycle_logs      x WHERE x.user_id = p.id), 'epoch'::timestamptz),
        COALESCE((SELECT max(created_at) FROM pregnancy_logs  x WHERE x.user_id = p.id), 'epoch'::timestamptz),
        COALESCE((SELECT max(created_at) FROM channel_posts   x WHERE x.author_id = p.id), 'epoch'::timestamptz),
        COALESCE((SELECT max(last_seen_at) FROM push_tokens   t WHERE t.user_id = p.id), 'epoch'::timestamptz)
      ) AS last_active
    FROM profiles p
  ),
  enrolled AS (  -- distinct users per behavior (cycle == pre_pregnancy), incl. journey_mode fallback
    SELECT DISTINCT p.id, CASE WHEN b.type = 'cycle' THEN 'pre_pregnancy' ELSE b.type END AS mode
    FROM profiles p JOIN behaviors b ON b.user_id = p.id AND b.active
    UNION
    SELECT p.id, p.journey_mode FROM profiles p
    WHERE p.journey_mode IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM behaviors b WHERE b.user_id = p.id AND b.active)
  )
  SELECT jsonb_build_object(
    'users', jsonb_build_object(
      'total',        (SELECT count(*) FROM profiles),
      'new7d',        (SELECT count(*) FROM profiles WHERE created_at >= now() - interval '7 days'),
      'new30d',       (SELECT count(*) FROM profiles WHERE created_at >= now() - interval '30 days'),
      'prev7d',       (SELECT count(*) FROM profiles WHERE created_at >= now() - interval '14 days' AND created_at < now() - interval '7 days')
    ),
    'engagement', jsonb_build_object(
      'dau', (SELECT count(*) FROM la WHERE last_active >= now() - interval '1 day'),
      'wau', (SELECT count(*) FROM la WHERE last_active >= now() - interval '7 days'),
      'mau', (SELECT count(*) FROM la WHERE last_active >= now() - interval '30 days'),
      'totalLogs', (
        (SELECT count(*) FROM child_logs) + (SELECT count(*) FROM cycle_logs) + (SELECT count(*) FROM pregnancy_logs)
      ),
      'logs7d', (
        (SELECT count(*) FROM child_logs WHERE created_at >= now() - interval '7 days') +
        (SELECT count(*) FROM cycle_logs WHERE created_at >= now() - interval '7 days') +
        (SELECT count(*) FROM pregnancy_logs WHERE created_at >= now() - interval '7 days')
      )
    ),
    'lifecycle', jsonb_build_object(
      'active',   (SELECT count(*) FROM la WHERE last_active >= now() - interval '7 days'),
      'dormant',  (SELECT count(*) FROM la WHERE last_active < now() - interval '7 days' AND last_active >= now() - interval '30 days'),
      'atRisk',   (SELECT count(*) FROM la WHERE last_active < now() - interval '30 days' AND last_active >= now() - interval '60 days'),
      'churned',  (SELECT count(*) FROM la WHERE last_active < now() - interval '60 days' AND last_active > 'epoch'::timestamptz)
    ),
    'behaviors', jsonb_build_object(
      'pre_pregnancy', (SELECT count(*) FROM enrolled WHERE mode = 'pre_pregnancy'),
      'pregnancy',     (SELECT count(*) FROM enrolled WHERE mode = 'pregnancy'),
      'kids',          (SELECT count(*) FROM enrolled WHERE mode = 'kids')
    ),
    'subscription', jsonb_build_object(
      'free',           (SELECT count(*) FROM profiles WHERE subscription_tier::text = 'free'),
      'premium_solo',   (SELECT count(*) FROM profiles WHERE subscription_tier::text = 'premium_solo'),
      'premium_family', (SELECT count(*) FROM profiles WHERE subscription_tier::text = 'premium_family'),
      'paid',           (SELECT count(*) FROM profiles WHERE subscription_tier::text <> 'free')
    ),
    'community', jsonb_build_object(
      'channels',    COALESCE((SELECT count(*) FROM channels), 0),
      'posts',       (SELECT count(*) FROM channel_posts),
      'posts7d',     (SELECT count(*) FROM channel_posts WHERE created_at >= now() - interval '7 days')
    ),
    'content', jsonb_build_object(
      'questions',   COALESCE((SELECT count(*) FROM content_daily_questions), 0),
      'affirmations',COALESCE((SELECT count(*) FROM affirmations), 0),
      'birthTopics', COALESCE((SELECT count(*) FROM content_birth_topics), 0),
      'sources',     COALESCE((SELECT count(*) FROM content_sources), 0),
      'newsPublished', COALESCE((SELECT count(*) FROM content_news WHERE status = 'published'), 0),
      'newsDrafts',  COALESCE((SELECT count(*) FROM content_news WHERE status = 'draft'), 0)
    )
  );
$$;

NOTIFY pgrst, 'reload schema';
