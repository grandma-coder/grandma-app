-- Hard paywall (2026-11-16): caregivers never pay — they're covered by the
-- parent who invited them. The app asks this to decide a caregiver account's
-- access: true when the caller has at least one active care link (accepted,
-- not locked, not paused) to a child whose parent holds a premium tier.
--
-- Not relying on is_locked alone: links of parents who were "free" during the
-- beta are unlocked and would otherwise stay open once the paywall turns on.
-- SECURITY DEFINER because a caregiver can't read the parent's profiles row.

CREATE OR REPLACE FUNCTION public.caregiver_has_covered_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM child_caregivers cc
    JOIN children c ON c.id = cc.child_id
    JOIN profiles p ON p.id = c.parent_id
    WHERE cc.user_id = auth.uid()
      AND cc.status = 'accepted'
      AND COALESCE(cc.is_locked, false) = false
      AND COALESCE((cc.permissions->>'_paused')::boolean, false) = false
      AND p.subscription_tier IN ('premium_solo', 'premium_family')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.caregiver_has_covered_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.caregiver_has_covered_access() TO authenticated;
