-- Close logged-out access to the three SECURITY DEFINER "public" views.
--
-- Supabase Advisor flags these views (critical). They run as their owner on purpose — each one
-- exposes a safe column subset of OTHER users' rows (names/photos, leaderboard counts, anonymous
-- circle posts), which a SECURITY INVOKER view can't do under per-user RLS. The real exposure was
-- who may call them: verified on 2026-11-02 with the public anon key (shipped inside the app),
-- no login:
--   profiles_public      → 200, all rows (name, photo, role, language of every user)
--   leaderboard_scores   → 200, all rows (name + per-user pregnancy/cycle/child log counts)
--   circle_posts_public  → 200 (empty today; sensitive anonymous posts once they exist)
--
-- Cause: 20260616120000_p1_rls_fixes revoked anon on profiles_public, then
-- 20260717170000_expert_verification re-granted it; the other two never had anon revoked, so
-- Supabase's default privileges on the public schema left anon with SELECT.
--
-- Signed-in users keep access (the app only reads these views after sign-in). Re-run safe.

REVOKE ALL ON public.profiles_public     FROM anon;
REVOKE ALL ON public.leaderboard_scores  FROM anon;
REVOKE ALL ON public.circle_posts_public FROM anon;

GRANT SELECT ON public.profiles_public     TO authenticated;
GRANT SELECT ON public.leaderboard_scores  TO authenticated;
GRANT SELECT ON public.circle_posts_public TO authenticated;

NOTIFY pgrst, 'reload schema';
