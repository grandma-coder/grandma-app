-- Migration: Expand children table with food preferences, health details, pediatrician

ALTER TABLE children ADD COLUMN IF NOT EXISTS sex text CHECK (sex IN ('male', 'female', 'other'));
ALTER TABLE children ADD COLUMN IF NOT EXISTS blood_type text;
ALTER TABLE children ADD COLUMN IF NOT EXISTS conditions text[] DEFAULT '{}';
ALTER TABLE children ADD COLUMN IF NOT EXISTS dietary_restrictions text[] DEFAULT '{}';
ALTER TABLE children ADD COLUMN IF NOT EXISTS preferred_foods text[] DEFAULT '{}';
ALTER TABLE children ADD COLUMN IF NOT EXISTS disliked_foods text[] DEFAULT '{}';
ALTER TABLE children ADD COLUMN IF NOT EXISTS pediatrician jsonb;
ALTER TABLE children ADD COLUMN IF NOT EXISTS notes text;

NOTIFY pgrst, 'reload schema';
