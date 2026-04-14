-- =============================================================================
-- Seed: Bob diaper logs for April 11-13 2026 (gap left by previous seed)
-- =============================================================================

DO $$
DECLARE
  v_bob_id uuid;
  v_user_id uuid;
  d date;
  diaper_type text;
BEGIN
  SELECT id, parent_id INTO v_bob_id, v_user_id
    FROM children WHERE lower(name) = 'bob' LIMIT 1;

  IF v_bob_id IS NULL THEN
    RAISE NOTICE 'Child Bob not found — skipping.';
    RETURN;
  END IF;

  -- Clean existing diapers for this window to avoid dupes
  DELETE FROM child_logs
    WHERE child_id = v_bob_id
      AND type = 'diaper'
      AND date >= '2026-04-11' AND date <= '2026-04-13';

  FOR d IN SELECT generate_series('2026-04-11'::date, '2026-04-13'::date, '1 day')::date LOOP

    -- ~2am
    diaper_type := (ARRAY['pee','mixed','pee','poop'])[1+floor(random()*4)::int];
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'diaper',
      '{"diaperType":"' || diaper_type || '"'
      || CASE WHEN diaper_type IN ('poop','mixed') THEN ',"color":"yellow","consistency":"soft"' ELSE '' END
      || ',"time":"02:00"}',
      NULL, d + '02:00'::time);

    -- ~5:30am
    diaper_type := (ARRAY['pee','pee','mixed','pee'])[1+floor(random()*4)::int];
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'diaper',
      '{"diaperType":"' || diaper_type || '"'
      || CASE WHEN diaper_type IN ('poop','mixed') THEN ',"color":"yellow","consistency":"soft"' ELSE '' END
      || ',"time":"05:30"}',
      NULL, d + '05:30'::time);

    -- ~7:30am
    diaper_type := CASE WHEN random() < 0.35 THEN 'poop' WHEN random() < 0.5 THEN 'mixed' ELSE 'pee' END;
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'diaper',
      '{"diaperType":"' || diaper_type || '"'
      || CASE WHEN diaper_type IN ('poop','mixed') THEN ',"color":"yellow","consistency":"soft"' ELSE '' END
      || ',"time":"07:30"}',
      CASE WHEN random() < 0.05 THEN 'Right after feed' ELSE NULL END,
      d + '07:30'::time);

    -- ~9:30am
    diaper_type := (ARRAY['pee','pee','pee','mixed'])[1+floor(random()*4)::int];
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'diaper',
      '{"diaperType":"' || diaper_type || '"'
      || CASE WHEN diaper_type IN ('poop','mixed') THEN ',"color":"yellow","consistency":"soft"' ELSE '' END
      || ',"time":"09:30"}',
      NULL, d + '09:30'::time);

    -- ~11:30am
    diaper_type := (ARRAY['pee','mixed','pee','poop'])[1+floor(random()*4)::int];
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'diaper',
      '{"diaperType":"' || diaper_type || '"'
      || CASE WHEN diaper_type IN ('poop','mixed') THEN ',"color":"yellow","consistency":"soft"' ELSE '' END
      || ',"time":"11:30"}',
      NULL, d + '11:30'::time);

    -- ~13:00
    diaper_type := (ARRAY['pee','poop','pee','mixed'])[1+floor(random()*4)::int];
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'diaper',
      '{"diaperType":"' || diaper_type || '"'
      || CASE WHEN diaper_type IN ('poop','mixed') THEN ',"color":"yellow","consistency":"soft"' ELSE '' END
      || ',"time":"13:00"}',
      NULL, d + '13:00'::time);

    -- ~15:00
    diaper_type := (ARRAY['pee','pee','mixed','pee'])[1+floor(random()*4)::int];
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'diaper',
      '{"diaperType":"' || diaper_type || '"'
      || CASE WHEN diaper_type IN ('poop','mixed') THEN ',"color":"yellow","consistency":"soft"' ELSE '' END
      || ',"time":"15:00"}',
      NULL, d + '15:00'::time);

    -- ~17:00
    diaper_type := (ARRAY['poop','pee','mixed','pee'])[1+floor(random()*4)::int];
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'diaper',
      '{"diaperType":"' || diaper_type || '"'
      || CASE WHEN diaper_type IN ('poop','mixed') THEN ',"color":"yellow","consistency":"' || (ARRAY['soft','soft','liquid'])[1+floor(random()*3)::int] || '"' ELSE '' END
      || ',"time":"17:00"}',
      CASE WHEN random() < 0.04 THEN 'Blowout!' ELSE NULL END,
      d + '17:00'::time);

    -- ~19:00
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'diaper',
      '{"diaperType":"pee","time":"19:00"}',
      NULL, d + '19:00'::time);

  END LOOP;

  RAISE NOTICE 'Bob diaper seed for Apr 11-13 complete!';
END $$;
