-- supabase/migrations/20260617130000_private_photo_buckets.sql
-- P2-27 / P2-41 / P2-68 / P2-76 / P3-165 — move PII photos off the PUBLIC
-- garage-photos bucket into PRIVATE, RLS-scoped buckets, and add explicit RLS
-- to the already-private vault-documents bucket.
--
-- Buckets created here (private):
--   child-photos       — child face + kids activity-log + memory photos
--                        path: {childId}/...   (so caregivers can read by child)
--   profile-avatars    — user + caregiver avatar photos
--                        path: {userId}/...
--   pregnancy-nutrition— pregnancy meal photos
--                        path: {userId}/...
--
-- Soft migration: existing rows hold full PUBLIC garage-photos URLs and keep
-- working (garage-photos stays public for the marketplace). NEW uploads write a
-- bare storage PATH into the same columns and are signed at read time. The
-- client's photo-signing helper distinguishes a bare path (sign it) from a
-- legacy http(s) URL or an "icon:" sentinel (pass through).
--
-- NOTE: a PUBLIC bucket skips storage.objects RLS entirely, so privacy depends
-- on these buckets being created with public=false (done below). Do NOT flip
-- them public in the Dashboard.
--
-- Caregiver access mirrors the hardened predicate used everywhere else in this
-- app (P0-1 / P1-16 / P1-17 / P2-42): accepted AND not locked AND not paused.
-- Paths are compared as TEXT (id::text = segment) rather than casting the path
-- segment to uuid, so a malformed/non-uuid first segment can never raise a
-- cast error that would abort an otherwise-legitimate request.

BEGIN;

-- ─── Buckets (idempotent, private) ──────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public) VALUES ('child-photos', 'child-photos', false)
ON CONFLICT (id) DO UPDATE SET public = false, name = EXCLUDED.name;
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-avatars', 'profile-avatars', false)
ON CONFLICT (id) DO UPDATE SET public = false, name = EXCLUDED.name;
INSERT INTO storage.buckets (id, name, public) VALUES ('pregnancy-nutrition', 'pregnancy-nutrition', false)
ON CONFLICT (id) DO UPDATE SET public = false, name = EXCLUDED.name;
-- vault-documents is already private; ensure it exists + stays private.
INSERT INTO storage.buckets (id, name, public) VALUES ('vault-documents', 'vault-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false, name = EXCLUDED.name;

-- ─── child-photos ───────────────────────────────────────────────────────────
-- Path: {childId}/<file>. Parent owns (full access); accepted/active/unpaused
-- caregivers read.
DROP POLICY IF EXISTS "child_photos_parent_all" ON storage.objects;
DROP POLICY IF EXISTS "child_photos_caregiver_read" ON storage.objects;

CREATE POLICY "child_photos_parent_all"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'child-photos'
    AND EXISTS (
      SELECT 1 FROM children
      WHERE id::text = (storage.foldername(name))[1]
        AND parent_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'child-photos'
    AND EXISTS (
      SELECT 1 FROM children
      WHERE id::text = (storage.foldername(name))[1]
        AND parent_id = auth.uid()
    )
  );

CREATE POLICY "child_photos_caregiver_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'child-photos'
    AND EXISTS (
      SELECT 1 FROM child_caregivers
      WHERE child_id::text = (storage.foldername(name))[1]
        AND user_id = auth.uid()
        AND status = 'accepted'
        AND is_locked = false
        AND COALESCE((permissions->>'_paused')::boolean, false) = false
    )
  );

-- ─── profile-avatars ─────────────────────────────────────────────────────────
-- Path: {userId}/<file>. Owner full access. A parent and their accepted/active/
-- unpaused caregivers may READ each other's avatars (so caregiver UIs can show
-- the parent, and the parent's UI can show the caregiver).
DROP POLICY IF EXISTS "profile_avatars_owner_all" ON storage.objects;
DROP POLICY IF EXISTS "profile_avatars_linked_read" ON storage.objects;

CREATE POLICY "profile_avatars_owner_all"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'profile-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'profile-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "profile_avatars_linked_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'profile-avatars'
    AND (
      -- parent reading an accepted caregiver's avatar
      EXISTS (
        SELECT 1 FROM child_caregivers cc
        JOIN children c ON c.id = cc.child_id
        WHERE cc.user_id::text = (storage.foldername(name))[1]
          AND c.parent_id = auth.uid()
          AND cc.status = 'accepted'
          AND cc.is_locked = false
          AND COALESCE((cc.permissions->>'_paused')::boolean, false) = false
      )
      -- caregiver reading the parent's avatar
      OR EXISTS (
        SELECT 1 FROM child_caregivers cc
        JOIN children c ON c.id = cc.child_id
        WHERE c.parent_id::text = (storage.foldername(name))[1]
          AND cc.user_id = auth.uid()
          AND cc.status = 'accepted'
          AND cc.is_locked = false
          AND COALESCE((cc.permissions->>'_paused')::boolean, false) = false
      )
    )
  );

-- ─── pregnancy-nutrition ─────────────────────────────────────────────────────
-- Path: {userId}/<file>. Strictly owner-only (no sharing).
DROP POLICY IF EXISTS "pregnancy_nutrition_owner_all" ON storage.objects;

CREATE POLICY "pregnancy_nutrition_owner_all"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'pregnancy-nutrition'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'pregnancy-nutrition'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── vault-documents (P3-165) ────────────────────────────────────────────────
-- Path: {userId}/<file>. Owner-only; medical records, never shared at storage
-- level. (The vault_documents TABLE has its own RLS; this covers the objects.)
DROP POLICY IF EXISTS "vault_documents_owner_all" ON storage.objects;

CREATE POLICY "vault_documents_owner_all"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'vault-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'vault-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

NOTIFY pgrst, 'reload schema';

COMMIT;
