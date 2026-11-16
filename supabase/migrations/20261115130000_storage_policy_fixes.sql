-- Storage policy fixes found by the 2026-11-15 live RLS test run.
--
-- 1. "Public read" on garage-photos (created in the dashboard, never in a
--    migration) let anyone LIST the bucket. Public objects are served by their
--    public URL, which doesn't need a SELECT policy; owners keep garage_media_read.
--
-- 2. Column capture bug: inside `EXISTS (SELECT … FROM children …)` an unqualified
--    `name` resolves to children.name (the CHILD'S NAME), not storage.objects.name,
--    so `storage.foldername(name)` compared the child's name to a uuid and the
--    branch never matched. child_photos_parent_all and the parent→caregiver branch
--    of profile_avatars_linked_read were dead (parents only got in through their
--    self-link via child_photos_caregiver_read). Qualify as objects.name.
--
-- 3. profile_avatars_linked_read calls is_active_caregiver_of_parent(), which anon
--    can't execute, so any anon storage.objects read errored. Scope it to
--    authenticated (anon has no business reading avatars).

DROP POLICY IF EXISTS "Public read" ON storage.objects;

DROP POLICY IF EXISTS "child_photos_parent_all" ON storage.objects;
CREATE POLICY "child_photos_parent_all"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'child-photos'
    AND EXISTS (
      SELECT 1 FROM public.children c
      WHERE c.id::text = (storage.foldername(objects.name))[1]
        AND c.parent_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'child-photos'
    AND EXISTS (
      SELECT 1 FROM public.children c
      WHERE c.id::text = (storage.foldername(objects.name))[1]
        AND c.parent_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "profile_avatars_linked_read" ON storage.objects;
CREATE POLICY "profile_avatars_linked_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'profile-avatars'
    AND (
      -- parent reading an accepted caregiver's avatar
      EXISTS (
        SELECT 1 FROM public.child_caregivers cc
        JOIN public.children c ON c.id = cc.child_id
        WHERE cc.user_id::text = (storage.foldername(objects.name))[1]
          AND c.parent_id = auth.uid()
          AND cc.status = 'accepted'
          AND COALESCE(cc.is_locked, false) = false
          AND COALESCE((cc.permissions->>'_paused')::boolean, false) = false
      )
      -- caregiver reading the parent's avatar
      -- (CASE guards the uuid cast: a non-uuid folder must not error the whole query)
      OR CASE WHEN (storage.foldername(objects.name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              THEN public.is_active_caregiver_of_parent(((storage.foldername(objects.name))[1])::uuid)
              ELSE false END
    )
  );
