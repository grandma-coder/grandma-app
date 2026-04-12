-- =============================================================================
-- Fix health seed data format for health-history.tsx compatibility
--
-- The component expects:
--   growth:      separate entries, value = "Weight: X.X kg" / "Height: X.X cm"
--   vaccine:     value = vaccine name (displayed directly)
--   temperature: value = "38.5°C" (displayed directly)
--   medicine:    value = "Medicine name + dose" (displayed directly)
--   milestone:   value = milestone text (displayed directly)
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
    RAISE NOTICE 'Children not found — skipping health seed fix.';
    RETURN;
  END IF;

  -- ═══════════════════════════════════════════════════════════════
  -- DELETE old JSON-format growth entries (malformed in UI)
  -- ═══════════════════════════════════════════════════════════════

  DELETE FROM child_logs
    WHERE type = 'growth'
      AND child_id IN (v_rio_id, v_bahia_id, v_bob_id)
      AND value LIKE '{%}';

  -- ═══════════════════════════════════════════════════════════════
  -- RIO — Growth (separate Weight + Height entries)
  -- ═══════════════════════════════════════════════════════════════

  INSERT INTO child_logs (child_id, user_id, date, type, value, notes, logged_by) VALUES
    (v_rio_id, v_user_id, '2026-01-15', 'growth', 'Weight: 8.9 kg', 'Pediatrician checkup — 50th percentile', v_user_id),
    (v_rio_id, v_user_id, '2026-01-15', 'growth', 'Height: 71 cm',  'Pediatrician checkup — 50th percentile', v_user_id),

    (v_rio_id, v_user_id, '2026-02-15', 'growth', 'Weight: 9.2 kg', 'Growing well, pulling up to stand', v_user_id),
    (v_rio_id, v_user_id, '2026-02-15', 'growth', 'Height: 72.5 cm','Growing well, pulling up to stand', v_user_id),

    (v_rio_id, v_user_id, '2026-03-15', 'growth', 'Weight: 9.5 kg', 'Doctor happy with weight gain', v_user_id),
    (v_rio_id, v_user_id, '2026-03-15', 'growth', 'Height: 74 cm',  'Doctor happy with weight gain', v_user_id),

    (v_rio_id, v_user_id, '2026-04-05', 'growth', 'Weight: 9.8 kg', '10 month checkup — all great!', v_user_id),
    (v_rio_id, v_user_id, '2026-04-05', 'growth', 'Height: 75.5 cm','10 month checkup — all great!', v_user_id);

  -- ═══════════════════════════════════════════════════════════════
  -- RIO — Temperature entries (plain text format)
  -- ═══════════════════════════════════════════════════════════════

  -- Remove old temperature entries that may be in JSON format
  DELETE FROM child_logs
    WHERE type = 'temperature'
      AND child_id = v_rio_id
      AND value LIKE '{%}';

  INSERT INTO child_logs (child_id, user_id, date, type, value, notes, logged_by) VALUES
    (v_rio_id, v_user_id, '2026-01-28', 'temperature', '38.2°C', 'Low-grade fever — teething suspected', v_user_id),
    (v_rio_id, v_user_id, '2026-02-12', 'temperature', '37.1°C', 'Routine check, all normal', v_user_id),
    (v_rio_id, v_user_id, '2026-03-03', 'temperature', '39.0°C', 'Fever — gave ibuprofen, resolved in 24h', v_user_id),
    (v_rio_id, v_user_id, '2026-03-04', 'temperature', '37.4°C', 'Fever cleared!', v_user_id),
    (v_rio_id, v_user_id, '2026-04-01', 'temperature', '36.9°C', 'Post-vaccine check, normal', v_user_id);

  -- ═══════════════════════════════════════════════════════════════
  -- RIO — Medicine entries
  -- ═══════════════════════════════════════════════════════════════

  INSERT INTO child_logs (child_id, user_id, date, type, value, notes, logged_by) VALUES
    (v_rio_id, v_user_id, '2026-01-28', 'medicine', 'Paracetamol 2.5ml', 'For teething fever', v_user_id),
    (v_rio_id, v_user_id, '2026-03-03', 'medicine', 'Ibuprofen 2.5ml', 'Fever management', v_user_id),
    (v_rio_id, v_user_id, '2026-03-03', 'medicine', 'Saline nasal drops', 'Congestion relief', v_user_id),
    (v_rio_id, v_user_id, '2026-04-01', 'medicine', 'Vitamin D drops 400IU', 'Daily supplement', v_user_id);

  -- ═══════════════════════════════════════════════════════════════
  -- BAHIA — Growth
  -- ═══════════════════════════════════════════════════════════════

  INSERT INTO child_logs (child_id, user_id, date, type, value, notes, logged_by) VALUES
    (v_bahia_id, v_user_id, '2026-01-20', 'growth', 'Weight: 12.1 kg','2-year checkup — 50th percentile', v_user_id),
    (v_bahia_id, v_user_id, '2026-01-20', 'growth', 'Height: 86 cm',  '2-year checkup — 50th percentile', v_user_id),

    (v_bahia_id, v_user_id, '2026-02-18', 'growth', 'Weight: 12.4 kg','Growing steadily', v_user_id),
    (v_bahia_id, v_user_id, '2026-02-18', 'growth', 'Height: 87 cm',  'Growing steadily', v_user_id),

    (v_bahia_id, v_user_id, '2026-03-18', 'growth', 'Weight: 12.7 kg','Height jumped, growth spurt', v_user_id),
    (v_bahia_id, v_user_id, '2026-03-18', 'growth', 'Height: 88.5 cm','Height jumped, growth spurt', v_user_id),

    (v_bahia_id, v_user_id, '2026-04-08', 'growth', 'Weight: 13.0 kg','Healthy and active', v_user_id),
    (v_bahia_id, v_user_id, '2026-04-08', 'growth', 'Height: 89.5 cm','Healthy and active', v_user_id);

  -- ═══════════════════════════════════════════════════════════════
  -- BAHIA — Temperature
  -- ═══════════════════════════════════════════════════════════════

  DELETE FROM child_logs
    WHERE type = 'temperature'
      AND child_id = v_bahia_id
      AND value LIKE '{%}';

  INSERT INTO child_logs (child_id, user_id, date, type, value, notes, logged_by) VALUES
    (v_bahia_id, v_user_id, '2026-01-30', 'temperature', '36.8°C', 'Routine morning check, normal', v_user_id),
    (v_bahia_id, v_user_id, '2026-02-08', 'temperature', '38.6°C', 'Cold with runny nose, gave paracetamol', v_user_id),
    (v_bahia_id, v_user_id, '2026-02-09', 'temperature', '37.2°C', 'Fever breaking, feeling better', v_user_id),
    (v_bahia_id, v_user_id, '2026-03-12', 'temperature', '37.0°C', 'Post DTP booster check — normal', v_user_id),
    (v_bahia_id, v_user_id, '2026-04-02', 'temperature', '36.9°C', 'All well', v_user_id);

  -- ═══════════════════════════════════════════════════════════════
  -- BAHIA — Medicine
  -- ═══════════════════════════════════════════════════════════════

  INSERT INTO child_logs (child_id, user_id, date, type, value, notes, logged_by) VALUES
    (v_bahia_id, v_user_id, '2026-02-08', 'medicine', 'Paracetamol 5ml',     'Fever from cold', v_user_id),
    (v_bahia_id, v_user_id, '2026-02-09', 'medicine', 'Honey & lemon syrup', 'Sore throat relief', v_user_id),
    (v_bahia_id, v_user_id, '2026-03-12', 'medicine', 'Vitamin D 400IU',     'Daily supplement', v_user_id),
    (v_bahia_id, v_user_id, '2026-03-12', 'medicine', 'Omega-3 chewable',    'Brain development support', v_user_id);

  -- ═══════════════════════════════════════════════════════════════
  -- BOB — Growth (separate Weight + Height entries)
  -- ═══════════════════════════════════════════════════════════════

  INSERT INTO child_logs (child_id, user_id, date, type, value, notes, logged_by) VALUES
    (v_bob_id, v_user_id, '2026-01-20', 'growth', 'Weight: 3.4 kg', 'Birth weight check — healthy', v_user_id),
    (v_bob_id, v_user_id, '2026-01-20', 'growth', 'Height: 50 cm',  'Birth height', v_user_id),

    (v_bob_id, v_user_id, '2026-02-01', 'growth', 'Weight: 3.8 kg', '2 week checkup — gaining well on breast milk', v_user_id),
    (v_bob_id, v_user_id, '2026-02-01', 'growth', 'Height: 51.5 cm','2 week checkup', v_user_id),

    (v_bob_id, v_user_id, '2026-02-15', 'growth', 'Weight: 4.5 kg', '1 month — great weight gain!', v_user_id),
    (v_bob_id, v_user_id, '2026-02-15', 'growth', 'Height: 53 cm',  '1 month checkup', v_user_id),

    (v_bob_id, v_user_id, '2026-03-01', 'growth', 'Weight: 5.2 kg', '6 weeks — growing fast', v_user_id),
    (v_bob_id, v_user_id, '2026-03-01', 'growth', 'Height: 55 cm',  '6 weeks', v_user_id),

    (v_bob_id, v_user_id, '2026-03-15', 'growth', 'Weight: 5.8 kg', '2 month checkup — 50th percentile', v_user_id),
    (v_bob_id, v_user_id, '2026-03-15', 'growth', 'Height: 57 cm',  '2 month checkup', v_user_id),

    (v_bob_id, v_user_id, '2026-04-01', 'growth', 'Weight: 6.3 kg', '10 weeks — thriving on breastmilk', v_user_id),
    (v_bob_id, v_user_id, '2026-04-01', 'growth', 'Height: 59 cm',  '10 weeks', v_user_id),

    (v_bob_id, v_user_id, '2026-04-08', 'growth', 'Weight: 6.6 kg', '3 month checkup — all perfect', v_user_id),
    (v_bob_id, v_user_id, '2026-04-08', 'growth', 'Height: 60 cm',  '3 month checkup', v_user_id);

  -- ═══════════════════════════════════════════════════════════════
  -- BOB — Temperature (plain text, delete any JSON-format ones)
  -- ═══════════════════════════════════════════════════════════════

  DELETE FROM child_logs
    WHERE type = 'temperature'
      AND child_id = v_bob_id
      AND (value LIKE '{%}' OR value IS NULL OR value = '');

  INSERT INTO child_logs (child_id, user_id, date, type, value, notes, logged_by) VALUES
    (v_bob_id, v_user_id, '2026-01-25', 'temperature', '36.7°C', 'Normal newborn temp', v_user_id),
    (v_bob_id, v_user_id, '2026-02-20', 'temperature', '37.8°C', 'Mild post-vaccine fever — expected', v_user_id),
    (v_bob_id, v_user_id, '2026-02-21', 'temperature', '37.2°C', 'Vaccine fever resolved', v_user_id),
    (v_bob_id, v_user_id, '2026-03-15', 'temperature', '37.9°C', 'Mild post-vaccine fever — normal reaction', v_user_id),
    (v_bob_id, v_user_id, '2026-03-16', 'temperature', '36.8°C', 'All clear', v_user_id),
    (v_bob_id, v_user_id, '2026-04-08', 'temperature', '36.6°C', '3 month checkup — perfect', v_user_id);

  -- ═══════════════════════════════════════════════════════════════
  -- BOB — Medicine (fix saline drops from seed — ensure plain text value)
  -- ═══════════════════════════════════════════════════════════════

  DELETE FROM child_logs
    WHERE type = 'medicine'
      AND child_id = v_bob_id
      AND value LIKE '{%}';

  INSERT INTO child_logs (child_id, user_id, date, type, value, notes, logged_by) VALUES
    (v_bob_id, v_user_id, '2026-02-20', 'medicine', 'Paracetamol infant drops 0.5ml', 'Post-DTaP vaccine fever', v_user_id),
    (v_bob_id, v_user_id, '2026-03-10', 'medicine', 'Saline nasal drops',             'Mild congestion', v_user_id),
    (v_bob_id, v_user_id, '2026-03-15', 'medicine', 'Paracetamol infant drops 0.5ml', 'Post-Rotavirus mild discomfort', v_user_id),
    (v_bob_id, v_user_id, '2026-04-01', 'medicine', 'Vitamin D drops 400IU',          'Daily supplement — exclusively breastfed', v_user_id);

  RAISE NOTICE 'Health seed format fixed for Rio, Bahia, and Bob!';
END $$;

NOTIFY pgrst, 'reload schema';
