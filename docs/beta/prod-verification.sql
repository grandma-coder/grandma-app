-- =============================================================================
-- grandma.app: production verification (READ-ONLY)
-- Paste into the Supabase SQL editor of the PRODUCTION project and run block by
-- block (or all at once; the editor shows the last result, so run each block
-- separately to see every table). Every statement is a SELECT against
-- catalog views. Nothing here creates, changes or deletes anything.
-- Generated from supabase/migrations/*.sql filenames (all of them listed below).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- BLOCK 1: Which repo migrations are recorded as applied?
-- Compares the version list from the repo against
-- supabase_migrations.schema_migrations (the table the Supabase CLI writes to).
-- status = MISSING means that migration is not recorded in prod. Note: if a
-- migration was pasted manually in the SQL editor it will not be recorded even
-- though its effects may be present; use blocks 2 to 5 to check the effects.
-- If the history table does not exist at all, this block returns a single row
-- saying so instead of failing.
-- -----------------------------------------------------------------------------
WITH repo(version, name) AS (
  VALUES
    ('20260330010000', 'child_caregivers'),
    ('20260403010000', 'mode_awareness'),
    ('20260405010000', 'channel_posts'),
    ('20260405020000', 'child_logs'),
    ('20260405030000', 'children_expanded'),
    ('20260405040000', 'fix_caregiver_rls'),
    ('20260405050000', 'garage_listings'),
    ('20260405060000', 'insights_table'),
    ('20260405070000', 'profiles_columns'),
    ('20260406010000', 'garage_posts'),
    ('20260407010000', 'fix_storage_policies'),
    ('20260407020000', 'garage_counters'),
    ('20260407030000', 'channels_complete'),
    ('20260408010000', 'channel_ratings'),
    ('20260408020000', 'seed_more_channels'),
    ('20260408030000', 'channel_saves_notifications'),
    ('20260408040000', 'seed_channels_and_messages'),
    ('20260409010000', 'share_count_and_auto_notifications'),
    ('20260411010000', 'channel_system_messages_and_private'),
    ('20260411020000', 'seed_kids_activity_data'),
    ('20260411030000', 'child_routines'),
    ('20260411040000', 'child_goals'),
    ('20260411050000', 'seed_bob_data'),
    ('20260411060000', 'fix_health_seed_format'),
    ('20260411070000', 'fix_children_health_data'),
    ('20260412010000', 'caregiver_and_comment_notifications'),
    ('20260412020000', 'leaderboard_and_points'),
    ('20260412030000', 'children_country_code'),
    ('20260412040000', 'dedup_child_routines'),
    ('20260413010000', 'reseed_kids_with_routine_links'),
    ('20260413020000', 'seed_diaper_logs'),
    ('20260413030000', 'seed_bob_diapers_recent'),
    ('20260413040000', 'remove_bahia_diaper_logs'),
    ('20260413050000', 'emergency_insurance'),
    ('20260415000000', 'pregnancy_profile'),
    ('20260415010000', 'pregnancy_logs_extend'),
    ('20260416010000', 'pregnancy_routines'),
    ('20260416020000', 'seed_pregnancy_logs'),
    ('20260416030000', 'affirmations'),
    ('20260420010000', 'cycle_logs'),
    ('20260421010000', 'subscription_tiers'),
    ('20260422000000', 'exams'),
    ('20260422010000', 'exam_photos_rls'),
    ('20260502010000', 'profiles_blood_type'),
    ('20260509120000', 'affirmations_dedup_rpc'),
    ('20260512120000', 'rls_hardening'),
    ('20260512130000', 'kids_vaccine_schedule'),
    ('20260512140000', 'kids_reminders'),
    ('20260512150000', 'scan_history_user_id'),
    ('20260512160000', 'leaderboard_pregnancy_cycle'),
    ('20260516020000', 'insights_is_starter'),
    ('20260516030000', 'onboarding_p0_fixes'),
    ('20260516040000', 'care_circle_invite_name'),
    ('20260516050000', 'profiles_journey_mode'),
    ('20260516051000', 'dev_mode_cleanup'),
    ('20260516060000', 'backfill_child_caregivers'),
    ('20260521000000', 'children_photo_url'),
    ('20260521150000', 'children_skeleton_space'),
    ('20260522022918', 'cycle_signal_logs'),
    ('20260522030000', 'audit_fixes'),
    ('20260524000000', 'cascade_user_delete'),
    ('20260604120000', 'remap_cycle_symptom_ids'),
    ('20260607130000', 'garage_increment_share_count'),
    ('20260607131000', 'remove_channel_seed'),
    ('20260615120000', 'p0_security_fixes'),
    ('20260616120000', 'p1_rls_fixes'),
    ('20260616130000', 'p2_rls_db_hardening'),
    ('20260616140000', 'invite_token_expiry'),
    ('20260616150000', 'drop_insecure_caregiver_insert_policy'),
    ('20260617130000', 'private_photo_buckets'),
    ('20260617140000', 'log_updated_at'),
    ('20260625120000', 'cycle_checklist'),
    ('20260626120000', 'caregiver_phi_gating'),
    ('20260626130000', 'caregiver_read_gates'),
    ('20260626140000', 'invite_status_expired_enum'),
    ('20260626150000', 'guard_subscription_tier'),
    ('20260626160000', 'fix_subscription_tier_guard_definer'),
    ('20260705120000', 'content_translations'),
    ('20260711120000', 'daily_messages'),
    ('20260712100000', 'daily_messages_mode'),
    ('20260714120000', 'care_circle_member_read'),
    ('20260716120000', 'privacy_settings_and_deletion'),
    ('20260716140000', 'notification_prefs_and_push_tokens'),
    ('20260716160000', 'profiles_consented_at'),
    ('20260716180000', 'community_safety'),
    ('20260717120000', 'cycle_completeness_log_types'),
    ('20260717140000', 'post_saves'),
    ('20260717160000', 'push_tokens_active_lastseen'),
    ('20260717170000', 'expert_verification'),
    ('20260717180000', 'polls'),
    ('20260717200000', 'seed_topic_channels'),
    ('20260717220000', 'remove_test_channels'),
    ('20260717240000', 'circles_foundation'),
    ('20260717260000', 'cycle_lifestyle_logs'),
    ('20260717280000', 'channel_mutes'),
    ('20260718120000', 'circle_post_count'),
    ('20260718140000', 'circle_reactions'),
    ('20260718200000', 'channel_logic_fixes'),
    ('20260719210000', 'memories_per_behavior'),
    ('20260719220000', 'cycle_photos_bucket'),
    ('20260726120000', 'menopause_logs'),
    ('20261101120000', 'feature_flags'),
    ('20261102180000', 'public_views_no_anon'),
    ('20261102200000', 'paywall_flag')
),
has_hist AS (
  SELECT to_regclass('supabase_migrations.schema_migrations') IS NOT NULL AS ok
),
applied AS (
  -- query_to_xml lets us read the history table only if it exists, with no error otherwise
  SELECT (xpath('/row/version/text()', x))[1]::text AS version
  FROM (
    SELECT unnest(xpath('/table/row',
      query_to_xml(
        CASE WHEN (SELECT ok FROM has_hist)
          THEN 'SELECT version FROM supabase_migrations.schema_migrations'
          ELSE 'SELECT NULL::text AS version WHERE false' END,
        false, false, ''))) AS x
  ) s
)
SELECT r.version, r.name,
       CASE WHEN NOT (SELECT ok FROM has_hist) THEN 'NO HISTORY TABLE'
            WHEN a.version IS NULL THEN 'MISSING' ELSE 'applied' END AS status
FROM repo r
LEFT JOIN applied a ON a.version = r.version
ORDER BY (a.version IS NOT NULL), r.version;   -- MISSING rows first


-- -----------------------------------------------------------------------------
-- BLOCK 1b: Versions recorded in prod that are NOT in the repo
-- (applied from another branch or renamed files). Should normally be empty.
-- -----------------------------------------------------------------------------
SELECT (xpath('/row/version/text()', x))[1]::text AS prod_only_version
FROM (
  SELECT unnest(xpath('/table/row',
    query_to_xml(
      CASE WHEN to_regclass('supabase_migrations.schema_migrations') IS NOT NULL
        THEN 'SELECT version FROM supabase_migrations.schema_migrations'
        ELSE 'SELECT NULL::text AS version WHERE false' END,
      false, false, ''))) AS x
) s
WHERE (xpath('/row/version/text()', x))[1]::text NOT IN (
  '20260330010000',
  '20260403010000',
  '20260405010000',
  '20260405020000',
  '20260405030000',
  '20260405040000',
  '20260405050000',
  '20260405060000',
  '20260405070000',
  '20260406010000',
  '20260407010000',
  '20260407020000',
  '20260407030000',
  '20260408010000',
  '20260408020000',
  '20260408030000',
  '20260408040000',
  '20260409010000',
  '20260411010000',
  '20260411020000',
  '20260411030000',
  '20260411040000',
  '20260411050000',
  '20260411060000',
  '20260411070000',
  '20260412010000',
  '20260412020000',
  '20260412030000',
  '20260412040000',
  '20260413010000',
  '20260413020000',
  '20260413030000',
  '20260413040000',
  '20260413050000',
  '20260415000000',
  '20260415010000',
  '20260416010000',
  '20260416020000',
  '20260416030000',
  '20260420010000',
  '20260421010000',
  '20260422000000',
  '20260422010000',
  '20260502010000',
  '20260509120000',
  '20260512120000',
  '20260512130000',
  '20260512140000',
  '20260512150000',
  '20260512160000',
  '20260516020000',
  '20260516030000',
  '20260516040000',
  '20260516050000',
  '20260516051000',
  '20260516060000',
  '20260521000000',
  '20260521150000',
  '20260522022918',
  '20260522030000',
  '20260524000000',
  '20260604120000',
  '20260607130000',
  '20260607131000',
  '20260615120000',
  '20260616120000',
  '20260616130000',
  '20260616140000',
  '20260616150000',
  '20260617130000',
  '20260617140000',
  '20260625120000',
  '20260626120000',
  '20260626130000',
  '20260626140000',
  '20260626150000',
  '20260626160000',
  '20260705120000',
  '20260711120000',
  '20260712100000',
  '20260714120000',
  '20260716120000',
  '20260716140000',
  '20260716160000',
  '20260716180000',
  '20260717120000',
  '20260717140000',
  '20260717160000',
  '20260717170000',
  '20260717180000',
  '20260717200000',
  '20260717220000',
  '20260717240000',
  '20260717260000',
  '20260717280000',
  '20260718120000',
  '20260718140000',
  '20260718200000',
  '20260719210000',
  '20260719220000',
  '20260726120000',
  '20261101120000',
  '20261102180000',
  '20261102200000'
);


-- -----------------------------------------------------------------------------
-- BLOCK 2: Do the key tables exist?
-- One row per expected table. exists = false means the migration that creates it
-- has not taken effect. Sources:
--   support_tickets, waitlist: admin/migrations 0015 and 0018
--   menopause_logs: 20260726120000; content_translations: 20260705120000
--   feature_flags: 20261101120000
-- -----------------------------------------------------------------------------
SELECT t.table_name,
       (c.table_name IS NOT NULL) AS exists
FROM (VALUES
  ('support_tickets'), ('menopause_logs'), ('content_translations'),
  ('feature_flags'), ('waitlist'), ('beta_testers'), ('profiles'),
  ('children'), ('cycle_logs'), ('pregnancy_logs'), ('child_logs')
) AS t(table_name)
LEFT JOIN information_schema.tables c
  ON c.table_schema = 'public' AND c.table_name = t.table_name
ORDER BY exists, t.table_name;


-- -----------------------------------------------------------------------------
-- BLOCK 3: Do the key columns exist?
-- profiles.menopause_stage and profiles.last_period_date (20260726120000),
-- profiles.privacy_settings (20260716120000), plus the columns of the feature
-- flags table (key, enabled, note, updated_at).
-- -----------------------------------------------------------------------------
SELECT e.table_name, e.column_name,
       (c.column_name IS NOT NULL) AS exists,
       c.data_type
FROM (VALUES
  ('profiles', 'menopause_stage'),
  ('profiles', 'last_period_date'),
  ('profiles', 'privacy_settings'),
  ('feature_flags', 'key'),
  ('feature_flags', 'enabled'),
  ('feature_flags', 'note'),
  ('feature_flags', 'updated_at')
) AS e(table_name, column_name)
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public'
 AND c.table_name = e.table_name
 AND c.column_name = e.column_name
ORDER BY exists, e.table_name, e.column_name;


-- -----------------------------------------------------------------------------
-- BLOCK 4: Waitlist-related tables and any table with "waitlist" in its name
-- Shows what exists so you can compare with admin/migrations/0018_waitlist.sql
-- and 0019_waitlist_place.sql (the latter adds waitlist place logic).
-- -----------------------------------------------------------------------------
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name ILIKE '%waitlist%'
ORDER BY table_schema, table_name;

-- Functions that mention waitlist (0019 adds place logic).
SELECT n.nspname AS schema, p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname ILIKE '%waitlist%'
ORDER BY 1, 2;


-- -----------------------------------------------------------------------------
-- BLOCK 5: Feature flag rows currently in prod
-- Expected at least: grandma_chat, daily_rewards (20261101120000) and the
-- paywall flag (20261102200000). Flags default OFF; confirm each is what you
-- intend for launch. Returns nothing if the table is missing (see block 2).
-- -----------------------------------------------------------------------------
SELECT *
FROM query_to_xml(
  CASE WHEN to_regclass('public.feature_flags') IS NOT NULL
    THEN 'SELECT key, enabled, note, updated_at FROM public.feature_flags ORDER BY key'
    ELSE 'SELECT ''feature_flags table missing''::text AS key' END,
  false, false, '') AS flags_xml;


-- -----------------------------------------------------------------------------
-- BLOCK 5b: Caregiver seat limit follows the paywall flag (20261102200000)
-- Expected: has_effective_limit = true, trigger_uses_it = true, limit_now = 4.
-- If false: every invite on a free account fails with "your care circle is full"
-- (free tier = 0 seats) — seen on the simulator with a fresh beta account.
-- -----------------------------------------------------------------------------
SELECT
  to_regprocedure('public.effective_seat_limit(subscription_tier)') IS NOT NULL AS has_effective_limit,
  coalesce(position('effective_seat_limit' IN pg_get_functiondef('public.enforce_seat_limit_on_insert()'::regprocedure)) > 0, false) AS trigger_uses_it,
  CASE WHEN to_regprocedure('public.effective_seat_limit(subscription_tier)') IS NOT NULL
    THEN (SELECT public.effective_seat_limit('free')) END AS limit_now;


-- -----------------------------------------------------------------------------
-- BLOCK 6: Tables in schema public with Row Level Security DISABLED
-- Any row here is readable/writable by anyone with the anon key if grants allow
-- it. Ideally this returns zero rows (or only tables you deliberately left open).
-- -----------------------------------------------------------------------------
SELECT c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'p')          -- ordinary and partitioned tables
  AND NOT c.relrowsecurity
ORDER BY c.relname;


-- -----------------------------------------------------------------------------
-- BLOCK 6b: Tables with RLS enabled but ZERO policies
-- With RLS on and no policy, only the service role can access the table.
-- Fine if intended (e.g. admin-only tables); otherwise the app will see no rows.
-- -----------------------------------------------------------------------------
SELECT c.relname AS table_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND c.relrowsecurity
  AND NOT EXISTS (SELECT 1 FROM pg_policies p
                  WHERE p.schemaname = 'public' AND p.tablename = c.relname)
ORDER BY c.relname;


-- -----------------------------------------------------------------------------
-- BLOCK 7: Storage buckets and whether each is public
-- Expected private: child-photos, profile-avatars, pregnancy-nutrition
-- (20260617130000). garage-media is public by design (20260406010000).
-- Anything public that holds personal or health photos is a problem.
-- -----------------------------------------------------------------------------
SELECT id, name, public, file_size_limit, allowed_mime_types, created_at
FROM storage.buckets
ORDER BY public DESC, name;


-- -----------------------------------------------------------------------------
-- BLOCK 8: Seed-data sanity (counts only, no row contents)
-- Seed migrations targeted children named Bob/Rio/Bahia and the oldest auth user.
-- Non-zero counts of these names on prod are worth a manual look to confirm
-- they are real users' children, not leftover demo data. Counts only.
-- -----------------------------------------------------------------------------
SELECT lower(name) AS child_name, count(*) AS how_many
FROM public.children
WHERE lower(name) IN ('bob', 'rio', 'bahia')
GROUP BY lower(name);
