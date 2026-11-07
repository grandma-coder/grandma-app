-- Beta testers roster — a command-center-owned record of people invited to test
-- the mobile app. This does NOT distribute the app build (that's TestFlight /
-- Play Console) and does NOT create an app account. It's a lightweight tracker:
-- who you invited + a note, matched at read-time against profiles/auth.users to
-- show whether they've signed up yet. Idempotent.

CREATE TABLE IF NOT EXISTS public.beta_testers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  name        TEXT,
  platform    TEXT NOT NULL DEFAULT 'both',   -- ios | android | both
  note        TEXT,
  invited_by  TEXT,                            -- admin email who added them
  invited_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_beta_testers_email ON public.beta_testers (lower(email));

ALTER TABLE public.beta_testers ENABLE ROW LEVEL SECURITY;
-- Reached only via the service-role Postgres client (bypasses RLS by design);
-- no user-facing policy intended.

NOTIFY pgrst, 'reload schema';
