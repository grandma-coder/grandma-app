-- supabase/migrations/20260422010000_exam_photos_rls.sql
-- Restrict exam photo access to the owning user. Medical data should never be
-- public or readable by anyone who guesses the storage key.

-- NOTE: the scan-images bucket itself must be kept *private* (Dashboard →
-- Storage → scan-images → toggle "Public bucket" off). These policies assume
-- that. If the bucket is public, anyone with the URL can read objects
-- regardless of row-level rules — public buckets skip storage.objects RLS.

-- Remove any prior owner-only exam policies (idempotent re-run).
DROP POLICY IF EXISTS "Users read own exam photos" ON storage.objects;
DROP POLICY IF EXISTS "Users write own exam photos" ON storage.objects;
DROP POLICY IF EXISTS "Users update own exam photos" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own exam photos" ON storage.objects;

-- Read own exam photos.
CREATE POLICY "Users read own exam photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'scan-images'
    AND name LIKE 'exams/' || auth.uid()::text || '/%'
  );

-- Upload into own exam folder.
CREATE POLICY "Users write own exam photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'scan-images'
    AND name LIKE 'exams/' || auth.uid()::text || '/%'
  );

-- Update metadata on own exam photos (rarely needed, but keeps parity).
CREATE POLICY "Users update own exam photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'scan-images'
    AND name LIKE 'exams/' || auth.uid()::text || '/%'
  )
  WITH CHECK (
    bucket_id = 'scan-images'
    AND name LIKE 'exams/' || auth.uid()::text || '/%'
  );

-- Delete own exam photos (used when a user deletes an exam).
CREATE POLICY "Users delete own exam photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'scan-images'
    AND name LIKE 'exams/' || auth.uid()::text || '/%'
  );
