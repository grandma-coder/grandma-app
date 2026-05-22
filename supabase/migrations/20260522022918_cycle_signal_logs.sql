-- cycle_logs: support fertility-signal logging for TTC users.
--
-- 2026-05-21 redesign — extends the type CHECK with two new values (lh,
-- opk_scan) and adds a single scan_url column for OPK / pregnancy-test
-- photo uploads. BBT writes to existing 'basal_temp', CM writes to existing
-- 'cervical_mucus', intercourse writes to existing 'intercourse'. All four
-- carry their structured payload as plain text in the existing `value`
-- column (e.g. '36.42' for BBT, 'peak' for LH, 'eggwhite' for CM,
-- 'unprotected'/'protected' for intercourse).
--
-- RLS: existing "Users can manage own cycle_logs" policy covers the new
-- rows and column. No new policies.

-- Drop and recreate the CHECK to extend the allowed value set. The data
-- in the table is already compatible because we only ADD values.
alter table cycle_logs drop constraint if exists cycle_logs_type_check;
alter table cycle_logs add constraint cycle_logs_type_check
  check (type in (
    'period_start', 'period_end', 'ovulation', 'symptom',
    'basal_temp', 'intercourse', 'cervical_mucus', 'mood',
    'energy', 'weight', 'note',
    'lh', 'opk_scan'
  ));

alter table cycle_logs add column if not exists scan_url text;

-- Helpful index for the new tile-by-tile fetch on the Fertility Signals
-- card (queries are scoped by user + type, ordered by date desc).
create index if not exists idx_cycle_logs_user_type_date
  on cycle_logs(user_id, type, date desc);

notify pgrst, 'reload schema';
