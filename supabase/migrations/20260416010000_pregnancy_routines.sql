CREATE TABLE IF NOT EXISTS pregnancy_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  days_of_week INTEGER[] DEFAULT ARRAY[0,1,2,3,4,5,6],
  time TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pregnancy_routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own pregnancy_routines"
  ON pregnancy_routines
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_pregnancy_routines_user ON pregnancy_routines(user_id);
CREATE INDEX idx_pregnancy_routines_user_active ON pregnancy_routines(user_id, active);
