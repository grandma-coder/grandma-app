-- =============================================================================
-- Seed: 3 months of realistic data for Bob (newborn ~3 months, born Jan 2026)
-- Bob is exclusively breastfed, tracks side (left/right) for balance
-- Covers: breastfeeding with side tracking, sleep, health, mood, memory, growth
-- =============================================================================

DO $$
DECLARE
  v_bob_id uuid;
  v_user_id uuid;
  d date;
  dow int;
  pick int;
  memo_text text;
  last_side text := 'left'; -- alternate tracking
BEGIN
  SELECT id, parent_id INTO v_bob_id, v_user_id
    FROM children WHERE lower(name) = 'bob' LIMIT 1;

  IF v_bob_id IS NULL THEN
    RAISE NOTICE 'Child Bob not found — skipping seed.';
    RETURN;
  END IF;

  DELETE FROM child_logs
    WHERE child_id = v_bob_id
      AND date >= '2026-01-11' AND date < '2026-04-11';

  -- ════════════════════════════════════════════════════════════════════════════
  -- BOB — Newborn (~3 months, born Jan 2026)
  -- Exclusively breastfed, calm baby, good sleeper for his age
  -- ════════════════════════════════════════════════════════════════════════════

  FOR d IN SELECT generate_series('2026-01-15'::date, '2026-04-10'::date, '1 day')::date LOOP
    dow := EXTRACT(DOW FROM d);

    -- ── SLEEP (3-4 entries/day for a newborn) ───────────────────────────────

    -- Night sleep block 1 (7:30pm - 1am)
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'sleep',
      '{"startTime":"19:30","endTime":"' || CASE WHEN random()<0.4 THEN '01:00' WHEN random()<0.7 THEN '01:30' ELSE '02:00' END
      || '","duration":"' || (5.0 + round((random()*1.5)::numeric,1))::text
      || '","quality":"' || (ARRAY['good','good','restless','great'])[1+floor(random()*4)::int]
      || '"}',
      CASE WHEN random()<0.1 THEN 'Woke for feed' ELSE NULL END,
      d + '01:30'::time);

    -- Night sleep block 2 (2am - 5:30am)
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'sleep',
      '{"startTime":"02:00","endTime":"' || CASE WHEN random()<0.5 THEN '05:00' ELSE '05:30' END
      || '","duration":"' || (3.0 + round((random()*0.5)::numeric,1))::text
      || '","quality":"' || (ARRAY['good','great','good'])[1+floor(random()*3)::int]
      || '"}',
      NULL, d + '05:30'::time);

    -- Morning nap
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'sleep',
      '{"startTime":"' || CASE WHEN random()<0.5 THEN '08:30' ELSE '09:00' END
      || '","endTime":"' || CASE WHEN random()<0.5 THEN '10:00' ELSE '10:30' END
      || '","duration":"' || (1.0 + round((random()*0.5)::numeric,1))::text
      || '","quality":"' || (ARRAY['great','good','great'])[1+floor(random()*3)::int]
      || '"}',
      NULL, d + '10:00'::time);

    -- Afternoon nap
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'sleep',
      '{"startTime":"13:00","endTime":"' || CASE WHEN random()<0.5 THEN '14:30' ELSE '15:00' END
      || '","duration":"' || (1.5 + round((random()*0.5)::numeric,1))::text
      || '","quality":"' || (ARRAY['great','good','good'])[1+floor(random()*3)::int]
      || '"}',
      NULL, d + '15:00'::time);

    -- Late afternoon catnap (only first 2 months)
    IF d < '2026-03-15' AND random() < 0.6 THEN
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_bob_id, v_user_id, d, 'sleep',
        '{"startTime":"16:30","endTime":"17:00","duration":"0.5","quality":"good"}',
        NULL, d + '17:00'::time);
    END IF;

    -- ── BREASTFEEDING (8-12 feeds/day for newborn, with side tracking) ──────

    -- Feed 1: Early morning (5:30am)
    last_side := CASE WHEN last_side = 'left' THEN 'right' ELSE 'left' END;
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'feeding',
      '{"feedType":"breast","time":"05:30","duration":"' || (12+floor(random()*8))::text
      || '","side":"' || last_side || '"}',
      NULL, d + '05:30'::time);

    -- Feed 2: After wake (7:00am)
    last_side := CASE WHEN last_side = 'left' THEN 'right' ELSE 'left' END;
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'feeding',
      '{"feedType":"breast","time":"07:00","duration":"' || (10+floor(random()*10))::text
      || '","side":"' || last_side || '"}',
      NULL, d + '07:00'::time);

    -- Feed 3: Mid-morning (9:00am)
    last_side := CASE WHEN last_side = 'left' THEN 'right' ELSE 'left' END;
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'feeding',
      '{"feedType":"breast","time":"09:00","duration":"' || (10+floor(random()*8))::text
      || '","side":"' || last_side || '"}',
      NULL, d + '09:00'::time);

    -- Feed 4: Before afternoon nap (11:00am)
    last_side := CASE WHEN last_side = 'left' THEN 'right' ELSE 'left' END;
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'feeding',
      '{"feedType":"breast","time":"11:00","duration":"' || (12+floor(random()*8))::text
      || '","side":"' || last_side || '"}',
      NULL, d + '11:00'::time);

    -- Feed 5: After nap (13:00)
    last_side := CASE WHEN last_side = 'left' THEN 'right' ELSE 'left' END;
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'feeding',
      '{"feedType":"breast","time":"13:00","duration":"' || (10+floor(random()*8))::text
      || '","side":"' || last_side || '"}',
      NULL, d + '13:00'::time);

    -- Feed 6: Afternoon (15:30)
    last_side := CASE WHEN last_side = 'left' THEN 'right' ELSE 'left' END;
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'feeding',
      '{"feedType":"breast","time":"15:30","duration":"' || (10+floor(random()*8))::text
      || '","side":"' || last_side || '"}',
      NULL, d + '15:30'::time);

    -- Feed 7: Evening (17:30)
    last_side := CASE WHEN last_side = 'left' THEN 'right' ELSE 'left' END;
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'feeding',
      '{"feedType":"breast","time":"17:30","duration":"' || (12+floor(random()*8))::text
      || '","side":"' || last_side || '"}',
      CASE WHEN random()<0.1 THEN 'Cluster feeding before bed' ELSE NULL END,
      d + '17:30'::time);

    -- Feed 8: Bedtime (19:00)
    last_side := CASE WHEN last_side = 'left' THEN 'right' ELSE 'left' END;
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'feeding',
      '{"feedType":"breast","time":"19:00","duration":"' || (15+floor(random()*10))::text
      || '","side":"' || last_side || '"}',
      NULL, d + '19:00'::time);

    -- Feed 9: Night feed (1:30am) — sometimes both sides
    last_side := CASE WHEN last_side = 'left' THEN 'right' ELSE 'left' END;
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'feeding',
      '{"feedType":"breast","time":"01:30","duration":"' || (10+floor(random()*8))::text
      || '","side":"' || CASE WHEN random()<0.3 THEN 'both' ELSE last_side END || '"}',
      NULL, d + '01:30'::time);

    -- Extra feed in first 2 months (10+ feeds/day)
    IF d < '2026-03-01' AND random() < 0.7 THEN
      last_side := CASE WHEN last_side = 'left' THEN 'right' ELSE 'left' END;
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_bob_id, v_user_id, d, 'feeding',
        '{"feedType":"breast","time":"22:00","duration":"' || (8+floor(random()*7))::text
        || '","side":"' || last_side || '"}',
        CASE WHEN random()<0.15 THEN 'Dream feed' ELSE NULL END,
        d + '22:00'::time);
    END IF;

    -- ── MOOD (1-2 per day) ──────────────────────────────────────────────────
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'mood',
      '"' || (ARRAY['calm','happy','calm','happy','fussy'])[1+floor(random()*5)::int] || '"',
      CASE WHEN random()<0.08 THEN 'Very calm after feeding'
           WHEN random()<0.06 THEN 'Fussy before nap'
           WHEN random()<0.04 THEN 'Smiling at mobile' ELSE NULL END,
      d + '10:00'::time);

    IF random() < 0.5 THEN
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_bob_id, v_user_id, d, 'mood',
        '"' || (ARRAY['calm','happy','fussy','cranky','calm'])[1+floor(random()*5)::int] || '"',
        NULL, d + '17:00'::time);
    END IF;

    -- ── ACTIVITY (lighter for newborn) ──────────────────────────────────────
    IF random() < 0.6 THEN
      pick := 1 + floor(random()*4)::int;
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_bob_id, v_user_id, d, 'activity',
        '{"activityType":"' || (ARRAY['walk','other','other','other'])[pick]
        || '","name":"' || (ARRAY['Stroller walk','Tummy time','Skin to skin','Bath time'])[pick]
        || '","startTime":"10:00","endTime":"10:30","duration":"30m"}',
        CASE WHEN random()<0.15 THEN 'Enjoyed it!' ELSE NULL END,
        d + '10:30'::time);
    END IF;

    -- ── MEMORY (2-3 per week) ───────────────────────────────────────────────
    IF dow IN (0,2,5) AND random() < 0.7 THEN
      memo_text := (ARRAY[
        'First real smile!',
        'Sleeping peacefully',
        'Tiny yawn',
        'Holding moms finger',
        'Bath time giggles',
        'Looking at the mobile',
        'Snuggled in blanket',
        'Cooing sounds',
        'First outing to the park',
        'Meeting grandma'
      ])[1+floor(random()*10)::int];
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_bob_id, v_user_id, d, 'photo', 'memory', memo_text, d + '14:00'::time);
    END IF;

    -- ── HEALTH ──────────────────────────────────────────────────────────────
    IF (EXTRACT(DAY FROM d)::int % 8 = 0)
       OR (d BETWEEN '2026-02-20' AND '2026-02-24')
       OR (d BETWEEN '2026-03-25' AND '2026-03-27') THEN
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_bob_id, v_user_id, d, 'temperature',
        CASE
          WHEN d BETWEEN '2026-02-20' AND '2026-02-24' THEN (37.3+round((random()*0.8)::numeric,1))::text
          WHEN d BETWEEN '2026-03-25' AND '2026-03-27' THEN (37.1+round((random()*0.6)::numeric,1))::text
          ELSE (36.4+round((random()*0.4)::numeric,1))::text
        END,
        CASE
          WHEN d BETWEEN '2026-02-20' AND '2026-02-24' THEN 'Post-vaccine mild fever, normal'
          WHEN d BETWEEN '2026-03-25' AND '2026-03-27' THEN 'Slight cold, stuffy nose'
          ELSE 'Routine check'
        END,
        d + '09:00'::time);
    END IF;

    IF d BETWEEN '2026-03-25' AND '2026-03-27' THEN
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_bob_id, v_user_id, d, 'medicine', 'Saline drops',
        'Nasal drops before feeds', d + '08:00'::time);
    END IF;

  END LOOP;

  -- Bob: Vaccines
  INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, '2026-02-15', 'vaccine', 'Hepatitis B - 2nd dose', 'At 1 month checkup, no issues', '2026-02-15 10:00'),
    (v_bob_id, v_user_id, '2026-02-20', 'vaccine', 'DTaP + IPV + Hib (2mo combo)', 'Mild fussiness and low fever for 24h', '2026-02-20 11:00'),
    (v_bob_id, v_user_id, '2026-03-15', 'vaccine', 'Rotavirus oral dose', 'Took it well, no reaction', '2026-03-15 10:30');

  -- Bob: Growth (weekly at first, then biweekly)
  INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, '2026-01-20', 'growth', '{"weight":3.4,"height":50,"head":35.0}', 'Birth weight check — healthy', '2026-01-20 10:30'),
    (v_bob_id, v_user_id, '2026-02-01', 'growth', '{"weight":3.8,"height":51.5,"head":35.5}', '2 week checkup — gaining well on breast milk', '2026-02-01 10:30'),
    (v_bob_id, v_user_id, '2026-02-15', 'growth', '{"weight":4.5,"height":53,"head":36.5}', '1 month — great weight gain!', '2026-02-15 10:30'),
    (v_bob_id, v_user_id, '2026-03-01', 'growth', '{"weight":5.2,"height":55,"head":37.5}', '6 weeks — growing fast', '2026-03-01 10:30'),
    (v_bob_id, v_user_id, '2026-03-15', 'growth', '{"weight":5.8,"height":57,"head":38.5}', '2 month checkup — 50th percentile', '2026-03-15 10:30'),
    (v_bob_id, v_user_id, '2026-04-01', 'growth', '{"weight":6.3,"height":59,"head":39.5}', '10 weeks — thriving on breastmilk', '2026-04-01 10:30'),
    (v_bob_id, v_user_id, '2026-04-08', 'growth', '{"weight":6.6,"height":60,"head":40.0}', '3 month checkup — all perfect', '2026-04-08 10:30');

  -- Bob: Milestones
  INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, '2026-01-25', 'milestone', 'Focusing on faces', 'Stares at mom during feeding', '2026-01-25 09:00'),
    (v_bob_id, v_user_id, '2026-02-10', 'milestone', 'First social smile', 'Smiled at daddy for the first time!', '2026-02-10 16:00'),
    (v_bob_id, v_user_id, '2026-02-25', 'milestone', 'Tracking objects', 'Follows the mobile with his eyes', '2026-02-25 10:00'),
    (v_bob_id, v_user_id, '2026-03-08', 'milestone', 'Cooing sounds', 'Making adorable oooh and aaah sounds', '2026-03-08 08:00'),
    (v_bob_id, v_user_id, '2026-03-20', 'milestone', 'Holding head up briefly', 'During tummy time, lifts head for a few seconds', '2026-03-20 10:30'),
    (v_bob_id, v_user_id, '2026-04-05', 'milestone', 'Laughing', 'First real laugh when tickled!', '2026-04-05 17:00');

  -- Notes
  INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, '2026-01-25', 'note', NULL, 'Breastfeeding going well. Good latch on both sides.', '2026-01-25 20:00'),
    (v_bob_id, v_user_id, '2026-02-10', 'note', NULL, 'Starting to establish a feeding rhythm — every 2-3 hours.', '2026-02-10 20:00'),
    (v_bob_id, v_user_id, '2026-03-01', 'note', NULL, 'Night feeds reducing. Only waking once now most nights!', '2026-03-01 20:00'),
    (v_bob_id, v_user_id, '2026-03-20', 'note', NULL, 'Prefers left side but we keep alternating. Feeds getting shorter and more efficient.', '2026-03-20 20:00'),
    (v_bob_id, v_user_id, '2026-04-05', 'note', NULL, 'Exclusively breastfed for 3 months! Pediatrician very happy with growth.', '2026-04-05 20:00');

  -- Bob: Routines
  DELETE FROM child_routines WHERE child_id = v_bob_id;

  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time) VALUES
    (v_bob_id, v_user_id, 'feeding', 'Early morning feed',
     '{"feedType":"breast"}', '{0,1,2,3,4,5,6}', '05:30'),
    (v_bob_id, v_user_id, 'feeding', 'Morning feed',
     '{"feedType":"breast"}', '{0,1,2,3,4,5,6}', '07:00'),
    (v_bob_id, v_user_id, 'feeding', 'Mid-morning feed',
     '{"feedType":"breast"}', '{0,1,2,3,4,5,6}', '09:00'),
    (v_bob_id, v_user_id, 'feeding', 'Pre-nap feed',
     '{"feedType":"breast"}', '{0,1,2,3,4,5,6}', '11:00'),
    (v_bob_id, v_user_id, 'feeding', 'Afternoon feed',
     '{"feedType":"breast"}', '{0,1,2,3,4,5,6}', '13:00'),
    (v_bob_id, v_user_id, 'feeding', 'Late afternoon feed',
     '{"feedType":"breast"}', '{0,1,2,3,4,5,6}', '15:30'),
    (v_bob_id, v_user_id, 'feeding', 'Evening feed',
     '{"feedType":"breast"}', '{0,1,2,3,4,5,6}', '17:30'),
    (v_bob_id, v_user_id, 'feeding', 'Bedtime feed',
     '{"feedType":"breast"}', '{0,1,2,3,4,5,6}', '19:00'),
    (v_bob_id, v_user_id, 'feeding', 'Night feed',
     '{"feedType":"breast"}', '{0,1,2,3,4,5,6}', '01:30'),
    (v_bob_id, v_user_id, 'sleep', 'Morning nap',
     '{"startTime":"08:30","quality":"great"}', '{0,1,2,3,4,5,6}', '08:30'),
    (v_bob_id, v_user_id, 'sleep', 'Afternoon nap',
     '{"startTime":"13:00","quality":"good"}', '{0,1,2,3,4,5,6}', '13:00'),
    (v_bob_id, v_user_id, 'sleep', 'Bedtime',
     '{"startTime":"19:30","quality":"great"}', '{0,1,2,3,4,5,6}', '19:30'),
    (v_bob_id, v_user_id, 'activity', 'Tummy time',
     '{"activityType":"other","name":"Tummy time","startTime":"10:00","endTime":"10:15","duration":"15m"}',
     '{0,1,2,3,4,5,6}', '10:00'),
    (v_bob_id, v_user_id, 'mood', 'Mood check',
     NULL, '{0,1,2,3,4,5,6}', '10:00');

  RAISE NOTICE 'Seed complete for Bob!';
END $$;
