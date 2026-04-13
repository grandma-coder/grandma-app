-- =============================================================================
-- RESEED: align all 3 kids (Rio, Bahia, Bob) with their routine set.
-- Key fixes:
--   1. Every seeded log embeds `routineId` + `routineName` in its value JSON
--      so the calendar's fast-path `isRoutineDone` match succeeds and logged
--      activities stop showing as pending.
--   2. Bahia is now 7yo (school age) — routines rewritten (no naps, no
--      bottles, school schedule) and all logs regenerated to match.
--   3. Bahia's growth entries replaced with age-appropriate values.
-- Date window: 2026-01-13 → 2026-04-12 (yesterday).
-- =============================================================================

DO $$
DECLARE
  v_rio_id    uuid;
  v_bahia_id  uuid;
  v_bob_id    uuid;
  v_user_id   uuid;

  -- Rio routine ids
  rr_morning_bottle uuid; rr_breakfast uuid; rr_lunch uuid;
  rr_afternoon_snack uuid; rr_dinner uuid; rr_night_bottle uuid;
  rr_afternoon_nap uuid; rr_bedtime uuid;
  rr_music uuid; rr_swim uuid; rr_park uuid; rr_mood uuid;

  -- Bahia (7yo) routine ids
  rb_breakfast uuid; rb_school_lunch uuid; rb_afternoon_snack uuid;
  rb_dinner uuid;
  rb_school uuid; rb_soccer uuid; rb_art uuid; rb_piano uuid;
  rb_homework uuid; rb_bedtime uuid; rb_mood uuid;

  -- Bob routine ids
  rbo_feed_early uuid; rbo_feed_morning uuid; rbo_feed_midmorning uuid;
  rbo_feed_prenap uuid; rbo_feed_afternoon uuid; rbo_feed_late uuid;
  rbo_feed_evening uuid; rbo_feed_bedtime uuid; rbo_feed_night uuid;
  rbo_nap_morning uuid; rbo_nap_afternoon uuid; rbo_bedtime uuid;
  rbo_tummy uuid; rbo_mood uuid;

  d date;
  dow int;
  pick int;
  foods_json text;
  memo_text text;
  last_side text := 'left';
