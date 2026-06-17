-- supabase/migrations/20260617140000_log_updated_at.sql
-- P3-116 — cycle_logs and pregnancy_logs had no updated_at column or trigger,
-- so edits couldn't be ordered/audited and cache-invalidation by mtime was
-- impossible. Add an updated_at column + a BEFORE UPDATE trigger to both.

BEGIN;

-- Reusable timestamp trigger fn (first use in this project; keep generic so
-- future tables can share it).
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- cycle_logs
ALTER TABLE cycle_logs
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
DROP TRIGGER IF EXISTS set_cycle_logs_updated_at ON cycle_logs;
CREATE TRIGGER set_cycle_logs_updated_at
  BEFORE UPDATE ON cycle_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- pregnancy_logs
ALTER TABLE pregnancy_logs
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
DROP TRIGGER IF EXISTS set_pregnancy_logs_updated_at ON pregnancy_logs;
CREATE TRIGGER set_pregnancy_logs_updated_at
  BEFORE UPDATE ON pregnancy_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

NOTIFY pgrst, 'reload schema';

COMMIT;
