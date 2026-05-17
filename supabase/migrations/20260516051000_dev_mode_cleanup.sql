-- DRY RUN: count rows that look like dev-mode-created data for the
-- developer's account (igor@mothergames.com), without deleting anything.
--
-- After this runs, check the Supabase dashboard → Logs → Postgres logs
-- for the NOTICE lines below. A follow-up migration will do the actual
-- DELETEs once the counts look right.

DO $$
DECLARE
  v_user_id uuid;
  v_count_behaviors    integer;
  v_count_cycle_logs   integer;
  v_count_preg_logs    integer;
  v_count_children     integer;
  v_count_care_circle  integer;
  v_count_caregivers   integer;
  v_profile_summary    text;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'igor@mothergames.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE '[DRY RUN] no user with that email — nothing to inspect';
    RETURN;
  END IF;

  RAISE NOTICE '[DRY RUN] target user = %', v_user_id;

  SELECT COUNT(*) INTO v_count_behaviors
    FROM behaviors WHERE user_id = v_user_id;

  SELECT COUNT(*) INTO v_count_cycle_logs
    FROM cycle_logs WHERE user_id = v_user_id
      AND created_at > NOW() - INTERVAL '7 days';

  SELECT COUNT(*) INTO v_count_preg_logs
    FROM pregnancy_logs WHERE user_id = v_user_id
      AND created_at > NOW() - INTERVAL '7 days';

  SELECT COUNT(*) INTO v_count_children
    FROM children WHERE parent_id = v_user_id
      AND created_at > NOW() - INTERVAL '7 days';

  SELECT COUNT(*) INTO v_count_care_circle
    FROM care_circle WHERE owner_id = v_user_id
      AND created_at > NOW() - INTERVAL '7 days';

  SELECT COUNT(*) INTO v_count_caregivers
    FROM child_caregivers WHERE user_id = v_user_id
      AND accepted_at > NOW() - INTERVAL '7 days';

  RAISE NOTICE '[DRY RUN] behaviors (all):              %', v_count_behaviors;
  RAISE NOTICE '[DRY RUN] cycle_logs (last 7d):         %', v_count_cycle_logs;
  RAISE NOTICE '[DRY RUN] pregnancy_logs (last 7d):     %', v_count_preg_logs;
  RAISE NOTICE '[DRY RUN] children (last 7d):           %', v_count_children;
  RAISE NOTICE '[DRY RUN] care_circle (last 7d):        %', v_count_care_circle;
  RAISE NOTICE '[DRY RUN] child_caregivers (last 7d):   %', v_count_caregivers;

  SELECT format('journey_mode=%s, due_date=%s, health_notes=%s',
                COALESCE(journey_mode, '<null>'),
                COALESCE(due_date::text, '<null>'),
                CASE WHEN health_notes IS NULL THEN '<null>'
                     ELSE '"' || LEFT(health_notes, 40) || '"' END)
  INTO v_profile_summary
  FROM profiles WHERE id = v_user_id;

  RAISE NOTICE '[DRY RUN] profile: %', v_profile_summary;
  RAISE NOTICE '[DRY RUN] nothing deleted. Review counts in Postgres logs, then apply the follow-up DELETE migration if they look right.';
END$$;
