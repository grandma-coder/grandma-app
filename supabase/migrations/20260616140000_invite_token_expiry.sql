-- ════════════════════════════════════════════════════════════════════════════
-- P2-32 / P2-45 / P2-47: caregiver invite token lifecycle
-- Source: [[Pre-Friends-Test — Fix Tracker]]
--
-- Problem: invite_token never expired and was reused on revoke-then-reinvite,
-- and acceptance didn't null the token. Add an expiry column, rotate the token
-- + reset expiry whenever a row (re)enters 'pending', and null the token on
-- acceptance. The accept-invite edge function additionally rejects expired
-- tokens (see its own change).
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE child_caregivers
  ADD COLUMN IF NOT EXISTS invite_token_expires_at timestamptz;

-- Backfill: give existing pending invites a 7-day window from now; leave
-- accepted/revoked rows null.
UPDATE child_caregivers
  SET invite_token_expires_at = now() + interval '7 days'
  WHERE status = 'pending' AND invite_token_expires_at IS NULL;

-- Rotate token + (re)set expiry when a row enters 'pending' (new invite or
-- re-send), and clear the token once accepted/revoked so it can't be reused.
CREATE OR REPLACE FUNCTION manage_invite_token_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'pending'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'pending') THEN
    -- Fresh token + window every time an invite is (re)issued.
    NEW.invite_token := gen_random_uuid();
    NEW.invite_token_expires_at := now() + interval '7 days';
  ELSIF NEW.status IN ('accepted', 'revoked', 'expired') THEN
    -- Single-use / dead — burn the token.
    NEW.invite_token := NULL;
    NEW.invite_token_expires_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS child_caregivers_invite_token_lifecycle ON child_caregivers;
CREATE TRIGGER child_caregivers_invite_token_lifecycle
  BEFORE INSERT OR UPDATE OF status ON child_caregivers
  FOR EACH ROW
  EXECUTE FUNCTION manage_invite_token_lifecycle();

NOTIFY pgrst, 'reload schema';
