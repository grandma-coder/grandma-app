-- Command-center metrics RPCs (live SQL, hybrid model — KPIs + funnel computed
-- on request; retention/DAU-history rollup can be layered later).
--
-- Activity signal = a row a user CHOSE to create, unioned across the log tables:
--   child_logs, cycle_logs, pregnancy_logs (user_id) + channel_posts (author_id).
-- All functions are STABLE and read-only.

-- ── Activity days: one row per (user, UTC day) they were active ──────────────
CREATE OR REPLACE FUNCTION cc_activity_days(p_since date, p_until date)
RETURNS TABLE (user_id uuid, day date) LANGUAGE sql STABLE AS $$
  SELECT user_id, (created_at AT TIME ZONE 'UTC')::date AS day
  FROM (
    SELECT user_id, created_at FROM child_logs
    UNION ALL SELECT user_id, created_at FROM cycle_logs
    UNION ALL SELECT user_id, created_at FROM pregnancy_logs
    UNION ALL SELECT author_id AS user_id, created_at FROM channel_posts
  ) a
  WHERE created_at IS NOT NULL
    AND (created_at AT TIME ZONE 'UTC')::date BETWEEN p_since AND p_until
  GROUP BY user_id, (created_at AT TIME ZONE 'UTC')::date
$$;

-- ── Daily activity: DAU + new signups per day over the window ────────────────
CREATE OR REPLACE FUNCTION cc_get_daily_activity(p_since date, p_until date)
RETURNS TABLE (day date, dau bigint, new_signups bigint) LANGUAGE sql STABLE AS $$
  WITH d AS (SELECT generate_series(p_since, p_until, interval '1 day')::date AS day),
  act AS (SELECT * FROM cc_activity_days(p_since, p_until))
  SELECT d.day,
    (SELECT count(DISTINCT a.user_id) FROM act a WHERE a.day = d.day) AS dau,
    (SELECT count(*) FROM profiles p
       WHERE p.created_at IS NOT NULL
         AND (p.created_at AT TIME ZONE 'UTC')::date = d.day) AS new_signups
  FROM d ORDER BY d.day
$$;

-- ── Headline totals (window-independent snapshot) ───────────────────────────
CREATE OR REPLACE FUNCTION cc_get_totals()
RETURNS TABLE (
  total_users bigint, premium_users bigint,
  dau bigint, wau bigint, mau bigint,
  mode_pre bigint, mode_preg bigint, mode_kids bigint
) LANGUAGE sql STABLE AS $$
  SELECT
    (SELECT count(*) FROM profiles),
    (SELECT count(*) FROM profiles WHERE subscription_tier::text <> 'free'),
    (SELECT count(DISTINCT user_id) FROM cc_activity_days((now()-interval '1 day')::date, now()::date)),
    (SELECT count(DISTINCT user_id) FROM cc_activity_days((now()-interval '7 day')::date, now()::date)),
    (SELECT count(DISTINCT user_id) FROM cc_activity_days((now()-interval '30 day')::date, now()::date)),
    (SELECT count(*) FROM profiles WHERE journey_mode = 'pre_pregnancy'),
    (SELECT count(*) FROM profiles WHERE journey_mode = 'pregnancy'),
    (SELECT count(*) FROM profiles WHERE journey_mode = 'kids')
$$;

-- ── Activation funnel over a signup-cohort window ───────────────────────────
--   signed_up  — profiles created in window
--   onboarded  — journey_mode set AND a behaviors row exists
--   activated  — ≥1 activity-signal row EVER (a user-chosen action)
--   subscribed — subscription_tier <> 'free'
CREATE OR REPLACE FUNCTION cc_get_activation_funnel(p_since date, p_until date)
RETURNS TABLE (stage text, count bigint) LANGUAGE sql STABLE AS $$
  WITH cohort AS (
    SELECT id, journey_mode, subscription_tier
    FROM profiles
    WHERE created_at IS NOT NULL
      AND (created_at AT TIME ZONE 'UTC')::date BETWEEN p_since AND p_until
  ),
  onboarded AS (
    SELECT c.id FROM cohort c
    WHERE c.journey_mode IS NOT NULL
      AND EXISTS (SELECT 1 FROM behaviors b WHERE b.user_id = c.id)
  ),
  activated AS (
    SELECT DISTINCT c.id FROM cohort c
    WHERE EXISTS (SELECT 1 FROM child_logs x WHERE x.user_id = c.id)
       OR EXISTS (SELECT 1 FROM cycle_logs x WHERE x.user_id = c.id)
       OR EXISTS (SELECT 1 FROM pregnancy_logs x WHERE x.user_id = c.id)
       OR EXISTS (SELECT 1 FROM channel_posts x WHERE x.author_id = c.id)
  )
  SELECT * FROM (VALUES
    ('signed_up',  (SELECT count(*) FROM cohort)),
    ('onboarded',  (SELECT count(*) FROM onboarded)),
    ('activated',  (SELECT count(*) FROM activated)),
    ('subscribed', (SELECT count(*) FROM cohort WHERE subscription_tier::text <> 'free'))
  ) AS t(stage, count)
$$;

NOTIFY pgrst, 'reload schema';
