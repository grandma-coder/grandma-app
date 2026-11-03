-- Fix pending_moderation in cc_get_community_totals. It previously counted
-- channel_posts whose moderation_status was non-clean — but the real "needs a
-- human" signal is unresolved user REPORTS (content_reports), which is what the
-- new moderation queue works from. Repoint the count at open reports so the
-- Community KPI and the queue agree. Everything else in the function is
-- unchanged. Idempotent (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION public.cc_get_community_totals()
 RETURNS TABLE(total_channels bigint, total_posts bigint, total_members bigint, total_comments bigint, total_reactions bigint, active_channels_7d bigint, posts_today bigint, pending_moderation bigint)
 LANGUAGE sql
 STABLE
AS $function$
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
    -- Unresolved user reports awaiting review (the moderation queue's backlog).
    (SELECT count(*) FROM content_reports
       WHERE status IS NULL OR status IN ('pending','open','new','reported'))
$function$;

NOTIFY pgrst, 'reload schema';
