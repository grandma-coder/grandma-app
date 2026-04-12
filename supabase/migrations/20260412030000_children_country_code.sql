-- Add country_code to children table for country-specific vaccine schedules

ALTER TABLE children ADD COLUMN IF NOT EXISTS country_code text NOT NULL DEFAULT 'US';

NOTIFY pgrst, 'reload schema';
