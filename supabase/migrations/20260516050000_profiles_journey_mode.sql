-- Ensure `profiles.journey_mode` exists.
--
-- This column was declared in 20260403010000_mode_awareness.sql but that
-- migration appears to never have been applied to the live project
-- (Metro log: "column profiles.journey_mode does not exist"). The boot
-- path was selecting it and cascading every other query into timeout via
-- PostgREST schema-cache thrash. The app no longer hard-depends on this
-- column (active mode is resolved from useModeStore + the behaviors
-- table), but writers in onboarding still upsert it, so make sure it's
-- actually here.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS journey_mode TEXT;

-- Backfill from behaviors: if a user has exactly one enrolled behavior,
-- use that as the active journey mode. If they have multiple, leave NULL
-- (the client picks one). Safe to re-run.
UPDATE profiles p
SET journey_mode = CASE
  WHEN b.type = 'cycle'     THEN 'pre-pregnancy'
  ELSE b.type
END
FROM (
  SELECT user_id, MIN(type) AS type, COUNT(*) AS n
  FROM behaviors
  GROUP BY user_id
  HAVING COUNT(*) = 1
) b
WHERE p.id = b.user_id
  AND p.journey_mode IS NULL;

NOTIFY pgrst, 'reload schema';
