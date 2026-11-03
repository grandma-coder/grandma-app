-- Subscriptions behind a remote flag (public.feature_flags, key 'paywall'), OFF for launch.
--
-- While the paywall is off the app shows no paywall or Upgrade prompts, so premium limits must be
-- lifted too — otherwise free users (seat cap 0) could never invite a caregiver. The seat trigger
-- now asks effective_seat_limit(), which gives everyone the Family cap while the flag is off and
-- the real tier cap once it is on. The app mirrors this in lib/revenue.ts effectiveSeatLimit().
--
-- Requires 20261101120000_feature_flags.sql. Re-run safe.

INSERT INTO public.feature_flags (key, enabled, note)
VALUES ('paywall', false, 'Subscriptions: paywall + Upgrade prompts. Off = hidden in the app and premium limits lifted (caregiver seats use the Family cap).')
ON CONFLICT (key) DO NOTHING;

-- Missing row / missing table = OFF (fail closed: no paywall, limits lifted).
CREATE OR REPLACE FUNCTION public.paywall_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((SELECT enabled FROM public.feature_flags WHERE key = 'paywall'), false);
$$;

CREATE OR REPLACE FUNCTION public.effective_seat_limit(tier subscription_tier)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN public.paywall_enabled() THEN tier_seat_limit(tier)
              ELSE tier_seat_limit('premium_family') END;
$$;

-- Same body as 20260421010000_subscription_tiers.sql, only the limit check changed.
CREATE OR REPLACE FUNCTION enforce_seat_limit_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  owner_tier subscription_tier;
  current_count int;
BEGIN
  IF new.role = 'parent' THEN
    RETURN new;
  END IF;

  -- Serialize concurrent invites per owner
  SELECT subscription_tier INTO owner_tier
  FROM profiles WHERE id = new.invited_by
  FOR UPDATE;

  SELECT count(*) INTO current_count
  FROM child_caregivers
  WHERE invited_by = new.invited_by
    AND status = 'accepted'
    AND is_locked = false
    AND role <> 'parent';

  IF current_count >= public.effective_seat_limit(owner_tier) THEN
    RAISE EXCEPTION 'seat_limit_exceeded' USING
      errcode = 'P0001',
      hint = 'Upgrade your subscription to invite more caregivers.';
  END IF;

  RETURN new;
END;
$$;
