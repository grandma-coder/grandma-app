-- Add blood_type column to profiles
-- Used by the Pregnancy Profile screen (parent's own blood type, separate from child's)

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS blood_type text;

NOTIFY pgrst, 'reload schema';
