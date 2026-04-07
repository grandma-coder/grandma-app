-- Migration: Add missing profile columns for personal profile screen
-- Adds name, location, language, health_notes, allergies, conditions, medications

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dob date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language text DEFAULT 'en';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS health_notes text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS allergies text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS conditions text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS medications text[] DEFAULT '{}';

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
