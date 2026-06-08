-- Remap legacy cycle symptom ids to the canonical lib/cycleSymptoms set.
--
-- The old home-screen symptom strip wrote a divergent id scheme
-- (tired / tender / craving) while the calendar log forms write the canonical
-- ids (fatigue / tender-breasts / cravings). Both land in cycle_logs as
-- type = 'symptom', so the same symptom was stored under two values and split
-- across analytics. This migration consolidates the legacy values to canonical.
--
-- Idempotent: re-running is a no-op once no legacy values remain.

UPDATE public.cycle_logs SET value = 'fatigue'        WHERE type = 'symptom' AND value = 'tired';
UPDATE public.cycle_logs SET value = 'tender-breasts' WHERE type = 'symptom' AND value = 'tender';
UPDATE public.cycle_logs SET value = 'cravings'       WHERE type = 'symptom' AND value = 'craving';

NOTIFY pgrst, 'reload schema';
