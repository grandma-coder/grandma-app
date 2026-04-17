-- Seed 24 weeks of pregnancy logs (2025-10-29 to 2026-04-16) for the first user.
-- Also inserts default pregnancy routines.
-- Week 1 start: 2025-10-29, due date: ~2026-09-18 (week 24 current as of 2026-04-16)

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- -----------------------------------------------------------------------
  -- VITAMINS — daily, every day for 168 days
  -- -----------------------------------------------------------------------
  INSERT INTO pregnancy_logs (user_id, log_date, log_type, value, notes, created_at)
  SELECT
    v_user_id,
    gs::date,
    'vitamins',
    '1',
    NULL,
    gs + INTERVAL '8 hours'
  FROM generate_series(
    '2025-10-29'::date,
    '2026-04-16'::date,
    '1 day'::interval
  ) gs
  ON CONFLICT DO NOTHING;

  -- -----------------------------------------------------------------------
  -- MOOD — daily, values vary by trimester phase
  -- -----------------------------------------------------------------------
  INSERT INTO pregnancy_logs (user_id, log_date, log_type, value, notes, created_at)
  SELECT
    v_user_id,
    gs::date,
    'mood',
    CASE
      -- Weeks 1-4 (days 0-27): early excitement
      WHEN (gs::date - '2025-10-29'::date) < 28 THEN
        CASE (EXTRACT(DOW FROM gs)::int % 3)
          WHEN 0 THEN 'excited'
          WHEN 1 THEN 'happy'
          ELSE 'okay'
        END
      -- Weeks 5-12 (days 28-83): nausea / anxiety phase
      WHEN (gs::date - '2025-10-29'::date) < 84 THEN
        CASE (EXTRACT(DOW FROM gs)::int % 4)
          WHEN 0 THEN 'anxious'
          WHEN 1 THEN 'okay'
          WHEN 2 THEN 'happy'
          ELSE 'anxious'
        END
      -- Weeks 13-20 (days 84-139): T2 energy boost
      WHEN (gs::date - '2025-10-29'::date) < 140 THEN
        CASE (EXTRACT(DOW FROM gs)::int % 3)
          WHEN 0 THEN 'happy'
          WHEN 1 THEN 'energetic'
          ELSE 'excited'
        END
      -- Weeks 21-24 (days 140-167): T2 growing, some anxiety
      ELSE
        CASE (EXTRACT(DOW FROM gs)::int % 4)
          WHEN 0 THEN 'happy'
          WHEN 1 THEN 'okay'
          WHEN 2 THEN 'happy'
          ELSE 'anxious'
        END
    END,
    NULL,
    gs + INTERVAL '20 hours'
  FROM generate_series('2025-10-29'::date, '2026-04-16'::date, '1 day'::interval) gs
  ON CONFLICT DO NOTHING;

  -- -----------------------------------------------------------------------
  -- WEIGHT — weekly (24 entries)
  -- Week 1: 65.0, slight dip T1, then +0.4 kg/week from week 5
  -- -----------------------------------------------------------------------
  INSERT INTO pregnancy_logs (user_id, log_date, log_type, value, notes, created_at)
  SELECT
    v_user_id,
    ('2025-10-29'::date + ((week_num - 1) * 7))::date,
    'weight',
    CASE
      WHEN week_num <= 4 THEN ROUND((65.0 - (week_num * 0.05))::numeric, 1)::text
      ELSE ROUND((64.8 + ((week_num - 4) * 0.4))::numeric, 1)::text
    END,
    NULL,
    ('2025-10-29'::date + ((week_num - 1) * 7)) + INTERVAL '7 hours'
  FROM generate_series(1, 24) AS week_num
  ON CONFLICT DO NOTHING;

  -- -----------------------------------------------------------------------
  -- WATER — daily, rotating 12-value pattern
  -- -----------------------------------------------------------------------
  INSERT INTO pregnancy_logs (user_id, log_date, log_type, value, notes, created_at)
  SELECT
    v_user_id,
    gs::date,
    'water',
    (ARRAY['5','6','7','8','7','6','8','7','5','8','7','6'])[(EXTRACT(DOY FROM gs)::int % 12) + 1],
    NULL,
    gs + INTERVAL '21 hours'
  FROM generate_series('2025-10-29'::date, '2026-04-16'::date, '1 day'::interval) gs
  ON CONFLICT DO NOTHING;

  -- -----------------------------------------------------------------------
  -- SLEEP — daily, T1 sleepier (7-9 h), T2 lighter (6-8 h)
  -- -----------------------------------------------------------------------
  INSERT INTO pregnancy_logs (user_id, log_date, log_type, value, notes, created_at)
  SELECT
    v_user_id,
    gs::date,
    'sleep',
    CASE
      WHEN (gs::date - '2025-10-29'::date) < 84 THEN -- T1
        (ARRAY['8','8','9','7','8','7','9','8'])[(EXTRACT(DOW FROM gs)::int % 8) + 1]
      ELSE -- T2
        (ARRAY['7','7','8','6','7','8','6','7'])[(EXTRACT(DOW FROM gs)::int % 8) + 1]
    END,
    jsonb_build_object('quality', 4 + (EXTRACT(DOW FROM gs)::int % 5))::text,
    gs + INTERVAL '7 hours'
  FROM generate_series('2025-10-29'::date, '2026-04-16'::date, '1 day'::interval) gs
  ON CONFLICT DO NOTHING;

  -- -----------------------------------------------------------------------
  -- SYMPTOMS — 4 days/week (Mon/Tue/Thu/Sat = DOW 1,2,4,6)
  -- T1: nausea/fatigue; T2: back pain/heartburn
  -- -----------------------------------------------------------------------
  INSERT INTO pregnancy_logs (user_id, log_date, log_type, value, notes, created_at)
  SELECT
    v_user_id,
    gs::date,
    'symptom',
    CASE
      WHEN (gs::date - '2025-10-29'::date) < 84 THEN -- T1
        (ARRAY['Nausea','Fatigue','Nausea, Fatigue','Mood swings','Cravings','Fatigue','Nausea'])
        [(EXTRACT(DOW FROM gs)::int % 7) + 1]
      ELSE -- T2
        (ARRAY['Back pain','Heartburn','Back pain','Insomnia','Heartburn','Back pain','Swelling'])
        [(EXTRACT(DOW FROM gs)::int % 7) + 1]
    END,
    NULL,
    gs + INTERVAL '12 hours'
  FROM generate_series('2025-10-29'::date, '2026-04-16'::date, '1 day'::interval) gs
  WHERE EXTRACT(DOW FROM gs)::int IN (1, 2, 4, 6)
  ON CONFLICT DO NOTHING;

  -- -----------------------------------------------------------------------
  -- EXERCISE — Mon/Wed/Fri (DOW 1,3,5), alternating Walk/Yoga/Stretching
  -- -----------------------------------------------------------------------
  INSERT INTO pregnancy_logs (user_id, log_date, log_type, value, notes, created_at)
  SELECT
    v_user_id,
    gs::date,
    'exercise',
    (ARRAY['30','30','45','20','30','45'])[(EXTRACT(DOW FROM gs)::int % 6) + 1],
    jsonb_build_object(
      'type',
      CASE
        WHEN EXTRACT(DOW FROM gs)::int = 1 THEN 'Walk'
        WHEN EXTRACT(DOW FROM gs)::int = 3 THEN 'Yoga'
        ELSE 'Stretching'
      END
    )::text,
    gs + INTERVAL '16 hours'
  FROM generate_series('2025-10-29'::date, '2026-04-16'::date, '1 day'::interval) gs
  WHERE EXTRACT(DOW FROM gs)::int IN (1, 3, 5)
  ON CONFLICT DO NOTHING;

  -- -----------------------------------------------------------------------
  -- KICK COUNT — daily from week 20 (2026-02-12 onwards)
  -- -----------------------------------------------------------------------
  INSERT INTO pregnancy_logs (user_id, log_date, log_type, value, notes, created_at)
  SELECT
    v_user_id,
    gs::date,
    'kick_count',
    (ARRAY['10','12','15','8','14','18','11','22','9','16','20','13'])[(EXTRACT(DOY FROM gs)::int % 12) + 1],
    '{"durationMinutes":45}',
    gs + INTERVAL '19 hours'
  FROM generate_series('2026-02-12'::date, '2026-04-16'::date, '1 day'::interval) gs
  ON CONFLICT DO NOTHING;

  -- -----------------------------------------------------------------------
  -- NUTRITION — 4 days/week (Mon/Tue/Thu/Sat = DOW 1,2,4,6)
  -- -----------------------------------------------------------------------
  INSERT INTO pregnancy_logs (user_id, log_date, log_type, value, notes, created_at)
  SELECT
    v_user_id,
    gs::date,
    'nutrition',
    (ARRAY['Iron,Folic acid','Protein,Calcium','DHA,Vitamin D','Iron,Protein'])[(EXTRACT(DOW FROM gs)::int % 4) + 1],
    NULL,
    gs + INTERVAL '13 hours'
  FROM generate_series('2025-10-29'::date, '2026-04-16'::date, '1 day'::interval) gs
  WHERE EXTRACT(DOW FROM gs)::int IN (1, 2, 4, 6)
  ON CONFLICT DO NOTHING;

  -- -----------------------------------------------------------------------
  -- APPOINTMENTS — milestone checkups per standard pregnancy schedule
  -- -----------------------------------------------------------------------
  INSERT INTO pregnancy_logs (user_id, log_date, log_type, value, notes, created_at)
  VALUES
    (v_user_id, '2025-12-22', 'appointment', 'Regular checkup',  NULL,                        '2025-12-22 09:00:00'),  -- week 8
    (v_user_id, '2026-01-19', 'appointment', 'Ultrasound',        '{"doctor":"Dr. Smith"}',    '2026-01-19 10:00:00'),  -- week 12 (NT scan)
    (v_user_id, '2026-02-16', 'appointment', 'Regular checkup',  NULL,                        '2026-02-16 09:00:00'),  -- week 16
    (v_user_id, '2026-03-16', 'appointment', 'Ultrasound',        '{"doctor":"Dr. Smith"}',    '2026-03-16 10:00:00'),  -- week 20 (anatomy scan)
    (v_user_id, '2026-04-13', 'appointment', 'Glucose test',     NULL,                        '2026-04-13 08:00:00')   -- week 24
  ON CONFLICT DO NOTHING;

  -- -----------------------------------------------------------------------
  -- DEFAULT PREGNANCY ROUTINES
  -- -----------------------------------------------------------------------
  INSERT INTO pregnancy_routines (user_id, type, name, days_of_week, time, active)
  VALUES
    (v_user_id, 'vitamins',   'Prenatal Vitamins', ARRAY[0,1,2,3,4,5,6], '09:00', true),
    (v_user_id, 'water',      'Water Goal',        ARRAY[0,1,2,3,4,5,6], '21:00', true),
    (v_user_id, 'mood',       'Mood Check',        ARRAY[0,1,2,3,4,5,6], '20:00', true),
    (v_user_id, 'sleep',      'Sleep Log',         ARRAY[0,1,2,3,4,5,6], '07:00', true),
    (v_user_id, 'exercise',   'Exercise',          ARRAY[1,3,5],          '16:00', true),
    (v_user_id, 'kick_count', 'Kick Count',        ARRAY[0,1,2,3,4,5,6], '19:00', true)
  ON CONFLICT DO NOTHING;

END $$;
