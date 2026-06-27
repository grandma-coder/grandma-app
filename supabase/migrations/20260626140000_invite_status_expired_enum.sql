-- Fix a live production breakage: caregiver invite accept/revoke throws at the
-- DB layer.
--
-- manage_invite_token_lifecycle() (20260616140000_invite_token_expiry.sql)
-- evaluates `NEW.status IN ('accepted','revoked','expired')`, but the
-- `invite_status` enum (20260330010000_child_caregivers.sql) only has
-- pending / accepted / revoked. `'expired'` was added to the SEPARATE
-- care_circle CHECK constraint (20260516040000) but never to this enum. So any
-- INSERT/UPDATE that sets child_caregivers.status to 'accepted' or 'revoked'
-- raises `22P02 invalid input value for enum invite_status: "expired"` when the
-- trigger compares against the missing label — i.e. accepting a caregiver invite
-- fails entirely. (Found via the U3/U7 RLS leak test, which could not create an
-- accepted caregiver link to exercise the positive paths.)
--
-- Fix: add the missing 'expired' label so the trigger predicate is valid. The
-- trigger's expiry transition (pending -> expired on token lapse) becomes
-- reachable, which is the originally-intended behavior of 20260616140000.

ALTER TYPE invite_status ADD VALUE IF NOT EXISTS 'expired';

NOTIFY pgrst, 'reload schema';
