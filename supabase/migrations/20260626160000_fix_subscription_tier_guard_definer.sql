-- Fix the subscription_tier guard, which shipped as a no-op.
--
-- 20260626150000 declared guard_subscription_tier() as SECURITY DEFINER while
-- gating on current_user. Under SECURITY DEFINER, current_user is the function
-- OWNER (postgres/supabase_admin — an allow-listed role), NOT the calling client.
-- So the `current_user NOT IN (...)` check was always false for client PATCHes,
-- the RAISE never fired, and any authenticated user could still self-upgrade
-- subscription_tier. Confirmed reproducible: a free user PATCHed to premium_family
-- and got HTTP 200 with the tier persisted.
--
-- Ground truth for an authenticated PostgREST request (verified on this project):
--   current_user = 'authenticated'   (ONLY when the function is SECURITY INVOKER)
--   session_user = 'postgres'        (the pooler login role — same for clients AND
--                                     the service-role webhook, so useless as a gate)
--   auth.role()  = 'authenticated'   (reads the JWT 'role' claim directly)
--
-- Fix: (1) run as SECURITY INVOKER (the default — a trigger needs no elevated
-- rights just to RAISE), so current_user reflects the real caller; and (2) gate
-- primarily on auth.role(), the canonical Supabase client/backend signal. The
-- service_role webhook presents auth.role()='service_role' (and current_user=
-- 'service_role'), so it stays allowed. Both conditions must indicate a non-
-- privileged caller for the change to be rejected — defense in depth.

CREATE OR REPLACE FUNCTION guard_subscription_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  jwt_role text := COALESCE(auth.role(), '');
BEGIN
  IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
     AND current_user NOT IN ('service_role', 'postgres', 'supabase_admin')
     AND jwt_role NOT IN ('service_role', 'postgres', 'supabase_admin')
  THEN
    RAISE EXCEPTION
      'subscription_tier can only be changed by the billing backend (role=%, jwt=%)',
      current_user, jwt_role
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger definition is unchanged from 20260626150000, but recreate idempotently
-- so this migration is self-contained.
DROP TRIGGER IF EXISTS trg_guard_subscription_tier ON profiles;
CREATE TRIGGER trg_guard_subscription_tier
  BEFORE UPDATE OF subscription_tier ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION guard_subscription_tier();

NOTIFY pgrst, 'reload schema';
