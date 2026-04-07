-- Fix storage policies — use auth.uid() instead of auth.role()
-- The anon key with a user session has role='anon' not 'authenticated'

-- Drop broken policies
DROP POLICY IF EXISTS "garage_media_read" ON storage.objects;
DROP POLICY IF EXISTS "garage_media_upload" ON storage.objects;
DROP POLICY IF EXISTS "garage_media_delete" ON storage.objects;

-- Recreate with correct auth check
CREATE POLICY "garage_media_read" ON storage.objects
  FOR SELECT USING (bucket_id IN ('garage-media', 'garage-photos'));

CREATE POLICY "garage_media_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id IN ('garage-media', 'garage-photos')
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "garage_media_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id IN ('garage-media', 'garage-photos')
    AND auth.uid() = owner
  );

CREATE POLICY "garage_media_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id IN ('garage-media', 'garage-photos')
    AND auth.uid() = owner
  );
