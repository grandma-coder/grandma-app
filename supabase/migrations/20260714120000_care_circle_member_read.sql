-- care_circle: add the missing member-side SELECT policy.
--
-- The table shipped with only an owner "FOR ALL" policy plus a member UPDATE
-- policy ("Members can accept invite"). With no SELECT policy, an invited
-- member can never READ their own care_circle row via RLS — so they can't see
-- or list an invite before/after accepting it. RLS defaults to deny, so this
-- was a functional dead-end, not an open door.
--
-- This mirrors the existing member policy's predicate (auth.uid() =
-- member_user_id). Idempotent + guarded so it's a no-op if `care_circle` was
-- ever dropped in favor of `child_caregivers` (the newer caregiver system).
--
-- NOTE: `care_circle` appears to be legacy — the live invite flow
-- (invite-caregiver / accept-invite edge functions, the care-circle screen)
-- writes to `child_caregivers`. If you confirm `care_circle` is fully dead and
-- unread, prefer dropping it outright instead of shipping this policy. Until
-- then, this closes the read gap defensively.

DO $$
BEGIN
  IF to_regclass('public.care_circle') IS NOT NULL THEN
    -- Ensure RLS is on (no-op if already enabled).
    EXECUTE 'ALTER TABLE public.care_circle ENABLE ROW LEVEL SECURITY';

    DROP POLICY IF EXISTS "Members can read own care_circle entry" ON public.care_circle;
    CREATE POLICY "Members can read own care_circle entry"
      ON public.care_circle
      FOR SELECT
      USING (auth.uid() = member_user_id);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
