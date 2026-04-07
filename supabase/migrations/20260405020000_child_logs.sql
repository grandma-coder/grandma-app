-- Create child_logs table for activity logging, memories, health tracking
CREATE TABLE IF NOT EXISTS child_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id uuid REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL, -- parent who owns the child
  date date NOT NULL DEFAULT current_date,
  type text NOT NULL,
  value text,
  photos text[] DEFAULT '{}',
  notes text,
  logged_by uuid, -- who actually logged it (parent or caregiver)
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_child_logs_child_date ON child_logs(child_id, date);
CREATE INDEX IF NOT EXISTS idx_child_logs_user ON child_logs(user_id);

ALTER TABLE child_logs ENABLE ROW LEVEL SECURITY;

-- Parent can do everything with their children's logs
CREATE POLICY "Owner can manage child_logs"
  ON child_logs FOR ALL
  USING (user_id = auth.uid());

-- Anyone can insert if they know the child_id (caregivers)
CREATE POLICY "Insert child_logs"
  ON child_logs FOR INSERT
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
