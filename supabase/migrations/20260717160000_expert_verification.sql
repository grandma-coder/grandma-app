-- Phase 3 (community engagement) — verified-expert badges.
--
-- Some community authors are credentialed (pediatrician, OB-GYN, lactation
-- consultant, …). A verified badge next to their name lets others trust their
-- answers. Two profile columns, exposed through profiles_public (the ONLY
-- cross-user read path — channelPosts reads names exclusively via that view, so
-- the badge flag must live there or other users' clients can't see it).
--
-- Verification is granted server-side (admin / command center) — there is no
-- user-facing self-serve toggle, so no new RLS policy is needed on profiles.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_verified_expert boolean NOT NULL DEFAULT false;
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS expert_title text; -- e.g. 'Pediatrician', 'IBCLC'

-- Recreate profiles_public with the two new columns APPENDED AT THE END.
-- CREATE OR REPLACE VIEW can only add columns at the tail of the existing list;
-- inserting them mid-list errors ("cannot change name of view column"). Keep the
-- original 7 columns in their exact order, then append the 2 new ones.
CREATE OR REPLACE VIEW profiles_public AS
SELECT
  id,
  id AS user_id,
  name,
  photo_url,
  user_role,
  created_at,
  language,
  is_verified_expert,
  expert_title
FROM profiles
WHERE name IS NOT NULL;

ALTER VIEW profiles_public SET (security_invoker = false);
GRANT SELECT ON profiles_public TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
