-- =============================================================================
-- Fix children table health data
-- Remove "no" placeholder from allergies arrays, set realistic values
-- =============================================================================

DO $$
DECLARE
  v_rio_id    uuid;
  v_bahia_id  uuid;
  v_bob_id    uuid;
  v_user_id   uuid;
BEGIN
  SELECT id, parent_id INTO v_rio_id, v_user_id
    FROM children WHERE lower(name) = 'rio' LIMIT 1;
  SELECT id INTO v_bahia_id
    FROM children WHERE lower(name) = 'bahia' AND parent_id = v_user_id LIMIT 1;
  SELECT id INTO v_bob_id
    FROM children WHERE lower(name) = 'bob' AND parent_id = v_user_id LIMIT 1;

  IF v_rio_id IS NULL THEN
    RAISE NOTICE 'Children not found — skipping fix.';
    RETURN;
  END IF;

  -- Rio: milk allergy confirmed, no routine medications
  UPDATE children
    SET allergies = ARRAY['Milk'],
        medications = ARRAY[]::text[]
    WHERE id = v_rio_id;

  -- Bahia: no allergies (remove 'no' placeholder), no routine medications
  UPDATE children
    SET allergies = ARRAY[]::text[],
        medications = ARRAY[]::text[]
    WHERE id = v_bahia_id;

  -- Bob: rice allergy (keep), Vitamin D drops as daily supplement is fine but remove Tylenol from profile
  --      (Tylenol is episodic, not a daily medication — tracked in child_logs instead)
  UPDATE children
    SET allergies = ARRAY['Rice'],
        medications = ARRAY[]::text[]
    WHERE id = v_bob_id;

  RAISE NOTICE 'Children health data cleaned up!';
END $$;
