-- Per-behavior Memories — photo memories scoped to each journey behavior.
--
-- Kids memories already live in child_logs (photos text[] + free-text type).
-- This adds equivalent photo storage to cycle_logs and pregnancy_logs so
-- pre-pregnancy and pregnancy get their OWN memories, matching the app's
-- table-per-behavior convention (no shared behavior-discriminant table).
--
-- Cycle: add a `photos` array + allow a 'memory' log type (its type CHECK is
--        restrictive and must be widened).
-- Pregnancy: add a `photos` array (its log_type CHECK was already dropped in
--        20260516030000, so 'memory' is already accepted — no constraint work).
-- Idempotent; RLS owner policies already exist on both tables (unchanged).

-- ── cycle_logs ──────────────────────────────────────────────────────────────
ALTER TABLE cycle_logs
  ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT '{}';

-- Widen the type CHECK to add 'memory'. IMPORTANT: the constraint has been
-- rewritten several times since the original create (cycle_signal_logs added
-- lh/opk_scan; cycle_completeness_log_types added pregnancy_test/sex_drive/
-- clots; cycle_lifestyle_logs added water/activity). We must preserve the full
-- current 18-value set — reproducing only the original 11 would silently break
-- live fertility/lifestyle logging. drop-then-add is idempotent (re-runnable).
ALTER TABLE cycle_logs DROP CONSTRAINT IF EXISTS cycle_logs_type_check;
ALTER TABLE cycle_logs
  ADD CONSTRAINT cycle_logs_type_check CHECK (type IN (
    'period_start', 'period_end', 'ovulation', 'symptom',
    'basal_temp', 'intercourse', 'cervical_mucus', 'mood',
    'energy', 'weight', 'note', 'lh', 'opk_scan',
    'pregnancy_test', 'sex_drive', 'clots', 'water', 'activity',
    'memory'
  ));

-- ── pregnancy_logs ──────────────────────────────────────────────────────────
ALTER TABLE pregnancy_logs
  ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT '{}';

-- log_type CHECK IS live: dropped in 20260415010000 but RE-ADDED in
-- 20260522030000_audit_fixes (H8) with a 13-value set that excludes 'memory'.
-- Widen it to accept 'memory', preserving the full current set. drop-then-add.
ALTER TABLE pregnancy_logs DROP CONSTRAINT IF EXISTS pregnancy_logs_log_type_check;
ALTER TABLE pregnancy_logs
  ADD CONSTRAINT pregnancy_logs_log_type_check CHECK (log_type IN (
    'symptom', 'weight', 'kick_count', 'contraction', 'mood',
    'appointment', 'note', 'sleep', 'water', 'exercise',
    'vitamins', 'kegel', 'nutrition', 'memory'
  ));

-- child_logs: unchanged — it already has photos text[] and a free-text type,
-- so kids memories continue to work as-is.

-- Reload PostgREST schema cache so the new columns are queryable immediately.
NOTIFY pgrst, 'reload schema';
