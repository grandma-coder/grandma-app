-- Command-center audit log. EVERY PII detail view and EVERY push send writes a
-- row here. Center-owned table (lives in grandma's Supabase, but only the
-- command center reads/writes it via the service-role connection).
--
-- RLS is enabled with NO policies: the service-role connection bypasses RLS by
-- design (that's how the whole center works), while any other role — including
-- app users — is denied entirely. So no grandma-app user can ever read the
-- admin audit trail.

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_email text NOT NULL,
  action      text NOT NULL,
  target      text,
  meta        jsonb,
  at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_at ON admin_audit_log (at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor ON admin_audit_log (actor_email);

NOTIFY pgrst, 'reload schema';
