-- Per-child metric goals (sleep, calories, activity)
-- Parents can customize targets; defaults are age-based suggestions.

CREATE TABLE IF NOT EXISTS child_goals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id uuid REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  metric text NOT NULL,          -- 'sleep' | 'calories' | 'activity'
  daily_target numeric NOT NULL, -- hours for sleep, kcal for calories, count for activity
  unit text NOT NULL,            -- 'hours' | 'kcal' | 'count'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (child_id, metric)
);

CREATE INDEX IF NOT EXISTS idx_child_goals_child ON child_goals(child_id);

ALTER TABLE child_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage child_goals"
  ON child_goals FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Insert child_goals"
  ON child_goals FOR INSERT
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
