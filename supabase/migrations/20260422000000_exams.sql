-- supabase/migrations/20260422000000_exams.sql
-- Unified cross-behavior exams (labs / tests / medical results).
-- Backed by photos in Supabase Storage + AI-extracted fields.

CREATE TABLE IF NOT EXISTS exams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  behavior TEXT NOT NULL CHECK (behavior IN ('pre-pregnancy', 'pregnancy', 'kids')),
  title TEXT NOT NULL,
  result TEXT,
  notes TEXT,
  exam_date DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Photos are public-URL strings in the scan-images bucket (may be multiple pages)
  photos TEXT[] DEFAULT ARRAY[]::TEXT[],
  -- AI-extracted structured fields: { testName, result, referenceRange, examDate, notes, ... }
  extracted JSONB,
  -- Doctor / provider / reference (freeform)
  provider TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own exams" ON exams;
CREATE POLICY "Users can manage own exams"
  ON exams FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exams_user_behavior_date
  ON exams (user_id, behavior, exam_date DESC);

CREATE INDEX IF NOT EXISTS idx_exams_child_date
  ON exams (child_id, exam_date DESC)
  WHERE child_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_exams_user_date
  ON exams (user_id, exam_date DESC);

-- updated_at trigger (match pattern used elsewhere)
CREATE OR REPLACE FUNCTION touch_exams_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS exams_touch_updated_at ON exams;
CREATE TRIGGER exams_touch_updated_at
  BEFORE UPDATE ON exams
  FOR EACH ROW EXECUTE FUNCTION touch_exams_updated_at();
