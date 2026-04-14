-- =============================================================================
-- Seed: Diaper logs for Bob (newborn ~3 months), Rio (~10 months), Bahia (~18 months)
-- Newborns: 8-12 diapers/day, mix of pee/poop/mixed
-- Older babies: 6-8/day with more varied consistency
-- Date range: 2026-01-15 → 2026-04-10
-- =============================================================================

DO $$
DECLARE
  v_bob_id uuid;
  v_rio_id uuid;
  v_bahia_id uuid;
  v_user_id uuid;
  d date;
  diaper_type text;
  diaper_color text;
  diaper_consistency text;
  note_text text;
  hour_offset int;
BEGIN
  SELECT id, parent_id INTO v_rio_id, v_user_id
    FROM children WHERE lower(name) = 'rio' LIMIT 1;
  SELECT id INTO v_bahia_id
    FROM children WHERE lower(name) = 'bahia' AND parent_id = v_user_id LIMIT 1;
  SELECT id INTO v_bob_id
    FROM children WHERE lower(name) = 'bob' AND parent_id = v_user_id LIMIT 1;

  IF v_bob_id IS NULL THEN
    RAISE NOTICE 'Child Bob not found — skipping diaper seed.';
    RETURN;
  END IF;

  -- Clean up any existing diaper logs
  DELETE FROM child_logs
    WHERE child_id IN (v_bob_id, v_rio_id, v_bahia_id)
      AND type = 'diaper'
      AND date >= '2026-01-15' AND date < '2026-04-11';

  -- ════════════════════════════════════════════════════════════════════════════
  -- BOB — Newborn (~3 months) — 8-12 diapers/day
  -- First weeks: dark meconium → transitional green → yellow breastmilk poop
  -- ════════════════════════════════════════════════════════════════════════════

  FOR d IN SELECT generate_series('2026-01-15'::date, '2026-04-10'::date, '1 day')::date LOOP

    -- Diaper 1: After first night feed (~2am)
    diaper_type := CASE WHEN random() < 0.4 THEN 'pee' WHEN random() < 0.6 THEN 'mixed' ELSE 'poop' END;
    diaper_color := CASE
      WHEN d < '2026-01-20' THEN 'black'        -- meconium first days
      WHEN d < '2026-01-25' THEN 'green'         -- transitional
      ELSE (ARRAY['yellow','yellow','yellow','green'])[1+floor(random()*4)::int]  -- breastmilk yellow
    END;
    diaper_consistency := CASE
      WHEN d < '2026-01-20' THEN 'soft'          -- meconium is thick/soft
      WHEN d < '2026-02-01' THEN (ARRAY['liquid','soft','soft'])[1+floor(random()*3)::int]
      ELSE (ARRAY['liquid','soft','soft','normal'])[1+floor(random()*4)::int]
    END;
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'diaper',
      '{"diaperType":"' || diaper_type || '"'
      || CASE WHEN diaper_type IN ('poop','mixed') THEN ',"color":"' || diaper_color || '","consistency":"' || diaper_consistency || '"' ELSE '' END
      || ',"time":"02:00"}',
      CASE WHEN d < '2026-01-20' AND diaper_type IN ('poop','mixed') THEN 'Meconium — dark and sticky'
           WHEN d < '2026-01-25' AND diaper_color = 'green' THEN 'Transitional stool'
           ELSE NULL END,
      d + '02:00'::time);

    -- Diaper 2: Early morning (~5:30am)
    diaper_type := (ARRAY['pee','pee','mixed','poop'])[1+floor(random()*4)::int];
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'diaper',
      '{"diaperType":"' || diaper_type || '"'
      || CASE WHEN diaper_type IN ('poop','mixed') THEN ',"color":"yellow","consistency":"soft"' ELSE '' END
      || ',"time":"05:30"}',
      NULL, d + '05:30'::time);

    -- Diaper 3: After morning feed (~7:30am)
    diaper_type := CASE WHEN random() < 0.35 THEN 'poop' WHEN random() < 0.5 THEN 'mixed' ELSE 'pee' END;
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'diaper',
      '{"diaperType":"' || diaper_type || '"'
      || CASE WHEN diaper_type IN ('poop','mixed') THEN ',"color":"yellow","consistency":"' || (ARRAY['liquid','soft','soft'])[1+floor(random()*3)::int] || '"' ELSE '' END
      || ',"time":"07:30"}',
      CASE WHEN random() < 0.05 THEN 'Right after feed' ELSE NULL END,
      d + '07:30'::time);

    -- Diaper 4: Mid-morning (~9:30am)
    diaper_type := (ARRAY['pee','pee','pee','mixed'])[1+floor(random()*4)::int];
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'diaper',
      '{"diaperType":"' || diaper_type || '"'
      || CASE WHEN diaper_type IN ('poop','mixed') THEN ',"color":"yellow","consistency":"soft"' ELSE '' END
      || ',"time":"09:30"}',
      NULL, d + '09:30'::time);

    -- Diaper 5: Before nap (~11:30am)
    diaper_type := (ARRAY['pee','mixed','pee','poop'])[1+floor(random()*4)::int];
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'diaper',
      '{"diaperType":"' || diaper_type || '"'
      || CASE WHEN diaper_type IN ('poop','mixed') THEN ',"color":"yellow","consistency":"soft"' ELSE '' END
      || ',"time":"11:30"}',
      NULL, d + '11:30'::time);

    -- Diaper 6: After nap (~15:00)
    diaper_type := (ARRAY['pee','pee','mixed','pee'])[1+floor(random()*4)::int];
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'diaper',
      '{"diaperType":"' || diaper_type || '"'
      || CASE WHEN diaper_type IN ('poop','mixed') THEN ',"color":"yellow","consistency":"soft"' ELSE '' END
      || ',"time":"15:00"}',
      NULL, d + '15:00'::time);

    -- Diaper 7: Late afternoon (~17:00)
    diaper_type := (ARRAY['poop','pee','mixed','pee'])[1+floor(random()*4)::int];
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'diaper',
      '{"diaperType":"' || diaper_type || '"'
      || CASE WHEN diaper_type IN ('poop','mixed') THEN ',"color":"yellow","consistency":"' || (ARRAY['soft','soft','liquid'])[1+floor(random()*3)::int] || '"' ELSE '' END
      || ',"time":"17:00"}',
      CASE WHEN random() < 0.04 THEN 'Blowout!' ELSE NULL END,
      d + '17:00'::time);

    -- Diaper 8: Before bed (~19:00)
    diaper_type := (ARRAY['pee','pee','mixed','pee'])[1+floor(random()*4)::int];
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'diaper',
      '{"diaperType":"' || diaper_type || '"'
      || CASE WHEN diaper_type IN ('poop','mixed') THEN ',"color":"yellow","consistency":"soft"' ELSE '' END
      || ',"time":"19:00"}',
      NULL, d + '19:00'::time);

    -- Extra diapers for first 2 months (10-12/day)
    IF d < '2026-03-01' THEN
      -- Diaper 9: Extra mid-afternoon
      diaper_type := (ARRAY['pee','poop','pee','mixed'])[1+floor(random()*4)::int];
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_bob_id, v_user_id, d, 'diaper',
        '{"diaperType":"' || diaper_type || '"'
        || CASE WHEN diaper_type IN ('poop','mixed') THEN ',"color":"yellow","consistency":"soft"' ELSE '' END
        || ',"time":"13:00"}',
        NULL, d + '13:00'::time);

      IF random() < 0.6 THEN
        -- Diaper 10: Extra evening
        INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
        (v_bob_id, v_user_id, d, 'diaper',
          '{"diaperType":"pee","time":"21:00"}',
          NULL, d + '21:00'::time);
      END IF;
    END IF;

  END LOOP;

  -- ════════════════════════════════════════════════════════════════════════════
  -- RIO — Baby (~10 months) — 6-8 diapers/day, varied solids poop
  -- ════════════════════════════════════════════════════════════════════════════

  IF v_rio_id IS NOT NULL THEN
    FOR d IN SELECT generate_series('2026-01-11'::date, '2026-04-10'::date, '1 day')::date LOOP

      -- Diaper 1: Morning wake (~6:00am) — usually heavy pee overnight
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_rio_id, v_user_id, d, 'diaper',
        '{"diaperType":"pee","time":"06:00"}',
        NULL, d + '06:00'::time);

      -- Diaper 2: After breakfast (~8:30am) — often poop
      diaper_type := CASE WHEN random() < 0.6 THEN 'poop' WHEN random() < 0.3 THEN 'mixed' ELSE 'pee' END;
      diaper_color := (ARRAY['brown','brown','brown','green','yellow'])[1+floor(random()*5)::int];
      diaper_consistency := (ARRAY['soft','normal','normal','soft'])[1+floor(random()*4)::int];
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_rio_id, v_user_id, d, 'diaper',
        '{"diaperType":"' || diaper_type || '"'
        || CASE WHEN diaper_type IN ('poop','mixed') THEN ',"color":"' || diaper_color || '","consistency":"' || diaper_consistency || '"' ELSE '' END
        || ',"time":"08:30"}',
        NULL, d + '08:30'::time);

      -- Diaper 3: Mid-morning (~10:30am)
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_rio_id, v_user_id, d, 'diaper',
        '{"diaperType":"pee","time":"10:30"}',
        NULL, d + '10:30'::time);

      -- Diaper 4: After lunch (~13:00)
      diaper_type := (ARRAY['pee','poop','mixed','pee'])[1+floor(random()*4)::int];
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_rio_id, v_user_id, d, 'diaper',
        '{"diaperType":"' || diaper_type || '"'
        || CASE WHEN diaper_type IN ('poop','mixed') THEN ',"color":"brown","consistency":"normal"' ELSE '' END
        || ',"time":"13:00"}',
        NULL, d + '13:00'::time);

      -- Diaper 5: After nap (~15:30)
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_rio_id, v_user_id, d, 'diaper',
        '{"diaperType":"pee","time":"15:30"}',
        NULL, d + '15:30'::time);

      -- Diaper 6: Before bed (~18:30)
      diaper_type := (ARRAY['pee','pee','mixed','pee'])[1+floor(random()*4)::int];
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_rio_id, v_user_id, d, 'diaper',
        '{"diaperType":"' || diaper_type || '"'
        || CASE WHEN diaper_type IN ('poop','mixed') THEN ',"color":"brown","consistency":"soft"' ELSE '' END
        || ',"time":"18:30"}',
        NULL, d + '18:30'::time);

      -- Extra diaper occasionally
      IF random() < 0.4 THEN
        INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
        (v_rio_id, v_user_id, d, 'diaper',
          '{"diaperType":"pee","time":"16:30"}',
          NULL, d + '16:30'::time);
      END IF;

    END LOOP;
  END IF;

  -- ════════════════════════════════════════════════════════════════════════════
  -- BAHIA — Toddler (~18 months) — 5-7 diapers/day, more formed stools
  -- ════════════════════════════════════════════════════════════════════════════

  IF v_bahia_id IS NOT NULL THEN
    FOR d IN SELECT generate_series('2026-01-11'::date, '2026-04-10'::date, '1 day')::date LOOP

      -- Diaper 1: Morning (~7:00am) — heavy overnight
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_bahia_id, v_user_id, d, 'diaper',
        '{"diaperType":"pee","time":"07:00"}',
        NULL, d + '07:00'::time);

      -- Diaper 2: After breakfast (~9:00am) — usually poop
      diaper_type := CASE WHEN random() < 0.5 THEN 'poop' ELSE 'mixed' END;
      diaper_consistency := (ARRAY['normal','normal','soft','hard'])[1+floor(random()*4)::int];
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_bahia_id, v_user_id, d, 'diaper',
        '{"diaperType":"' || diaper_type || '","color":"brown","consistency":"' || diaper_consistency || '","time":"09:00"}',
        NULL, d + '09:00'::time);

      -- Diaper 3: Before lunch (~11:30)
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_bahia_id, v_user_id, d, 'diaper',
        '{"diaperType":"pee","time":"11:30"}',
        NULL, d + '11:30'::time);

      -- Diaper 4: After nap (~15:00)
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_bahia_id, v_user_id, d, 'diaper',
        '{"diaperType":"pee","time":"15:00"}',
        NULL, d + '15:00'::time);

      -- Diaper 5: Afternoon (~17:00) — sometimes poop
      diaper_type := (ARRAY['pee','pee','poop','pee'])[1+floor(random()*4)::int];
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_bahia_id, v_user_id, d, 'diaper',
        '{"diaperType":"' || diaper_type || '"'
        || CASE WHEN diaper_type = 'poop' THEN ',"color":"brown","consistency":"normal"' ELSE '' END
        || ',"time":"17:00"}',
        NULL, d + '17:00'::time);

      -- Diaper 6: Before bed (~19:00)
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_bahia_id, v_user_id, d, 'diaper',
        '{"diaperType":"pee","time":"19:00"}',
        NULL, d + '19:00'::time);

    END LOOP;
  END IF;

  RAISE NOTICE 'Diaper seed data complete for Bob, Rio, and Bahia!';
END $$;
