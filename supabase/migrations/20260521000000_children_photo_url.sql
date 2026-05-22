-- Add missing photo_url column to children table.
-- schema.sql declares it but no prior migration created it, causing PostgREST
-- "Could not find the 'photo_url' column of 'children' in the schema cache"
-- when the kids onboarding tries to insert.

ALTER TABLE children ADD COLUMN IF NOT EXISTS photo_url text;

NOTIFY pgrst, 'reload schema';
