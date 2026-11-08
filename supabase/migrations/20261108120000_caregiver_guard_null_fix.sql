-- Fix for 20261107120000_beta_security_hardening (C1). Idempotent: only redefines the trigger
-- function; the trigger itself is unchanged.
--
-- On a pending invite (user_id NULL) the self-link check evaluated to NULL instead of false, so an
-- inviter could PATCH their own pending row to status 'accepted' (or null out user_id) from the
-- client. Nobody gained access, but the row became an accepted seat with no user, breaking the
-- invite link and eating into the seat cap.

CREATE OR REPLACE FUNCTION guard_child_caregivers_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  jwt_role  text    := COALESCE(auth.role(), '');
  caller    uuid    := auth.uid();
  self_link boolean;
BEGIN
  -- Backend paths (service_role edge functions, webhooks, migrations) pass.
  IF current_user IN ('service_role', 'postgres', 'supabase_admin')
     OR jwt_role IN ('service_role', 'postgres', 'supabase_admin')
  THEN
    RETURN NEW;
  END IF;

  -- COALESCE: on a pending invite user_id is NULL, so "NEW.user_id = caller" is NULL and the whole
  -- expression NULL — "NOT self_link" was then NULL and the guard let the change through.
  self_link := COALESCE(
    caller IS NOT NULL
    AND NEW.child_id IS NOT DISTINCT FROM OLD.child_id
    AND NEW.user_id = caller
    AND NEW.invited_by = caller
    AND EXISTS (SELECT 1 FROM children c WHERE c.id = NEW.child_id AND c.parent_id = caller),
    false);

  IF (NEW.child_id   IS DISTINCT FROM OLD.child_id
      OR NEW.invited_by IS DISTINCT FROM OLD.invited_by
      OR NEW.user_id    IS DISTINCT FROM OLD.user_id)
     AND NOT self_link
  THEN
    RAISE EXCEPTION
      'child_caregivers.child_id / invited_by / user_id can only be changed by the backend (role=%, jwt=%)',
      current_user, jwt_role
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.is_locked IS DISTINCT FROM OLD.is_locked THEN
    RAISE EXCEPTION
      'child_caregivers.is_locked is managed by the billing backend (role=%, jwt=%)',
      current_user, jwt_role
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.status = 'accepted'
     AND OLD.status IS DISTINCT FROM 'accepted'
     AND NOT self_link
  THEN
    RAISE EXCEPTION
      'invites can only be accepted through the accept-invite flow (role=%, jwt=%)',
      current_user, jwt_role
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;
