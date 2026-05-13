-- =============================================================================
-- leaderboard_scores: include pregnancy_logs and cycle_logs in the points math.
-- Previously only child_logs contributed to ranking, so pregnant / pre-pregnant
-- users with daily logging activity scored zero from their primary surface.
-- =============================================================================

DROP VIEW IF EXISTS leaderboard_scores;
CREATE VIEW leaderboard_scores AS
SELECT
  p.id AS user_id,
  p.name,
  p.photo_url,
  COALESCE(gp.post_count, 0) AS garage_posts,
  COALESCE(gp.total_likes, 0) AS garage_likes,
  COALESCE(gp.total_comments, 0) AS garage_comments,
  COALESCE(cp.post_count, 0) AS channel_posts,
  COALESCE(cp.total_reactions, 0) AS channel_reactions,
  COALESCE(cp.total_replies, 0) AS channel_replies,
  COALESCE(cm.channels_joined, 0) AS channels_joined,
  COALESCE(cl.total_logs, 0) AS child_logs,
  COALESCE(cl.log_streak, 0) AS log_streak,
  COALESCE(pl.total_logs, 0) AS pregnancy_logs,
  COALESCE(cyl.total_logs, 0) AS cycle_logs,
  -- Points formula
  (
    COALESCE(gp.post_count, 0) * 5 +
    COALESCE(gp.total_likes, 0) * 1 +
    COALESCE(gp.total_comments, 0) * 2 +
    COALESCE(cp.post_count, 0) * 3 +
    COALESCE(cp.total_reactions, 0) * 1 +
    COALESCE(cp.total_replies, 0) * 2 +
    COALESCE(cm.channels_joined, 0) * 2 +
    COALESCE(cl.total_logs, 0) * 1 +
    COALESCE(pl.total_logs, 0) * 1 +
    COALESCE(cyl.total_logs, 0) * 1 +
    LEAST(COALESCE(cl.log_streak, 0), 60) * 3
  ) AS total_points
FROM profiles p
LEFT JOIN (
  SELECT author_id,
    COUNT(*) AS post_count,
    SUM(like_count) AS total_likes,
    SUM(comment_count) AS total_comments
  FROM garage_posts
  GROUP BY author_id
) gp ON p.id = gp.author_id
LEFT JOIN (
  SELECT author_id,
    COUNT(*) AS post_count,
    SUM(reaction_count) AS total_reactions,
    SUM(reply_count) AS total_replies
  FROM channel_posts
  WHERE reply_to_id IS NULL
  GROUP BY author_id
) cp ON p.id = cp.author_id
LEFT JOIN (
  SELECT user_id, COUNT(DISTINCT channel_id) AS channels_joined
  FROM channel_members
  GROUP BY user_id
) cm ON p.id = cm.user_id
LEFT JOIN (
  SELECT cl.user_id,
    COUNT(*) AS total_logs,
    0 AS log_streak
  FROM child_logs cl
  WHERE cl.date >= (CURRENT_DATE - INTERVAL '90 days')
  GROUP BY cl.user_id
) cl ON p.id = cl.user_id
LEFT JOIN (
  SELECT user_id, COUNT(*) AS total_logs
  FROM pregnancy_logs
  WHERE log_date >= (CURRENT_DATE - INTERVAL '90 days')
  GROUP BY user_id
) pl ON p.id = pl.user_id
LEFT JOIN (
  SELECT user_id, COUNT(*) AS total_logs
  FROM cycle_logs
  WHERE date >= (CURRENT_DATE - INTERVAL '90 days')
  GROUP BY user_id
) cyl ON p.id = cyl.user_id
WHERE p.name IS NOT NULL
ORDER BY total_points DESC;

NOTIFY pgrst, 'reload schema';
