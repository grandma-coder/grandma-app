-- Support inbox — user-reported issues, feedback, and questions that land from
-- the app (via an edge function) or are entered manually, triaged by the team in
-- the Support pillar. Command-center-owned; the app WRITES new tickets via
-- service-role, the console READS + updates status/notes/replies. Idempotent.

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID,                          -- app user (auth uuid), null for anon/manual
  email       TEXT,                          -- contact email captured at submit time
  kind        TEXT NOT NULL DEFAULT 'feedback', -- feedback | bug | question | review
  subject     TEXT,
  message     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open',  -- open | in_progress | resolved | closed
  priority    TEXT NOT NULL DEFAULT 'normal',-- low | normal | high
  source      TEXT NOT NULL DEFAULT 'in_app',-- in_app | app_store | manual
  rating      INTEGER,                       -- 1–5 when the report is a review
  app_version TEXT,
  platform    TEXT,                          -- ios | android
  assignee    TEXT,                          -- team email the ticket is assigned to
  admin_notes TEXT,                          -- internal triage notes (never shown to the user)
  reply       TEXT,                          -- the reply sent back (recorded for the audit trail)
  replied_at  TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON public.support_tickets (status);
CREATE INDEX IF NOT EXISTS support_tickets_created_at_idx ON public.support_tickets (created_at DESC);
CREATE INDEX IF NOT EXISTS support_tickets_user_id_idx ON public.support_tickets (user_id);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
-- Command-center reads/writes via service-role. The app inserts via service-role
-- (edge function). No user-facing policy — users don't read this table directly.

NOTIFY pgrst, 'reload schema';
