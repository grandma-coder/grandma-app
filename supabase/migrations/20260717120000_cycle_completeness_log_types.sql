-- Phase 2 (cycle completeness) — three new cycle_logs types.
--
-- Flo tracks these; we didn't. Adds:
--   pregnancy_test — result of a home pregnancy test (negative/positive/faint)
--   sex_drive      — libido / sex-drive level (none…high)
--   clots          — blood-clot size during a period (none/small/medium/large)
--
-- cycle_logs.type has a CHECK constraint (cycle_logs_type_check); an unlisted
-- type is rejected on insert, so we must drop + recreate it with the full list.
-- Keep in sync with lib/cycleAnalytics.ts's type union and the log-form
-- registry. The value payload stays free-text in cycle_logs.value.

ALTER TABLE cycle_logs DROP CONSTRAINT IF EXISTS cycle_logs_type_check;
ALTER TABLE cycle_logs DROP CONSTRAINT IF EXISTS cycle_logs_log_type_check;

ALTER TABLE cycle_logs
  ADD CONSTRAINT cycle_logs_type_check CHECK (type IN (
    'period_start', 'period_end', 'ovulation', 'symptom',
    'basal_temp', 'intercourse', 'cervical_mucus', 'mood',
    'energy', 'weight', 'note', 'lh', 'opk_scan',
    -- new (Phase 2 cycle completeness)
    'pregnancy_test', 'sex_drive', 'clots'
  ));

NOTIFY pgrst, 'reload schema';
