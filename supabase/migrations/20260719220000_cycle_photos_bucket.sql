-- supabase/migrations/20260719220000_cycle_photos_bucket.sql
-- Cycle memory photos need a durable, private storage home. Before this, the
-- cycle Memories sheet stored the raw local picker URI directly in
-- cycle_logs.photos (see CycleMemoriesSheet.tsx / lib/memories.ts) — which is
-- not durable (URI invalidates when the OS clears the picker cache) and never
-- syncs across devices.
--
-- This adds a PRIVATE `cycle-photos` bucket, path {userId}/<file>, strictly
-- owner-only — mirroring the `pregnancy-nutrition` bucket policy from
-- 20260617130000. Cycle data is the user's own reproductive/fertility data and
-- is never shared with caregivers (a cycle "watcher" must not read these), so
-- there is deliberately NO caregiver-read policy here.
--
-- The client uploads a re-encoded JPEG and stores the bare storage PATH in
-- cycle_logs.photos; lib/photoSigning.ts signs it at read time (bucket key
-- `cycle`). Pregnancy memories reuse the existing owner-only `pregnancy-nutrition`
-- bucket, so no new bucket is needed for them.

BEGIN;

-- ─── Bucket (idempotent, private) ────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public) VALUES ('cycle-photos', 'cycle-photos', false)
ON CONFLICT (id) DO UPDATE SET public = false, name = EXCLUDED.name;

-- ─── cycle-photos — strictly owner-only ──────────────────────────────────────
-- Path: {userId}/<file>. No sharing (mirrors pregnancy-nutrition).
DROP POLICY IF EXISTS "cycle_photos_owner_all" ON storage.objects;

CREATE POLICY "cycle_photos_owner_all"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'cycle-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'cycle-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

NOTIFY pgrst, 'reload schema';

COMMIT;