BEGIN
  SELECT id, parent_id INTO v_rio_id, v_user_id
    FROM children WHERE lower(name) = 'rio' LIMIT 1;
  SELECT id INTO v_bahia_id
    FROM children WHERE lower(name) = 'bahia' AND parent_id = v_user_id LIMIT 1;
  SELECT id INTO v_bob_id
    FROM children WHERE lower(name) = 'bob'   AND parent_id = v_user_id LIMIT 1;

  IF v_rio_id IS NULL OR v_bahia_id IS NULL OR v_bob_id IS NULL THEN
    RAISE NOTICE 'Children not found — skipping reseed.';
    RETURN;
  END IF;

  -- Note: Bahia's date-of-birth is expected to already reflect 7yo.
  -- (Set via the UI / earlier profile update — not touched here to avoid
  -- column-name drift across environments.)

  -- ═══════════════════════════════════════════════════════════════════════════
  -- Wipe existing routines + logs in window for all three children
  -- ═══════════════════════════════════════════════════════════════════════════
  DELETE FROM child_routines WHERE child_id IN (v_rio_id, v_bahia_id, v_bob_id);
  -- Only wipe the daily-repeating log types; preserve vaccines/growth/milestones/notes
  -- so Rio and Bob keep their previously seeded history. Bahia's history gets
  -- rewritten age-appropriately further down.
  DELETE FROM child_logs
   WHERE child_id IN (v_rio_id, v_bahia_id, v_bob_id)
     AND date >= '2026-01-13' AND date <= '2026-04-12'
     AND type IN ('sleep','feeding','food','mood','activity','photo','temperature','medicine');

  -- ═══════════════════════════════════════════════════════════════════════════
  -- RIO ROUTINES (baby ~10mo)
  -- ═══════════════════════════════════════════════════════════════════════════
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_rio_id, v_user_id, 'feeding', 'Morning bottle',
      '{"feedType":"bottle","amount":"200","duration":"15"}', '{0,1,2,3,4,5,6}', '06:30')
    RETURNING id INTO rr_morning_bottle;
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_rio_id, v_user_id, 'food', 'Breakfast',
      '{"feedType":"solids","meal":"breakfast"}', '{0,1,2,3,4,5,6}', '08:00')
    RETURNING id INTO rr_breakfast;
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_rio_id, v_user_id, 'food', 'Lunch',
      '{"feedType":"solids","meal":"lunch"}', '{0,1,2,3,4,5,6}', '11:30')
    RETURNING id INTO rr_lunch;
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_rio_id, v_user_id, 'food', 'Afternoon snack',
      '{"feedType":"solids","meal":"afternoon_snack"}', '{0,1,2,3,4,5,6}', '15:30')
    RETURNING id INTO rr_afternoon_snack;
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_rio_id, v_user_id, 'food', 'Dinner',
      '{"feedType":"solids","meal":"dinner"}', '{0,1,2,3,4,5,6}', '18:00')
    RETURNING id INTO rr_dinner;
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_rio_id, v_user_id, 'feeding', 'Night bottle',
      '{"feedType":"bottle","amount":"200","duration":"12"}', '{0,1,2,3,4,5,6}', '19:00')
    RETURNING id INTO rr_night_bottle;
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_rio_id, v_user_id, 'sleep', 'Afternoon nap',
      '{"startTime":"12:30","endTime":"14:30","quality":"good"}', '{0,1,2,3,4,5,6}', '12:30')
    RETURNING id INTO rr_afternoon_nap;
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_rio_id, v_user_id, 'sleep', 'Bedtime',
      '{"startTime":"19:30","quality":"great"}', '{0,1,2,3,4,5,6}', '19:30')
    RETURNING id INTO rr_bedtime;
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_rio_id, v_user_id, 'activity', 'Music class',
      '{"activityType":"music","name":"Music class","startTime":"10:00","endTime":"11:00","duration":"1h"}',
      '{2}', '10:00')
    RETURNING id INTO rr_music;
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_rio_id, v_user_id, 'activity', 'Baby swim',
      '{"activityType":"swim","name":"Baby swim","startTime":"10:00","endTime":"10:45","duration":"45m"}',
      '{4}', '10:00')
    RETURNING id INTO rr_swim;
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_rio_id, v_user_id, 'activity', 'Park time',
      '{"activityType":"playground","name":"Park time","startTime":"10:00","endTime":"11:00","duration":"1h"}',
      '{1,3,5}', '10:00')
    RETURNING id INTO rr_park;
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_rio_id, v_user_id, 'mood', 'Morning mood check',
      NULL, '{0,1,2,3,4,5,6}', '10:00')
    RETURNING id INTO rr_mood;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- BAHIA ROUTINES (7 years — school age)
  -- Weekdays: school + extracurricular. Weekends: family activities.
  -- ═══════════════════════════════════════════════════════════════════════════
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_bahia_id, v_user_id, 'food', 'Breakfast',
      '{"feedType":"solids","meal":"breakfast"}', '{0,1,2,3,4,5,6}', '07:00')
    RETURNING id INTO rb_breakfast;
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_bahia_id, v_user_id, 'food', 'School lunch',
      '{"feedType":"solids","meal":"lunch"}', '{1,2,3,4,5}', '12:00')
    RETURNING id INTO rb_school_lunch;
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_bahia_id, v_user_id, 'food', 'Afternoon snack',
      '{"feedType":"solids","meal":"afternoon_snack"}', '{0,1,2,3,4,5,6}', '15:30')
    RETURNING id INTO rb_afternoon_snack;
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_bahia_id, v_user_id, 'food', 'Dinner',
      '{"feedType":"solids","meal":"dinner"}', '{0,1,2,3,4,5,6}', '19:00')
    RETURNING id INTO rb_dinner;
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_bahia_id, v_user_id, 'activity', 'School',
      '{"activityType":"other","name":"School","startTime":"08:00","endTime":"15:00","duration":"7h"}',
      '{1,2,3,4,5}', '08:00')
    RETURNING id INTO rb_school;
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_bahia_id, v_user_id, 'activity', 'Soccer practice',
      '{"activityType":"other","name":"Soccer practice","startTime":"17:00","endTime":"18:00","duration":"1h"}',
      '{2,4}', '17:00')
    RETURNING id INTO rb_soccer;
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_bahia_id, v_user_id, 'activity', 'Piano lesson',
      '{"activityType":"music","name":"Piano lesson","startTime":"16:00","endTime":"17:00","duration":"1h"}',
      '{3}', '16:00')
    RETURNING id INTO rb_piano;
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_bahia_id, v_user_id, 'activity', 'Art class',
      '{"activityType":"art","name":"Art class","startTime":"10:00","endTime":"11:30","duration":"1h 30m"}',
      '{6}', '10:00')
    RETURNING id INTO rb_art;
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_bahia_id, v_user_id, 'activity', 'Homework time',
      '{"activityType":"other","name":"Homework time","startTime":"16:00","endTime":"17:00","duration":"1h"}',
      '{1,2,5}', '16:00')  -- skip Wed (piano) and Thu (soccer prep)
    RETURNING id INTO rb_homework;
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_bahia_id, v_user_id, 'sleep', 'Bedtime',
      '{"startTime":"20:30","quality":"great"}', '{0,1,2,3,4,5,6}', '20:30')
    RETURNING id INTO rb_bedtime;
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_bahia_id, v_user_id, 'mood', 'Evening mood check',
      NULL, '{0,1,2,3,4,5,6}', '19:30')
    RETURNING id INTO rb_mood;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- BOB ROUTINES (newborn ~3mo, breastfeeding)
  -- ═══════════════════════════════════════════════════════════════════════════
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_bob_id, v_user_id, 'feeding', 'Early morning feed',
      '{"feedType":"breast"}', '{0,1,2,3,4,5,6}', '05:30') RETURNING id INTO rbo_feed_early;
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_bob_id, v_user_id, 'feeding', 'Morning feed',
      '{"feedType":"breast"}', '{0,1,2,3,4,5,6}', '07:00') RETURNING id INTO rbo_feed_morning;
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_bob_id, v_user_id, 'feeding', 'Mid-morning feed',
      '{"feedType":"breast"}', '{0,1,2,3,4,5,6}', '09:00') RETURNING id INTO rbo_feed_midmorning;
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_bob_id, v_user_id, 'feeding', 'Pre-nap feed',
      '{"feedType":"breast"}', '{0,1,2,3,4,5,6}', '11:00') RETURNING id INTO rbo_feed_prenap;
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_bob_id, v_user_id, 'feeding', 'Afternoon feed',
      '{"feedType":"breast"}', '{0,1,2,3,4,5,6}', '13:00') RETURNING id INTO rbo_feed_afternoon;
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_bob_id, v_user_id, 'feeding', 'Late afternoon feed',
      '{"feedType":"breast"}', '{0,1,2,3,4,5,6}', '15:30') RETURNING id INTO rbo_feed_late;
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_bob_id, v_user_id, 'feeding', 'Evening feed',
      '{"feedType":"breast"}', '{0,1,2,3,4,5,6}', '17:30') RETURNING id INTO rbo_feed_evening;
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_bob_id, v_user_id, 'feeding', 'Bedtime feed',
      '{"feedType":"breast"}', '{0,1,2,3,4,5,6}', '19:00') RETURNING id INTO rbo_feed_bedtime;
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_bob_id, v_user_id, 'feeding', 'Night feed',
      '{"feedType":"breast"}', '{0,1,2,3,4,5,6}', '01:30') RETURNING id INTO rbo_feed_night;
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_bob_id, v_user_id, 'sleep', 'Morning nap',
      '{"startTime":"08:30","quality":"great"}', '{0,1,2,3,4,5,6}', '08:30') RETURNING id INTO rbo_nap_morning;
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_bob_id, v_user_id, 'sleep', 'Afternoon nap',
      '{"startTime":"13:00","quality":"good"}', '{0,1,2,3,4,5,6}', '13:00') RETURNING id INTO rbo_nap_afternoon;
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_bob_id, v_user_id, 'sleep', 'Bedtime',
      '{"startTime":"19:30","quality":"great"}', '{0,1,2,3,4,5,6}', '19:30') RETURNING id INTO rbo_bedtime;
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_bob_id, v_user_id, 'activity', 'Tummy time',
      '{"activityType":"other","name":"Tummy time","startTime":"10:00","endTime":"10:15","duration":"15m"}',
      '{0,1,2,3,4,5,6}', '10:00') RETURNING id INTO rbo_tummy;
  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time)
    VALUES (v_bob_id, v_user_id, 'mood', 'Mood check', NULL, '{0,1,2,3,4,5,6}', '10:00')
    RETURNING id INTO rbo_mood;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- RIO — daily logs (baby, matches routine set 1:1)
  -- ═══════════════════════════════════════════════════════════════════════════
  FOR d IN SELECT generate_series('2026-01-13'::date, '2026-04-12'::date, '1 day')::date LOOP
    dow := EXTRACT(DOW FROM d);

    -- Sleep: bedtime (previous night) — logged with routine link
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_rio_id, v_user_id, d, 'sleep',
      '{"routineId":"' || rr_bedtime || '","routineName":"Bedtime","routineType":"sleep",' ||
      '"startTime":"' || CASE WHEN random()<0.5 THEN '19:30' ELSE '20:00' END ||
      '","endTime":"' || CASE WHEN random()<0.6 THEN '05:30' ELSE '06:00' END ||
      '","duration":"' || (9.5 + round((random()*1.5)::numeric,1))::text ||
      '","quality":"' || (ARRAY['great','good','good','restless'])[1+floor(random()*4)::int] || '"}',
      CASE WHEN random()<0.1 THEN 'Slept through!' ELSE NULL END,
      d + '06:00'::time);

    -- Afternoon nap
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_rio_id, v_user_id, d, 'sleep',
      '{"routineId":"' || rr_afternoon_nap || '","routineName":"Afternoon nap","routineType":"sleep",' ||
      '"startTime":"12:30","endTime":"' || CASE WHEN random()<0.5 THEN '14:30' ELSE '15:00' END ||
      '","duration":"' || (1.5 + round((random()*0.8)::numeric,1))::text ||
      '","quality":"' || (ARRAY['great','good','great'])[1+floor(random()*3)::int] || '"}',
      NULL, d + '15:00'::time);

    -- Morning bottle
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_rio_id, v_user_id, d, 'feeding',
      '{"routineId":"' || rr_morning_bottle || '","routineName":"Morning bottle","routineType":"feeding",' ||
      '"feedType":"bottle","amount":"' || (180+floor(random()*40))::text ||
      '","duration":"15","time":"06:30"}',
      'Formula', d + '06:30'::time);

    -- Breakfast
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
      '{"routineId":"' || rr_breakfast || '","routineName":"Breakfast","routineType":"food",' ||
      '"feedType":"solids","meal":"breakfast","quality":"' ||
      (ARRAY['ate_well','ate_well','ate_little','ate_well'])[1+floor(random()*4)::int] ||
      '","time":"08:00","estimatedCals":' || (120+floor(random()*60))::text ||
      ',"matchedFoods":' || foods_json || '}',
      NULL, d + '08:00'::time);

    -- Lunch
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
      '{"routineId":"' || rr_lunch || '","routineName":"Lunch","routineType":"food",' ||
      '"feedType":"solids","meal":"lunch","quality":"' ||
      (ARRAY['ate_well','ate_well','ate_little','ate_well','did_not_eat'])[1+floor(random()*5)::int] ||
      '","time":"11:30","estimatedCals":' || (150+floor(random()*80))::text ||
      ',"matchedFoods":' || foods_json || '}',
      NULL, d + '11:30'::time);

    -- Afternoon snack
    pick := 1 + floor(random()*5)::int;
    foods_json := (ARRAY[
      '["banana","crackers"]','["yogurt","strawberry"]','["avocado","toast"]',
      '["mango","rice cracker"]','["cheese","grape"]'
    ])[pick];
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_rio_id, v_user_id, d, 'food',
      '{"routineId":"' || rr_afternoon_snack || '","routineName":"Afternoon snack","routineType":"food",' ||
      '"feedType":"solids","meal":"afternoon_snack","quality":"ate_well","time":"15:30","estimatedCals":' ||
      (60+floor(random()*40))::text || ',"matchedFoods":' || foods_json || '}',
      NULL, d + '15:30'::time);

    -- Dinner
    pick := 1 + floor(random()*5)::int;
    foods_json := (ARRAY[
      '["rice","chicken","carrot","beans"]','["pasta","beef","broccoli"]',
      '["sweet potato","fish","peas"]','["soup","bread"]',
      '["rice","egg","spinach","tomato"]'
    ])[pick];
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_rio_id, v_user_id, d, 'food',
      '{"routineId":"' || rr_dinner || '","routineName":"Dinner","routineType":"food",' ||
      '"feedType":"solids","meal":"dinner","quality":"' ||
      (ARRAY['ate_well','ate_well','ate_little','ate_well'])[1+floor(random()*4)::int] ||
      '","time":"18:00","estimatedCals":' || (130+floor(random()*70))::text ||
      ',"matchedFoods":' || foods_json || '}',
      NULL, d + '18:00'::time);

    -- Night bottle
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_rio_id, v_user_id, d, 'feeding',
      '{"routineId":"' || rr_night_bottle || '","routineName":"Night bottle","routineType":"feeding",' ||
      '"feedType":"bottle","amount":"' || (200+floor(random()*30))::text ||
      '","duration":"12","time":"19:00"}',
      NULL, d + '19:00'::time);

    -- Mood — value is a plain quoted string (analytics compatibility);
    -- isRoutineDone already matches any mood log to a mood routine.
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_rio_id, v_user_id, d, 'mood',
      '"' || (ARRAY['happy','calm','energetic','happy','fussy'])[1+floor(random()*5)::int] || '"',
      NULL, d + '10:00'::time);

    -- Activity — match the routine scheduled for this dow
    IF dow = 2 THEN
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_rio_id, v_user_id, d, 'activity',
        '{"routineId":"' || rr_music || '","routineName":"Music class","routineType":"activity",' ||
        '"activityType":"music","name":"Music class","startTime":"10:00","endTime":"11:00","duration":"1h"}',
        CASE WHEN random()<0.2 THEN 'Loved the drums today' ELSE NULL END, d + '11:00'::time);
    ELSIF dow = 4 THEN
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_rio_id, v_user_id, d, 'activity',
        '{"routineId":"' || rr_swim || '","routineName":"Baby swim","routineType":"activity",' ||
        '"activityType":"swim","name":"Baby swim","startTime":"10:00","endTime":"10:45","duration":"45m"}',
        NULL, d + '10:45'::time);
    ELSIF dow IN (1,3,5) THEN
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_rio_id, v_user_id, d, 'activity',
        '{"routineId":"' || rr_park || '","routineName":"Park time","routineType":"activity",' ||
        '"activityType":"playground","name":"Park time","startTime":"10:00","endTime":"11:00","duration":"1h"}',
        CASE WHEN random()<0.15 THEN 'Beautiful morning at the park' ELSE NULL END, d + '11:00'::time);
    END IF;

    -- Memory (2-3/week)
    IF dow IN (0,3,6) AND random() < 0.7 THEN
      memo_text := (ARRAY[
        'First time crawling to the dog!','Messy banana face','Playing with blocks',
        'Bath time splashes','Standing up holding the couch','Clapping hands',
        'Exploring the garden','Dancing to music'
      ])[1+floor(random()*8)::int];
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_rio_id, v_user_id, d, 'photo', 'memory', memo_text, d + '14:00'::time);
    END IF;

    -- Health (occasional)
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
        END, d + '09:00'::time);
    END IF;
    IF d BETWEEN '2026-02-06' AND '2026-02-08' THEN
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_rio_id, v_user_id, d, 'medicine', 'Paracetamol 100mg/ml - 0.8ml',
        'For fever management per pediatrician', d + '10:00'::time);
    END IF;
  END LOOP;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- BAHIA — 7 year old school kid
  -- ═══════════════════════════════════════════════════════════════════════════
  FOR d IN SELECT generate_series('2026-01-13'::date, '2026-04-12'::date, '1 day')::date LOOP
    dow := EXTRACT(DOW FROM d);

    -- Night sleep → morning wake
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bahia_id, v_user_id, d, 'sleep',
      '{"routineId":"' || rb_bedtime || '","routineName":"Bedtime","routineType":"sleep",' ||
      '"startTime":"' || CASE WHEN random()<0.5 THEN '20:30' ELSE '21:00' END ||
      '","endTime":"' || CASE WHEN random()<0.5 THEN '06:30' ELSE '07:00' END ||
      '","duration":"' || (9.5+round((random()*1.0)::numeric,1))::text ||
      '","quality":"' || (ARRAY['great','great','good','great'])[1+floor(random()*4)::int] || '"}',
      CASE WHEN random()<0.06 THEN 'Woke up excited for school' ELSE NULL END,
      d + '07:00'::time);

    -- Breakfast
    pick := 1 + floor(random()*5)::int;
    foods_json := (ARRAY[
      '["pancake","strawberry","milk"]','["toast","cheese","banana"]',
      '["oatmeal","blueberry","honey"]','["scrambled egg","toast","orange juice"]',
      '["cereal","milk","banana"]'
    ])[pick];
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bahia_id, v_user_id, d, 'food',
      '{"routineId":"' || rb_breakfast || '","routineName":"Breakfast","routineType":"food",' ||
      '"feedType":"solids","meal":"breakfast","quality":"' ||
      (ARRAY['ate_well','ate_well','ate_little','ate_well'])[1+floor(random()*4)::int] ||
      '","time":"07:00","estimatedCals":' || (250+floor(random()*120))::text ||
      ',"matchedFoods":' || foods_json || '}',
      NULL, d + '07:00'::time);

    -- School (weekdays only)
    IF dow BETWEEN 1 AND 5 THEN
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_bahia_id, v_user_id, d, 'activity',
        '{"routineId":"' || rb_school || '","routineName":"School","routineType":"activity",' ||
        '"activityType":"other","name":"School","startTime":"08:00","endTime":"15:00","duration":"7h"}',
        CASE WHEN random()<0.1 THEN 'Great day at school — got a star!'
             WHEN random()<0.08 THEN 'Had music class in school today' ELSE NULL END,
        d + '15:00'::time);

      -- School lunch
      pick := 1 + floor(random()*5)::int;
      foods_json := (ARRAY[
        '["rice","chicken","carrot","beans"]','["pasta","tomato","cheese"]',
        '["sandwich","apple","milk"]','["rice","fish","broccoli"]',
        '["pasta","meat sauce","salad"]'
      ])[pick];
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_bahia_id, v_user_id, d, 'food',
        '{"routineId":"' || rb_school_lunch || '","routineName":"School lunch","routineType":"food",' ||
        '"feedType":"solids","meal":"lunch","quality":"' ||
        (ARRAY['ate_well','ate_well','ate_little','did_not_eat','ate_well'])[1+floor(random()*5)::int] ||
        '","time":"12:00","estimatedCals":' || (350+floor(random()*150))::text ||
        ',"matchedFoods":' || foods_json || '}',
        NULL, d + '12:00'::time);
    ELSE
      -- Weekend lunch (still tagged to school_lunch routine to satisfy logged matching on those days if routine is active — but routine is weekdays-only, so use a free-form lunch log)
      pick := 1 + floor(random()*4)::int;
      foods_json := (ARRAY[
        '["burger","fries","salad"]','["pizza","corn","juice"]',
        '["pasta","meatballs","cheese"]','["rice","chicken","avocado"]'
      ])[pick];
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_bahia_id, v_user_id, d, 'food',
        '{"feedType":"solids","meal":"lunch","quality":"ate_well","time":"12:30","estimatedCals":' ||
        (380+floor(random()*120))::text || ',"matchedFoods":' || foods_json || '}',
        'Weekend family lunch', d + '12:30'::time);
    END IF;

    -- Afternoon snack
    pick := 1 + floor(random()*5)::int;
    foods_json := (ARRAY[
      '["apple","peanut butter"]','["yogurt","granola"]','["crackers","cheese"]',
      '["banana","milk"]','["watermelon"]'
    ])[pick];
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bahia_id, v_user_id, d, 'food',
      '{"routineId":"' || rb_afternoon_snack || '","routineName":"Afternoon snack","routineType":"food",' ||
      '"feedType":"solids","meal":"afternoon_snack","quality":"ate_well","time":"15:30","estimatedCals":' ||
      (90+floor(random()*60))::text || ',"matchedFoods":' || foods_json || '}',
      NULL, d + '15:30'::time);

    -- Extracurriculars
    IF dow = 2 OR dow = 4 THEN
      -- Soccer
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_bahia_id, v_user_id, d, 'activity',
        '{"routineId":"' || rb_soccer || '","routineName":"Soccer practice","routineType":"activity",' ||
        '"activityType":"other","name":"Soccer practice","startTime":"17:00","endTime":"18:00","duration":"1h"}',
        CASE WHEN random()<0.2 THEN 'Scored a goal!' ELSE NULL END,
        d + '18:00'::time);
    END IF;
    IF dow = 3 THEN
      -- Piano
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_bahia_id, v_user_id, d, 'activity',
        '{"routineId":"' || rb_piano || '","routineName":"Piano lesson","routineType":"activity",' ||
        '"activityType":"music","name":"Piano lesson","startTime":"16:00","endTime":"17:00","duration":"1h"}',
        CASE WHEN random()<0.15 THEN 'Learning a new song' ELSE NULL END,
        d + '17:00'::time);
    END IF;
    IF dow = 6 THEN
      -- Art class
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_bahia_id, v_user_id, d, 'activity',
        '{"routineId":"' || rb_art || '","routineName":"Art class","routineType":"activity",' ||
        '"activityType":"art","name":"Art class","startTime":"10:00","endTime":"11:30","duration":"1h 30m"}',
        CASE WHEN random()<0.2 THEN 'Painted a whole landscape' ELSE NULL END,
        d + '11:30'::time);
    END IF;
    IF dow IN (1,2,5) THEN
      -- Homework (skip Wed/piano and Thu/soccer to avoid overlap)
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_bahia_id, v_user_id, d, 'activity',
        '{"routineId":"' || rb_homework || '","routineName":"Homework time","routineType":"activity",' ||
        '"activityType":"other","name":"Homework time","startTime":"16:00","endTime":"17:00","duration":"1h"}',
        CASE WHEN random()<0.08 THEN 'Struggled with math today'
             WHEN random()<0.06 THEN 'Finished in 30 minutes!' ELSE NULL END,
        d + '17:00'::time);
    END IF;

    -- Dinner
    pick := 1 + floor(random()*5)::int;
    foods_json := (ARRAY[
      '["pasta","chicken","broccoli"]','["rice","beans","sweet potato"]',
      '["fish","potato","peas"]','["stir fry","rice","vegetables"]',
      '["omelette","rice","tomato"]'
    ])[pick];
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bahia_id, v_user_id, d, 'food',
      '{"routineId":"' || rb_dinner || '","routineName":"Dinner","routineType":"food",' ||
      '"feedType":"solids","meal":"dinner","quality":"' ||
      (ARRAY['ate_well','ate_well','ate_little','ate_well'])[1+floor(random()*4)::int] ||
      '","time":"19:00","estimatedCals":' || (350+floor(random()*150))::text ||
      ',"matchedFoods":' || foods_json || '}',
      CASE WHEN random()<0.06 THEN 'Asked for seconds' ELSE NULL END,
      d + '19:00'::time);

    -- Mood — plain quoted string for analytics compatibility.
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bahia_id, v_user_id, d, 'mood',
      '"' || (ARRAY['happy','calm','energetic','happy','tired','excited'])[1+floor(random()*6)::int] || '"',
      CASE WHEN random()<0.08 THEN 'Proud of drawing she did'
           WHEN random()<0.06 THEN 'Tired from soccer'
           WHEN random()<0.04 THEN 'Excited about weekend trip' ELSE NULL END,
      d + '19:30'::time);

    -- Memory (2-3/week)
    IF dow IN (1,4,6) AND random() < 0.65 THEN
      memo_text := (ARRAY[
        'Won a soccer match','Piano recital practice','Drew a portrait of grandma',
        'Read a chapter book by herself','Lost her first tooth!',
        'Science experiment at home','Swimming in the backyard pool',
        'Rode her bike without training wheels','Built a LEGO castle',
        'School play costume fitting'
      ])[1+floor(random()*10)::int];
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_bahia_id, v_user_id, d, 'photo', 'memory', memo_text, d + '17:30'::time);
    END IF;

    -- Health (occasional)
    IF (EXTRACT(DAY FROM d)::int % 14 = 0)
       OR (d BETWEEN '2026-02-10' AND '2026-02-13')
       OR (d BETWEEN '2026-03-28' AND '2026-03-30') THEN
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_bahia_id, v_user_id, d, 'temperature',
        CASE
          WHEN d BETWEEN '2026-02-10' AND '2026-02-13' THEN (37.8+round((random()*1.0)::numeric,1))::text
          WHEN d BETWEEN '2026-03-28' AND '2026-03-30' THEN (37.0+round((random()*0.6)::numeric,1))::text
          ELSE (36.2+round((random()*0.5)::numeric,1))::text
        END,
        CASE
          WHEN d BETWEEN '2026-02-10' AND '2026-02-13' THEN 'Flu, stayed home from school'
          WHEN d BETWEEN '2026-03-28' AND '2026-03-30' THEN 'Mild cold'
          ELSE 'Routine check'
        END, d + '09:00'::time);
    END IF;
    IF d BETWEEN '2026-02-10' AND '2026-02-13' THEN
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_bahia_id, v_user_id, d, 'medicine', 'Ibuprofen 100mg/5ml - 7.5ml',
        'For flu fever management', d + '08:00'::time);
    END IF;
  END LOOP;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- BOB — newborn
  -- ═══════════════════════════════════════════════════════════════════════════
  FOR d IN SELECT generate_series('2026-01-15'::date, '2026-04-12'::date, '1 day')::date LOOP
    dow := EXTRACT(DOW FROM d);

    -- Night sleep (two blocks)
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'sleep',
      '{"routineId":"' || rbo_bedtime || '","routineName":"Bedtime","routineType":"sleep",' ||
      '"startTime":"19:30","endTime":"' ||
      CASE WHEN random()<0.4 THEN '01:00' WHEN random()<0.7 THEN '01:30' ELSE '02:00' END ||
      '","duration":"' || (5.0+round((random()*1.5)::numeric,1))::text ||
      '","quality":"' || (ARRAY['good','good','restless','great'])[1+floor(random()*4)::int] || '"}',
      NULL, d + '01:30'::time);

    -- Morning nap
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'sleep',
      '{"routineId":"' || rbo_nap_morning || '","routineName":"Morning nap","routineType":"sleep",' ||
      '"startTime":"08:30","endTime":"' || CASE WHEN random()<0.5 THEN '10:00' ELSE '10:30' END ||
      '","duration":"' || (1.0+round((random()*0.5)::numeric,1))::text ||
      '","quality":"' || (ARRAY['great','good','great'])[1+floor(random()*3)::int] || '"}',
      NULL, d + '10:00'::time);

    -- Afternoon nap
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'sleep',
      '{"routineId":"' || rbo_nap_afternoon || '","routineName":"Afternoon nap","routineType":"sleep",' ||
      '"startTime":"13:00","endTime":"' || CASE WHEN random()<0.5 THEN '14:30' ELSE '15:00' END ||
      '","duration":"' || (1.5+round((random()*0.5)::numeric,1))::text ||
      '","quality":"' || (ARRAY['great','good','good'])[1+floor(random()*3)::int] || '"}',
      NULL, d + '15:00'::time);

    -- Feeds — each tagged to its routine
    last_side := CASE WHEN last_side = 'left' THEN 'right' ELSE 'left' END;
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'feeding',
      '{"routineId":"' || rbo_feed_early || '","routineName":"Early morning feed","routineType":"feeding",' ||
      '"feedType":"breast","time":"05:30","duration":"' || (12+floor(random()*8))::text ||
      '","side":"' || last_side || '"}', NULL, d + '05:30'::time);

    last_side := CASE WHEN last_side = 'left' THEN 'right' ELSE 'left' END;
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'feeding',
      '{"routineId":"' || rbo_feed_morning || '","routineName":"Morning feed","routineType":"feeding",' ||
      '"feedType":"breast","time":"07:00","duration":"' || (10+floor(random()*10))::text ||
      '","side":"' || last_side || '"}', NULL, d + '07:00'::time);

    last_side := CASE WHEN last_side = 'left' THEN 'right' ELSE 'left' END;
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'feeding',
      '{"routineId":"' || rbo_feed_midmorning || '","routineName":"Mid-morning feed","routineType":"feeding",' ||
      '"feedType":"breast","time":"09:00","duration":"' || (10+floor(random()*8))::text ||
      '","side":"' || last_side || '"}', NULL, d + '09:00'::time);

    last_side := CASE WHEN last_side = 'left' THEN 'right' ELSE 'left' END;
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'feeding',
      '{"routineId":"' || rbo_feed_prenap || '","routineName":"Pre-nap feed","routineType":"feeding",' ||
      '"feedType":"breast","time":"11:00","duration":"' || (12+floor(random()*8))::text ||
      '","side":"' || last_side || '"}', NULL, d + '11:00'::time);

    last_side := CASE WHEN last_side = 'left' THEN 'right' ELSE 'left' END;
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'feeding',
      '{"routineId":"' || rbo_feed_afternoon || '","routineName":"Afternoon feed","routineType":"feeding",' ||
      '"feedType":"breast","time":"13:00","duration":"' || (10+floor(random()*8))::text ||
      '","side":"' || last_side || '"}', NULL, d + '13:00'::time);

    last_side := CASE WHEN last_side = 'left' THEN 'right' ELSE 'left' END;
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'feeding',
      '{"routineId":"' || rbo_feed_late || '","routineName":"Late afternoon feed","routineType":"feeding",' ||
      '"feedType":"breast","time":"15:30","duration":"' || (10+floor(random()*8))::text ||
      '","side":"' || last_side || '"}', NULL, d + '15:30'::time);

    last_side := CASE WHEN last_side = 'left' THEN 'right' ELSE 'left' END;
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'feeding',
      '{"routineId":"' || rbo_feed_evening || '","routineName":"Evening feed","routineType":"feeding",' ||
      '"feedType":"breast","time":"17:30","duration":"' || (12+floor(random()*8))::text ||
      '","side":"' || last_side || '"}', NULL, d + '17:30'::time);

    last_side := CASE WHEN last_side = 'left' THEN 'right' ELSE 'left' END;
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'feeding',
      '{"routineId":"' || rbo_feed_bedtime || '","routineName":"Bedtime feed","routineType":"feeding",' ||
      '"feedType":"breast","time":"19:00","duration":"' || (15+floor(random()*10))::text ||
      '","side":"' || last_side || '"}', NULL, d + '19:00'::time);

    last_side := CASE WHEN last_side = 'left' THEN 'right' ELSE 'left' END;
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'feeding',
      '{"routineId":"' || rbo_feed_night || '","routineName":"Night feed","routineType":"feeding",' ||
      '"feedType":"breast","time":"01:30","duration":"' || (10+floor(random()*8))::text ||
      '","side":"' || CASE WHEN random()<0.3 THEN 'both' ELSE last_side END || '"}',
      NULL, d + '01:30'::time);

    -- Tummy time
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'activity',
      '{"routineId":"' || rbo_tummy || '","routineName":"Tummy time","routineType":"activity",' ||
      '"activityType":"other","name":"Tummy time","startTime":"10:00","endTime":"10:15","duration":"15m"}',
      CASE WHEN random()<0.15 THEN 'Lifted head longer today' ELSE NULL END, d + '10:15'::time);

    -- Mood — plain quoted string for analytics compatibility.
    INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bob_id, v_user_id, d, 'mood',
      '"' || (ARRAY['calm','happy','calm','happy','fussy'])[1+floor(random()*5)::int] || '"',
      NULL, d + '10:00'::time);

    -- Memory
    IF dow IN (0,2,5) AND random() < 0.7 THEN
      memo_text := (ARRAY[
        'First real smile!','Sleeping peacefully','Tiny yawn','Holding moms finger',
        'Bath time giggles','Looking at the mobile','Snuggled in blanket',
        'Cooing sounds','First outing to the park'
      ])[1+floor(random()*9)::int];
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_bob_id, v_user_id, d, 'photo', 'memory', memo_text, d + '14:00'::time);
    END IF;

    -- Health
    IF (EXTRACT(DAY FROM d)::int % 10 = 0)
       OR (d BETWEEN '2026-02-20' AND '2026-02-22')
       OR (d BETWEEN '2026-03-25' AND '2026-03-27') THEN
      INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
      (v_bob_id, v_user_id, d, 'temperature',
        CASE
          WHEN d BETWEEN '2026-02-20' AND '2026-02-22' THEN (37.3+round((random()*0.8)::numeric,1))::text
          WHEN d BETWEEN '2026-03-25' AND '2026-03-27' THEN (37.1+round((random()*0.6)::numeric,1))::text
          ELSE (36.4+round((random()*0.4)::numeric,1))::text
        END,
        CASE
          WHEN d BETWEEN '2026-02-20' AND '2026-02-22' THEN 'Post-vaccine mild fever'
          WHEN d BETWEEN '2026-03-25' AND '2026-03-27' THEN 'Slight cold, stuffy nose'
          ELSE 'Routine check'
        END, d + '09:00'::time);
    END IF;
  END LOOP;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- Bahia — realign age-specific growth (remove toddler entries, add 7yo)
  -- ═══════════════════════════════════════════════════════════════════════════
  -- Wipe ALL of Bahia's growth/vaccine/milestone/note history (any date) —
  -- her toddler-era entries no longer apply at her new 7yo age.
  DELETE FROM child_logs WHERE child_id = v_bahia_id AND type IN ('growth','vaccine','milestone','note');

  INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bahia_id, v_user_id, '2026-01-20', 'growth', '{"weight":23.5,"height":120,"head":52.0}',
     '7-year wellness visit — 50th percentile', '2026-01-20 10:30'),
    (v_bahia_id, v_user_id, '2026-04-08', 'growth', '{"weight":24.2,"height":121.5,"head":52.2}',
     'Spring checkup — growing steadily', '2026-04-08 10:30');

  -- Age-appropriate vaccines for 7yo
  INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bahia_id, v_user_id, '2026-02-05', 'vaccine', 'Flu shot (seasonal)',
     'Brave — no tears this year!', '2026-02-05 10:00');

  -- Milestones (school-age)
  INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bahia_id, v_user_id, '2026-01-28', 'milestone', 'Reading chapter books',
     'Finished her first Magic Tree House book alone', '2026-01-28 19:00'),
    (v_bahia_id, v_user_id, '2026-02-18', 'milestone', 'Lost first tooth',
     'Tooth fairy left a dollar', '2026-02-18 21:00'),
    (v_bahia_id, v_user_id, '2026-03-02', 'milestone', 'Riding bike without training wheels',
     'Pedaled around the block by herself', '2026-03-02 16:00'),
    (v_bahia_id, v_user_id, '2026-03-20', 'milestone', 'Wrote first story',
     '5-page story about a dragon princess', '2026-03-20 18:00'),
    (v_bahia_id, v_user_id, '2026-04-05', 'milestone', 'Swim across the pool',
     'Completed a full pool lap with no floaties', '2026-04-05 11:00');

  -- Notes
  INSERT INTO child_logs (child_id, user_id, date, type, value, notes, created_at) VALUES
    (v_bahia_id, v_user_id, '2026-01-25', 'note', NULL,
     'Starting to read independently. Loves animal stories.', '2026-01-25 20:00'),
    (v_bahia_id, v_user_id, '2026-02-20', 'note', NULL,
     'Recovered fully from flu. Back to soccer practice.', '2026-02-20 20:00'),
    (v_bahia_id, v_user_id, '2026-03-15', 'note', NULL,
     'Teacher says she is reading above grade level.', '2026-03-15 20:00'),
    (v_bahia_id, v_user_id, '2026-04-01', 'note', NULL,
     'Lost her 2nd tooth this morning at breakfast.', '2026-04-01 08:30');

  -- ═══════════════════════════════════════════════════════════════════════════
  -- Rio & Bob — keep previously seeded vaccine/growth/milestone/note entries
  -- (those were inserted by earlier migrations outside our window, so they
  --  survived the targeted delete above on dated-log range).
  -- ═══════════════════════════════════════════════════════════════════════════

  RAISE NOTICE 'Reseed complete: Rio, Bahia (7yo), Bob — routines linked to logs.';
END $$;

NOTIFY pgrst, 'reload schema';
