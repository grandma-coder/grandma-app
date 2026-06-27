-- Close a self-service premium-escalation hole.
--
-- profiles.subscription_tier (enum free / premium_solo / premium_family) has no
-- write guard: the RLS owner policy lets a user UPDATE their own profile row, and
-- nothing restricts WHICH columns. So any authenticated user can PATCH their own
-- subscription_tier to premium_family via PostgREST and self-grant unlimited
-- scans/chat/insights AND lift the caregiver seat cap (tier_seat_limit free=0 ->
-- premium_family=4) — entirely for free. (Found via the U3/U7 RLS leak test:
-- a synthetic free user PATCHed to premium_family and the read-back confirmed it.)
--
-- subscription_tier is meant to be set ONLY by the billing path: the
-- revenuecat-webhook edge function, which runs with the service_role key and
-- bypasses RLS/this trigger. So the rule is: reject any tier change unless the
-- caller is a privileged backend role.
--
-- Implemented as BEFORE UPDATE so the bad write is rejected before it lands (and
-- before the existing AFTER-UPDATE trg_lock_excess_seats seat logic runs). The
-- service_role / postgres roles are allowed through; only client roles
-- (authenticated / anon) are blocked. INSERTs aren't gated here — a fresh
-- profile defaults to 'free'; tier only ever moves via the webhook UPDATE.

CREATE OR REPLACE FUNCTION guard_subscription_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
     AND current_user NOT IN ('service_role', 'postgres', 'supabase_admin')
  THEN
    RAISE EXCEPTION
      'subscription_tier can only be changed by the billing backend (got role %)',
      current_user
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_subscription_tier ON profiles;
CREATE TRIGGER trg_guard_subscription_tier
  BEFORE UPDATE OF subscription_tier ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION guard_subscription_tier();

NOTIFY pgrst, 'reload schema';
