-- Remove all diaper logs for Bahia (7 years old — diapers not appropriate)
DO $$
DECLARE
  v_bahia_id uuid;
BEGIN
  SELECT id INTO v_bahia_id
    FROM children WHERE lower(name) = 'bahia' LIMIT 1;

  IF v_bahia_id IS NULL THEN
    RAISE NOTICE 'Child Bahia not found — skipping.';
    RETURN;
  END IF;

  DELETE FROM child_logs
    WHERE child_id = v_bahia_id AND type = 'diaper';

  RAISE NOTICE 'Removed all diaper logs for Bahia.';
END $$;
