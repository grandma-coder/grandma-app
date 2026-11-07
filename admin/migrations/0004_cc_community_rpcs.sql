-- Command-center community/channel metrics RPCs (live SQL). All STABLE + read-only.

-- ── High-level totals snapshot ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION cc_get_community_totals()
RETURNS TABLE (
  total_channels    bigint,
  total_posts       bigint,
  total_members     bigint,
  total_comments    bigint,
  total_reactions   bigint,
  active_channels_7d bigint,   -- channels with a post in the last 7 days
  posts_today       bigint,
  pending_moderation bigint    -- posts whose moderation_status is not approved/clean
) LANGUAGE sql STABLE AS $$
  SELECT
    (SELECT count(*) FROM channels),
    (SELECT count(*) FROM channel_posts),
    (SELECT count(*) FROM channel_members),
    (SELECT count(*) FROM post_comments),
    (SELECT count(*) FROM post_reactions),
    (SELECT count(DISTINCT channel_id) FROM channel_posts
       WHERE created_at >= now() - interval '7 days'),
    (SELECT count(*) FROM channel_posts
       WHERE created_at::date = now()::date),
    (SELECT count(*) FROM channel_posts
       WHERE moderation_status IS NOT NULL
         AND moderation_status NOT IN ('approved','clean','ok','visible'))
$$;

-- ── Channels list with derived activity ─────────────────────────────────────
CREATE OR REPLACE FUNCTION cc_get_channels()
RETURNS TABLE (
  id uuid, name text, category text, channel_type text,
  member_count int, post_count bigint, avg_rating numeric, rating_count int,
  last_post_at timestamptz
) LANGUAGE sql STABLE AS $$
  SELECT c.id, c.name, c.category, c.channel_type,
    coalesce(c.member_count, 0),
    (SELECT count(*) FROM channel_posts p WHERE p.channel_id = c.id),
    c.avg_rating, coalesce(c.rating_count, 0),
    (SELECT max(p.created_at) FROM channel_posts p WHERE p.channel_id = c.id)
  FROM channels c
  ORDER BY (SELECT count(*) FROM channel_posts p WHERE p.channel_id = c.id) DESC,
           coalesce(c.member_count,0) DESC
$$;

-- ── Posts per day over a window ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION cc_get_channel_posts_daily(p_since date, p_until date)
RETURNS TABLE (day date, posts bigint) LANGUAGE sql STABLE AS $$
  WITH d AS (SELECT generate_series(p_since, p_until, interval '1 day')::date AS day)
  SELECT d.day,
    (SELECT count(*) FROM channel_posts p
       WHERE (p.created_at AT TIME ZONE 'UTC')::date = d.day) AS posts
  FROM d ORDER BY d.day
$$;

-- ── Category breakdown (channels + posts per category) ──────────────────────
CREATE OR REPLACE FUNCTION cc_get_channel_categories()
RETURNS TABLE (category text, channels bigint, posts bigint) LANGUAGE sql STABLE AS $$
  SELECT coalesce(c.category, 'uncategorized') AS category,
    count(DISTINCT c.id) AS channels,
    count(p.id) AS posts
  FROM channels c
  LEFT JOIN channel_posts p ON p.channel_id = c.id
  GROUP BY coalesce(c.category, 'uncategorized')
  ORDER BY count(p.id) DESC, count(DISTINCT c.id) DESC
$$;

NOTIFY pgrst, 'reload schema';
