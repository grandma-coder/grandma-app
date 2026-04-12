-- =============================================================================
-- Child Routines — recurring activities that auto-populate the calendar
-- =============================================================================

CREATE TABLE IF NOT EXISTS child_routines (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id uuid REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  type text NOT NULL,  -- feeding, sleep, activity, health, mood
  name text NOT NULL,  -- "Morning bottle", "Music class"
  value text,          -- JSON with default log values
  days_of_week int[] DEFAULT '{0,1,2,3,4,5,6}', -- 0=Sun..6=Sat
  time text,           -- "06:30" (HH:MM)
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_child_routines_child ON child_routines(child_id);
CREATE INDEX IF NOT EXISTS idx_child_routines_user ON child_routines(user_id);

ALTER TABLE child_routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage routines"
  ON child_routines FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Insert routines"
  ON child_routines FOR INSERT
  WITH CHECK (true);

-- =============================================================================
-- Seed routines for Rio & Bahia
-- =============================================================================

DO $$
DECLARE
  v_rio_id uuid;
  v_bahia_id uuid;
  v_user_id uuid;
BEGIN
  SELECT id, parent_id INTO v_rio_id, v_user_id
    FROM children WHERE lower(name) = 'rio' LIMIT 1;
  SELECT id INTO v_bahia_id
    FROM children WHERE lower(name) = 'bahia' AND parent_id = v_user_id LIMIT 1;

  IF v_rio_id IS NULL OR v_bahia_id IS NULL THEN
    RAISE NOTICE 'Children not found — skipping routine seed.';
    RETURN;
  END IF;

  -- ═══ RIO ROUTINES ═══

  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time) VALUES
    -- Daily feeding
    (v_rio_id, v_user_id, 'feeding', 'Morning bottle',
     '{"feedType":"bottle","amount":"200","duration":"15"}',
     '{0,1,2,3,4,5,6}', '06:30'),

    (v_rio_id, v_user_id, 'food', 'Breakfast',
     '{"feedType":"solids","meal":"breakfast"}',
     '{0,1,2,3,4,5,6}', '08:00'),

    (v_rio_id, v_user_id, 'food', 'Lunch',
     '{"feedType":"solids","meal":"lunch"}',
     '{0,1,2,3,4,5,6}', '11:30'),

    (v_rio_id, v_user_id, 'food', 'Afternoon snack',
     '{"feedType":"solids","meal":"afternoon_snack"}',
     '{0,1,2,3,4,5,6}', '15:30'),

    (v_rio_id, v_user_id, 'food', 'Dinner',
     '{"feedType":"solids","meal":"dinner"}',
     '{0,1,2,3,4,5,6}', '18:00'),

    (v_rio_id, v_user_id, 'feeding', 'Night bottle',
     '{"feedType":"bottle","amount":"200","duration":"12"}',
     '{0,1,2,3,4,5,6}', '19:00'),

    -- Daily sleep
    (v_rio_id, v_user_id, 'sleep', 'Afternoon nap',
     '{"startTime":"12:30","endTime":"14:30","quality":"good"}',
     '{0,1,2,3,4,5,6}', '12:30'),

    (v_rio_id, v_user_id, 'sleep', 'Bedtime',
     '{"startTime":"19:30","quality":"great"}',
     '{0,1,2,3,4,5,6}', '19:30'),

    -- Weekly activities
    (v_rio_id, v_user_id, 'activity', 'Music class',
     '{"activityType":"music","name":"Music class","startTime":"10:00","endTime":"11:00","duration":"1h"}',
     '{2}', '10:00'),  -- Tuesday

    (v_rio_id, v_user_id, 'activity', 'Baby swim',
     '{"activityType":"swim","name":"Baby swim","startTime":"10:00","endTime":"10:45","duration":"45m"}',
     '{4}', '10:00'),  -- Thursday

    (v_rio_id, v_user_id, 'activity', 'Park time',
     '{"activityType":"playground","name":"Morning at the park","startTime":"10:00","endTime":"11:00","duration":"1h"}',
     '{1,3,5}', '10:00'),  -- Mon, Wed, Fri

    -- Daily mood check
    (v_rio_id, v_user_id, 'mood', 'Morning mood check',
     NULL,
     '{0,1,2,3,4,5,6}', '10:00');


  -- ═══ BAHIA ROUTINES ═══

  INSERT INTO child_routines (child_id, user_id, type, name, value, days_of_week, time) VALUES
    -- Daily meals
    (v_bahia_id, v_user_id, 'food', 'Breakfast',
     '{"feedType":"solids","meal":"breakfast"}',
     '{0,1,2,3,4,5,6}', '07:30'),

    (v_bahia_id, v_user_id, 'food', 'Morning snack',
     '{"feedType":"solids","meal":"morning_snack"}',
     '{0,1,2,3,4,5,6}', '10:00'),

    (v_bahia_id, v_user_id, 'food', 'Lunch',
     '{"feedType":"solids","meal":"lunch"}',
     '{0,1,2,3,4,5,6}', '12:00'),

    (v_bahia_id, v_user_id, 'food', 'Afternoon snack',
     '{"feedType":"solids","meal":"afternoon_snack"}',
     '{0,1,2,3,4,5,6}', '15:30'),

    (v_bahia_id, v_user_id, 'food', 'Dinner',
     '{"feedType":"solids","meal":"dinner"}',
     '{0,1,2,3,4,5,6}', '18:30'),

    -- Sleep
    (v_bahia_id, v_user_id, 'sleep', 'Afternoon nap',
     '{"startTime":"13:00","endTime":"14:30","quality":"good"}',
     '{0,1,2,3,4,5,6}', '13:00'),

    (v_bahia_id, v_user_id, 'sleep', 'Bedtime',
     '{"startTime":"20:00","quality":"great"}',
     '{0,1,2,3,4,5,6}', '20:00'),

    -- Weekly activities
    (v_bahia_id, v_user_id, 'activity', 'Art class',
     '{"activityType":"art","name":"Art class — painting","startTime":"10:00","endTime":"11:00","duration":"1h"}',
     '{1}', '10:00'),  -- Monday

    (v_bahia_id, v_user_id, 'activity', 'Dance class',
     '{"activityType":"dance","name":"Dance class","startTime":"10:00","endTime":"11:00","duration":"1h"}',
     '{3}', '10:00'),  -- Wednesday

    (v_bahia_id, v_user_id, 'activity', 'Swimming lesson',
     '{"activityType":"swim","name":"Swimming lesson","startTime":"10:00","endTime":"11:00","duration":"1h"}',
     '{6}', '10:00'),  -- Saturday

    (v_bahia_id, v_user_id, 'activity', 'Playground time',
     '{"activityType":"playground","name":"Playground with friends","startTime":"16:00","endTime":"17:00","duration":"1h"}',
     '{2,4}', '16:00'),  -- Tue, Thu

    -- Daily mood
    (v_bahia_id, v_user_id, 'mood', 'Morning mood check',
     NULL,
     '{0,1,2,3,4,5,6}', '10:30');

  RAISE NOTICE 'Routines seeded for Rio and Bahia!';
END $$;

NOTIFY pgrst, 'reload schema';
