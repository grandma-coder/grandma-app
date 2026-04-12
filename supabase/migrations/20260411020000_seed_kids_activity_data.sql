-- =============================================================================
-- Seed: 3 months of realistic child activity data for Rio & Bahia
-- Covers: feeding, sleep, health, mood, activity, memory, growth
-- Date range: 2026-01-11 → 2026-04-11
-- =============================================================================

DO $$
DECLARE
  v_rio_id uuid;
  v_bahia_id uuid;
  v_user_id uuid;
  d date;
  dow int;
  r float;
  pick int;
  foods_json text;
  act_type text;
  act_name text;
  memo_text text;
BEGIN
  SELECT id, parent_id INTO v_rio_id, v_user_id
    FROM children WHERE lower(name) = 'rio' LIMIT 1;
  SELECT id INTO v_bahia_id
    FROM children WHERE lower(name) = 'bahia' AND parent_id = v_user_id LIMIT 1;

  IF v_rio_id IS NULL OR v_bahia_id IS NULL THEN
    RAISE NOTICE 'Children Rio and/or Bahia not found — skipping seed.';
    RETURN;
  END IF;

  DELETE FROM child_logs
    WHERE child_id IN (v_rio_id, v_bahia_id)
      AND date >= '2026-01-11' AND date < '2026-04-11';

  -- ════════════════════════════════════════════════════════════════════════════
  -- RIO — Baby (~10 months, born Jun 2025)
  -- Energetic, curious, great eater, loves music & water
  -- ════════════════════════════════════════════════════════════════════════════

  FOR d IN SELECT generate_series('2026-01-11'::date, '2026-04-10'::date, '1 day')::date LOOP
    dow := EXTRACT(DOW FROM d);

    -- ── SLEEP: night ────────────────────────────────────────────────────────
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_rio_id, v_user_id, d, 'sleep',
      '{"startTime":"' || CASE WHEN random()<0.5 THEN '19:30' ELSE '20:00' END
      || '","endTime":"' || CASE WHEN random()<0.6 THEN '05:30' ELSE '06:00' END
      || '","duration":"' || (9.5 + round((random()*1.5)::numeric,1))::text
      || '","quality":"' || (ARRAY['great','good','good','restless'])[1+floor(random()*4)::int]
      || '"}',
      CASE WHEN random()<0.12 THEN 'Woke up once, settled quickly'
           WHEN random()<0.08 THEN 'Slept through!' ELSE NULL END,
      d + '06:00'::time);

    -- SLEEP: afternoon nap
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_rio_id, v_user_id, d, 'sleep',
      '{"startTime":"' || CASE WHEN random()<0.5 THEN '12:30' ELSE '13:00' END
      || '","endTime":"' || CASE WHEN random()<0.5 THEN '14:30' ELSE '15:00' END
      || '","duration":"' || (1.5 + round((random()*1.0)::numeric,1))::text
      || '","quality":"' || (ARRAY['great','good','great','good'])[1+floor(random()*4)::int]
      || '"}', NULL, d + '15:00'::time);

    -- SLEEP: morning nap (Jan-Feb only, phasing out)
    IF d < '2026-02-15' AND random() < 0.7 THEN
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_rio_id, v_user_id, d, 'sleep',
        '{"startTime":"09:30","endTime":"10:15","duration":"0.75","quality":"good"}',
        CASE WHEN d > '2026-02-01' THEN 'Short nap, fighting it' ELSE NULL END,
        d + '10:15'::time);
    END IF;

    -- ── FEEDING: morning bottle ─────────────────────────────────────────────
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_rio_id, v_user_id, d, 'feeding',
      '{"feedType":"bottle","amount":"' || (180+floor(random()*40))::text
      || '","duration":"15","time":"06:30"}',
      'Formula', d + '06:30'::time);

    -- FOOD: breakfast
    pick := 1 + floor(random()*5)::int;
    foods_json := (ARRAY[
      '["banana","oatmeal","yogurt"]',
      '["banana","toast","yogurt"]',
      '["oatmeal","blueberry","milk"]',
      '["scrambled egg","toast","banana"]',
      '["papaya","oatmeal","cheese"]'
    ])[pick];
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_rio_id, v_user_id, d, 'food',
      '{"feedType":"solids","meal":"breakfast","quality":"'
      || (ARRAY['ate_well','ate_well','ate_little','ate_well'])[1+floor(random()*4)::int]
      || '","time":"08:00","estimatedCals":' || (120+floor(random()*60))::text
      || ',"matchedFoods":' || foods_json || '}',
      CASE WHEN random()<0.08 THEN 'Loved the banana today'
           WHEN random()<0.06 THEN 'Tried self-feeding with spoon' ELSE NULL END,
      d + '08:00'::time);

    -- FOOD: lunch
    pick := 1 + floor(random()*7)::int;
    foods_json := (ARRAY[
      '["rice","beans","chicken","carrot"]',
      '["sweet potato","chicken","broccoli"]',
      '["pasta","meat","pumpkin"]',
      '["rice","beans","beef","spinach"]',
      '["potato","fish","peas","carrot"]',
      '["lentils","rice","chicken","zucchini"]',
      '["pasta","tomato","cheese"]'
    ])[pick];
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_rio_id, v_user_id, d, 'food',
      '{"feedType":"solids","meal":"lunch","quality":"'
      || (ARRAY['ate_well','ate_well','ate_little','ate_well','did_not_eat'])[1+floor(random()*5)::int]
      || '","time":"11:30","estimatedCals":' || (150+floor(random()*80))::text
      || ',"matchedFoods":' || foods_json || '}',
      CASE WHEN random()<0.06 THEN 'Threw food on the floor'
           WHEN random()<0.04 THEN 'Asked for more!' ELSE NULL END,
      d + '11:30'::time);

    -- FOOD: afternoon snack
    pick := 1 + floor(random()*5)::int;
    foods_json := (ARRAY[
      '["banana","crackers"]',
      '["yogurt","strawberry"]',
      '["avocado","toast"]',
      '["mango","rice cracker"]',
      '["cheese","grape"]'
    ])[pick];
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_rio_id, v_user_id, d, 'food',
      '{"feedType":"solids","meal":"afternoon_snack","quality":"ate_well","time":"15:30","estimatedCals":'
      || (60+floor(random()*40))::text || ',"matchedFoods":' || foods_json || '}',
      NULL, d + '15:30'::time);

    -- FOOD: dinner
    pick := 1 + floor(random()*5)::int;
    foods_json := (ARRAY[
      '["rice","chicken","carrot","beans"]',
      '["pasta","beef","broccoli"]',
      '["sweet potato","fish","peas"]',
      '["soup","bread"]',
      '["rice","egg","spinach","tomato"]'
    ])[pick];
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_rio_id, v_user_id, d, 'food',
      '{"feedType":"solids","meal":"dinner","quality":"'
      || (ARRAY['ate_well','ate_well','ate_little','ate_well'])[1+floor(random()*4)::int]
      || '","time":"18:00","estimatedCals":' || (130+floor(random()*70))::text
      || ',"matchedFoods":' || foods_json || '}',
      NULL, d + '18:00'::time);

    -- FEEDING: night bottle
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_rio_id, v_user_id, d, 'feeding',
      '{"feedType":"bottle","amount":"' || (200+floor(random()*30))::text
      || '","duration":"12","time":"19:00"}',
      NULL, d + '19:00'::time);

    -- ── MOOD ────────────────────────────────────────────────────────────────
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_rio_id, v_user_id, d, 'mood',
      '"' || (ARRAY['happy','calm','energetic','happy','fussy'])[1+floor(random()*5)::int] || '"',
      CASE WHEN random()<0.08 THEN 'Very playful today'
           WHEN random()<0.06 THEN 'A bit clingy after nap'
           WHEN random()<0.04 THEN 'Giggling nonstop' ELSE NULL END,
      d + '10:00'::time);

    IF random() < 0.6 THEN
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_rio_id, v_user_id, d, 'mood',
        '"' || (ARRAY['happy','calm','energetic','fussy','cranky'])[1+floor(random()*5)::int] || '"',
        NULL, d + '16:00'::time);
    END IF;

    -- ── ACTIVITY ────────────────────────────────────────────────────────────
    IF dow NOT IN (0,6) THEN
      pick := 1 + floor(random()*5)::int;
      act_type := (ARRAY['music','playground','swim','walk','playdate'])[pick];
      act_name := (ARRAY['Music class','Morning at the park','Baby swim','Stroller walk','Playdate with Leo'])[pick];
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_rio_id, v_user_id, d, 'activity',
        '{"activityType":"' || act_type || '","name":"' || act_name
        || '","startTime":"10:00","endTime":"11:00","duration":"1h"}',
        CASE WHEN random()<0.12 THEN 'Really enjoyed it today' ELSE NULL END,
        d + '11:00'::time);
    ELSE
      pick := 1 + floor(random()*4)::int;
      act_type := (ARRAY['walk','playground','swim','playdate'])[pick];
      act_name := (ARRAY['Family walk at the beach','Park morning','Pool time','Playdate at home'])[pick];
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_rio_id, v_user_id, d, 'activity',
        '{"activityType":"' || act_type || '","name":"' || act_name
        || '","startTime":"09:00","endTime":"10:30","duration":"1h 30m"}',
        CASE WHEN random()<0.2 THEN 'Family outing, great weather' ELSE NULL END,
        d + '10:30'::time);
    END IF;

    -- ── MEMORY (2-3/week) ───────────────────────────────────────────────────
    IF dow IN (0,3,6) AND random() < 0.75 THEN
      memo_text := (ARRAY[
        'First time crawling to the dog!',
        'Messy banana face',
        'Playing with blocks',
        'Bath time splashes',
        'Morning giggles',
        'Standing up holding the couch',
        'Clapping hands for the first time',
        'Playing peekaboo with daddy',
        'Exploring the garden',
        'Dancing to music'
      ])[1+floor(random()*10)::int];
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_rio_id, v_user_id, d, 'photo', 'memory', memo_text, d + '14:00'::time);
    END IF;

    -- ── HEALTH ──────────────────────────────────────────────────────────────
    IF (EXTRACT(DAY FROM d)::int % 10 = 0)
       OR (d BETWEEN '2026-02-05' AND '2026-02-09')
       OR (d BETWEEN '2026-03-18' AND '2026-03-21') THEN
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_rio_id, v_user_id, d, 'temperature',
        CASE
          WHEN d BETWEEN '2026-02-05' AND '2026-02-09' THEN (37.5+round((random()*1.0)::numeric,1))::text
          WHEN d BETWEEN '2026-03-18' AND '2026-03-21' THEN (37.2+round((random()*0.8)::numeric,1))::text
          ELSE (36.3+round((random()*0.5)::numeric,1))::text
        END,
        CASE
          WHEN d BETWEEN '2026-02-05' AND '2026-02-09' THEN 'Cold symptoms, runny nose'
          WHEN d BETWEEN '2026-03-18' AND '2026-03-21' THEN 'Teething fever, drooling a lot'
          ELSE 'Routine check'
        END,
        d + '09:00'::time);
    END IF;

    IF d BETWEEN '2026-02-06' AND '2026-02-08' THEN
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_rio_id, v_user_id, d, 'medicine', 'Paracetamol 100mg/ml - 0.8ml',
        'For fever management per pediatrician', d + '10:00'::time);
    END IF;
    IF d BETWEEN '2026-03-19' AND '2026-03-20' THEN
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_rio_id, v_user_id, d, 'medicine', 'Camomile teething gel',
        'Applied to gums before bed', d + '19:30'::time);
    END IF;

  END LOOP;

  -- Rio: Vaccines
  INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_rio_id, v_user_id, '2026-01-15', 'vaccine', 'Flu shot (seasonal)', 'No reaction, was brave!', '2026-01-15 10:00'),
    (v_rio_id, v_user_id, '2026-02-20', 'vaccine', 'Pneumococcal booster', 'Slight redness at site, resolved in 24h', '2026-02-20 11:00'),
    (v_rio_id, v_user_id, '2026-03-25', 'vaccine', 'Hepatitis A - 1st dose', 'Mild fussiness evening, no fever', '2026-03-25 10:30');

  -- Rio: Growth
  INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_rio_id, v_user_id, '2026-01-15', 'growth', '{"weight":8.9,"height":71,"head":45.2}', 'Pediatrician checkup — 50th percentile', '2026-01-15 10:30'),
    (v_rio_id, v_user_id, '2026-02-15', 'growth', '{"weight":9.2,"height":72.5,"head":45.5}', 'Growing well, pulling up to stand', '2026-02-15 10:30'),
    (v_rio_id, v_user_id, '2026-03-15', 'growth', '{"weight":9.5,"height":74,"head":45.8}', 'Doctor happy with weight gain', '2026-03-15 10:30'),
    (v_rio_id, v_user_id, '2026-04-05', 'growth', '{"weight":9.8,"height":75.5,"head":46.0}', '10 month checkup — all great!', '2026-04-05 10:30');

  -- Rio: Milestones
  INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_rio_id, v_user_id, '2026-01-20', 'milestone', 'Waving bye-bye', 'Started waving at everyone!', '2026-01-20 16:00'),
    (v_rio_id, v_user_id, '2026-02-03', 'milestone', 'Pulling to stand', 'Uses furniture to pull himself up', '2026-02-03 11:00'),
    (v_rio_id, v_user_id, '2026-02-18', 'milestone', 'First word: mama', 'Said mama clearly looking at mom!', '2026-02-18 08:00'),
    (v_rio_id, v_user_id, '2026-03-05', 'milestone', 'Cruising along furniture', 'Walking sideways holding the couch', '2026-03-05 15:00'),
    (v_rio_id, v_user_id, '2026-03-22', 'milestone', 'Clapping on command', 'Claps when we sing patty-cake', '2026-03-22 10:00'),
    (v_rio_id, v_user_id, '2026-04-08', 'milestone', 'Pointing at things', 'Points at birds, dogs, and food', '2026-04-08 09:30');


  -- ════════════════════════════════════════════════════════════════════════════
  -- BAHIA — Toddler (~2 years, born Jan 2024)
  -- Creative, independent, picky eater, loves art & animals
  -- ════════════════════════════════════════════════════════════════════════════

  FOR d IN SELECT generate_series('2026-01-11'::date, '2026-04-10'::date, '1 day')::date LOOP
    dow := EXTRACT(DOW FROM d);

    -- ── SLEEP: night ────────────────────────────────────────────────────────
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bahia_id, v_user_id, d, 'sleep',
      '{"startTime":"' || CASE WHEN random()<0.5 THEN '20:00' ELSE '20:30' END
      || '","endTime":"' || CASE WHEN random()<0.5 THEN '06:30' ELSE '07:00' END
      || '","duration":"' || (10.0+round((random()*1.0)::numeric,1))::text
      || '","quality":"' || (ARRAY['great','great','good','great'])[1+floor(random()*4)::int]
      || '"}',
      CASE WHEN random()<0.08 THEN 'Had a nightmare, needed cuddles'
           WHEN random()<0.06 THEN 'Asked for water at 3am' ELSE NULL END,
      d + '07:00'::time);

    -- SLEEP: afternoon nap (skipping ~25%)
    IF random() < 0.75 THEN
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_bahia_id, v_user_id, d, 'sleep',
        '{"startTime":"13:00","endTime":"' || CASE WHEN random()<0.5 THEN '14:30' ELSE '15:00' END
        || '","duration":"' || (1.5+round((random()*0.5)::numeric,1))::text
        || '","quality":"' || (ARRAY['great','good','good'])[1+floor(random()*3)::int]
        || '"}',
        CASE WHEN random()<0.12 THEN 'Fought the nap for 20min' ELSE NULL END,
        d + '15:00'::time);
    END IF;

    -- ── FOOD: breakfast ─────────────────────────────────────────────────────
    pick := 1 + floor(random()*5)::int;
    foods_json := (ARRAY[
      '["pancake","strawberry","milk"]',
      '["toast","cheese","banana"]',
      '["oatmeal","blueberry","honey"]',
      '["scrambled egg","toast","yogurt"]',
      '["cereal","milk","banana"]'
    ])[pick];
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bahia_id, v_user_id, d, 'food',
      '{"feedType":"solids","meal":"breakfast","quality":"'
      || (ARRAY['ate_well','ate_little','ate_well','ate_little','did_not_eat'])[1+floor(random()*5)::int]
      || '","time":"07:30","estimatedCals":' || (100+floor(random()*80))::text
      || ',"matchedFoods":' || foods_json || '}',
      CASE WHEN random()<0.08 THEN 'Only wanted the fruit'
           WHEN random()<0.06 THEN 'Made a mess but ate well!' ELSE NULL END,
      d + '07:30'::time);

    -- FOOD: morning snack
    IF random() < 0.8 THEN
      pick := 1 + floor(random()*4)::int;
      foods_json := (ARRAY[
        '["crackers","cheese"]',
        '["apple","peanut butter"]',
        '["yogurt","granola"]',
        '["banana","milk"]'
      ])[pick];
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_bahia_id, v_user_id, d, 'food',
        '{"feedType":"solids","meal":"morning_snack","quality":"ate_well","time":"10:00","estimatedCals":'
        || (50+floor(random()*30))::text || ',"matchedFoods":' || foods_json || '}',
        NULL, d + '10:00'::time);
    END IF;

    -- FOOD: lunch (picky)
    pick := 1 + floor(random()*6)::int;
    foods_json := (ARRAY[
      '["rice","chicken","carrot"]',
      '["pasta","tomato","cheese"]',
      '["beans","rice","beef"]',
      '["soup","bread"]',
      '["potato","fish","broccoli"]',
      '["rice","egg","peas"]'
    ])[pick];
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bahia_id, v_user_id, d, 'food',
      '{"feedType":"solids","meal":"lunch","quality":"'
      || (ARRAY['ate_well','ate_little','ate_little','did_not_eat','ate_well','ate_little'])[1+floor(random()*6)::int]
      || '","time":"12:00","estimatedCals":' || (120+floor(random()*100))::text
      || ',"matchedFoods":' || foods_json || '}',
      CASE WHEN random()<0.1 THEN 'Refused the vegetables again'
           WHEN random()<0.06 THEN 'Ate everything! Rare win'
           WHEN random()<0.04 THEN 'Only ate the rice' ELSE NULL END,
      d + '12:00'::time);

    -- FOOD: afternoon snack
    pick := 1 + floor(random()*5)::int;
    foods_json := (ARRAY[
      '["mango","yogurt"]',
      '["crackers","hummus"]',
      '["watermelon"]',
      '["cheese","grape"]',
      '["banana","cookie"]'
    ])[pick];
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bahia_id, v_user_id, d, 'food',
      '{"feedType":"solids","meal":"afternoon_snack","quality":"ate_well","time":"15:30","estimatedCals":'
      || (70+floor(random()*40))::text || ',"matchedFoods":' || foods_json || '}',
      NULL, d + '15:30'::time);

    -- FOOD: dinner
    pick := 1 + floor(random()*5)::int;
    foods_json := (ARRAY[
      '["pasta","chicken","broccoli"]',
      '["rice","beans","sweet potato"]',
      '["soup","toast","cheese"]',
      '["fish","potato","peas"]',
      '["omelette","rice","tomato"]'
    ])[pick];
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bahia_id, v_user_id, d, 'food',
      '{"feedType":"solids","meal":"dinner","quality":"'
      || (ARRAY['ate_well','ate_little','ate_well','ate_little'])[1+floor(random()*4)::int]
      || '","time":"18:30","estimatedCals":' || (130+floor(random()*80))::text
      || ',"matchedFoods":' || foods_json || '}',
      CASE WHEN random()<0.06 THEN 'Asked for pasta instead (again)' ELSE NULL END,
      d + '18:30'::time);

    -- ── MOOD ────────────────────────────────────────────────────────────────
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bahia_id, v_user_id, d, 'mood',
      CASE
        WHEN d BETWEEN '2026-02-05' AND '2026-02-12' THEN
          '"' || (ARRAY['cranky','fussy','calm','fussy'])[1+floor(random()*4)::int] || '"'
        ELSE
          '"' || (ARRAY['happy','energetic','calm','happy','fussy','cranky'])[1+floor(random()*6)::int] || '"'
      END,
      CASE WHEN random()<0.08 THEN 'Very artistic today, drew for an hour'
           WHEN random()<0.06 THEN 'Tantrum at the store'
           WHEN random()<0.04 THEN 'Sweet and cuddly all morning' ELSE NULL END,
      d + '10:30'::time);

    IF random() < 0.5 THEN
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_bahia_id, v_user_id, d, 'mood',
        '"' || (ARRAY['happy','calm','cranky','energetic','fussy'])[1+floor(random()*5)::int] || '"',
        NULL, d + '17:00'::time);
    END IF;

    -- ── ACTIVITY ────────────────────────────────────────────────────────────
    IF dow NOT IN (0,6) THEN
      pick := 1 + floor(random()*5)::int;
      act_type := (ARRAY['art','dance','playground','music','walk'])[pick];
      act_name := (ARRAY['Art class — painting','Dance class','Playground with friends','Music & movement','Nature walk'])[pick];
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_bahia_id, v_user_id, d, 'activity',
        '{"activityType":"' || act_type || '","name":"' || act_name
        || '","startTime":"10:00","endTime":"11:00","duration":"1h"}',
        CASE WHEN random()<0.12 THEN 'Loved it today!' ELSE NULL END,
        d + '11:00'::time);

      IF random() < 0.4 THEN
        pick := 1 + floor(random()*3)::int;
        act_type := (ARRAY['playground','walk','playdate'])[pick];
        act_name := (ARRAY['Afternoon at the park','Walk with grandma','Playdate with Nina'])[pick];
        INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
        (v_bahia_id, v_user_id, d, 'activity',
          '{"activityType":"' || act_type || '","name":"' || act_name
          || '","startTime":"16:00","endTime":"17:00","duration":"1h"}',
          NULL, d + '17:00'::time);
      END IF;
    ELSE
      pick := 1 + floor(random()*5)::int;
      act_type := (ARRAY['playground','swim','walk','playdate','art'])[pick];
      act_name := (ARRAY['Family park day','Swimming lesson','Zoo visit','Playdate at Luiza''s','Arts and crafts'])[pick];
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_bahia_id, v_user_id, d, 'activity',
        '{"activityType":"' || act_type || '","name":"' || act_name
        || '","startTime":"09:30","endTime":"11:30","duration":"2h"}',
        CASE WHEN random()<0.25 THEN 'Great family time!' ELSE NULL END,
        d + '11:30'::time);
    END IF;

    -- ── MEMORY (2-3/week) ───────────────────────────────────────────────────
    IF dow IN (1,4,6) AND random() < 0.7 THEN
      memo_text := (ARRAY[
        'Painting a rainbow',
        'Dancing in the living room',
        'Feeding the ducks at the park',
        'First time on the swing alone',
        'Reading her favorite book',
        'Playing doctor with dolls',
        'Building a tower with blocks',
        'Splashing in puddles after rain',
        'Counting to ten!',
        'Helping mommy cook'
      ])[1+floor(random()*10)::int];
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_bahia_id, v_user_id, d, 'photo', 'memory', memo_text, d + '14:00'::time);
    END IF;

    -- ── HEALTH ──────────────────────────────────────────────────────────────
    IF (EXTRACT(DAY FROM d)::int % 12 = 0)
       OR (d BETWEEN '2026-02-08' AND '2026-02-13')
       OR (d BETWEEN '2026-03-28' AND '2026-03-30') THEN
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_bahia_id, v_user_id, d, 'temperature',
        CASE
          WHEN d BETWEEN '2026-02-08' AND '2026-02-13' THEN (37.8+round((random()*1.2)::numeric,1))::text
          WHEN d BETWEEN '2026-03-28' AND '2026-03-30' THEN (37.0+round((random()*0.8)::numeric,1))::text
          ELSE (36.2+round((random()*0.5)::numeric,1))::text
        END,
        CASE
          WHEN d BETWEEN '2026-02-08' AND '2026-02-13' THEN 'Ear infection, pulling on ear'
          WHEN d BETWEEN '2026-03-28' AND '2026-03-30' THEN 'Mild cold, coughing at night'
          ELSE 'Routine check'
        END,
        d + '09:00'::time);
    END IF;

    IF d BETWEEN '2026-02-09' AND '2026-02-13' THEN
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_bahia_id, v_user_id, d, 'medicine', 'Amoxicillin 250mg/5ml - 5ml 2x/day',
        'Antibiotics for ear infection, per Dr. Santos', d + '08:00'::time);
    END IF;
    IF d BETWEEN '2026-03-28' AND '2026-03-30' THEN
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_bahia_id, v_user_id, d, 'medicine', 'Saline nasal drops',
        'Before bed to help with congestion', d + '19:00'::time);
    END IF;

  END LOOP;

  -- Bahia: Vaccines
  INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bahia_id, v_user_id, '2026-01-22', 'vaccine', 'Hepatitis A - 2nd dose', 'All done with Hep A series!', '2026-01-22 10:00'),
    (v_bahia_id, v_user_id, '2026-03-10', 'vaccine', 'DTP booster', 'Cried briefly, brave girl. Sticker reward.', '2026-03-10 11:00');

  -- Bahia: Growth
  INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bahia_id, v_user_id, '2026-01-20', 'growth', '{"weight":12.1,"height":86,"head":48.0}', '2-year checkup — 50th percentile', '2026-01-20 10:30'),
    (v_bahia_id, v_user_id, '2026-02-18', 'growth', '{"weight":12.4,"height":87,"head":48.2}', 'Growing steadily', '2026-02-18 10:30'),
    (v_bahia_id, v_user_id, '2026-03-18', 'growth', '{"weight":12.7,"height":88.5,"head":48.4}', 'Height jumped, growth spurt', '2026-03-18 10:30'),
    (v_bahia_id, v_user_id, '2026-04-08', 'growth', '{"weight":13.0,"height":89.5,"head":48.5}', 'Healthy and active', '2026-04-08 10:30');

  -- Bahia: Milestones
  INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bahia_id, v_user_id, '2026-01-18', 'milestone', 'Two-word sentences', 'Started saying "more milk" and "bye daddy"', '2026-01-18 09:00'),
    (v_bahia_id, v_user_id, '2026-02-01', 'milestone', 'Jumping with both feet', 'Jumped off the last step!', '2026-02-01 16:00'),
    (v_bahia_id, v_user_id, '2026-02-22', 'milestone', 'Knows 5 colors', 'Can identify red, blue, yellow, green, pink', '2026-02-22 10:00'),
    (v_bahia_id, v_user_id, '2026-03-08', 'milestone', 'Potty training progress', 'Told us she needed to go!', '2026-03-08 14:00'),
    (v_bahia_id, v_user_id, '2026-03-28', 'milestone', 'Singing full songs', 'Sang Twinkle Twinkle start to finish', '2026-03-28 18:00'),
    (v_bahia_id, v_user_id, '2026-04-05', 'milestone', 'Drawing circles', 'Drew circles and called them sun', '2026-04-05 11:00');

  -- ── Notes (general observations) ──────────────────────────────────────────
  INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_rio_id, v_user_id, '2026-01-25', 'note', NULL, 'Rio prefers savory over sweet foods. Great appetite overall.', '2026-01-25 20:00'),
    (v_rio_id, v_user_id, '2026-02-10', 'note', NULL, 'Cold cleared up well. Back to normal energy.', '2026-02-10 20:00'),
    (v_rio_id, v_user_id, '2026-03-01', 'note', NULL, 'Dropping morning nap naturally. Longer afternoon nap now.', '2026-03-01 20:00'),
    (v_rio_id, v_user_id, '2026-03-30', 'note', NULL, 'Separation anxiety phase — cries when I leave the room.', '2026-03-30 20:00'),
    (v_bahia_id, v_user_id, '2026-01-30', 'note', NULL, 'Vocabulary is exploding! New words every day.', '2026-01-30 20:00'),
    (v_bahia_id, v_user_id, '2026-02-15', 'note', NULL, 'Ear infection fully cleared. Completed antibiotics course.', '2026-02-15 20:00'),
    (v_bahia_id, v_user_id, '2026-03-15', 'note', NULL, 'Picky eating continues. Accepts pasta, rice, fruit consistently.', '2026-03-15 20:00'),
    (v_bahia_id, v_user_id, '2026-04-01', 'note', NULL, 'Potty training going well — fewer accidents this week!', '2026-04-01 20:00');

  RAISE NOTICE 'Seed complete for Rio and Bahia!';
END $$;
