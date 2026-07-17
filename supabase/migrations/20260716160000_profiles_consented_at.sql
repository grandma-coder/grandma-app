-- Phase 1 (trust & safety) — record explicit data-processing consent.
--
-- The onboarding consent gate (blocking, before any health/child data is
-- collected) writes an acceptance timestamp here so we have a server-side
-- record of when the user agreed to health-data processing + the privacy
-- policy. The client also keeps a local persisted flag (useConsentStore) so
-- the gate isn't re-shown after an app kill.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS consented_at timestamptz;

NOTIFY pgrst, 'reload schema';
