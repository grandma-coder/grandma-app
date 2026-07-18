-- Cycle completeness (Flo parity, gap #28) — lifestyle log types.
--
-- Flo lets you log weight, water, and activity within the cycle. We already had
-- 'weight' in the CHECK enum but no form; 'water' and 'activity' were missing
-- entirely. Add the two missing types and build forms for all three (client).
--
-- Keep in sync with lib/cycleAnalytics.ts's type union and the log-form registry.

ALTER TABLE cycle_logs DROP CONSTRAINT IF EXISTS cycle_logs_type_check;

ALTER TABLE cycle_logs
  ADD CONSTRAINT cycle_logs_type_check CHECK (type IN (
    'period_start', 'period_end', 'ovulation', 'symptom',
    'basal_temp', 'intercourse', 'cervical_mucus', 'mood',
    'energy', 'weight', 'note', 'lh', 'opk_scan',
    'pregnancy_test', 'sex_drive', 'clots',
    -- new (lifestyle)
    'water', 'activity'
  ));

NOTIFY pgrst, 'reload schema';
